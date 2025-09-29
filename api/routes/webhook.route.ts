import { Router, RequestHandler } from "express";
import {
    handlePRWebhook,
    webhookHealthCheck,
    getJobStatus,
    getQueueStats,
    getWorkflowStatus,
    triggerManualAnalysis,
    getIntelligentContextConfig,
    updateIntelligentContextConfig
} from "../controllers/webhook.controller";
import {
    validateGitHubWebhook,
    validatePRWebhookEvent
} from "../middlewares/webhook.middleware";

export const webhookRoutes = Router();

/**
 * GitHub webhook endpoint for PR events
 * 
 * This endpoint:
 * - Validates GitHub webhook signatures for security
 * - Filters for PR events (opened, synchronize, ready_for_review)
 * - Validates that PR is targeting the default branch
 * - Identifies PRs that link to issues
 * - Triggers AI review process for eligible PRs
 */
webhookRoutes.post(
    "/github/pr-review",
    validateGitHubWebhook,
    validatePRWebhookEvent,
    handlePRWebhook as RequestHandler
);

/**
 * Health check endpoint for webhook service
 */
webhookRoutes.get(
    "/health",
    webhookHealthCheck as RequestHandler
);

/**
 * Job status endpoint
 * Get status of a specific analysis job
 */
webhookRoutes.get(
    "/jobs/:jobId",
    getJobStatus as RequestHandler
);

/**
 * Queue statistics endpoint
 * Get current queue statistics and metrics
 */
webhookRoutes.get(
    "/queue/stats",
    getQueueStats as RequestHandler
);

/**
 * Workflow status endpoint
 * Get comprehensive workflow status and monitoring information
 */
webhookRoutes.get(
    "/workflow/status",
    getWorkflowStatus as RequestHandler
);

/**
 * Manual analysis trigger endpoint
 * Manually trigger PR analysis for a specific PR
 */
webhookRoutes.post(
    "/github/manual-analysis",
    triggerManualAnalysis as RequestHandler
);

/**
 * Intelligent context configuration endpoint
 * Get current intelligent context configuration
 */
webhookRoutes.get(
    "/intelligent-context/config",
    getIntelligentContextConfig as RequestHandler
);

/**
 * Update intelligent context configuration endpoint
 * Update intelligent context configuration at runtime
 */
webhookRoutes.post(
    "/intelligent-context/config",
    updateIntelligentContextConfig as RequestHandler
);
