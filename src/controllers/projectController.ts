import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { 
    checkGithubUser, 
    createBountyLabel, 
    getRepoDetails, 
    getRepoIssues, 
    getRepoLabels, 
    getRepoMilestones, 
    sendInvitation 
} from "../services/githubService";
import { ErrorClass, NotFoundErrorClass } from "../types/general";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt, encrypt } from "../helper";

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        userId,
        searchTerm,
        page = 1,
        limit = 10
    } = req.query;

    try {
        if (Number(limit) > 100) {
            throw new ErrorClass("ValidationError", null, "Maximum limit is 100");
        }
        if (Number(page) < 1) {
            throw new ErrorClass("ValidationError", null, "Page must be greater than 0");
        }

        // Build where clause based on filters
        const where: any = {};
        
        if (userId) {
            where.users = {
                some: { userId: userId as string }
            };
        }

        if (searchTerm) {
            where.OR = [
                { name: { contains: searchTerm as string, mode: 'insensitive' } },
                { description: { contains: searchTerm as string, mode: 'insensitive' } }
            ];
        }

        // Get total count for pagination
        const totalProjects = await prisma.project.count({ where });
        const totalPages = Math.ceil(totalProjects / Number(limit));
        const skip = (Number(page) - 1) * Number(limit);

        // Get projects with pagination
        const projects = await prisma.project.findMany({
            where,
            select: {
                id: true,
                name: true,
                description: true,
                repoUrls: true,
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
            data: projects,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalItems: totalProjects,
                itemsPerPage: Number(limit),
                hasMore: Number(page) < totalPages
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                description: true,
                repoUrls: true,
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

        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }
        
        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to view this project");
        }

        // Calculate project stats
        const stats = {
            totalBounty: project.tasks.reduce((sum, task) => sum + task.bounty, 0),
            openTasks: project.tasks.filter(task => task.status === 'OPEN').length,
            completedTasks: project.tasks.filter(task => task.status === 'COMPLETED').length,
            totalTasks: project.tasks.length,
            totalMembers: project.users.length
        };

        res.status(200).json({
            ...project,
            stats
        });
    } catch (error) {
        next(error);
    }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, name, description } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },            
            select: { walletSecret: true }
        });
        
        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const decryptedUserSecret = decrypt(user.walletSecret);
        const projectWallet = await stellarService.createWalletViaSponsor(decryptedUserSecret);
        const escrowWallet = await stellarService.createWalletViaSponsor(decryptedUserSecret);
        const encryptedEscrowSecret = encrypt(escrowWallet.secretKey);
        const encryptedProjectSecret = encrypt(escrowWallet.secretKey);

        const project = await prisma.project.create({
            data: {
                name: name,
                description: description || "",
                walletAddress: projectWallet.publicKey,
                walletSecret: encryptedProjectSecret,
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
                name: true,
                description: true,
                walletAddress: true,
                subscriptionPackage: true,
                createdAt: true,
                updatedAt: true
            }
        });

        try {
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                projectWallet.secretKey
            );
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                escrowWallet.secretKey
            );
            
            res.status(201).json(project);
        } catch (error: any) {
            // Return project data even if adding USDC trustline fails
            next({ 
                error, 
                project, 
                message: "Project successfully created. Failed to add USDC trustlines."
            });
        }
    } catch (error) {
        next(error);
    }
};

