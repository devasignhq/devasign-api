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
import { ErrorClass } from "../types";
import { stellarService } from "../config/stellar";
import { encrypt } from "../helper";

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubToken, repoUrl } = req.body;

    try {
        const repoDetails = await getRepoDetails(repoUrl, githubToken);
        
        const escrowWallet = await stellarService.createWallet();
        const encryptedUserSecret = encrypt(escrowWallet.secretKey);

        const project = await prisma.project.create({
            data: {
                name: repoDetails.name,
                description: repoDetails.description || "",
                repoUrl,
                escrowAddress: escrowWallet.publicKey,
                escrowSecret: encryptedUserSecret,
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
            await stellarService.fundWallet(escrowWallet.publicKey);
            await stellarService.addTrustLine(escrowWallet.secretKey);
            
            res.status(201).json(project);
        } catch (error: any) {
            next({ 
                ...error, 
                project, 
                message: "Project successfully created. Failed to fund escrow wallet/add USDC trustline."
            });
        }
    } catch (error) {
        next(error);
    }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { githubToken, repoUrl } = req.body;

    try {
        const repoDetails = await getRepoDetails(repoUrl, githubToken);

        const project = await prisma.project.update({
            where: { id },
            data: { 
                name: repoDetails.name,
                description: repoDetails.description || "",
                repoUrl 
            }
        });
        res.status(200).json(project);
    } catch (error) {
        next(error);
    }
};

export const deleteProject = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const allTasks = await prisma.task.findMany({
            where: { projectId: id },
            select: { id: true }
        });
        const allOpenTasks = await prisma.task.findMany({
            where: {
                projectId: id,
                status: "OPEN"
            },
            select: { id: true }
        });

        // Check if no task is IN_PROGRESS or COMPLETED
        if (allTasks.length !== allOpenTasks.length) {
            throw new ErrorClass(
                "ProjectError",
                null,
                "Cannot delete project with active or completed tasks"
            )
        }

        // TODO: refund user with escrow funds

        await prisma.project.delete({
            where: { id }
        });

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        next(error);
    }
};

export const addTeamMembers = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { githubUsernames } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            select: { 
                users: true, 
                repoUrl: true, 
                name: true 
            }
        });

        if (!project) {
            throw new ErrorClass("ProjectError", null, "Project not found");
        }

        const results = await Promise.all(
            githubUsernames.map(async (username: string) => {
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
    const { page = 1, labels, milestone, sort, direction } = req.query;
    const { githubToken, repoUrl } = req.body;
    const PER_PAGE = 20;

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