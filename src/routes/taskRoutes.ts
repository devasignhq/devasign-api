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
    updateTaskComment
} from "../controllers/taskController";

export const taskRoutes = Router();

taskRoutes.get('/', getTasks as RequestHandler);
taskRoutes.get('/:id', getTask as RequestHandler);

// Task management
taskRoutes.post("/", createTask as RequestHandler);
taskRoutes.put("/:id/bounty", updateTaskBounty as RequestHandler);
taskRoutes.delete("/:id", deleteTask as RequestHandler);

// Task status changes
taskRoutes.post("/:id/accept", acceptTask as RequestHandler);
taskRoutes.post("/:id/complete", markAsComplete as RequestHandler);
taskRoutes.post("/:id/validate", validateCompletion as RequestHandler);

// Timeline
taskRoutes.post("/:id/timeline", requestTimelineModification as RequestHandler);
taskRoutes.post("/:id/timeline/reply", replyTimelineModificationRequest as RequestHandler);

// Comments
taskRoutes.post("/:id/comments", addTaskComment as RequestHandler);
taskRoutes.put("/:id/comments/:commentId", updateTaskComment as RequestHandler);