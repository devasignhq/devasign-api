import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { HorizonApi } from "../../models/horizonapi.model";
import { TransactionCategory } from "../../../prisma_client";
import { usdcAssetId, xlmAssetId } from "../../config/stellar.config";
import { stellarService } from "../../services/stellar.service";
import { NotFoundError, ValidationError } from "../../models/error.model";
import { KMSService } from "../../services/kms.service";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

// Get wallet info based on installation or user
const getContextWallet = async (userId: string, installationId?: string) => {
    let wallet;

    if (installationId) {
        // Check if user is part of the installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: { some: { userId } }
            },
            select: { wallet: true }
        });

        if (!installation) {
            throw new NotFoundError(
                "Installation does not exist or user is not part of this installation."
            );
        }

        // Set wallet details
        if (!installation.wallet) throw new NotFoundError("Installation wallet not found");
        wallet = installation.wallet;
    } else {
        // Fetch user and verify user exists
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { wallet: true }
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Set wallet details
        if (!user.wallet) throw new NotFoundError("User wallet not found");
        wallet = user.wallet;
    }

    return wallet;
};

/**
 * Withdraw assets from wallet.
 */
export const withdrawAsset = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const {
        installationId,
        walletAddress: destinationAddress,
        assetType = "XLM",
        amount
    } = req.body;

    try {
        // User wallets can only withdraw USDC
        if (!installationId && assetType !== "USDC") {
            throw new ValidationError("User wallets only support USDC withdrawals.");
        }

        // Get wallet info based on installation or user
        const wallet = await getContextWallet(userId, installationId);
        const walletAddress = wallet.address;
        const walletSecret = await KMSService.decryptWallet(wallet);

        // Check balance before withdrawal
        const accountInfo = await stellarService.getAccountInfo(walletAddress);
        const xlmBalanceLine = accountInfo.balances.find(
            balance => "asset_type" in balance && balance.asset_type === "native"
        );

        if (!xlmBalanceLine) {
            throw new ValidationError("No XLM balance found in wallet");
        }

        const feeBuffer = 0.01; // Small buffer for network fees
        const minimumReserve = (2 + accountInfo.subentry_count) * 0.5;
        const requiredXLMForFeesAndReserve = minimumReserve + feeBuffer;
        const currentXLMBalance = parseFloat(xlmBalanceLine.balance);

        // Ensure we always have enough for fees and reserve (user wallet fees are sponsored)
        if (installationId && currentXLMBalance < requiredXLMForFeesAndReserve) {
            throw new ValidationError(
                `Insufficient XLM for network fees and reserve (Minimum required: ${requiredXLMForFeesAndReserve.toFixed(4)} XLM)`
            );
        }

        if (assetType === "USDC") {
            // USDC balance check
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset) {
                throw new ValidationError("No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new ValidationError(
                    "Insufficient USDC balance",
                    { available: usdcAsset.balance }
                );
            }
        } else {
            // XLM balance check (Amount + Fees + Reserve)
            const availableXLMForTransfer = currentXLMBalance - requiredXLMForFeesAndReserve;

            if (availableXLMForTransfer < Number(amount)) {
                throw new ValidationError(
                    `Insufficient XLM balance. Available for transfer: ${availableXLMForTransfer.toFixed(4)} XLM (after ${minimumReserve} XLM reserve and fee buffer)`,
                    { available: availableXLMForTransfer.toString() }
                );
            }
        }

        // Perform transfer (user wallet withdrawals fees are sponsored by master account)
        let txHash: string;
        if (installationId) {
            // Installation wallets pay their own fees
            ({ txHash } = await stellarService.transferAsset(
                walletSecret,
                destinationAddress,
                assetType === "USDC" ? usdcAssetId : xlmAssetId,
                assetType === "USDC" ? usdcAssetId : xlmAssetId,
                amount
            ));
        } else {
            // User wallet withdrawals — master account sponsors the transaction fee
            const masterSecret = process.env.STELLAR_MASTER_SECRET_KEY!;
            ({ txHash } = await stellarService.transferAssetViaSponsor(
                masterSecret,
                walletSecret,
                destinationAddress,
                assetType === "USDC" ? usdcAssetId : xlmAssetId,
                assetType === "USDC" ? usdcAssetId : xlmAssetId,
                amount
            ));
        }

        // Record transaction
        const transactionPayload = {
            txHash,
            category: TransactionCategory.WITHDRAWAL,
            amount: parseFloat(amount.toString()),
            asset: assetType,
            destinationAddress,
            ...(installationId
                ? { installation: { connect: { id: installationId } } }
                : { user: { connect: { userId } } }
            )
        };

        const transaction = await prisma.transaction.create({ data: transactionPayload });

        // Return transaction details
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: transaction,
            message: "Withdrawal successful"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Swap assets in wallet. Only installation wallets can swap assets.
 */
