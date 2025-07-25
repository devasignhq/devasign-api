import { RequestHandler, Router } from "express";
import {
    createTask,
    updateTaskBounty,
    acceptTaskApplication,
    requestTimelineExtension,
    replyTimelineExtensionRequest,
    markAsComplete,
    validateCompletion,
    deleteTask,
    getTask,
    getTasks,
    createManyTasks,
    submitTaskApplication,
    getTaskActivities,
    updateTaskTimeline,
    addBountyCommentId,
    getInstallationTask,
    getInstallationTasks
} from "../controllers/taskController";
import {
    getTasksValidator,
    createTaskValidator,
    updateTaskBountyValidator,
    requestTimelineExtensionValidator,
    markAsCompleteValidator,
    validateCompletionValidator,
    deleteTaskValidator,
    acceptTaskApplicationValidator,
    replyTimelineModificationValidator,
    createManyTasksValidator,
    submitTaskApplicationValidator,
    getTaskActivitiesValidator,
    updateTaskTimelineValidator,
    addBountyCommentIdValidator,
    getInstallationTasksValidator
} from "../validators/taskValidators";

export const taskRoutes = Router();

// Task queries
taskRoutes.get('/', getTasksValidator, getTasks as RequestHandler);
taskRoutes.get('/installation/:installationId', getInstallationTasksValidator, getInstallationTasks as RequestHandler);
taskRoutes.get('/:id', getTask as RequestHandler);
taskRoutes.get('/installation/single-task/:id', getInstallationTask as RequestHandler);
taskRoutes.get('/activities/:id', getTaskActivitiesValidator, getTaskActivities as RequestHandler);

// Task management
taskRoutes.post("/", createTaskValidator, createTask as RequestHandler);
taskRoutes.post("/batch", createManyTasksValidator, createManyTasks as RequestHandler);
taskRoutes.patch("/:id/issue-comment", addBountyCommentIdValidator, addBountyCommentId as RequestHandler);
taskRoutes.patch("/:id/bounty", updateTaskBountyValidator, updateTaskBounty as RequestHandler);
taskRoutes.patch("/:id/timeline", updateTaskTimelineValidator, updateTaskTimeline as RequestHandler);
taskRoutes.delete("/:id", deleteTaskValidator, deleteTask as RequestHandler);

// Task status changes
taskRoutes.post("/:id/apply", submitTaskApplicationValidator, submitTaskApplication as RequestHandler);
taskRoutes.post("/:id/accept/:contributorId", acceptTaskApplicationValidator, acceptTaskApplication as RequestHandler);
taskRoutes.post("/:id/complete", markAsCompleteValidator, markAsComplete as RequestHandler);
taskRoutes.post("/:id/validate", validateCompletionValidator, validateCompletion as RequestHandler);

// Timeline
taskRoutes.post("/:id/timeline", requestTimelineExtensionValidator, requestTimelineExtension as RequestHandler);
taskRoutes.post("/:id/timeline/reply", replyTimelineModificationValidator, replyTimelineExtensionRequest as RequestHandler);