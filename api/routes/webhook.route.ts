import { Router, RequestHandler } from "express";
import { handleGitHubWebhook, handleSumsubWebhook } from "../controllers/webhook/index.js";
import { validateGitHubWebhook, validateGitHubWebhookEvent, validateSumsubWebhook } from "../middlewares/webhook.middleware.js";

import { ENDPOINTS } from "../utils/data.js";

export const webhookRoutes = Router();

// Handle GitHub webhook
webhookRoutes.post(
    ENDPOINTS.WEBHOOK.GITHUB,
    validateGitHubWebhook,
    validateGitHubWebhookEvent,
    handleGitHubWebhook as RequestHandler
);

// Handle Sumsub webhook
webhookRoutes.post(
    ENDPOINTS.WEBHOOK.SUMSUB,
    validateSumsubWebhook,
    handleSumsubWebhook as RequestHandler
);
