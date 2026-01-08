import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload, APIResponse } from "../../models/ai-review.model";
import { WorkflowIntegrationService } from "../../services/ai-review/workflow-integration.service";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { PRAnalysisService } from "../../services/ai-review/pr-analysis.service";
import { stellarTimestampToDate } from "../../utilities/helper";
import { TaskStatus } from "../../../prisma_client";
import { ContractService } from "../../services/contract.service";
import { KMSService } from "../../services/kms.service";
import { FirebaseService } from "../../services/firebase.service";

/**
 * Handles GitHub PR webhook events
 */
export const handlePRWebhook = async (req: Request, res: Response, next: NextFunction) => {
    const { action, pull_request } = req.body;

    // Handle PR review events
    const validPRReviewActions = ["opened", "synchronize", "ready_for_review"];
    if (validPRReviewActions.includes(action)) {
        handlePRReview(req, res, next);
        return;
    }

    // Handle PR merged events for bounty payout
    if (action === "closed" && pull_request.merged) {
        handleBountyPayout(req, res, next);
        return;
    }

    res.status(STATUS_CODES.SUCCESS).json({
        success: true,
        message: "PR action not processed",
        action
    });
    return;
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
            return res.status(STATUS_CODES.UNKNOWN).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Handle case where PR is not eligible for analysis
        if (result.reason && !result.jobId) {
            return res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: result.reason,
                data: {
                    prNumber: payload.pull_request.number,
                    repositoryName: payload.repository.full_name
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Return success response with job information
        res.status(STATUS_CODES.BACKGROUND_JOB).json({
            success: true,
            message: "PR webhook processed successfully - analysis queued",
            data: {
                jobId: result.jobId,
                installationId: result.prData?.installationId,
                repositoryName: result.prData?.repositoryName,
                prNumber: result.prData?.prNumber,
                prUrl: result.prData?.prUrl,
                linkedIssuesCount: result.prData?.linkedIssues.length || 0,
                changedFilesCount: result.prData?.changedFiles.length || 0,
                eligibleForAnalysis: true,
                status: "queued"
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

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

            return res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "No linked issues found - no payment triggered",
                data: { prNumber, repositoryName, prUrl }
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

            return res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "No matching active or submitted task found",
                data: { prNumber, repositoryName, prUrl, linkedIssues: linkedIssues.map(i => i.number) }
            });
        }

        // Verify contributor has a wallet
        if (!relatedTask.contributor || !relatedTask.contributor.wallet || !relatedTask.contributor.wallet.address) {
            return res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "No wallet address found for contributor",
                data: { prNumber, repositoryName, prUrl, linkedIssues: linkedIssues.map(i => i.number) }
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
            res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: "PR merged - Payment processed successfully",
                data: {
                    prNumber,
                    repositoryName,
                    prUrl,
                    linkedIssues: linkedIssues.map(i => i.number)
                }
            });

            // Disable chat for the task
            FirebaseService.updateTaskStatus(relatedTask.id).catch(
                error => dataLogger.warn("Failed to disable chat", { taskId: relatedTask.id, error })
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

