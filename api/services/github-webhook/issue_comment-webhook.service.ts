import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { WorkflowIntegrationService } from "../pr-review/workflow-integration.service";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { OctokitService } from "../octokit.service";

export class IssueCommentWebhookService {
    /**
     * Handles issue_comment events.
     * When the comment body is exactly "review" (case-insensitive) and the comment
     * is posted on a pull request, it triggers a PR review regardless of whether
     * the PR has any linked issues.
     */
    static async handleReviewCommentTrigger(req: Request, res: Response, next: NextFunction) {
        try {
            const { comment, issue, repository, installation } = req.body;

            // Only act on PR comments (GitHub issues that are pull requests have a pull_request key)
            if (!issue.pull_request) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Comment is not on a pull request - skipping"
                });
            }

            // Only trigger when the comment body is exactly "review" (case-insensitive, trimmed)
            const commentBody: string = (comment.body ?? "").trim();
            if (commentBody.toLowerCase() !== "review") {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Comment body is not 'review' - skipping"
                });
            }

            const installationId = installation.id.toString();

            // Check if user is part of the installation
            const userInstallation = await prisma.installation.findUnique({
                where: {
                    id: installationId,
                    users: { some: { username: comment.user?.login } }
                },
                select: { id: true }
            });

            // Return success if user is not part of the installation
            if (!userInstallation) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "User is not part of this installation - skipping"
                });
            }

            dataLogger.info(
                "'review' comment detected on PR - triggering manual review",
                {
                    prNumber: issue.number,
                    repository: repository.full_name,
                    commenter: comment.user?.login
                }
            );

            // Fetch the full PR object from the GitHub API
            const repositoryName = repository.full_name;
            const prNumber: number = issue.number;

            const octokit = await OctokitService.getOctokit(installationId);
            const [owner, repo] = OctokitService.getOwnerAndRepo(repositoryName);
            const { data: pull_request } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            // Check for draft PRs
            if (pull_request?.draft) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Skipping draft PR"
                });
            }

            // Validate that the PR is targeting the default branch
            const targetBranch = pull_request.base.ref;
            let defaultBranch = pull_request.base.repo?.default_branch;

            // Fetch the default branch from the API if not available on the payload
            if (!defaultBranch) {
                try {
                    defaultBranch = await OctokitService.getDefaultBranch(installationId, repositoryName);
                } catch (error) {
                    // Non-fatal — log and continue
                    dataLogger.warn(
                        "Failed to validate default branch for 'review' trigger, continuing with processing",
                        {
                            repositoryName,
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
                        prNumber,
                        repositoryName,
                        targetBranch,
                        defaultBranch,
                        reason: "not_default_branch"
                    }
                );
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "PR not targeting default branch - skipping review",
                    meta: { prNumber, repositoryName, targetBranch, defaultBranch, reason: "not_default_branch" }
                });
            }

            // Build an explicit GitHubWebhookPayload — no req.body mutation needed.
            // manualTrigger: true signals downstream services to bypass the linked-issues check.
            const payload: GitHubWebhookPayload = {
                action: "opened",
                number: prNumber,
                pull_request: pull_request as unknown as GitHubWebhookPayload["pull_request"],
                repository,
                installation,
                manualTrigger: true
            };

            const workflowService = WorkflowIntegrationService.getInstance();
            const result = await workflowService.processWebhookWorkflow(payload);

            if (!result.success) {
                dataLogger.error("Failed to process 'review' comment trigger", { payload, result });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SERVER_ERROR,
                    data: { timestamp: new Date().toISOString() },
                    message: result.error || "Failed to process review trigger"
                });
            }

            if (result.reason && !result.jobId) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {
                        prNumber,
                        repositoryName,
                        timestamp: new Date().toISOString()
                    },
                    message: result.reason
                });
            }

            responseWrapper({
                res,
                status: STATUS_CODES.BACKGROUND_JOB,
                data: {
                    jobId: result.jobId,
                    installationId: result.prData?.installationId,
                    repositoryName: result.prData?.repositoryName,
                    prNumber: result.prData?.prNumber,
                    prUrl: result.prData?.prUrl,
                    linkedIssuesCount: result.prData?.linkedIssues.length || 0,
                    changedFilesCount: result.prData?.changedFiles.length || 0,
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
