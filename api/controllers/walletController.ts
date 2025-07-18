import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { stellarService, usdcAssetId, xlmAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { ErrorClass, NotFoundErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";
import { TransactionCategory } from "../generated/client";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

export const withdrawAsset = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        userId,
        installationId, 
        walletAddress: destinationAddress, 
        assetType = "XLM", 
        amount 
    } = req.body;

    try {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ErrorClass("ValidationError", null, "Invalid amount specified");
        }

        let walletAddress = "";
        let walletSecret = "";

        if (installationId) {
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!installation) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Installation does not exist or user is not part of this installation."
                );
            }

            walletAddress = installation.walletAddress;
            walletSecret = decrypt(installation.walletSecret);
        } else {
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!user) {
                throw new NotFoundErrorClass("User not found");
            }

            walletAddress = user.walletAddress;
            walletSecret = decrypt(user.walletSecret);
        }

        // Check balance before withdrawal
        const accountInfo = await stellarService.getAccountInfo(walletAddress);
        
        if (assetType === "USDC") {
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => 'asset_code' in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset) {
                throw new ErrorClass("ValidationError", null, "No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new ErrorClass(
                    "InsufficientFundsError", 
                    { available: usdcAsset.balance }, 
                    "Insufficient USDC balance"
                );
            }
        } else {
            // XLM balance check
            const xlmBalance = accountInfo.balances.find(balance => 'asset_type' in balance && balance.asset_type === 'native');
            
            if (!xlmBalance) {
                throw new ErrorClass("ValidationError", null, "No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;
            
            if (availableXLM < Number(amount)) {
                throw new ErrorClass(
                    "InsufficientFundsError", 
                    { available: availableXLM.toString() }, 
                    "Insufficient XLM balance (1 XLM reserve required)"
                );
            }
        }

        const { txHash } = await stellarService.transferAsset(
            walletSecret,
            destinationAddress,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            amount
        );

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

        res.status(200).json(withdrawal);
    } catch (error) {
        next(error);
    }
};

export const swapAsset = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        userId, 
        installationId,
        toAssetType = "USDC", 
        amount,
        equivalentAmount 
    } = req.body;

    try {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ErrorClass("ValidationError", null, "Invalid amount specified");
        }

        let walletAddress = "";
        let walletSecret = "";

        if (installationId) {
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!installation) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Installation does not exist or user is not part of this installation."
                );
            }

            walletAddress = installation.walletAddress;
            walletSecret = decrypt(installation.walletSecret);
        } else {
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!user) {
                throw new NotFoundErrorClass("User not found");
            }

            walletAddress = user.walletAddress;
            walletSecret = decrypt(user.walletSecret);
        }

        // Check balance before swap
        const accountInfo = await stellarService.getAccountInfo(walletAddress);
        
        if (toAssetType === "USDC") {
            // Check XLM balance for swap to USDC
            const xlmBalance = accountInfo.balances.find(balance => 'asset_type' in balance && balance.asset_type === 'native');
            
            if (!xlmBalance) {
                throw new ErrorClass("ValidationError", null, "No XLM balance found");
            }

            // Keep 1 XLM as minimum reserve
            const availableXLM = parseFloat(xlmBalance.balance) - 1;
            
            if (availableXLM < Number(amount)) {
                throw new ErrorClass(
                    "InsufficientFundsError", 
                    { available: availableXLM.toString() }, 
                    "Insufficient XLM balance for swap (1 XLM reserve required)"
                );
            }
        } else {
            // Check USDC balance for swap to XLM
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => 'asset_code' in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset) {
                throw new ErrorClass("ValidationError", null, "No USDC asset found in wallet");
            }

            if (parseFloat(usdcAsset.balance) < Number(amount)) {
                throw new ErrorClass(
                    "InsufficientFundsError", 
                    { available: usdcAsset.balance }, 
                    "Insufficient USDC balance for swap"
                );
            }
        }

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

        const transactionPayload = {
            txHash,
            category: toAssetType === "USDC" ? TransactionCategory.SWAP_XLM : TransactionCategory.SWAP_USDC,
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

        res.status(200).json(swap);
    } catch (error) {
        next(error);
    }
};

