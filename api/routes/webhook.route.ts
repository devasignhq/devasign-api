import { Router, RequestHandler } from "express";
import { handlePRWebhook } from "../controllers/webhook";
import { validateGitHubWebhook, validatePRWebhookEvent } from "../middlewares/webhook.middleware";
import { ENDPOINTS } from "../utilities/endpoints";

export const webhookRoutes = Router();

// Handle GitHub PR review webhook
webhookRoutes.post(
    ENDPOINTS.WEBHOOK.PR_REVIEW,
    validateGitHubWebhook,
    validatePRWebhookEvent,
    handlePRWebhook as RequestHandler
);
