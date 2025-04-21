import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { 
    checkGithubUser, 
    getRepoDetails, 
    getRepoIssues, 
    getRepoLabels, 
    getRepoMilestones, 
    sendInvitation 
} from "../services/projectService";
import { ErrorClass, NotFoundErrorClass } from "../types/general";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt, encrypt } from "../helper";
import { ref } from "process";

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubToken, repoUrl } = req.body;

    try {
        const existingProject = await prisma.project.findFirst({
            where: { repoUrl }
        });

        if (existingProject) {
            throw new ErrorClass("ProjectError", null, "Project already exists");
        }

        const repoDetails = await getRepoDetails(repoUrl, githubToken);
        const user = await prisma.user.findUnique({
            where: { userId },            
            select: { walletSecret: true }
        });
        
        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const decryptedUserSecret = decrypt(user.walletSecret);
        const escrowWallet = await stellarService.createWalletViaSponsor(decryptedUserSecret);
        const encryptedEscrowSecret = encrypt(escrowWallet.secretKey);

        const project = await prisma.project.create({
            data: {
                name: repoDetails.name,
                description: repoDetails.description || "",
                repoUrl,
                escrowAddress: escrowWallet.publicKey,
                escrowSecret: encryptedEscrowSecret,
                users: {
                    connect: { userId }
                }
            },
            select: {
                id: true,
                name: true,
                description: true,
                repoUrl: true,
                createdAt: true,
                updatedAt: true
            }
        });

        try {
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                escrowWallet.secretKey
            );
            
            res.status(201).json(project);
        } catch (error: any) {
            // Return project data even if adding USDC trustline fails
            next({ 
                ...error, 
                project, 
                message: "Project successfully created. Failed to add USDC trustline."
            });
        }
    } catch (error) {
        next(error);
    }
};

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
                repoUrl: true,
                escrowAddress: true,
                tasks: {
                    select: {
                        id: true,
                        status: true,
                        bounty: true
                    }
                },
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
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

        // Calculate project stats
        const projectsWithStats = projects.map(project => {
            const totalBounty = project.tasks.reduce((sum, task) => sum + task.bounty, 0);
            const openTasks = project.tasks.filter(task => task.status === 'OPEN').length;
            const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length;

            return {
                ...project,
                stats: {
                    totalBounty,
                    openTasks,
                    completedTasks,
                    totalTasks: project._count.tasks,
                    totalMembers: project._count.users
                }
            };
        });

        res.status(200).json({
            data: projectsWithStats,
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
                repoUrl: true,
                escrowAddress: true,
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

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { githubToken, repoUrl, userId } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            select: { 
                users: { select: { userId: true } },
                tasks: { select: { status: true } }
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

        // ? Review this
        const hasActiveTasks = project.tasks.some(task => 
            task.status !== 'OPEN' && task.status !== 'COMPLETED'
        );
        if (hasActiveTasks) {
            throw new ErrorClass("ProjectError", null, "Cannot update project with active tasks");
        }

        const repoDetails = await getRepoDetails(repoUrl, githubToken);

        const updatedProject = await prisma.project.update({
            where: { id },
            data: { 
                name: repoDetails.name,
                description: repoDetails.description || "",
                repoUrl 
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

export const addTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { githubUsernames, userId } = req.body;

    try {
        // Validate input
        if (!Array.isArray(githubUsernames) || githubUsernames.length === 0) {
            throw new ErrorClass("ValidationError", null, "Invalid usernames array");
        }
        if (githubUsernames.length > 10) {
            throw new ErrorClass("ValidationError", null, "Cannot add more than 10 members at once");
        }

        // Remove duplicates
        const uniqueUsernames = [...(new Set(githubUsernames))];

        const project = await prisma.project.findUnique({
            where: { id },
            select: { 
                users: true, 
                repoUrl: true, 
                name: true 
            }
        });

        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        const results = await Promise.all(
            uniqueUsernames.map(async (username: string) => {
                // Check if user exists in our system
                const existingUser = await prisma.user.findFirst({
                    where: { username },
                    select: { userId: true }
                });

                if (existingUser) {
                    // Add user to project
                    await prisma.project.update({
                        where: { id },
                        data: {
                            users: {
                                connect: { userId: existingUser.userId }
                            }
                        }
                    });
                    return { username, status: 'added' };
                } else {
                    // Check if GitHub user exists
                    const githubUserExists = await checkGithubUser(username);
                    if (githubUserExists) {
                        // Send invitation
                        await sendInvitation(username, project.name);
                        return { username, status: 'invited' };
                    }
                    return { username, status: 'not_found' };
                }
            })
        );

        res.status(200).json({ results });
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
            ...(labels && { labels: (labels as string).split(',') }),
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
            hasMore: (issues.length + 1) === PER_PAGE
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