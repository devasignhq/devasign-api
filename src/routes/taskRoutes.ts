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
    addTaskMessage,
    updateTaskMessage,
    createManyTasks,
    submitTaskApplication,
    getTaskActivities
} from "../controllers/taskController";
import {
    getTasksValidator,
    createTaskValidator,
    updateTaskBountyValidator,
    requestTimelineExtensionValidator,
    addTaskMessageValidator,
    updateTaskMessageValidator,
    markAsCompleteValidator,
    validateCompletionValidator,
    deleteTaskValidator,
    acceptTaskApplicationValidator,
    replyTimelineModificationValidator,
    createManyTasksValidator,
    submitTaskApplicationValidator,
    getTaskActivitiesValidator
} from "../validators/taskValidators";

export const taskRoutes = Router();

// Task queries
taskRoutes.get('/', getTasksValidator, getTasks as RequestHandler);
taskRoutes.get('/:id', getTask as RequestHandler);
taskRoutes.get('/activities/:id', getTaskActivitiesValidator, getTaskActivities as RequestHandler);

// Task management
taskRoutes.post("/", createTaskValidator, createTask as RequestHandler);
taskRoutes.post("/batch", createManyTasksValidator, createManyTasks as RequestHandler);
taskRoutes.patch("/:id/bounty", updateTaskBountyValidator, updateTaskBounty as RequestHandler);
taskRoutes.delete("/:id", deleteTaskValidator, deleteTask as RequestHandler);

// Task status changes
taskRoutes.post("/:id/apply", submitTaskApplicationValidator, submitTaskApplication as RequestHandler);
taskRoutes.post("/:id/accept/:contributorId", acceptTaskApplicationValidator, acceptTaskApplication as RequestHandler);
taskRoutes.post("/:id/complete", markAsCompleteValidator, markAsComplete as RequestHandler);
taskRoutes.post("/:id/validate", validateCompletionValidator, validateCompletion as RequestHandler);

// Timeline
taskRoutes.post("/:id/timeline", requestTimelineExtensionValidator, requestTimelineExtension as RequestHandler);
taskRoutes.post("/:id/timeline/reply", replyTimelineModificationValidator, replyTimelineExtensionRequest as RequestHandler);

// Messages
taskRoutes.post("/:id/messages", addTaskMessageValidator, addTaskMessage as RequestHandler);
taskRoutes.patch("/:id/messages/:messageId", updateTaskMessageValidator, updateTaskMessage as RequestHandler);