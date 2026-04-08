import { Request, Response, NextFunction } from "express";
import { responseWrapper } from "../../utilities/helper.js";
import { STATUS_CODES } from "../../utilities/data.js";
import { dataLogger } from "../../config/logger.config.js";
import { PullRequestWebhookService } from "../../services/github-webhook/pull_request-webhook.service.js";
import { InstallationWebhookService } from "../../services/github-webhook/installation-webhook.service.js";
import { IssueCommentWebhookService } from "../../services/github-webhook/issue_comment-webhook.service.js";
import { InstallationRepositoriesWebhookService } from "../../services/github-webhook/installation_repositories-webhook.service.js";
import { PushWebhookService } from "../../services/github-webhook/push-webhook.service.js";

/**
 * Handles GitHub webhook events
 */
export const handleGitHubWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const { webhookMeta, installation, action } = req.body;
    const { eventType } = webhookMeta;

    dataLogger.info(
        `Received GitHub webhook: ${eventType} for installation ${installation.id}`,
        { webhookMeta, action }
    );

    if (eventType === "pull_request") {
        await PullRequestWebhookService.handlePREvent(req, res, next);
        return;
    }

    if (eventType === "installation") {
        await InstallationWebhookService.handleInstallationEvent(req, res, next);
        return;
    }

    if (eventType === "installation_repositories") {
        await InstallationRepositoriesWebhookService.handleInstallationRepositoriesEvent(req, res, next);
        return;
    }

    if (eventType === "issue_comment") {
        await IssueCommentWebhookService.handleIssueCommentEvent(req, res, next);
        return;
    }

    if (eventType === "push") {
        await PushWebhookService.handlePushEvent(req, res, next);
        return;
    }

    responseWrapper({
        res,
        status: STATUS_CODES.SUCCESS,
        data: { eventType },
        message: "Event type not processed"
    });
};