export const swapAsset = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { installationId } = req.params;
    const { toAssetType = "USDC", amount } = req.body;

    try {
        // Check if user is part of the installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: { some: { userId } }
            },
            select: { wallet: true }
        });

        if (!installation) {
            throw new NotFoundError(
                "Installation does not exist or user is not part of this installation."
            );
        }

        // Ensure installation has a wallet
        if (!installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }

        // Get wallet details
        const walletAddress = installation.wallet.address;
        const walletSecret = await KMSService.decryptWallet(installation.wallet);

        // Check balance before swap
        const accountInfo = await stellarService.getAccountInfo(walletAddress);
        const xlmBalanceLine = accountInfo.balances.find(
            balance => "asset_type" in balance && balance.asset_type === "native"
        );

        if (!xlmBalanceLine) {
            throw new ValidationError("No XLM balance found in wallet");
        }

        const feeBuffer = 0.01; // Small buffer for network fees
        const minimumReserve = (2 + accountInfo.subentry_count) * 0.5;
        const requiredXLMForFeesAndReserve = minimumReserve + feeBuffer;
        const currentXLMBalance = parseFloat(xlmBalanceLine.balance);

        // Ensure we always have enough for fees and reserve
        if (currentXLMBalance < requiredXLMForFeesAndReserve) {
            throw new ValidationError(
                `Insufficient XLM for network fees and reserve (Minimum required: ${requiredXLMForFeesAndReserve.toFixed(4)} XLM)`
            );
        }

        if (toAssetType === "USDC") {
            // Check XLM balance for swap to USDC
            const availableXLMForSwap = currentXLMBalance - requiredXLMForFeesAndReserve;

            if (availableXLMForSwap < Number(amount)) {
                throw new ValidationError(
                    `Insufficient XLM balance for swap. Available for swap: ${availableXLMForSwap.toFixed(4)} XLM (after ${minimumReserve} XLM reserve and fee buffer).`,
                    { available: availableXLMForSwap.toString() }
                );
            }
        } else {
            // Check USDC balance for swap to XLM
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset) {
                throw new ValidationError("No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new ValidationError(
                    "Insufficient USDC balance for swap",
                    { available: usdcAsset.balance }
                );
            }
        }

        // Perform swap
        let result;
        if (toAssetType === "USDC") {
            result = await stellarService.swapAsset(walletSecret, amount);
        } else {
            result = await stellarService.swapAsset(
                walletSecret,
                amount,
                usdcAssetId,
                xlmAssetId
            );
        }

        // Record transaction
        const transaction = await prisma.transaction.create({
            data: {
                txHash: result.txHash,
                category: toAssetType === "USDC"
                    ? TransactionCategory.SWAP_XLM
                    : TransactionCategory.SWAP_USDC,
                amount: parseFloat(amount.toString()),
                fromAmount: parseFloat(amount.toString()),
                toAmount: parseFloat(result.receivedAmount),
                assetFrom: toAssetType === "USDC" ? "XLM" : "USDC",
                assetTo: toAssetType,
                installation: { connect: { id: installationId } }
            }
        });

        // Return transaction details
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: transaction,
            message: "Swap successful"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get wallet info.
 */
export const getWalletInfo = async (req: Request, res: Response, next: NextFunction) => {
    const installationId = req.query.installationId as string;
    const { userId } = res.locals;

    try {
        // Get wallet info based on installation or user
        const wallet = await getContextWallet(userId, installationId);

        // Get account info from Stellar
        const accountInfo = await stellarService.getAccountInfo(wallet.address);

        // Return account info
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: accountInfo,
            message: "Wallet info retrieved successfully"
        });
    } catch (error) {
        next(error);
    }
};

