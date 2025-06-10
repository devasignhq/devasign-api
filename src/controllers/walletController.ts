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
        projectId, 
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

        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!project) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Project does not exist or user is not part of this project."
                );
            }

            walletAddress = project.walletAddress;
            walletSecret = decrypt(project.walletSecret);
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
            destinationAddress,
            ...(projectId 
                    ? { project: { connect: { id: projectId } } }
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
        projectId,
        toAssetType = "USDC", 
        amount 
    } = req.body;

    try {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ErrorClass("ValidationError", null, "Invalid amount specified");
        }

        let walletAddress = "";
        let walletSecret = "";

        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            if (!project) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Project does not exist or user is not part of this project."
                );
            }

            walletAddress = project.walletAddress;
            walletSecret = decrypt(project.walletSecret);
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
            category: TransactionCategory.WITHDRAWAL,
            amount: parseFloat(amount.toString()),
            assetFrom: toAssetType === "USDC" ? "XLM" : "USDC",
            assetTo: toAssetType,
            ...(projectId 
                    ? { project: { connect: { id: projectId } } }
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
    const { userId, projectId } = req.body;

    try {
        let walletAddress = "";

        if (projectId) {
            const project = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { walletAddress: true }
            });

            if (!project) {
                throw new ErrorClass(
                    "TransactionError", 
                    null, 
                    "Project does not exist or user is not part of this project."
                );
            }

            walletAddress = project.walletAddress;
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
    const { userId, projectId } = req.body;
    const { categories, page = 1, limit, sort } = req.query;

    try {
        const categoryList = (categories as string)?.split(",") as TransactionCategory[];

        if (projectId) {
            // Check if user is part of the project
            const userProject = await prisma.project.findFirst({
                where: {
                    id: projectId,
                    users: {
                        some: {
                            userId: userId
                        }
                    }
                },
                select: { id: true }
            });

            if (!userProject) {
                throw new ErrorClass("TransactionError", null, "User is not part of this project.");
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
        const whereClause: any = projectId ? { projectId } : { userId };
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