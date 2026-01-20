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
import { InstallationStatus, Task } from "../../../prisma_client";
import { TaskIssue } from "../../models/task.model";

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

    try {
        // Get installation and verify it exists and user has access
        const installation = await prisma.installation.findUnique({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            },
            include: {
                wallet: true,
                tasks: {
                    where: {
                        status: {
                            in: ["OPEN", "IN_PROGRESS"]
                        },
                        bounty: { gt: 0 }
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

        // Refund escrow funds from smart contract for open and in-progress tasks
        let refundedAmount = 0;
        const taskRefunds: { task: Task; refunded: boolean }[] = [];

        if (installation.wallet && installation.tasks.length > 0) {
            try {
                const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);

                for (const task of installation.tasks) {
                    if (task.bounty > 0) {
                        try {
                            await ContractService.refund(decryptedWalletSecret, task.id);
                            refundedAmount += task.bounty;
                            taskRefunds.push({ task, refunded: true });
                        } catch (error) {
                            dataLogger.warn(`Failed to refund task ${task.id}:`, { error });
                            taskRefunds.push({ task, refunded: false });
                        }
                    }
                }
            } catch (error) {
                dataLogger.error("Failed to decrypt wallet for refund during installation archive", { error });
            }
        }

        // Update installation status to ARCHIVED
        await prisma.installation.update({
            where: { id: installationId },
            data: { status: "ARCHIVED" }
        });

        // Return success confirmation
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { installationId, refundedAmount: `${refundedAmount} USDC` },
            message: `Installation archived and ${refundedAmount} USDC refunded`
        });

        // Perform cleanup for each task (labels, comments, and task status)
        for (const taskRefund of taskRefunds) {
            // Remove bounty label and delete bounty comment
            const taskIssue = taskRefund.task.issue as unknown as TaskIssue;
            OctokitService.removeBountyLabelAndDeleteBountyComment(
                installationId,
                taskIssue.id,
                taskIssue.bountyCommentId!,
                taskIssue.bountyLabelId!
            ).catch((error) => {
                dataLogger.warn(
                    `Failed to remove bounty label and delete bounty comment for task ${taskRefund.task.id} during installation archive:`,
                    { error }
                );
            });

            // Update task status and settled state
            prisma.task.update({
                where: { id: taskRefund.task.id },
                data: {
                    status: "ARCHIVED",
                    settled: taskRefund.refunded
                }
            }).catch((error) => {
                dataLogger.warn(
                    `Failed to update task ${taskRefund.task.id} status to ARCHIVED during installation archive:`,
                    { error }
                );
            });
        }
    } catch (error) {
        next(error);
    }
};
