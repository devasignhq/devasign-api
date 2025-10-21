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

// Get all tasks
taskRoutes.get("/", getTasksValidator, getTasks as RequestHandler);

// Get all tasks for an installation
taskRoutes.get("/installation/:installationId", getInstallationTasksValidator, getInstallationTasks as RequestHandler);

// Get all tasks for a contributor
taskRoutes.get("/contributor", getContributorTasksValidator, getContributorTasks as RequestHandler);

// Get a specific task
taskRoutes.get("/:taskId", getTask as RequestHandler);

// Get a specific task for an installation
taskRoutes.get("/installation/:installationId/:taskId", getInstallationTask as RequestHandler);

// Get a specific task for a contributor
taskRoutes.get("/contributor/:taskId", getContributorTask as RequestHandler);

// Get all activities for a task
taskRoutes.get("/activities/:taskId", getTaskActivitiesValidator, getTaskActivities as RequestHandler);

// Mark a task activity as viewed
taskRoutes.patch("/activities/:taskActivityId/viewed", markActivityAsViewed as RequestHandler);

// Create a new task
taskRoutes.post("/", createTaskValidator, createTask as RequestHandler);

// Add a bounty comment ID to a task
taskRoutes.patch("/:taskId/issue-comment", addBountyCommentIdValidator, addBountyCommentId as RequestHandler);

// Update task bounty
taskRoutes.patch("/:taskId/bounty", updateTaskBountyValidator, updateTaskBounty as RequestHandler);

// Update task timeline
taskRoutes.patch("/:taskId/timeline", updateTaskTimelineValidator, updateTaskTimeline as RequestHandler);

// Delete a task
taskRoutes.delete("/:taskId", deleteTaskValidator, deleteTask as RequestHandler);

// Submit a task application
taskRoutes.post("/:taskId/apply", submitTaskApplicationValidator, submitTaskApplication as RequestHandler);

// Accept a task application
taskRoutes.post("/:taskId/accept/:contributorId", acceptTaskApplicationValidator, acceptTaskApplication as RequestHandler);

// Mark a task as complete
taskRoutes.post("/:taskId/complete", markAsCompleteValidator, markAsComplete as RequestHandler);

// Validate task completion
taskRoutes.post("/:taskId/validate", validateCompletionValidator, validateCompletion as RequestHandler);

// Request a timeline extension
taskRoutes.post("/:taskId/timeline", requestTimelineExtensionValidator, requestTimelineExtension as RequestHandler);

// Reply to a timeline extension request
taskRoutes.post("/:taskId/timeline/reply", replyTimelineModificationValidator, replyTimelineExtensionRequest as RequestHandler);
