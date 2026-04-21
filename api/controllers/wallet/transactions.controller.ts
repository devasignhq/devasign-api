import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config.js";
import { responseWrapper } from "../../utils/helper.js";
import { STATUS_CODES } from "../../utils/data.js";
import { HorizonApi } from "../../models/horizonapi.model.js";
import { Prisma, TransactionCategory } from "../../../prisma_client/index.js";
import { stellarService } from "../../services/stellar.service.js";
import { AuthorizationError, NotFoundError } from "../../models/error.model.js";
import { dataLogger } from "../../config/logger.config.js";

/**
 * Get user transactions.
 */
export const getUserTransactions = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { page = 1, limit, sort } = req.query;

    try {
        // Fetch user and verify user exists
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { username: true }
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { doneAt: (sort as "asc" | "desc") || "desc" },
            skip: ((Number(page) - 1) * take) || 0,
            take: take + 1, // Request one extra record beyond the limit
            include: {
                task: {
                    select: {
                        id: true,
                        issue: true,
                        bounty: true
                    }
                }
            }
        });

        // Determine if more results exist and trim the array
        const hasMore = transactions.length > take;
        const results = hasMore ? transactions.slice(0, take) : transactions;

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: results,
            pagination: { hasMore }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get installation transactions.
 */
export const getInstallationTransactions = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const {
        categories,
        page = 1,
        limit,
        sort
    } = req.query;
    const { installationId } = req.params;

    try {
        // Parse categories if provided
        const categoryList = (categories as string)?.split(",") as TransactionCategory[];

        // Check if user is part of the installation
        const userInstallation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: { some: { userId } }
            },
            select: { id: true }
        });

        if (!userInstallation) {
            throw new AuthorizationError("User is not part of this installation.");
        }

        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);

        // Build filter for categories
        const whereClause: Prisma.TransactionWhereInput = { installationId };
        if (categoryList && categoryList.length > 0) {
            whereClause.category = { in: categoryList };
        }

        // Fetch transactions
        const transactions = await prisma.transaction.findMany({
            where: whereClause,
            orderBy: { doneAt: (sort as "asc" | "desc") || "desc" },
            skip: ((Number(page) - 1) * take) || 0,
            take: take + 1, // Request one extra record beyond the limit
            include: {
                task: {
                    select: {
                        id: true,
                        issue: true,
                        bounty: true,
                        contributor: {
                            select: {
                                userId: true,
                                username: true
                            }
                        }
                    }
                }
            }
        });

        // Determine if more results exist and trim the array
        const hasMore = transactions.length > take;
        const results = hasMore ? transactions.slice(0, take) : transactions;

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: results,
            pagination: { hasMore }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Record wallet top-up transactions.
 */
export const recordWalletTopups = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const installationId = req.query.installationId as string;

    try {
        let walletAddress: string;

        // Get wallet info based on installation or user
        if (installationId) {
            // Check if user is part of the installation
            const installation = await prisma.installation.findFirst({
                where: {
                    id: installationId,
                    users: { some: { userId } }
                },
                select: {
                    id: true,
                    wallet: { select: { address: true } }
                }
            });

            if (!installation) {
                throw new AuthorizationError("User is not part of this installation.");
            }

            // Set wallet details
            if (!installation.wallet) throw new NotFoundError("Installation wallet not found");
            walletAddress = installation.wallet.address;
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
            if (!user.wallet) throw new NotFoundError("User wallet not found");
            walletAddress = user.wallet.address;
        }

        // Get stellar topup transactions
        const stellarTopups = await stellarService.getTopUpTransactions(walletAddress);

        if (stellarTopups.length === 0) {
            // No topup transactions found
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { processed: 0 },
                message: "No new topup transactions found"
            });
        }

        // Collect all incoming tx hashes and check which ones already exist
        const incomingHashes = stellarTopups.map(tx => tx.transaction_hash);
        const existingRecords = await prisma.transaction.findMany({
            where: { txHash: { in: incomingHashes } },
            select: { txHash: true }
        });
        const existingHashes = new Set(existingRecords.map(r => r.txHash));

        // Build list of genuinely new transactions, skipping any already recorded
        const newTransactions: Prisma.TransactionCreateInput[] = [];
        let processed = 0;

        for (const stellarTx of stellarTopups) {
            if (existingHashes.has(stellarTx.transaction_hash)) {
                continue;
            }

            const paymentTx = stellarTx as (HorizonApi.PaymentOperationResponse | HorizonApi.PathPaymentOperationResponse);
            const amount = parseFloat(paymentTx.amount);

            // Filter out dust/spam transactions (amounts less than 0.01)
            if (amount < 0.01) {
                continue;
            }

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

        // Nothing new to record
        if (newTransactions.length === 0) {
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { processed: 0 },
                message: "No new topup transactions found"
            });
        }

        // Create transactions individually to handle potential race conditions on a per-transaction basis
        for (const transactionData of newTransactions) {
            try {
                await prisma.transaction.create({
                    data: transactionData
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                    // This race condition means another request inserted the transaction between our check and our write.
                    // This is not a true error, as the data is now present. We can proceed.
                    dataLogger.info(`Handled P2002 race condition for txHash: ${transactionData.txHash}.`);
                } else {
                    // Re-throw any other errors
                    throw error;
                }
            }
        }

        // Return details of recorded transactions
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {
                processed,
                transactions: newTransactions.map(tx => ({
                    txHash: tx.txHash,
                    amount: tx.amount,
                    asset: tx.asset,
                    sourceAddress: tx.sourceAddress,
                    doneAt: tx.doneAt
                }))
            },
            message: `Successfully processed ${processed} topup transactions`
        });
    } catch (error) {
        next(error);
    }
};