export const connectRepository = async (req: Request, res: Response, next: NextFunction) => {
    const { id: projectId } = req.params;
    const { githubToken, repoUrl, userId } = req.body;

    try {
        // 1. Fetch the project and check if user is a team member
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: {
                repoUrls: true,
                users: { select: { userId: true } }
            }
        });

        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to connect repository to this project");
        }

        // 2. Validate if user is an admin on the repository
        const repoDetails = await getRepoDetails(repoUrl, githubToken);
        if (!repoDetails.permissions || !repoDetails.permissions.admin) {
            throw new ErrorClass("AuthorizationError", null, "User is not an admin on the repository");
        }

        // 3. Add repoUrl to repoUrls array if not already present
        const updatedRepoUrls = Array.from(new Set([...(project.repoUrls || []), repoUrl]));

        await prisma.project.update({
            where: { id: projectId },
            data: { repoUrls: updatedRepoUrls }
        });

        await createBountyLabel(repoUrl, githubToken);

        res.status(200).json({ message: "Repository connected successfully", repoUrls: updatedRepoUrls });
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, name, description } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            select: { 
                users: { select: { userId: true } }
            }
        });
        
        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        // Check authorization
        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to update this project");
        }

        const updatedProject = await prisma.project.update({
            where: { id },
            data: { name, description },
            select: {
                name: true,
                description: true,
                updatedAt: true,
            }
        });
        res.status(200).json(updatedProject);
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {

        const project = await prisma.project.findUnique({
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
        
        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }
        
        // Check authorization
        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to delete this project");
        }

        // Check if there are active tasks
        if (!project.tasks.every(task => task.status !== 'OPEN')) {
            throw new ErrorClass(
                "ProjectError",
                null,
                "Cannot delete project with active or completed tasks"
            )
        }

        // Refund escrow funds
        const user = project.users.find(user => user.userId === userId)!;
        const decryptedUserSecret = decrypt(user.walletSecret);
        const decryptedEscrowecret = decrypt(project.escrowSecret!);
        let refunded = 0;

        project.tasks.forEach(async (task) => {
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

        await prisma.project.delete({
            where: { id }
        });

        res.status(200).json({ 
            message: "Project deleted successfully", 
            refunded: `${refunded} USDC` 
        });
    } catch (error) {
        next(error);
    }
};

export const addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { id: projectId } = req.params;
    const { userId, username, email, permissionCodes } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { 
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
                name: true 
            }
        });

        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        // Check if user exists in our system
        const existingUser = await prisma.user.findFirst({
            where: { username },
            select: { userId: true }
        });

        let result: Record<string, unknown> = {};
        if (existingUser) {
            // Check if user is already a member of the project
            const isAlreadyMember = project.users.some(user => user.userId === existingUser.userId);
            if (isAlreadyMember) {
                return res.status(400).json({ 
                    message: "User is already a member of this project",
                    username,
                    status: "already_member"
                });
            }

            // Add user to project
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    users: {
                        connect: { userId: existingUser.userId }
                    }
                }
            });

            await prisma.userProjectPermission.create({
                data: {
                    user: {
                        connect: { userId: existingUser.userId }
                    },
                    project: {
                        connect: { id: projectId }
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
                await sendInvitation(username, project.name);
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
    const { id: projectId, userId: memberId } = req.params;
    const { userId, permissionCodes } = req.body;

    try {
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { users: { select: { userId: true } } }
        });
        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }
        
        // TODO: check if user/actor has permission
        // Only allow if the acting user is a team member
        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to update permissions for this project");
        }

        // Update UserProjectPermission
        await prisma.userProjectPermission.update({
            where: { 
                userId_projectId: {
                    userId: memberId,
                    projectId: projectId
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
    const { id: projectId, userId: memberId } = req.params;
    const { userId } = req.body;

    try {
        // Check if project exists
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { users: { select: { userId: true } } }
        });
        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        // TODO: check if user/actor has permission
        // Only allow if the acting user is a team member
        const userIsTeamMember = project.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new ErrorClass("AuthorizationError", null, "Not authorized to remove members from this project");
        }

        // Remove user from project
        await prisma.project.update({
            where: { id: projectId },
            data: {
                users: {
                    disconnect: { userId: memberId }
                }
            }
        });

        // Delete UserProjectPermission
        await prisma.userProjectPermission.delete({
            where: { 
                userId_projectId: {
                    userId: memberId,
                    projectId: projectId
                }
            },
        });

        res.status(200).json({ message: "Team member removed successfully" });
    } catch (error) {
        next(error);
    }
};

export const getProjectIssues = async (req: Request, res: Response, next: NextFunction) => {
    const { page = 1, limit, labels, milestone, sort, direction } = req.query;
    const { githubToken, repoUrl } = req.body;
    const PER_PAGE = Number(limit) || 20;

    try {
        const filters: any = {
            ...(labels && { labels: (labels as string).split('_') }),
            milestone: milestone || undefined,
            sort: sort || "created",
            direction: direction || "desc"
        };

        const issues = await getRepoIssues(
            repoUrl,
            githubToken,
            Number(page),
            PER_PAGE,
            filters
        );

        res.status(200).json({
            issues,
            hasMore: issues.length === 0
        });
    } catch (error) {
        next(error);
    }
};

export const getProjectLabels = async (req: Request, res: Response, next: NextFunction) => {
    const { githubToken, repoUrl } = req.body;

    try {
        const labels = await getRepoLabels(repoUrl, githubToken);

        res.status(200).json({ labels });
    } catch (error) {
        next(error);
    }
};

export const getProjectMilestones = async (req: Request, res: Response, next: NextFunction) => {
    const { githubToken, repoUrl } = req.body;

    try {
        const milestones = await getRepoMilestones(repoUrl, githubToken);

        res.status(200).json({ milestones });
    } catch (error) {
        next(error);
    }
};