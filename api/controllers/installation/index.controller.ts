import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { usdcAssetId } from "../../config/stellar.config";
import { stellarService } from "../../services/stellar.service";
import { decryptWallet, encryptWallet } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { OctokitService } from "../../services/octokit.service";
import { Prisma } from "../../../prisma_client";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";

/**
 * Create a new installation.
 */
export const createInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, installationId } = req.body;

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

        // Create Stellar wallets for installation and escrow
        const installationWallet = await stellarService.createWallet();
        const escrowWallet = await stellarService.createWallet();
        const encryptedInstallationSecret = await encryptWallet(installationWallet.secretKey);
        const encryptedEscrowSecret = await encryptWallet(escrowWallet.secretKey);

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
                escrow: {
                    create: {
                        address: escrowWallet.publicKey,
                        ...encryptedEscrowSecret
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
                walletAddress: true,
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
            // Add USDC trustline for installation escrow wallet
            await stellarService.addTrustLineViaSponsor(
                masterAccountSecret,
                escrowWallet.secretKey
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
    const { userId } = req.body;

    try {
        // Build where clause to filter for user installations
        const where: Prisma.InstallationWhereInput = {
            users: {
                some: { userId: userId as string }
            }
        };

        // Get total count for pagination        
        const totalInstallations = await prisma.installation.count({ where });
        const totalPages = Math.ceil(totalInstallations / Number(limit));
        const skip = (Number(page) - 1) * Number(limit);

        // Get installations with pagination
        const installations = await prisma.installation.findMany({
            where,
            select: {
                id: true,
                htmlUrl: true,
                targetId: true,
                targetType: true,
                account: true,
                walletAddress: true,
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
            take: Number(limit)
        });

        // Return paginated response
        res.status(STATUS_CODES.SUCCESS).json({
            data: installations,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalItems: totalInstallations,
                itemsPerPage: Number(limit),
                hasMore: Number(page) < totalPages
            }
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
    const { userId } = req.body;

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
                walletAddress: true,
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
                        username: true,
                        contributionSummary: {
                            select: {
                                tasksCompleted: true,
                                totalEarnings: true
                            }
                        }
                    }
                },
                subscriptionPackage: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if user is a member of the installation
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to view this installation");
        }

        // Calculate installation stats
        const stats = {
            totalBounty: installation.tasks.reduce((sum, task) => sum + task.bounty, 0),
            openTasks: installation.tasks.filter(task => task.status === "OPEN").length,
            completedTasks: installation.tasks.filter(task => task.status === "COMPLETED").length,
            totalTasks: installation.tasks.length,
            totalMembers: installation.users.length
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
export const updateInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const {
        userId,
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
export const deleteInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { userId, walletAddress } = req.body;

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
                escrow: true,
                tasks: { select: { status: true, bounty: true } }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if there are active tasks
        if (!installation.tasks.every(task => task.status !== "OPEN")) {
            throw new ValidationError("Cannot delete installation with active or completed tasks");
        }

        // Refund escrow funds
        const decryptedWalletSecret = await decryptWallet(installation.wallet);
        const decryptedEscrowSecret = await decryptWallet(installation.escrow);
        let refunded = 0;

        installation.tasks.forEach(async (task) => {
            await stellarService.transferAssetViaSponsor(
                decryptedWalletSecret,
                decryptedEscrowSecret,
                walletAddress,
                usdcAssetId,
                usdcAssetId,
                task.bounty.toString()
            );
            refunded += task.bounty;
        });

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
