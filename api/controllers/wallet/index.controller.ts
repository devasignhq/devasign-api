import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { decrypt } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { HorizonApi } from "../../models/horizonapi.model";
import { TransactionCategory } from "../../../prisma_client";
import { usdcAssetId, xlmAssetId } from "../../config/stellar.config";
import { stellarService } from "../../services/stellar.service";
import { NotFoundError, ValidationError } from "../../models/error.model";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

/**
 * Withdraw assets from wallet.
 */
export const withdrawAsset = async (req: Request, res: Response, next: NextFunction) => {
    const {
        userId,
        installationId,
        walletAddress: destinationAddress,
        assetType = "XLM",
        amount
    } = req.body;

    try {
        // Ensure amount is valid
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ValidationError("Invalid amount specified");
        }

        let walletAddress = "";
        let walletSecret = "";

        // Get wallet info based on installation or user
        if (installationId) {
            // Check if user is part of the installation
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!installation) {
                throw new NotFoundError(
                    "Installation does not exist or user is not part of this installation."
                );
            }

            // Set wallet details
            walletAddress = installation.walletAddress;
            walletSecret = decrypt(installation.walletSecret);
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }

            // Set wallet details
            walletAddress = user.walletAddress;
            walletSecret = decrypt(user.walletSecret);
        }

        // Check balance before withdrawal
        const accountInfo = await stellarService.getAccountInfo(walletAddress);

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
            // XLM balance check
            const xlmBalance = accountInfo.balances.find(
                balance => "asset_type" in balance && balance.asset_type === "native"
            );

            if (!xlmBalance) {
                throw new ValidationError("No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;

            if (availableXLM < Number(amount)) {
                throw new ValidationError(
                    "Insufficient XLM balance (1 XLM reserve required)",
                    { available: availableXLM.toString() }
                );
            }
        }

        // Perform transfer
        const { txHash } = await stellarService.transferAsset(
            walletSecret,
            destinationAddress,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            amount
        );

        // Record transaction
        const transactionPayload = {
            txHash,
            category: TransactionCategory.WITHDRAWAL,
            amount: parseFloat(amount.toString()),
            asset: "XLM",
            destinationAddress,
            ...(installationId
                ? { installation: { connect: { id: installationId } } }
                : { user: { connect: { userId } } }
            )
        };

        const withdrawal = await prisma.transaction.create({ data: transactionPayload });

        // Return transaction details
        res.status(STATUS_CODES.SUCCESS).json(withdrawal);
    } catch (error) {
        next(error);
    }
};

/**
 * Swap assets in wallet.
 */
export const swapAsset = async (req: Request, res: Response, next: NextFunction) => {
    const {
        userId,
        installationId,
        toAssetType = "USDC",
        amount,
        equivalentAmount
    } = req.body;

    try {
        // Ensure amount is valid
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ValidationError("Invalid amount specified");
        }

        let walletAddress = "";
        let walletSecret = "";

        // Get wallet info based on installation or user
        if (installationId) {
            // Check if user is part of the installation
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!installation) {
                throw new NotFoundError(
                    "Installation does not exist or user is not part of this installation."
                );
            }

            // Set wallet details
            walletAddress = installation.walletAddress;
            walletSecret = decrypt(installation.walletSecret);
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }

            // Set wallet details
            walletAddress = user.walletAddress;
            walletSecret = decrypt(user.walletSecret);
        }

        // Check balance before swap
        const accountInfo = await stellarService.getAccountInfo(walletAddress);

        if (toAssetType === "USDC") {
            // Check XLM balance for swap to USDC
            const xlmBalance = accountInfo.balances.find(
                balance => "asset_type" in balance && balance.asset_type === "native"
            );

            if (!xlmBalance) {
                throw new ValidationError("No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;

            if (availableXLM < Number(amount)) {
                throw new ValidationError(
                    "Insufficient XLM balance for swap (1 XLM reserve required)",
                    { available: availableXLM.toString() }
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
        let txHash = "";
        if (toAssetType === "USDC") {
            const result = await stellarService.swapAsset(walletSecret, amount);
            txHash = result.txHash;
        } else {
            const result = await stellarService.swapAsset(
                walletSecret,
                amount,
                usdcAssetId,
                xlmAssetId
            );
            txHash = result.txHash;
        }

        // Record transaction
        const transactionPayload = {
            txHash,
            category: toAssetType === "USDC" 
                ? TransactionCategory.SWAP_XLM 
                : TransactionCategory.SWAP_USDC,
            amount: parseFloat(amount.toString()),
            fromAmount: parseFloat(amount.toString()),
            toAmount: parseFloat(equivalentAmount.toString()),
            assetFrom: toAssetType === "USDC" ? "XLM" : "USDC",
            assetTo: toAssetType,
            ...(installationId
                ? { installation: { connect: { id: installationId } } }
                : { user: { connect: { userId } } }
            )
        };

        const swap = await prisma.transaction.create({ data: transactionPayload });

        // Return transaction details
        res.status(STATUS_CODES.SUCCESS).json(swap);
    } catch (error) {
        next(error);
    }
};

/**
 * Get wallet info.
 */
export const getWalletInfo = async (req: Request, res: Response, next: NextFunction) => {
    const installationId = req.query.installationId as string;
    const { userId } = req.body;

    try {
        let walletAddress = "";

        // Get wallet info based on installation or user
        if (installationId) {
            // Check if user is part of the installation
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId
                        }
                    }
                },
                select: { walletAddress: true }
            });

            if (!installation) {
                throw new NotFoundError(
                    "Installation does not exist or user is not part of this installation."
                );
            }

            // Set wallet details
            walletAddress = installation.walletAddress;
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletAddress: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }

            // Set wallet details
            walletAddress = user.walletAddress;
        }

        // Get account info from Stellar
        const accountInfo = await stellarService.getAccountInfo(walletAddress);

        // Return account info
        res.status(STATUS_CODES.SUCCESS).json(accountInfo);
    } catch (error) {
        next(error);
    }
};
