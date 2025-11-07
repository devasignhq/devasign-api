import { Router, RequestHandler } from "express";
import {
    webhookHealthCheck,
    getJobData,
    getQueueStats,
    getWorkflowStatus,
    systemRecovery,
    resetDatabase
} from "../controllers/admin";
import { ENDPOINTS } from "../utilities/data";

export const adminRoutes = Router();

// Webhook health check
adminRoutes.get(
    ENDPOINTS.ADMIN.WEBHOOK.HEALTH, 
    webhookHealthCheck as RequestHandler
);

// Get job data by job ID
adminRoutes.get(
    ENDPOINTS.ADMIN.WEBHOOK.GET_JOB, 
    getJobData as RequestHandler
);

// Get queue statistics
adminRoutes.get(
    ENDPOINTS.ADMIN.WEBHOOK.QUEUE_STATS, 
    getQueueStats as RequestHandler
);

// Get workflow status
adminRoutes.get(
    ENDPOINTS.ADMIN.WEBHOOK.WORKFLOW_STATUS, 
    getWorkflowStatus as RequestHandler
);

// Recover failed systems
adminRoutes.get(
    ENDPOINTS.ADMIN.RECOVER_SYSTEM, 
    systemRecovery as RequestHandler
);

// To be removed. Used from development only.
adminRoutes.post(
    ENDPOINTS.ADMIN.RESET_DATABASE, 
    resetDatabase as RequestHandler
);
