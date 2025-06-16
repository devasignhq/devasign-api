import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { checkGithubUser, sendInvitation } from "../services/githubService";
import { ErrorClass, NotFoundErrorClass } from "../types/general";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt, encrypt } from "../helper";

export const getInstallations = async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit = 10} = req.query;
    const { userId } = req.body;

    try {
        if (Number(limit) > 100) {
            throw new ErrorClass("ValidationError", null, "Maximum limit is 100");
        }
        if (Number(page) < 1) {
            throw new ErrorClass("ValidationError", null, "Page must be greater than 0");
        }

        // Build where clause based on filters
        const where: any = {
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
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });

        res.status(200).json({
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

export const getInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const installation = await prisma.installation.findUnique({
            where: { 
                id,
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
                        createdAt: 'desc'
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
            throw new NotFoundErrorClass("Installation not found");
        }
        
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to view this installation");
        }

        // Calculate installation stats
        const stats = {
            totalBounty: installation.tasks.reduce((sum, task) => sum + task.bounty, 0),
            openTasks: installation.tasks.filter(task => task.status === 'OPEN').length,
            completedTasks: installation.tasks.filter(task => task.status === 'COMPLETED').length,
            totalTasks: installation.tasks.length,
            totalMembers: installation.users.length
        };

        res.status(200).json({
            ...installation,
            stats
        });
    } catch (error) {
        next(error);
    }
};

export const createInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        userId, 
        installationId,
        htmlUrl,
        targetId,
        targetType,
        account, 
    } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },            
            select: { walletSecret: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const existingInstallation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { id: true }
        });

        if (existingInstallation) {
            throw new ErrorClass("ValidationError", null, "Installation already exists");
        }

        const decryptedUserSecret = decrypt(user.walletSecret);
        const installationWallet = await stellarService.createWalletViaSponsor(decryptedUserSecret);
        const escrowWallet = await stellarService.createWalletViaSponsor(decryptedUserSecret);
        const encryptedInstallationSecret = encrypt(installationWallet.secretKey);
        const encryptedEscrowSecret = encrypt(escrowWallet.secretKey); 
        
        const installation = await prisma.installation.create({
            data: {
                id: installationId,
                htmlUrl,
                targetId,
                targetType,
                account,
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
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                installationWallet.secretKey
            );
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                escrowWallet.secretKey
            );
            
            res.status(201).json(installation);
        } catch (error: any) {
            // Return installation data even if adding USDC trustline fails
            next({ 
                error, 
                installation, 
                message: "Installation successfully created. Failed to add USDC trustlines."
            });
        }
    } catch (error) {
        next(error);
    }
};

export const updateInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { id: installationId } = req.params;
    const { 
        userId,
        htmlUrl,
        targetId,
        account, 
    } = req.body;

    try {
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { 
                users: { select: { userId: true } }
            }
        });
        
        if (!installation) {
            throw new NotFoundErrorClass("Installation not found");
        }

        // Check authorization
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to update this installation");
        }

        const updatedInstallation = await prisma.installation.update({
            where: { id: installationId },
            data: { 
                ...(htmlUrl && { htmlUrl }),
                ...(targetId && { targetId }),
                ...(account && { account }),
            },
            select: {
                htmlUrl: true,
                targetId: true,
                account: true,
                updatedAt: true,
            }
        });
        res.status(200).json(updatedInstallation);
    } catch (error) {
        next(error);
    }
};

export const deleteInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {

        const installation = await prisma.installation.findUnique({
            where: { id },
            select: { 
                escrowAddress: true,
                escrowSecret: true,
                users: { select: { userId: true, walletSecret: true } },
                tasks: {
                    select: {
                        status: true,
                        bounty: true,
                        creator: { select: { userId: true, walletAddress: true } },
                    }
                }
            }
        });
        
        if (!installation) {
            throw new NotFoundErrorClass("Installation not found");
        }
        
        // Check authorization
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to delete this installation");
        }

        // Check if there are active tasks
        if (!installation.tasks.every(task => task.status !== 'OPEN')) {
            throw new ErrorClass(
                "InstallationError",
                null,
                "Cannot delete installation with active or completed tasks"
            )
        }

        // Refund escrow funds
        const user = installation.users.find(user => user.userId === userId)!;
        const decryptedUserSecret = decrypt(user.walletSecret);
        const decryptedEscrowecret = decrypt(installation.escrowSecret!);
        let refunded = 0;

        installation.tasks.forEach(async (task) => {
            await stellarService.transferAssetViaSponsor(
                decryptedUserSecret,
                decryptedEscrowecret,
                task.creator.walletAddress,
                usdcAssetId,
                usdcAssetId,
                task.bounty.toString(),
            );
            refunded += task.bounty;
        });

        await prisma.installation.delete({
            where: { id }
        });

        res.status(200).json({ 
            message: "Installation deleted successfully", 
            refunded: `${refunded} USDC` 
        });
    } catch (error) {
        next(error);
    }
};

export const addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { id: installationId } = req.params;
    const { userId, username, email, permissionCodes } = req.body;

    try {
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { 
                id: true,
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found");
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
            const githubUserExists = await checkGithubUser(username);            
            if (githubUserExists) {
                // Send invitation
                await sendInvitation(username, email);
                result = { username, status: "invited" };
            }

            result = { username, status: "not_found" };
        }

        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
};

export const updateTeamMemberPermissions = async (req: Request, res: Response, next: NextFunction) => {
    const { id: installationId, userId: memberId } = req.params;
    const { userId, permissionCodes } = req.body;

    try {
        // Check if installation exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });
        if (!installation) {
            throw new NotFoundErrorClass("Installation not found");
        }
        
        // TODO: check if user/actor has permission
        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to update permissions for this installation");
        }

        // Update UserInstallationPermission
        await prisma.userInstallationPermission.update({
            where: { 
                userId_installationId: {
                    userId: memberId,
                    installationId: installationId
                }
            },
            data: {
                permissionCodes: permissionCodes,
                assignedBy: userId,
                permissions: {
                    set: (permissionCodes as string[]).map(code => ({ code }))
                }
            }
        });
        res.status(200).json({ message: "Permissions updated successfully" });
    } catch (error) {
        next(error);
    }
};

export const removeTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { id: installationId, userId: memberId } = req.params;
    const { userId } = req.body;

    try {
        // Check if installation exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });
        if (!installation) {
            throw new NotFoundErrorClass("Installation not found");
        }

        // TODO: check if user/actor has permission
        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to remove members from this installation");
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

        // Delete UserInstallationPermission
        await prisma.userInstallationPermission.delete({
            where: { 
                userId_installationId: {
                    userId: memberId,
                    installationId: installationId
                }
            },
        });

        res.status(200).json({ message: "Team member removed successfully" });
    } catch (error) {
        next(error);
    }
};