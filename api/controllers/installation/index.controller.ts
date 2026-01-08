import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { stellarService } from "../../services/stellar.service";
import { STATUS_CODES } from "../../utilities/data";
import { OctokitService } from "../../services/octokit.service";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";
import { ContractService } from "../../services/contract.service";
import { dataLogger } from "../../config/logger.config";
import { KMSService } from "../../services/kms.service";

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

        // Check if installation already exists
        const existingInstallation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { id: true }
        });

        if (existingInstallation) {
            throw new ValidationError("Installation already exists");
        }

        // Fetch installation details from GitHub
        const githubInstallation = await OctokitService.getInstallationDetails(
            installationId,
            user.username
        );

        // Create Stellar wallets for installation
        const installationWallet = await stellarService.createWallet();
        const encryptedInstallationSecret = await KMSService.encryptWallet(installationWallet.secretKey);

        // Create installation
        const installation = await prisma.installation.create({
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
                        address: installationWallet.publicKey,
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
            select: {
                id: true,
                htmlUrl: true,
                targetId: true,
                targetType: true,
                account: true,
                wallet: { select: { address: true } },
                subscriptionPackage: true,
                createdAt: true,
                updatedAt: true
            }
        });

        try {
            const masterAccountSecret = process.env.STELLAR_MASTER_SECRET_KEY!;

            // Add USDC trustline for installation wallet
            await stellarService.addTrustLineViaSponsor(
                masterAccountSecret,
                installationWallet.secretKey
            );

            // Return created installation
            res.status(STATUS_CODES.POST).json(installation);
        } catch (error) {
            // If trustline addition fails, return installation but indicate partial success
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                installation,
                message: "Failed to add USDC trustlines."
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
    const { page = 1, limit = 10, sort } = req.query;
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
                }
            },
            select: {
                id: true,
                htmlUrl: true,
                targetId: true,
                targetType: true,
                account: true,
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
        res.status(STATUS_CODES.SUCCESS).json({
            data: results,
            hasMore
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
        res.status(STATUS_CODES.SUCCESS).json({
            ...installation,
            stats
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update an existing installation.
 */
// TODO: Delete this controller and route (use github webhook instead)
export const updateInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const userId = res.locals.userId;
    const {
        htmlUrl,
        targetId,
        account
    } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: {
                users: { select: { userId: true } }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if user is a member of the installation
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to update this installation");
        }

        // Update installation details
        const updatedInstallation = await prisma.installation.update({
            where: { id: installationId },
            data: {
                ...(htmlUrl && { htmlUrl }),
                ...(targetId && { targetId }),
                ...(account && { account })
            },
            select: {
                htmlUrl: true,
                targetId: true,
                account: true,
                updatedAt: true
            }
        });

        // Return updated installation
        res.status(STATUS_CODES.SUCCESS).json(updatedInstallation);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete an installation.
 */
// TODO: restrict when installation has active tasks
export const deleteInstallation = async (req: Request, res: Response, next: NextFunction) => {
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
                tasks: { select: { id: true, status: true, bounty: true } }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if there are active tasks
        const activeStatuses = ["IN_PROGRESS", "MARKED_AS_COMPLETED"];
        const hasActiveWork = installation.tasks.some(task =>
            activeStatuses.includes(task.status)
        );

        if (hasActiveWork) {
            throw new ValidationError(
                "Cannot delete installation: there are tasks currently being worked on or awaiting payment."
            );
        }

        // Refund escrow funds from smart contract for open tasks
        if (!installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }

        const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);
        let refunded = 0;

        for (const task of installation.tasks) {
            if (task.status === "OPEN" && task.bounty > 0) {
                try {
                    await ContractService.refund(decryptedWalletSecret, task.id);
                    refunded += task.bounty;
                } catch (error) {
                    dataLogger.warning(`Failed to refund task ${task.id}:`, error);
                }
            }
        }

        // // 1. Mark as Deleting to prevent new tasks from being created
        // await prisma.installation.update({
        //     where: { id: installationId },
        //     data: { status: "DELETING" }
        // });

        // // 2. Perform refunds
        // const refundResults = await Promise.allSettled(
        //     installation.tasks
        //         .filter(t => t.status === "OPEN" && t.bounty > 0)
        //         .map(t => ContractService.refund(decryptedWalletSecret, t.id))
        // );

        // const failedRefunds = refundResults.filter(r => r.status === 'rejected');

        // if (failedRefunds.length > 0) {
        //     // 3. If any fail, do NOT delete. Keep status as DELETING for manual retry.
        //     throw new Error(`Failed to refund ${failedRefunds.length} tasks. Cleanup required.`);
        // }

        // // 4. Only hard delete if everything is clear
        // await prisma.installation.delete({ where: { id: installationId } });

        // TODO: Update installation status to ARCHIVED instead of deleting
        // Delete installation
        await prisma.installation.delete({
            where: { id: installationId }
        });

        // Return deletion confirmation
        res.status(STATUS_CODES.SUCCESS).json({
            message: "Installation deleted successfully",
            refunded: `${refunded} USDC`
        });
    } catch (error) {
        next(error);
    }
};
