import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { STATUS_CODES } from "../../utilities/data";
import { HorizonApi } from "../../models/horizonapi.model";
import { Prisma, TransactionCategory } from "../../../prisma_client";
import { stellarService } from "../../services/stellar.service";
import { AuthorizationError, NotFoundError } from "../../models/error.model";

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
                select: { id: true, walletAddress: true }
            });

            if (!installation) {
                throw new AuthorizationError("User is not part of this installation.");
            }

            // Set wallet details
            walletAddress = installation.walletAddress;
        } else {
            // Fetch user and verify user exists
            const user = await prisma.user.findUnique({
                where: { userId },
                select: { username: true, wallet: true }
            });

            if (!user) {
                throw new NotFoundError("User not found");
            }

            // Set wallet details
            walletAddress = user.wallet!.address!;
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

            // Create transaction data
            const transactionData = {
                txHash: stellarTx.transaction_hash,
                category: TransactionCategory.TOP_UP,
                amount,
                asset,
                sourceAddress: paymentTx.from,
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
