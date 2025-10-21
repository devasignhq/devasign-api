import { Router, RequestHandler } from "express";
import { handlePRWebhook } from "../controllers/webhook.controller";
import { validateGitHubWebhook, validatePRWebhookEvent } from "../middlewares/webhook.middleware";

export const webhookRoutes = Router();

// Handle GitHub PR review webhook
webhookRoutes.post(
    "/github/pr-review",
    validateGitHubWebhook,
    validatePRWebhookEvent,
    handlePRWebhook as RequestHandler
);
