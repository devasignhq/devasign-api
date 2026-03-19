import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { WorkflowIntegrationService } from "../pr-review/workflow-integration.service";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { PRAnalysisService } from "../pr-review/pr-analysis.service";
import { TaskStatus } from "../../../prisma_client";
import { ContractService } from "../contract.service";
import { KMSService } from "../kms.service";
import { FirebaseService } from "../firebase.service";

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
    }

    /**
     * Handles GitHub PR merge event and bounty disbursement
     */
    static async handleBountyPayout(req: Request, res: Response, next: NextFunction) {
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
                const [updatedTask] = await prisma.$transaction([
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
                        },
                        select: {
                            status: true,
                            completedAt: true,
                            settled: true,
                            updatedAt: true
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
                            activeTasks: { decrement: 1 },
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
                    message: "PR merged - Payment processed successfully",
                    metadata: { taskId: relatedTask.id, ...updatedTask }
                }).catch(
                    error => dataLogger.warn(
                        "Failed to update installation activity for live updates",
                        { installationId: installation.id, prUrl, error }
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
    }
}
