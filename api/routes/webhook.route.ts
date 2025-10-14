import { Router, RequestHandler } from "express";
import {
    handlePRWebhook,
    webhookHealthCheck,
    getJobData,
    getQueueStats,
    getWorkflowStatus,
    triggerManualAnalysis
} from "../controllers/webhook.controller";
import {
    validateGitHubWebhook,
    validatePRWebhookEvent
} from "../middlewares/webhook.middleware";

export const webhookRoutes = Router();

// Handle GitHub PR review webhook
webhookRoutes.post(
    "/github/pr-review",
    validateGitHubWebhook,
    validatePRWebhookEvent,
    handlePRWebhook as RequestHandler
);

// Webhook health check
webhookRoutes.get("/health", webhookHealthCheck as RequestHandler);

// Get job data by job ID
webhookRoutes.get("/jobs/:jobId", getJobData as RequestHandler);

// Get queue statistics
webhookRoutes.get("/queue/stats", getQueueStats as RequestHandler);

// Get workflow status
webhookRoutes.get("/workflow/status", getWorkflowStatus as RequestHandler);

// Trigger manual analysis
webhookRoutes.post("/github/manual-analysis", triggerManualAnalysis as RequestHandler);
