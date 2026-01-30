import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { FilterTasks } from "../../models/task.model";
import { Prisma, TaskStatus } from "../../../prisma_client";
import { NotFoundError } from "../../models/error.model";

/**
 * Get tasks for a specific installation. Used in the project maintainer app.
 */
export const getInstallationTasks = async (req: Request, res: Response, next: NextFunction) => {
    const {
        status,
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels
    } = req.query;
    const { installationId } = req.params;
    const { userId } = res.locals;

    // Extract filters
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels
    } as FilterTasks;

    try {
        // Build where clause based on filters
        const where: Prisma.TaskWhereInput = {
            installation: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        };

        if (status) {
            if (status === TaskStatus.PENDING_PAYMENT) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: [],
                    pagination: { hasMore: false }
                });
            }
            where.status = status as TaskStatus;
        } else {
            where.status = { not: TaskStatus.PENDING_PAYMENT };
        }

        const issueFilters: Prisma.JsonFilter<"Task">[] = [];

        if (filters.repoUrl) {
            issueFilters.push({
                path: ["repository", "url"],
                string_contains: filters.repoUrl
            });
        }
        if (filters.issueTitle) {
            issueFilters.push({
                path: ["title"],
                string_contains: filters.issueTitle,
                mode: "insensitive"
            });
        }
        if (filters.issueLabels && filters.issueLabels.length > 0) {
            issueFilters.push({
                path: ["labels"],
                array_contains: filters.issueLabels.map((label) => ({ name: label }))
            });
        }
        if (issueFilters.length > 0) {
            where.AND = issueFilters.map(filter => ({ issue: filter }));
        }

        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);
        const skip = (Number(page) - 1) * Number(limit);

        // Get tasks with pagination
        const tasks = await prisma.task.findMany({
            where,
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                status: true,
                settled: true,
                acceptedAt: true,
                completedAt: true,
                contributorId: true,
                creatorId: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        taskActivities: {
                            where: { viewed: false }
                        }
                    }
                },
                ...(detailed ? {
                    installation: {
                        select: {
                            id: true,
                            account: true
                        }
                    },
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
                    applications: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    taskSubmissions: {
                        select: {
                            id: true,
                            pullRequest: true,
                            attachmentUrl: true
                        }
                    }
                } : {})
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
            },
            skip,
            take: take + 1 // Request one extra record beyond the limit
        });

        // Determine if more results exist and trim the array
        const hasMore = tasks.length > take;
        const results = hasMore ? tasks.slice(0, take) : tasks;

        // Return paginated tasks
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: results,
            pagination: { hasMore }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get details of a specific installation task. Used in the project maintainer app.
 */
export const getInstallationTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId, installationId } = req.params;
    const { userId } = res.locals;

    try {
        // Fetch task and ensure it belongs to the installation and user has access
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                status: { not: TaskStatus.PENDING_PAYMENT },
                installation: {
                    id: installationId,
                    users: {
                        some: { userId: userId as string }
                    }
                }
            },
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                status: true,
                settled: true,
                acceptedAt: true,
                completedAt: true,
                installation: {
                    select: {
                        id: true,
                        account: true
                    }
                },
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
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        taskActivities: true
                    }
                }
            }
        });

        if (!task) {
            throw new NotFoundError("Task not found");
        }

        // Return task
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: task
        });
    } catch (error) {
        next(error);
    }
};
