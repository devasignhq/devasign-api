import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { cloudTasksService } from "../cloud-tasks.service";
import { TaskStatus } from "../../../prisma_client";
import { prisma } from "../../config/database.config";
import { PRAnalysisService } from "../pr-review/pr-analysis.service";

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
                    await PullRequestWebhookService.handleBountyPayout(req, res, next);
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
            const jobId = await cloudTasksService.addPRAnalysisJob(payload);

            if (!jobId) {
                dataLogger.error("Failed to process PR webhook", { payload });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SERVER_ERROR,
                    data: { timestamp: new Date().toISOString() },
                    message: "Failed to process PR webhook"
                });
            }

            // Return success response with job information
            responseWrapper({
                res,
                status: STATUS_CODES.BACKGROUND_JOB,
                data: {
                    jobId,
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

    /**
     * Handles GitHub PR bounty payout
     */
    static async handleBountyPayout(req: Request, res: Response, next: NextFunction) {
        const { pull_request, repository, installation } = req.body;

        const prNumber = pull_request.number;
        const prUrl = pull_request.html_url;
        const repositoryName = repository.full_name;
        const installationId = installation.id.toString();

        try {
            // Extract linked issues from PR body
            const linkedIssues = await PRAnalysisService.extractLinkedIssues(
                pull_request.body || "",
                installationId,
                repositoryName
            );

            // No linked issues found
            if (linkedIssues.length === 0) {
                dataLogger.info("No linked issues found", {
                    prNumber,
                    repositoryName,
                    prUrl
                });

                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { prNumber, repositoryName, prUrl },
                    message: "No linked issues found - no payment triggered"
                });
            }

            // Find related task for the merged PR
            const relatedTask = await prisma.task.findFirst({
                where: {
                    installationId,
                    status: {
                        in: [TaskStatus.MARKED_AS_COMPLETED, TaskStatus.IN_PROGRESS]
                    },
                    contributor: {
                        username: pull_request.user.login
                    },
                    issue: {
                        path: ["number"],
                        equals: linkedIssues[0].number
                    }
                },
                select: {
                    id: true
                }
            });

            // No matching task found
            if (!relatedTask) {
                dataLogger.info("No matching active or submitted task found", {
                    prNumber,
                    repositoryName,
                    prUrl,
                    linkedIssues: linkedIssues.map(i => i.number)
                });

                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { prNumber, repositoryName, prUrl, linkedIssues: linkedIssues.map(i => i.number) },
                    message: "No matching active or submitted task found"
                });
            }

            // Build payload for bounty payout job
            const payload = {
                taskId: relatedTask.id,
                linkedIssues,
                pull_request: {
                    number: pull_request.number,
                    html_url: pull_request.html_url,
                    user: { login: pull_request.user.login }
                },
                repository: { full_name: repository?.full_name },
                installation: { id: installation?.id }
            };

            // Trigger bounty payout job
            const jobId = await cloudTasksService.addBountyPayoutJob(payload);

            // Return success response with job information
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
    }
}
