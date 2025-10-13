import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { GitHubWebhookError } from "../models/error.model";
import { OctokitService } from "../services/octokit.service";
import { STATUS_CODES } from "../helper";
import { dataLogger } from "../config/logger.config";

/**
 * Middleware to validate GitHub webhook signatures
 */
export const validateGitHubWebhook = (req: Request, res: Response, next: NextFunction): void => {
    try {
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
        if (error instanceof GitHubWebhookError) {
            res.status(error.status).json({
                success: false,
                error: error.message,
                code: error.code
            });
            return;
        }

        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: "Webhook validation failed",
            code: "WEBHOOK_VALIDATION_ERROR"
        });
        return;
    }
};

/**
 * Middleware to validate webhook event types and default branch targeting
 * Only processes PR events that we care about and target the default branch
 * 
 * This middleware validates:
 * - Event type is 'pull_request'
 * - Action is one of: 'opened', 'synchronize', 'ready_for_review'
 * - PR is targeting the repository's default branch (main/master)
 * 
 * PRs targeting non-default branches are skipped with appropriate logging.
 */
export const validatePRWebhookEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const eventType = req.get("X-GitHub-Event");
        const { action, pull_request, repository, installation } = req.body;

        // Only process pull_request events
        if (eventType !== "pull_request") {
            res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "Event type not processed",
                eventType
            });
            return;
        }

        // Only process specific PR actions
        const validActions = ["opened", "synchronize", "ready_for_review"];
        if (!validActions.includes(action)) {
            res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "PR action not processed",
                action
            });
            return;
        }

        // Validate that PR is targeting the default branch
        if (pull_request && repository && installation) {
            try {
                const installationId = installation.id.toString();
                const repositoryName = repository.full_name;
                const targetBranch = pull_request.base.ref;

                // Get the repository's default branch
                const defaultBranch = await OctokitService.getDefaultBranch(installationId, repositoryName);

                // Only process PRs targeting the default branch
                if (targetBranch !== defaultBranch) {
                    dataLogger.info(
                        "PR skipped - not targeting default branch",
                        {
                            prNumber: pull_request.number,
                            repositoryName,
                            targetBranch,
                            defaultBranch,
                            reason: "not_default_branch"
                        }
                    );

                    res.status(STATUS_CODES.SUCCESS).json({
                        success: true,
                        message: "PR not targeting default branch - skipping review",
                        data: {
                            prNumber: pull_request.number,
                            repositoryName,
                            targetBranch,
                            defaultBranch,
                            reason: "not_default_branch"
                        }
                    });
                    return;
                }
            } catch (error) {
                // Log the error but don't fail the webhook - continue processing
                dataLogger.warn(
                    "Failed to validate default branch, continuing with processing",
                    {
                        repositoryName: repository.full_name,
                        targetBranch: pull_request.base.ref,
                        error: error instanceof Error ? error.message : String(error)
                    }
                );
            }
        }

        // Add event metadata to request for use in controller
        req.body.webhookMeta = {
            eventType,
            action,
            deliveryId: req.get("X-GitHub-Delivery"),
            timestamp: new Date().toISOString()
        };

        next();
    } catch (error) {
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error,
            code: "EVENT_VALIDATION_ERROR"
        });
        return;
    }
};
