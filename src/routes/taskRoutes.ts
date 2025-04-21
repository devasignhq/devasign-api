import { RequestHandler, Router } from "express";
import {
    createTask,
    updateTaskBounty,
    acceptTask,
    requestTimelineModification,
    replyTimelineModificationRequest,
    markAsComplete,
    validateCompletion,
    deleteTask,
    getTask,
    getTasks,
    addTaskComment,
    updateTaskComment,
    createManyTasks
} from "../controllers/taskController";
import {
    getTasksValidator,
    createTaskValidator,
    updateTaskBountyValidator,
    requestTimelineModificationValidator,
    addTaskCommentValidator,
    markAsCompleteValidator,
    validateCompletionValidator,
    deleteTaskValidator,
    acceptTaskValidator,
    replyTimelineModificationValidator,
    createManyTasksValidator
} from "../validators/taskValidators";

export const taskRoutes = Router();

// Task queries
taskRoutes.get('/', getTasksValidator, getTasks as RequestHandler);
taskRoutes.get('/:id', getTask as RequestHandler);

// Task management
taskRoutes.post("/", createTaskValidator, createTask as RequestHandler);
taskRoutes.post("/", createManyTasksValidator, createManyTasks as RequestHandler);
taskRoutes.put("/:id/bounty", updateTaskBountyValidator, updateTaskBounty as RequestHandler);
taskRoutes.delete("/:id", deleteTaskValidator, deleteTask as RequestHandler);

// Task status changes
taskRoutes.post("/:id/accept", acceptTaskValidator, acceptTask as RequestHandler);
taskRoutes.post("/:id/complete", markAsCompleteValidator, markAsComplete as RequestHandler);
taskRoutes.post("/:id/validate", validateCompletionValidator, validateCompletion as RequestHandler);

// Timeline
taskRoutes.post("/:id/timeline", requestTimelineModificationValidator, requestTimelineModification as RequestHandler);
taskRoutes.post("/:id/timeline/reply", replyTimelineModificationValidator, replyTimelineModificationRequest as RequestHandler);

// Comments
taskRoutes.post("/:id/comments", addTaskCommentValidator, addTaskComment as RequestHandler);
taskRoutes.put("/:id/comments/:commentId", addTaskCommentValidator, updateTaskComment as RequestHandler);