import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { WorkflowIntegrationService } from "../../services/pr-review/workflow-integration.service";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { PRAnalysisService } from "../../services/pr-review/pr-analysis.service";
import { Task, TaskStatus } from "../../../prisma_client";
import { ContractService } from "../../services/contract.service";
import { KMSService } from "../../services/kms.service";
import { FirebaseService } from "../../services/firebase.service";
import { OctokitService } from "../../services/octokit.service";
import { TaskIssue } from "../../models/task.model";

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
        await handlePREvent(req, res, next);
        return;
    }

    if (eventType === "installation") {
        await handleInstallationEvent(req, res, next);
        return;
    }

    if (eventType === "issue_comment") {
        await handleReviewCommentTrigger(req, res, next);
        return;
    }

    responseWrapper({
        res,
        status: STATUS_CODES.SUCCESS,
        data: { eventType },
        message: "Event type not processed"
    });
};

/**
 * Handles GitHub PR webhook events
 */
const handlePREvent = async (req: Request, res: Response, next: NextFunction) => {
    const { action, pull_request } = req.body;

    // Handle PR review events
    const validPRReviewActions = ["opened", "synchronize", "ready_for_review"];
    if (validPRReviewActions.includes(action)) {
        await handlePRReview(req, res, next);
        return;
    }

    // Handle PR merged events for bounty payout
    if (action === "closed" && pull_request.merged) {
        await handleBountyPayout(req, res, next);
        return;
    }

    responseWrapper({
        res,
        status: STATUS_CODES.SUCCESS,
        data: { action },
        message: "PR action not processed"
    });
};

/**
 * Handles issue_comment events.
 * When the comment body is exactly "review" (case-insensitive) and the comment
 * is posted on a pull request, it triggers a PR review regardless of whether
 * the PR has any linked issues.
 */
const handleReviewCommentTrigger = async (req: Request, res: Response, next: NextFunction) => {
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
};

/**
 * Handles GitHub Installation webhook events
 */
const handleInstallationEvent = async (req: Request, res: Response, next: NextFunction) => {
    const { action, installation: githubInstallation } = req.body;
    const installationId = githubInstallation.id.toString();

    try {
        if (action === "created") {
            // Log creation, actual setup happens via user flow
            dataLogger.info(`Installation created: ${installationId}`);

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId },
                message: "Installation creation logged"
            });
            return;
        }

        if (action === "deleted" || action === "suspend") {
            // Archive installation and refund open tasks
            const installation = await prisma.installation.findUnique({
                where: { id: installationId },
                include: {
                    wallet: true,
                    tasks: {
                        where: {
                            status: {
                                in: ["OPEN", "IN_PROGRESS"]
                            },
                            bounty: { gt: 0 }
                        }
                    }
                }
            });

            if (!installation) {
                // Installation not found
                responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { installationId },
                    message: "Installation not found in database, skipping archive"
                });
                return;
            }

            let refundedAmount = 0;
            const taskRefunds: { task: Task; refunded: boolean }[] = [];

            // Refund escrow funds
            if (installation.wallet && installation.tasks.length > 0) {
                try {
                    const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);

                    for (const task of installation.tasks) {
                        try {
                            await ContractService.refund(decryptedWalletSecret, task.id);
                            refundedAmount += task.bounty;
                            taskRefunds.push({ task, refunded: true });
                        } catch (error) {
                            dataLogger.warn(`Failed to refund task ${task.id} during installation archive:`, { error });
                            taskRefunds.push({ task, refunded: false });
                        }
                    }
                } catch (error) {
                    dataLogger.error("Failed to decrypt wallet for refund during installation archive", { error });
                }
            }

            // Update installation status
            await prisma.installation.update({
                where: { id: installationId },
                data: { status: "ARCHIVED" }
            });

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId, refundedAmount },
                message: `Installation archived and ${refundedAmount} USDC refunded`
            });

            for (const taskRefund of taskRefunds) {
                // Remove bounty label and delete bounty comment
                const taskIssue = taskRefund.task.issue as TaskIssue;
                OctokitService.removeBountyLabelAndDeleteBountyComment(
                    installationId,
                    taskIssue.id,
                    taskIssue.bountyCommentId!,
                    taskIssue.bountyLabelId!
                ).catch((error) => {
                    dataLogger.warn(
                        `Failed to remove bounty label and delete bounty comment for task ${taskRefund.task.id} during installation archive:`,
                        { error }
                    );
                });

                // Update task status and settled state
                prisma.task.update({
                    where: { id: taskRefund.task.id },
                    data: {
                        status: "ARCHIVED",
                        settled: taskRefund.refunded
                    }
                }).catch((error) => {
                    dataLogger.warn(
                        `Failed to update task ${taskRefund.task.id} status to ARCHIVED during installation archive:`,
                        { error }
                    );
                });
            }
            return;
        }

        if (action === "unsuspend") {
            // Reactivate installation
            await prisma.installation.update({
                where: { id: installationId },
                data: { status: "ACTIVE" }
            });

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId },
                message: "Installation reactivated"
            });
            return;
        }

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { action },
            message: "Installation action not processed"
        });

    } catch (error) {
        next(error);
    }
};

