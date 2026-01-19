import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { stellarService } from "../../services/stellar.service";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { OctokitService } from "../../services/octokit.service";
import { NotFoundError, ValidationError } from "../../models/error.model";
import { ContractService } from "../../services/contract.service";
import { dataLogger } from "../../config/logger.config";
import { KMSService } from "../../services/kms.service";
import { InstallationStatus } from "../../../prisma_client";

/**
 * Create a new installation.
 */
export const createInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.body;
    const userId = res.locals.userId;

    try {
        // Verify user exists
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { username: true }
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // Fetch installation details from GitHub
        const githubInstallation = await OctokitService.getInstallationDetails(
            installationId,
            user.username
        );

        // Check if there's an existing installation with the same account GitHub details
        const existingAccountInstallation = await prisma.installation.findFirst({
            where: {
                targetId: githubInstallation.target_id,
                targetType: githubInstallation.target_type
            },
            include: { wallet: true }
        });

        let installation;
        let installationWalletSecret: string;
        let isNewWallet = false;

        const select = {
            id: true,
            htmlUrl: true,
            targetId: true,
            targetType: true,
            account: true,
            status: true,
            wallet: { select: { address: true } },
            subscriptionPackage: true,
            createdAt: true,
            updatedAt: true
        };

        if (existingAccountInstallation) {
            if (existingAccountInstallation.status === "ACTIVE") {
                throw new ValidationError("Installation already exists");
            }

            // Verify if the new installationId is already taken by a different record
            if (existingAccountInstallation.id !== installationId) {
                const idConflict = await prisma.installation.findUnique({
                    where: { id: installationId }
                });
                if (idConflict) {
                    throw new ValidationError("Installation ID already exists");
                }
            }

            // Prepare wallet updates
            let walletUpdate;
            if (existingAccountInstallation.wallet) {
                installationWalletSecret = await KMSService.decryptWallet(existingAccountInstallation.wallet);
            } else {
                const newWallet = await stellarService.createWallet();
                installationWalletSecret = newWallet.secretKey;
                const encryptedInstallationSecret = await KMSService.encryptWallet(newWallet.secretKey);
                walletUpdate = {
                    create: {
                        address: newWallet.publicKey,
                        ...encryptedInstallationSecret
                    }
                };
                isNewWallet = true; // Mark as new to add trustline later
            }

            // Activate and update installation
            installation = await prisma.installation.update({
                where: { id: existingAccountInstallation.id },
                data: {
                    id: installationId,
                    status: "ACTIVE",
                    htmlUrl: githubInstallation.html_url,
                    targetId: githubInstallation.target_id,
                    targetType: githubInstallation.target_type,
                    account: {
                        login: "login" in githubInstallation.account!
                            ? githubInstallation.account!.login
                            : githubInstallation.account!.name,
                        nodeId: githubInstallation.account!.node_id,
                        avatarUrl: githubInstallation.account!.avatar_url,
                        htmlUrl: githubInstallation.account!.html_url
                    },
                    wallet: walletUpdate,
                    users: {
                        connect: { userId }
                    }
                },
                select
            });
        } else {
            // Check if installation ID already exists (standard check)
            const idCheck = await prisma.installation.findUnique({
                where: { id: installationId }
            });

            if (idCheck) {
                throw new ValidationError("Installation already exists");
            }

            // Create Stellar wallets for installation
            const newWallet = await stellarService.createWallet();
            installationWalletSecret = newWallet.secretKey;
            const encryptedInstallationSecret = await KMSService.encryptWallet(newWallet.secretKey);
            isNewWallet = true;

            // Create installation
            installation = await prisma.installation.create({
                data: {
                    id: installationId,
                    htmlUrl: githubInstallation.html_url,
                    targetId: githubInstallation.target_id,
                    targetType: githubInstallation.target_type,
                    account: {
                        login: "login" in githubInstallation.account!
                            ? githubInstallation.account!.login
                            : githubInstallation.account!.name,
                        nodeId: githubInstallation.account!.node_id,
                        avatarUrl: githubInstallation.account!.avatar_url,
                        htmlUrl: githubInstallation.account!.html_url
                    },
                    wallet: {
                        create: {
                            address: newWallet.publicKey,
                            ...encryptedInstallationSecret
                        }
                    },
                    users: {
                        connect: { userId }
                    },
                    subscriptionPackage: {
                        connect: { id: process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID! }
                    }
                },
                select
            });
        }

        try {
            // Add USDC trustline only if it's a new wallet
            if (isNewWallet) {
                const masterAccountSecret = process.env.STELLAR_MASTER_SECRET_KEY!;

                await stellarService.addTrustLineViaSponsor(
                    masterAccountSecret,
                    installationWalletSecret
                );
            }

            // Return created/updated installation
            responseWrapper({
                res,
                status: STATUS_CODES.CREATED,
                data: installation,
                message: existingAccountInstallation
                    ? "Installation reactivated successfully"
                    : "Installation created successfully"
            });
        } catch (error) {
            dataLogger.error("Failed to add USDC trustline to wallet", { installationId, error });
            // If trustline addition fails, return installation but indicate partial success
            responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                data: installation,
                message: existingAccountInstallation
                    ? "Installation reactivated successfully"
                    : "Installation created successfully",
                warning: "Failed to add USDC trustline to wallet"
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get all installations accessible by the current user.
 */
export const getInstallations = async (req: Request, res: Response, next: NextFunction) => {
    const {
        page = 1,
        limit = 10,
        sort,
        status
    } = req.query;
    const userId = res.locals.userId;

    try {
        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);
        const skip = (Number(page) - 1) * Number(limit);

        // Get installations with pagination
        const installations = await prisma.installation.findMany({
            where: {
                users: {
                    some: { userId: userId as string }
                },
                ...(status && { status: status as InstallationStatus })
            },
            select: {
                id: true,
                htmlUrl: true,
                targetId: true,
                targetType: true,
                account: true,
                status: true,
                wallet: { select: { address: true } },
                subscriptionPackage: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        tasks: true,
                        users: true
                    }
                }
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
            },
            skip,
            take: take + 1 // Request one extra record beyond the limit
        });

        // Determine if more results exist and trim the array
        const hasMore = installations.length > take;
        const results = hasMore ? installations.slice(0, take) : installations;

        // Return paginated response
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: results,
            pagination: { hasMore },
            message: "Installations retrieved successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get details of a specific user installation by ID.
 */
export const getInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const userId = res.locals.userId;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            },
            select: {
                id: true,
                htmlUrl: true,
                targetId: true,
                targetType: true,
                account: true,
                status: true,
                wallet: { select: { address: true } },
                tasks: {
                    select: {
                        id: true,
                        issue: true,
                        status: true,
                        bounty: true,
                        creator: {
                            select: {
                                userId: true,
                                username: true
                            }
                        },
                        contributor: {
                            select: {
                                userId: true,
                                username: true
                            }
                        },
                        createdAt: true
                    },
                    orderBy: {
                        createdAt: "desc"
                    }
                },
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
                subscriptionPackage: true,
                _count: {
                    select: {
                        tasks: true,
                        users: true
                    }
                },
                createdAt: true,
                updatedAt: true
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Fetch bounty aggregate
        const totalBounty = await prisma.task.aggregate({
            where: { installationId },
            _sum: { bounty: true }
        });

        // Fetch status counts
        const statusCounts = await prisma.task.groupBy({
            by: ["status"],
            where: { installationId },
            _count: true
        });

        const stats = {
            totalBounty: totalBounty._sum.bounty || 0,
            totalTasks: installation._count.tasks,
            totalMembers: installation._count.users,
            openTasks: statusCounts.find(c => c.status === "OPEN")?._count || 0,
            inProgressTasks: statusCounts.find(c => c.status === "IN_PROGRESS")?._count || 0,
            completedTasks: statusCounts.find(c => c.status === "COMPLETED")?._count || 0
        };

        // Return installation details with stats
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { ...installation, stats },
            message: "Installation details retrieved successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Archive an installation.
 */
export const archiveInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const userId = res.locals.userId;
    const { walletAddress: _ } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            },
            select: {
                wallet: true,
                status: true,
                tasks: {
                    where: { status: "OPEN" },
                    select: {
                        id: true,
                        bounty: true
                    }
                }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }
        // Check if installation is already archived
        if (installation.status === "ARCHIVED") {
            throw new ValidationError("Installation already archived");
        }

        const activeTaskCount = await prisma.task.count({
            where: {
                installationId,
                status: {
                    in: ["IN_PROGRESS", "MARKED_AS_COMPLETED"]
                }
            }
        });

        // Check if there are active tasks
        if (activeTaskCount > 0) {
            throw new ValidationError(
                "Cannot archive installation: there are tasks currently being worked on or awaiting payment."
            );
        }

        // Refund escrow funds from smart contract for open tasks
        if (!installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }

        const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);
        let refunded = 0;

        // TODO: Mark as Deleting to prevent new tasks from being created
        // TODO: Use Redis to handle idempotency of this and other operations

        for (const task of installation.tasks) {
            if (task.bounty > 0) {
                try {
                    await ContractService.refund(decryptedWalletSecret, task.id);
                    refunded += task.bounty;
                } catch (error) {
                    dataLogger.warn(`Failed to refund task ${task.id}:`, { error });
                }
            }
        }

        // Delete installation
        await prisma.installation.update({
            where: { id: installationId },
            data: { status: "ARCHIVED" }
        });

        // Return deletion confirmation
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { refunded: `${refunded} USDC` },
            message: "Installation archived successfully"
        });
    } catch (error) {
        next(error);
    }
};
