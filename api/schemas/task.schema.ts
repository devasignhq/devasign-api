import * as z from "zod";
import { TaskStatus, TimelineType } from "../../prisma_client";
import { cuidSchema, installationIdSchema, paginationSchema } from "./index.schema";

export const taskIdSchema = z.object({
    taskId: cuidSchema
});

export const getTasksSchema = {
    query: z.object({
        ...paginationSchema.shape,
        installationId: installationIdSchema.optional(),
        detailed: z.literal("true").optional(),
        repoUrl: z.string().min(1).max(500, "Repository URL must be between 1 and 500 characters").optional(),
        issueTitle: z.string().min(1).max(300, "Issue title must be between 1 and 300 characters").optional(),
        issueLabels: z.union([
            z.string(),
            z.array(z.string().max(50, "Each label must be a string with maximum 50 characters")).max(20, "Maximum 20 labels allowed")
        ]).optional()
    })
};

export const getInstallationTasksSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        ...paginationSchema.shape,
        detailed: z.literal("true").optional(),
        status: z.enum(TaskStatus).optional(),
        repoUrl: z.string().min(1).max(500, "Repository URL must be between 1 and 500 characters").optional(),
        issueTitle: z.string().min(1).max(300, "Issue title must be between 1 and 300 characters").optional(),
        issueLabels: z.union([
            z.string(),
            z.array(z.string().max(50, "Each label must be a string with maximum 50 characters")).max(20, "Maximum 20 labels allowed")
        ]).optional()
    })
};

export const getContributorTasksSchema = {
    query: z.object({
        ...paginationSchema.shape,
        detailed: z.literal("true").optional(),
        status: z.enum(TaskStatus).optional(),
        installationId: installationIdSchema.optional(),
        repoUrl: z.string().min(1).max(500, "Repository URL must be between 1 and 500 characters").optional(),
        issueTitle: z.string().min(1).max(300, "Issue title must be between 1 and 300 characters").optional(),
        issueLabels: z.union([
            z.string(),
            z.array(z.string().max(50, "Each label must be a string with maximum 50 characters")).max(20, "Maximum 20 labels allowed")
        ]).optional()
    })
};

export const getTaskSchema = {
    params: taskIdSchema
};

export const getInstallationTaskSchema = {
    params: z.object({
        installationId: installationIdSchema,
        taskId: cuidSchema
    })
};

export const getContributorTaskSchema = {
    params: taskIdSchema
};

export const createTaskSchema = {
    body: z.object({
        payload: z.object({
            installationId: installationIdSchema,
            issue: z.object({
                id: z.string(),
                number: z.number(),
                title: z.string(),
                body: z.string().nullable().optional(),
                url: z.url(),
                state: z.string(),
                labels: z.array(z.object({
                    id: z.number(),
                    name: z.string(),
                    color: z.string(),
                    description: z.string().nullable().optional()
                })),
                locked: z.boolean(),
                repository: z.object({
                    url: z.url()
                }),
                createdAt: z.string(),
                updatedAt: z.string(),
                bountyCommentId: z.string().optional()
            }),
            bounty: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
                message: "Bounty must be a positive number"
            }),
            timeline: z.coerce.number().int().min(1, "Timeline must be a positive integer").optional(),
            timelineType: z.enum(TimelineType).optional(),
            bountyLabelId: z.string()
        })
    })
};

export const addBountyCommentIdSchema = {
    params: taskIdSchema,
    body: z.object({
        bountyCommentId: z.string()
    })
};

export const updateTaskBountySchema = {
    params: taskIdSchema,
    body: z.object({
        newBounty: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Bounty must be a positive number"
        })
    })
};

export const updateTaskTimelineSchema = {
    params: taskIdSchema,
    body: z.object({
        newTimeline: z.coerce.number().int().min(1, "Timeline must be a positive integer"),
        newTimelineType: z.enum(["DAY", "WEEK"])
    })
};

export const markAsCompleteSchema = {
    params: taskIdSchema,
    body: z.object({
        pullRequest: z.string().trim().refine((url) => {
            const validUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/;
            return validUrlPattern.test(url);
        }, "Invalid pull request URL format. Must be a GitHub pull request"),
        attachmentUrl: z.url().optional()
    })
};

export const validateCompletionSchema = {
    params: taskIdSchema
};

export const deleteTaskSchema = {
    params: taskIdSchema
};

export const submitTaskApplicationSchema = {
    params: taskIdSchema
};

export const acceptTaskApplicationSchema = {
    params: z.object({
        taskId: cuidSchema,
        contributorId: cuidSchema
    })
};

export const requestTimelineExtensionSchema = {
    params: taskIdSchema,
    body: z.object({
        githubUsername: z.string().trim().min(1, "Username must be greater than 1 character"),
        requestedTimeline: z.coerce.number().int().min(1, "Timeline must be a positive integer"),
        timelineType: z.enum(TimelineType),
        reason: z.string(),
        attachments: z.array(z.string()).optional()
    })
};

export const replyTimelineModificationSchema = {
    params: taskIdSchema,
    body: z.object({
        accept: z.boolean(),
        requestedTimeline: z.coerce.number().int().min(1, "Timeline must be a positive integer").optional(),
        timelineType: z.enum(TimelineType)
    })
};

export const getTaskActivitiesSchema = {
    params: taskIdSchema,
    query: paginationSchema
};

export const markActivityAsViewedSchema = {
    params: z.object({
        taskActivityId: cuidSchema
    })
};
