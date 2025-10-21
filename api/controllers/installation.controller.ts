import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { usdcAssetId } from "../config/stellar.config";
import { stellarService } from "../services/stellar.service";
import { STATUS_CODES, decrypt, encrypt } from "../helper";
import { OctokitService } from "../services/octokit.service";
import { Prisma } from "../generated/client";
import {
    AuthorizationError,
    ErrorClass,
    NotFoundError,
    ValidationError
} from "../models/error.model";

class InstallationError extends ErrorClass {
    constructor(message: string, details: unknown = null) {
        super("INSTALLATION_ERROR", details, message);
    }
}

/**
 * Get all installations accessible by the current user.
 */
export const getInstallations = async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10} = req.query;
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
                createdAt: "desc"
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
 * Get details of a specific installation by ID.
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
        const encryptedInstallationSecret = encrypt(installationWallet.secretKey);
        const encryptedEscrowSecret = encrypt(escrowWallet.secretKey); 
        
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
                walletAddress: installationWallet.publicKey,
                walletSecret: encryptedInstallationSecret,
                escrowAddress: escrowWallet.publicKey,
                escrowSecret: encryptedEscrowSecret,
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
                walletSecret: true,
                escrowSecret: true,
                tasks: { select: { status: true, bounty: true } }
            }
        });
        
        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if there are active tasks
        if (!installation.tasks.every(task => task.status !== "OPEN")) {
            throw new InstallationError("Cannot delete installation with active or completed tasks");
        }

        // Refund escrow funds
        const decryptedWalletSecret = decrypt(installation.walletSecret!);
        const decryptedEscrowSecret = decrypt(installation.escrowSecret!);
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

/**
 * Add a user to the installation team.
 */
export const addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { userId, username, permissionCodes } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { 
                id: true,
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if user exists in our system
        const existingUser = await prisma.user.findFirst({
            where: { username },
            select: { userId: true }
        });

        let result: Record<string, unknown> = {};
        if (existingUser) {
            // Check if user is already a member of the installation
            const isAlreadyMember = installation.users.some(user => user.userId === existingUser.userId);
            if (isAlreadyMember) {
                return res.status(400).json({ 
                    message: "User is already a member of this installation",
                    username,
                    status: "already_member"
                });
            }

            // Add user to installation
            await prisma.installation.update({
                where: { id: installationId },
                data: {
                    users: {
                        connect: { userId: existingUser.userId }
                    }
                }
            });

            // Assign permissions to user for this installation
            await prisma.userInstallationPermission.create({
                data: {
                    user: {
                        connect: { userId: existingUser.userId }
                    },
                    installation: {
                        connect: { id: installationId }
                    },
                    permissionCodes,
                    permissions: {
                        connect: (permissionCodes as string[]).map(code => ({ code }))
                    },
                    assignedBy: userId
                }
            });

            result = { username, status: "added" };
        } else {
            // const githubUserExists = await checkGithubUser(username);            
            // if (githubUserExists) {
            //     // Send invitation
            //     await sendInvitation(username, email);
            //     result = { username, status: "invited" };
            // }

            result = { username, status: "not_found" };
        }

        // Return result
        res.status(STATUS_CODES.SUCCESS).json(result);
    } catch (error) {
        next(error);
    }
};

/**
 * Update permissions for a team member.
 */
export const updateTeamMemberPermissions = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, userId: memberId } = req.params;
    const { userId, permissionCodes } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }
        
        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to update permissions for this installation");
        }

        // Update team member permissions
        await prisma.userInstallationPermission.update({
            where: { 
                userId_installationId: {
                    userId: memberId,
                    installationId
                }
            },
            data: {
                permissionCodes,
                assignedBy: userId,
                permissions: {
                    set: (permissionCodes as string[]).map(code => ({ code }))
                }
            }
        });

        // Return success message
        res.status(STATUS_CODES.SUCCESS).json({ 
            message: "Permissions updated successfully" 
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove a user from the installation team.
 */
export const removeTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, userId: memberId } = req.params;
    const { userId } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to remove members from this installation");
        }

        // Remove user from installation
        await prisma.installation.update({
            where: { id: installationId },
            data: {
                users: {
                    disconnect: { userId: memberId }
                }
            }
        });

        // Delete user installation permissions
        await prisma.userInstallationPermission.delete({
            where: { 
                userId_installationId: {
                    userId: memberId,
                    installationId
                }
            }
        });

        // Return success message
        res.status(STATUS_CODES.SUCCESS).json({ 
            message: "Team member removed successfully" 
        });
    } catch (error) {
        next(error);
    }
};
