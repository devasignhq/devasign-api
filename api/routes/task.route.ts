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
    submitTaskApplication,
    getTaskActivities,
    updateTaskTimeline,
    addBountyCommentId,
    getInstallationTask,
    getInstallationTasks,
    getContributorTasks,
    getContributorTask,
    markActivityAsViewed
} from "../controllers/task.controller";
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
    submitTaskApplicationValidator,
    getTaskActivitiesValidator,
    updateTaskTimelineValidator,
    addBountyCommentIdValidator,
    getInstallationTasksValidator,
    getContributorTasksValidator
} from "../validators/task.validator";

export const taskRoutes = Router();

// Task queries
taskRoutes.get("/", getTasksValidator, getTasks as RequestHandler);
taskRoutes.get("/installation/:installationId", getInstallationTasksValidator, getInstallationTasks as RequestHandler);
taskRoutes.get("/contributor", getContributorTasksValidator, getContributorTasks as RequestHandler);

taskRoutes.get("/:id", getTask as RequestHandler);
taskRoutes.get("/installation/:installationId/:taskId", getInstallationTask as RequestHandler);
taskRoutes.get("/contributor/:id", getContributorTask as RequestHandler);

taskRoutes.get("/activities/:id", getTaskActivitiesValidator, getTaskActivities as RequestHandler);
taskRoutes.patch("/activities/:taskActivityId/viewed", markActivityAsViewed as RequestHandler);

// Task management
taskRoutes.post("/", createTaskValidator, createTask as RequestHandler);
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
