import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { stellarService, usdcAssetId, xlmAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { ErrorClass, NotFoundErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";
import { TransactionCategory } from "../generated/client";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

export const withdrawCrypto = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, walletAddress, assetType = "USDC", amount } = req.body;

    try {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ErrorClass("ValidationError", null, "Invalid amount specified");
        }

        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletSecret: true, walletAddress: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        // Check balance before withdrawal
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
        
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

        const decryptedUserSecret = decrypt(user.walletSecret);

        await stellarService.transferAsset(
            decryptedUserSecret,
            walletAddress,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            assetType === "USDC" ? usdcAssetId : xlmAssetId,
            amount
        );
        
        const updatedAccountInfo = await stellarService.getAccountInfo(user.walletAddress);

        res.status(200).json(updatedAccountInfo);
    } catch (error) {
        next(error);
    }
};

export const swapCrypto = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, toAssetType = "USDC", amount } = req.body;

    try {
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            throw new ErrorClass("ValidationError", null, "Invalid amount specified");
        }
        
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletSecret: true, walletAddress: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        // Check balance before swap
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
        
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

        const decryptedUserSecret = decrypt(user.walletSecret);

        if (toAssetType === "USDC") {
            await stellarService.swapAsset(decryptedUserSecret, amount);
        } else {
            await stellarService.swapAsset(
                decryptedUserSecret,
                amount,
                usdcAssetId,
                xlmAssetId
            );
        }
        
        const updatedAccountInfo = await stellarService.getAccountInfo(user.walletAddress);

        res.status(200).json(updatedAccountInfo);
    } catch (error) {
        next(error);
    }
};

export const getWalletInfo = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletAddress: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }
        
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);

        res.status(200).json(accountInfo);
    } catch (error) {
        next(error);
    }
};

export const getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    const { projectId } = req.params;
    const { userId, categories, skip = 0, limit } = req.body;

    try {
        // Validate categories if provided
        if (categories && Array.isArray(categories)) {
            const validCategories = Object.values(TransactionCategory);
            const invalid = categories.filter((cat: TransactionCategory) => !validCategories.includes(cat));
            if (invalid.length > 0) {
                throw new ErrorClass("ValidationError", null, `Invalid categories: ${invalid.join(", ")}`);
            }
        }

        // Check if user is part of the project
        const userProject = await prisma.project.findFirst({
            where: {
                id: projectId,
                users: {
                    some: {
                        userId: userId
                    }
                }
            }
        });

        if (!userProject) {
            throw new ErrorClass("TransactionError", null, "User is not part of this project.");
        }

        // Pagination defaults
        const take = Math.min(Number(limit) || 20, 50); // max 50 per page

        // Build filter for categories if provided
        const whereClause: any = { projectId };
        if (categories && Array.isArray(categories) && categories.length > 0) {
            whereClause.category = { in: categories };
        }

        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { doneAt: 'desc' },
            skip: Number(skip) || 0,
            take
        });

        res.status(200).json({
            transactions,
            hasMore: transactions.length < take,
            nextSkip: (Number(skip) || 0) + transactions.length
        });
    } catch (error) {
        next(error);
    }
}