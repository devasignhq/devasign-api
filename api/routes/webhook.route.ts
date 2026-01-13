import { Router, RequestHandler } from "express";
import { handleGitHubWebhook } from "../controllers/webhook";
import { validateGitHubWebhook, validateGitHubWebhookEvent } from "../middlewares/webhook.middleware";
import { ENDPOINTS } from "../utilities/data";

export const webhookRoutes = Router();

// Handle GitHub webhook
webhookRoutes.post(
    ENDPOINTS.WEBHOOK.GITHUB,
    validateGitHubWebhook,
    validateGitHubWebhookEvent,
    handleGitHubWebhook as RequestHandler
);
