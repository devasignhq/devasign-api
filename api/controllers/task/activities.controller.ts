import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { NotFoundError } from "../../models/error.model";

/**
 * Get task activities (applications, submissions, etc.) with pagination
 */
export const getTaskActivities = async (req: Request, res: Response, next: NextFunction) => {
    const {
        page = 1,
        limit = 10,
        sort
    } = req.query;
    const { taskId } = req.params;
    const { userId } = res.locals;

    try {
        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);
        const skip = (Number(page) - 1) * Number(limit);

        // Get task activities with pagination
        const activities = await prisma.taskActivity.findMany({
            where: {
                taskId,
                task: {
                    installation: {
                        users: { some: { userId } }
                    }
                }
            },
            select: {
                id: true,
                taskId: true,
                userId: true,
                taskSubmissionId: true,
                viewed: true,
                user: {
                    select: {
                        userId: true,
                        username: true,
                        contributionSummary: true,
                        techStack: true,
                        verified: true
                    }
                },
                taskSubmission: {
                    select: {
                        pullRequest: true,
                        attachmentUrl: true
                    }
                },
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
            },
            skip,
            take: take + 1 // Request one extra record beyond the limit
        });

        // Determine if more results exist and trim the array
        const hasMore = activities.length > take;
        const results = hasMore ? activities.slice(0, take) : activities;

        // Return paginated activities
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
 * Mark a task activity as viewed
 */
export const markActivityAsViewed = async (req: Request, res: Response, next: NextFunction) => {
    const { taskActivityId } = req.params;
    const { userId } = res.locals;

    try {
        // Check if the activity exists and user has access to it
        const activity = await prisma.taskActivity.findUnique({
            where: {
                id: taskActivityId,
                task: {
                    installation: {
                        users: { some: { userId } }
                    }
                }
            },
            select: { id: true, viewed: true }
        });

        if (!activity) {
            throw new NotFoundError("Task activity not found");
        }

        // Update the activity as viewed
        const updatedActivity = await prisma.taskActivity.update({
            where: { id: taskActivityId },
            data: { viewed: true },
            select: {
                id: true,
                viewed: true,
                updatedAt: true
            }
        });

        // Return updated activity
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedActivity,
            message: "Activity marked as viewed"
        });
    } catch (error) {
        next(error);
    }
};