/**
 * Handles GitHub PR analysis
 */
export const handlePRReview = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload: GitHubWebhookPayload = req.body;

        // Use the integrated workflow service for complete end-to-end processing
        const workflowService = WorkflowIntegrationService.getInstance();
        const result = await workflowService.processWebhookWorkflow(payload);

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

        // Handle case where PR is not eligible for analysis
        if (result.reason && !result.jobId) {
            dataLogger.info("PR is not eligible for analysis", {
                payload,
                result
            });
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: {
                    prNumber: payload.pull_request.number,
                    repositoryName: payload.repository.full_name,
                    timestamp: new Date().toISOString()
                },
                message: result.reason
            });
        }

        // Return success response with job information
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
};

/**
 * Handles GitHub PR merge event and bounty disbursement
 */
export const handleBountyPayout = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { pull_request, repository, installation } = req.body;

        const prNumber = pull_request.number;
        const prUrl = pull_request.html_url;
        const repositoryName = repository.full_name;
        const installationId = installation.id.toString();

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
                id: true,
                bounty: true,
                status: true,
                issue: true,
                creatorId: true,
                contributor: {
                    select: {
                        userId: true,
                        username: true,
                        wallet: { select: { address: true } }
                    }
                },
                installation: {
                    select: {
                        id: true,
                        wallet: true
                    }
                }
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

        // Verify contributor has a wallet
        if (!relatedTask.contributor || !relatedTask.contributor.wallet || !relatedTask.contributor.wallet.address) {
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { prNumber, repositoryName, prUrl, linkedIssues: linkedIssues.map(i => i.number) },
                message: "No wallet address found for contributor"
            });
        }

        // Transfer bounty from escrow to contributor via smart contract
        if (!relatedTask.installation.wallet) {
            throw new Error("Installation wallet not found");
        }

        const decryptedWalletSecret = await KMSService.decryptWallet(relatedTask.installation.wallet);
        const transactionResponse = await ContractService.approveCompletion(
            decryptedWalletSecret,
            relatedTask.id
        );

        try {
            await prisma.$transaction([
                // Update task as completed and settled
                prisma.task.update({
                    where: { id: relatedTask.id },
                    data: {
                        status: "COMPLETED",
                        completedAt: new Date(),
                        settled: true,
                        escrowTransactions: {
                            push: { txHash: transactionResponse.txHash, method: "bounty_payout" }
                        }
                    }
                }),
                // Record transaction for contributor
                prisma.transaction.create({
                    data: {
                        txHash: transactionResponse.txHash,
                        category: "BOUNTY",
                        amount: parseFloat(relatedTask.bounty.toString()),
                        task: { connect: { id: relatedTask.id } },
                        user: { connect: { userId: relatedTask.contributor.userId } },
                        doneAt: stellarTimestampToDate(transactionResponse.result.createdAt)
                    }
                }),
                // Update contribution summary
                prisma.contributionSummary.update({
                    where: { userId: relatedTask.contributor.userId },
                    data: {
                        tasksCompleted: { increment: 1 },
                        totalEarnings: { increment: relatedTask.bounty }
                    }
                })
            ]);

            // Send success response
            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: {
                    prNumber,
                    repositoryName,
                    prUrl,
                    linkedIssues: linkedIssues.map(i => i.number)
                },
                message: "PR merged - Payment processed successfully"
            });

            // Disable chat for the task
            FirebaseService.updateTaskStatus(relatedTask.id).catch(
                error => dataLogger.warn("Failed to disable chat", { taskId: relatedTask.id, error })
            );

            // Update contributor activity for live updates
            FirebaseService.updateAppActivity({
                userId: relatedTask.contributor.userId,
                type: "contributor"
            }).catch(
                error => dataLogger.warn(
                    "Failed to update contributor activity for live updates",
                    { contributorId: relatedTask.contributor?.userId, error }
                )
            );
            // Update installation activity for live updates
            FirebaseService.updateAppActivity({
                userId: relatedTask.creatorId,
                type: "installation",
                installationId: relatedTask.installation.id,
                operation: "task_completed",
                issueUrl: prUrl,
                message: "PR merged - Payment processed successfully"
            }).catch(
                error => dataLogger.warn(
                    "Failed to update installation activity for live updates",
                    { installationId: installation.id, error }
                )
            );
        } catch (error) {
            dataLogger.error("Contribution approved on smart contract but DB failed to update", {
                taskId: relatedTask.id,
                error
            });
            throw error;
        }

    } catch (error) {
        next(error);
    }
};

