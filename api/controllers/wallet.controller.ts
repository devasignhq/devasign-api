import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { STATUS_CODES, decrypt } from "../helper";
import { HorizonApi } from "../models/horizonapi.model";
import { Prisma, TransactionCategory } from "../../prisma_client";
import { usdcAssetId, xlmAssetId } from "../config/stellar.config";
import { stellarService } from "../services/stellar.service";
import { AuthorizationError, ErrorClass, NotFoundError, ValidationError } from "../models/error.model";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

class WalletError extends ErrorClass {
    constructor(message: string, details: unknown = null) {
        super("WALLET_ERROR", details, message);
    }
}

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
                throw new WalletError("No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new WalletError(
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
                throw new WalletError("No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;

            if (availableXLM < Number(amount)) {
                throw new WalletError(
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
                throw new WalletError("No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;

            if (availableXLM < Number(amount)) {
                throw new WalletError(
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
                throw new WalletError("No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new WalletError(
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


/**
 * Get wallet transactions.
 */
export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const {
        categories,
        page = 1,
        limit,
        sort
    } = req.query;
    const installationId = req.query.installationId as string;

    try {
        // Parse categories if provided
        const categoryList = (categories as string)?.split(",") as TransactionCategory[];

        // Get transactions based on installation or user
        if (installationId) {
            // Check if user is part of the installation
            const userInstallation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId
                        }
                    }
                },
                select: { id: true }
            });

            if (!userInstallation) {
                throw new AuthorizationError("User is not part of this installation.");
            }
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { username: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }
        }

        // Pagination defaults
        const take = Math.min(Number(limit) || 20, 50); // max 50 per page

        // Build filter for categories if provided
        const whereClause: Prisma.TransactionWhereInput = installationId ? { installationId } : { userId };
        if (categoryList && categoryList.length > 0) {
            whereClause.category = { in: categoryList };
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { doneAt: (sort as "asc" | "desc") || "desc" },
            skip: ((Number(page) - 1) * take) || 0,
            take,
            include: {
                task: {
                    select: {
                        id: true,
                        issue: true,
                        bounty: true,
                        contributor: { select: { userId: true, username: true } }
                    }
                }
            }
        });

        // Return transactions with pagination info
        res.status(STATUS_CODES.SUCCESS).json({
            transactions,
            hasMore: transactions.length === take
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Record wallet top-up transactions.
 */
export const recordWalletTopups = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const installationId = req.query.installationId as string;

    try {
        let walletAddress: string;
        let escrowAddress = "";

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
                select: {
                    id: true,
                    walletAddress: true,
                    escrowAddress: true
                }
            });

            if (!installation) {
                throw new AuthorizationError("User is not part of this installation.");
            }

            // Set wallet details
            walletAddress = installation.walletAddress;
            escrowAddress = installation.escrowAddress;
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { username: true, walletAddress: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }

            // Set wallet details
            walletAddress = user.walletAddress;
        }

        // Get stellar topup transactions
        const stellarTopups = await stellarService.getTopUpTransactions(walletAddress);

        if (stellarTopups.length === 0) {
            // No topup transactions found
            return res.status(STATUS_CODES.SUCCESS).json({
                message: "No new topup transactions found",
                processed: 0
            });
        }

        // Get the last recorded topup transaction for comparison
        const lastRecordedTopup = await prisma.transaction.findFirst({
            where: {
                category: "TOP_UP",
                ...(installationId ? { installationId } : { userId })
            },
            orderBy: {
                doneAt: "desc"
            }
        });

        // Find the most recent stellar transaction hash for comparison
        const mostRecentStellarTxHash = stellarTopups[0]?.transaction_hash;

        // If last recorded topup matches the most recent stellar topup, no new transactions
        if (lastRecordedTopup && lastRecordedTopup.txHash === mostRecentStellarTxHash) {
            return res.status(STATUS_CODES.SUCCESS).json({
                message: "No new topup transactions found",
                processed: 0
            });
        }

        // Process stellar topup transactions until we find a match with existing records
        const newTransactions: Prisma.TransactionCreateInput[] = [];
        let processed = 0;

        for (const stellarTx of stellarTopups) {
            // Stop if we've reached a transaction we've already recorded
            if (lastRecordedTopup && stellarTx.transaction_hash === lastRecordedTopup.txHash) {
                break;
            }

            const paymentTx = stellarTx as (HorizonApi.PaymentOperationResponse | HorizonApi.PathPaymentOperationResponse);
            const amount = parseFloat(paymentTx.amount);
            const asset = paymentTx.asset_type === "native" ? "XLM" : paymentTx.asset_code!;
            // Determine source address, label 'Escrow Refunds' if payment is from escrow walet address
            const sourceAddress = installationId
                ? escrowAddress === paymentTx.from
                    ? "Escrow Refunds"
                    : paymentTx.from
                : paymentTx.from;

            // Create transaction data
            const transactionData = {
                txHash: stellarTx.transaction_hash,
                category: TransactionCategory.TOP_UP,
                amount,
                asset,
                sourceAddress,
                doneAt: new Date(stellarTx.created_at),
                ...(installationId 
                    ? { installation: { connect: { id: installationId } } }
                    : { user: { connect: { userId } } }
                )
            };

            // Add to new transactions list
            newTransactions.push(transactionData);
            processed++;
        }

        // Create transactions individually to support relations
        if (newTransactions.length > 0) {
            await prisma.$transaction(
                newTransactions.map(transactionData =>
                    prisma.transaction.create({
                        data: transactionData
                    })
                )
            );
        }

        // Return details of recorded transactions
        res.status(STATUS_CODES.SUCCESS).json({
            message: `Successfully processed ${processed} topup transactions`,
            processed,
            transactions: newTransactions.map(tx => ({
                txHash: tx.txHash,
                amount: tx.amount,
                asset: tx.asset,
                sourceAddress: tx.sourceAddress,
                doneAt: tx.doneAt
            }))
        });
    } catch (error) {
        next(error);
    }
};
