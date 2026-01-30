import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { FilterTasks } from "../../models/task.model";
import { Prisma, TaskStatus } from "../../../prisma_client";
import { NotFoundError } from "../../models/error.model";

/**
 * Get tasks assigned to a contributor. Used in the tasks page of the contributor app.
 */
export const getContributorTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const {
        installationId,
        status,
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels
    } = req.query;

    // Extract filters
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels
    } as FilterTasks;

    try {
        // Build where clause based on filters
        let where: Prisma.TaskWhereInput;

        if (status === "APPLIED") {
            where = {
                taskActivities: {
                    some: {
                        userId,
                        taskSubmissionId: null
                    }
                },
                status: { notIn: [TaskStatus.ARCHIVED, TaskStatus.PENDING_PAYMENT] },
                contributorId: { equals: null }
            };
        } else {
            where = {
                OR: [
                    { contributorId: userId },
                    {
                        taskActivities: {
                            some: {
                                userId,
                                taskSubmissionId: null
                            }
                        }
                    }
                ]
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
        }
        if (installationId) {
            where.installationId = installationId as string;
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
                ...(detailed ? {
                    installation: {
                        select: { account: true }
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
 * Get details of a specific task assigned to a contributor. Used in the tasks page of the contributor app.
 */
export const getContributorTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;

    try {
        // Fetch task and ensure it is assigned to the contributor or they have applied
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                status: { notIn: [TaskStatus.ARCHIVED, TaskStatus.PENDING_PAYMENT] },
                OR: [
                    { contributorId: userId },
                    {
                        taskActivities: {
                            some: {
                                userId,
                                taskSubmissionId: null
                            }
                        }
                    }
                ]
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
                creatorId: true,
                contributorId: true,
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
                updatedAt: true
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