export const getWalletInfo = async (req: Request, res: Response, next: NextFunction) => {
    const installationId = req.query.installationId as string;
    const { userId } = req.body;

    try {
        let walletAddress = "";
        if (installationId) {
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletAddress: true }
            });

            if (!installation) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Installation does not exist or user is not part of this installation."
                );
            }

            walletAddress = installation.walletAddress;
        } else {
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { walletAddress: true }
            });

            if (!user) {
                throw new NotFoundErrorClass("User not found");
            }

            walletAddress = user.walletAddress;
        }
        
        const accountInfo = await stellarService.getAccountInfo(walletAddress);

        res.status(200).json(accountInfo);
    } catch (error) {
        next(error);
    }
};

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
        const categoryList = (categories as string)?.split(",") as TransactionCategory[];
        if (installationId) {
            // Check if user is part of the installation
            const userInstallation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { id: true }
            });

            if (!userInstallation) {
                throw new ErrorClass("TransactionError", null, "User is not part of this installation.");
            }
        } else {
            const user = await prisma.user.findUnique({
                where: { userId }, 
                select: { username: true }
            });
            
            if (!user) {
                throw new NotFoundErrorClass("User not found");
            }
        }

        // Pagination defaults
        const take = Math.min(Number(limit) || 20, 50); // max 50 per page

        // Build filter for categories if provided
        const whereClause: any = installationId ? { installationId } : { userId };
        if (categoryList && categoryList.length > 0) {
            whereClause.category = { in: categoryList };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { doneAt: (sort as "asc" | "desc") || 'desc' },
            skip: ((Number(page) - 1) * take) || 0,
            take,
            include: { 
                task: {
                    select: { 
                        id: true, 
                        issue: true, 
                        bounty: true, 
                        contributor: { select: { userId: true, username: true } } 
                    },
                }
            }
        });

        res.status(200).json({
            transactions,
            hasMore: transactions.length === take,
        });
    } catch (error) {
        next(error);
    }
}

export const recordWalletTopups = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const installationId = req.query.installationId as string;

    try {
        let walletAddress: string;

        if (installationId) {
            // Check if user is part of the installation
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { id: true, walletAddress: true }
            });

            if (!installation) {
                throw new ErrorClass("TransactionError", null, "User is not part of this installation.");
            }

            walletAddress = installation.walletAddress;
        } else {
            const user = await prisma.user.findUnique({
                where: { userId }, 
                select: { username: true, walletAddress: true }
            });
            
            if (!user) {
                throw new NotFoundErrorClass("User not found");
            }

            walletAddress = user.walletAddress;
        }

        // Get stellar topup transactions
        const stellarTopups = await stellarService.getTopUpTransactions(walletAddress);

        if (stellarTopups.length === 0) {
            return res.status(200).json({ 
                message: "No new topup transactions found",
                processed: 0 
            });
        }

        // Get the last recorded topup transaction for comparison
        const lastRecordedTopup = await prisma.transaction.findFirst({
            where: {
                category: "TOP_UP",
                ...(installationId ? { installationId } : { userId }),
            },
            orderBy: {
                doneAt: "desc"
            }
        });

        // Find the most recent stellar transaction hash for comparison
        const mostRecentStellarTxHash = stellarTopups[0]?.transaction_hash;

        // If last recorded topup matches the most recent stellar topup, no new transactions
        if (lastRecordedTopup && lastRecordedTopup.txHash === mostRecentStellarTxHash) {
            return res.status(200).json({ 
                message: "No new topup transactions found",
                processed: 0 
            });
        }

        // Process stellar topup transactions until we find a match with existing records
        const newTransactions = [];
        let processed = 0;

        for (const stellarTx of stellarTopups) {
            // Stop if we've reached a transaction we've already recorded
            if (lastRecordedTopup && stellarTx.transaction_hash === lastRecordedTopup.txHash) {
                break;
            }

            // Extract transaction details based on operation type
            let amount: number;
            let asset: string;
            let sourceAddress: string;

            const paymentTx = stellarTx as (HorizonApi.PaymentOperationResponse | HorizonApi.PathPaymentOperationResponse);
            amount = parseFloat(paymentTx.amount);
            asset = paymentTx.asset_type === "native" ? "XLM" : paymentTx.asset_code!;
            sourceAddress = paymentTx.from;

            // Create transaction record
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

            newTransactions.push(transactionData);
            processed++;
        }

        // Bulk insert new transactions
        if (newTransactions.length > 0) {
            await prisma.transaction.createMany({
                data: newTransactions
            });
        }

        res.status(200).json({
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
}