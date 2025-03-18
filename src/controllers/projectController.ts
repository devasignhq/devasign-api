import { Request, Response } from "express";
import { prisma } from "../config/database";
import { checkGithubUser, sendInvitation } from "../services/projectService";

export const createProject = async (req: Request, res: Response) => {
    const { name, description, repoUrl } = req.body;
    const { userId } = req.body; // From Firebase middleware

    try {
        const project = await prisma.project.create({
            data: {
                name,
                description,
                repoUrl,
                users: {
                    connect: { userId }
                }
            }
        });
        res.status(201).json(project);
    } catch (error) {
        res.status(400).json({ error: "Failed to create project" });
    }
};

export const updateProject = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, repoUrl } = req.body;

    try {
        const project = await prisma.project.update({
            where: { id },
            data: { name, description, repoUrl }
        });
        res.status(200).json(project);
    } catch (error) {
        res.status(400).json({ error: "Failed to update project" });
    }
};

export const deleteProject = async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Check if all tasks are either OPEN or HOLD
        const tasks = await prisma.task.findMany({
            where: {
                projectId: id,
                NOT: {
                    status: { in: ['OPEN', 'HOLD'] }
                }
            }
        });

        if (tasks.length > 0) {
            return res.status(400).json({
                error: "Cannot delete project with active or completed tasks"
            });
        }

        await prisma.project.delete({
            where: { id }
        });

        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Failed to delete project" });
    }
};

export const addTeamMembers = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { githubUsernames } = req.body;

    try {
        const project = await prisma.project.findUnique({
            where: { id },
            include: { users: true }
        });

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const results = await Promise.all(
            githubUsernames.map(async (username: string) => {
                // Check if user exists in our system
                const existingUser = await prisma.user.findFirst({
                    where: { username }
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
        res.status(400).json({ error: "Failed to add team members" });
    }
};