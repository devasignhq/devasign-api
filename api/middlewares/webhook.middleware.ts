import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { GitHubWebhookError } from "../models/error.model";
import { OctokitService } from "../services/octokit.service";
import { STATUS_CODES } from "../utilities/data";
import { dataLogger } from "../config/logger.config";
import { responseWrapper } from "../utilities/helper";

/**
 * Middleware to validate GitHub webhook signatures
 */
export const validateGitHubWebhook = (req: Request, res: Response, next: NextFunction): void => {
    try {
        // Get and validate signature and secret
        const signature = req.get("X-Hub-Signature-256");
        const secret = process.env.GITHUB_WEBHOOK_SECRET;

        if (!secret) {
            throw new GitHubWebhookError("GitHub webhook secret not configured");
        }

        if (!signature) {
            throw new GitHubWebhookError("Missing webhook signature");
        }

        // Get raw body (should be Buffer from express.raw middleware)
        const rawBody = req.body;
        if (!Buffer.isBuffer(rawBody)) {
            throw new GitHubWebhookError("Invalid request body format");
        }

        // Create expected signature using raw body
        const expectedSignature = `sha256=${crypto
            .createHmac("sha256", secret)
            .update(rawBody)
            .digest("hex")}`;

        // Compare signatures using timing-safe comparison
        const isValid = crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );

        // If signatures don't match, reject the request
        if (!isValid) {
            throw new GitHubWebhookError("Invalid webhook signature");
        }

        // Parse the JSON body for subsequent middleware
        try {
            req.body = JSON.parse(rawBody.toString());
        } catch {
            throw new GitHubWebhookError("Invalid JSON payload");
        }

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate pull request events
 */
export const validatePRWebhookEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const eventType = req.get("X-GitHub-Event");
    const { action, pull_request, repository, installation } = req.body;

    // Only process pull_request events
    if (eventType !== "pull_request") {
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Event type not processed",
            meta: { eventType }
        });
        return;
    }

    // Only process specific PR actions
    const validActions = ["opened", "synchronize", "ready_for_review", "closed"];
    if (!validActions.includes(action)) {
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "PR action not processed",
            meta: { action }
        });
        return;
    }

    // Check for draft PRs
    if (pull_request?.draft) {
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Skipping draft PR"
        });
        return;
    }

    if (!pull_request || !repository || !installation) {
        responseWrapper({
            res,
            status: STATUS_CODES.BAD_PAYLOAD,
            data: {},
            message: "Missing required webhook data",
            meta: {
                pull_request: Boolean(pull_request),
                repository: Boolean(repository),
                installation: Boolean(installation)
            }
        });
        return;
    }

    // Validate that PR is targeting the default branch
    const targetBranch = pull_request.base.ref;
    let defaultBranch = repository.default_branch;

    if (!defaultBranch) {
        try {
            const installationId = installation.id.toString();
            const repositoryName = repository.full_name;
            defaultBranch = await OctokitService.getDefaultBranch(installationId, repositoryName);
        } catch (error) {
            // Log the error but don't fail the webhook - continue processing
            dataLogger.warn(
                "Failed to validate default branch, continuing with processing",
                {
                    repositoryName: repository.full_name,
                    targetBranch,
                    error: error instanceof Error ? error.message : String(error)
                }
            );
        }
    }

    if (defaultBranch && targetBranch !== defaultBranch) {
        dataLogger.info(
            "PR skipped - not targeting default branch",
            {
                prNumber: pull_request.number,
                repositoryName: repository.full_name,
                targetBranch,
                defaultBranch,
                reason: "not_default_branch"
            }
        );

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "PR not targeting default branch - skipping review",
            meta: {
                prNumber: pull_request.number,
                repositoryName: repository.full_name,
                targetBranch,
                defaultBranch,
                reason: "not_default_branch"
            }
        });
        return;
    }

    // Add event metadata to request for use in controller
    req.body.webhookMeta = {
        eventType,
        action,
        deliveryId: req.get("X-GitHub-Delivery"),
        timestamp: new Date().toISOString()
    };

    next();
};
