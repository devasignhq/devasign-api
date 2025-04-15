import { RequestHandler, Router } from "express";
import {
    createTask,
    updateTaskBounty,
    acceptTask,
    // applyForTask,
    // addTaskComment,
    // updateTaskComment,
    // adjustTimeline,
    // replyTimelineAdjustment,
    // updateCompensation,
    markAsComplete,
    validateCompletion,
    deleteTask
} from "../controllers/taskController";

export const taskRoutes = Router();

// Task management
taskRoutes.post("/", createTask as RequestHandler);
taskRoutes.put("/:id/bounty", updateTaskBounty as RequestHandler);
taskRoutes.delete("/:id", deleteTask as RequestHandler);

// Task status changes
// taskRoutes.post("/:id/apply", applyForTask as RequestHandler);
taskRoutes.post("/:id/accept", acceptTask as RequestHandler);
taskRoutes.post("/:id/complete", markAsComplete as RequestHandler);
taskRoutes.post("/:id/validate", validateCompletion as RequestHandler);

// Timeline and compensation
// taskRoutes.post("/:id/timeline", adjustTimeline as RequestHandler);
// taskRoutes.post("/:id/timeline/reply", replyTimelineAdjustment as RequestHandler);
// taskRoutes.put("/:id/compensation", updateCompensation as RequestHandler);

// Comments
// taskRoutes.post("/:id/comments", addTaskComment as RequestHandler);
// taskRoutes.put("/:id/comments/:commentId", updateTaskComment as RequestHandler);