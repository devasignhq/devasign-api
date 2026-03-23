import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { orchestrationService } from "../pr-review/orchestration.service";
import { cloudTasksService } from "../cloud-tasks.service";

export class PullRequestWebhookService {
    /**
     * Handles GitHub PR webhook events
     */
    static async handlePREvent(req: Request, res: Response, next: NextFunction) {
        const { action, pull_request } = req.body;

        switch (action) {
            case "opened":
            case "synchronize":
            case "ready_for_review":
                await PullRequestWebhookService.handlePRReview(req, res, next);
                return;

            case "closed":
                // Handle PR merged events for bounty payout
                if (pull_request?.merged) {
                    try {
                        const payload = {
                            pull_request: {
                                number: pull_request.number,
                                html_url: pull_request.html_url,
                                body: pull_request.body,
                                user: { login: pull_request.user.login }
                            },
                            repository: { full_name: req.body.repository?.full_name },
                            installation: { id: req.body.installation?.id }
                        };
                        const jobId = await cloudTasksService.addBountyPayoutJob(payload);

                        responseWrapper({
                            res,
                            status: STATUS_CODES.BACKGROUND_JOB,
                            data: {
                                jobId,
                                prNumber: pull_request.number,
                                prUrl: pull_request.html_url,
                                repositoryName: req.body.repository?.full_name,
                                status: "queued",
                                timestamp: new Date().toISOString()
                            },
                            message: "Bounty payout job queued"
                        });
                    } catch (error) {
                        next(error);
                    }
                    return;
                }
                break;

            default:
                break;
        }

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { action },
            message: "PR action not processed"
        });
    }

    /**
     * Handles GitHub PR analysis
     */
    static async handlePRReview(req: Request, res: Response, next: NextFunction) {
        try {
            const payload: GitHubWebhookPayload = req.body;

            // Trigger review background job
            const result = await orchestrationService.triggerReviewBackgroundJob(payload);

            if (!result.success) {
                dataLogger.error("Failed to process PR webhook", {
                    payload,
                    result
                });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SERVER_ERROR,
                    data: { timestamp: new Date().toISOString() },
                    message: result.error || "Failed to process PR webhook"
                });
            }

            // Return success response with job information
            responseWrapper({
                res,
                status: STATUS_CODES.BACKGROUND_JOB,
                data: {
                    jobId: result.jobId,
                    installationId: payload.installation.id.toString(),
                    repositoryName: payload.repository.full_name,
                    prNumber: payload.pull_request.number,
                    prUrl: payload.pull_request.html_url,
                    eligibleForAnalysis: true,
                    status: "queued",
                    timestamp: new Date().toISOString()
                },
                message: "PR webhook processed successfully - analysis queued"
            });

        } catch (error) {
            next(error);
        }
    }

}
