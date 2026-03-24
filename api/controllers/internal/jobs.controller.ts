import { Request, Response, NextFunction } from "express";
import { orchestrationService } from "../../services/pr-review/orchestration.service";
import { statsigService } from "../../services/statsig.service";
import { PRAnalysisService } from "../../services/pr-review/pr-analysis.service";
import { indexingService } from "../../services/pr-review/indexing.service";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { prisma } from "../../config/database.config";
import { TaskStatus } from "../../../prisma_client";
import { KMSService } from "../../services/kms.service";
import { ContractService } from "../../services/contract.service";
import { FirebaseService } from "../../services/firebase.service";
import { OctokitService } from "../../services/octokit.service";
import { TaskIssue } from "../../models/task.model";

/**
 * Handles incoming Cloud Tasks jobs for PR Analysis
 */
export const handlePRAnalysisJob = async (req: Request, res: Response, next: NextFunction) => {
    const { payload, isActualFollowUp, pendingCommentId } = req.body;
    const { pull_request } = payload;

    try {
        dataLogger.info("Received PR Analysis job from Cloud Tasks", { prNumber: pull_request?.number });

        // Extract and validate PR data
        const prData = await PRAnalysisService.createCompletePRData(payload);
        prData.pendingCommentId = pendingCommentId;

        // Handle follow-up vs new review
        if (isActualFollowUp) {
            await orchestrationService.updateExistingReview(prData);
        } else {
            await orchestrationService.analyzePullRequest(prData);
        }

        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            isActualFollowUp ? "pr_review_followup_success" : "pr_review_success",
            undefined,
            { prNumber: pull_request?.number, installationId: payload.installation?.id?.toString() }
        );

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "PR Analysis job completed"
        });
    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            isActualFollowUp ? "pr_review_followup_failed" : "pr_review_failed",
            undefined,
            {
                error: error instanceof Error ? error.message : "Unknown error",
                prNumber: pull_request?.number,
                installationId: payload.installation?.id?.toString()
            }
        );
        next(error);
    }
};

/**
 * Handles incoming Cloud Tasks jobs for Repository Indexing
 */
export const handleRepositoryIndexingJob = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, repositoryName } = req.body;

    try {
        dataLogger.info("Received Repository Indexing job from Cloud Tasks", { installationId, repositoryName });

        // Index the repository
        await indexingService.indexRepository(installationId, repositoryName);

        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            "repository_indexing_success",
            undefined,
            { installationId, repositoryName }
        );

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "Repository Indexing job completed"
        });
    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            "repository_indexing_failed",
            undefined,
            {
                error: error instanceof Error ? error.message : "Unknown error",
                installationId,
                repositoryName
            }
        );
        next(error);
    }
};

/**
 * Handles incoming Cloud Tasks jobs for Incremental Indexing
 */
export const handleIncrementalIndexingJob = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, repositoryName, filesToIndex, filesToRemove } = req.body;

    try {
        dataLogger.info("Received Incremental Indexing job from Cloud Tasks", {
            installationId, repositoryName,
            filesToIndex: filesToIndex?.length,
            filesToRemove: filesToRemove?.length
        });

        // Index changed files
        await indexingService.indexChangedFiles(
            installationId,
            repositoryName,
            filesToIndex,
            filesToRemove
        );

        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            "incremental_indexing_success",
            undefined,
            { installationId, repositoryName }
        );

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { success: true },
            message: "Incremental Indexing job completed"
        });
    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            "incremental_indexing_failed",
            undefined,
            {
                error: error instanceof Error ? error.message : "Unknown error",
                installationId,
                repositoryName
            }
        );
        next(error);
    }
};

/**
 * Handles incoming Cloud Tasks jobs for Bounty Payout
 */
export const handleBountyPayoutJob = async (req: Request, res: Response, next: NextFunction) => {
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

            try {
                // Add bounty paid label to the issue
                await OctokitService.addBountyPaidLabel(
                    relatedTask.installation.id,
                    (relatedTask.issue as TaskIssue).id
                ).catch(
                    error => dataLogger.warn("Failed to add bounty paid label", { taskId: relatedTask.id, error })
                );

                // Disable chat for the task
                await FirebaseService.updateTaskStatus(relatedTask.id).catch(
                    error => dataLogger.warn("Failed to disable chat", { taskId: relatedTask.id, error })
                );

                // Update contributor activity for live updates
                await FirebaseService.updateAppActivity({
                    userId: relatedTask.contributor.userId,
                    type: "contributor"
                }).catch(
                    error => dataLogger.warn(
                        "Failed to update contributor activity for live updates",
                        { contributorId: relatedTask.contributor?.userId, error }
                    )
                );

                // Update installation activity for live updates
                await FirebaseService.updateAppActivity({
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
            } catch {
                // Ignore 
            }

            // Log statsig event
            statsigService.logEvent(
                { userID: "system" },
                "bounty_payout_pr_merge_success",
                relatedTask.bounty.toString(),
                { installationId, repositoryName, prNumber: prNumber?.toString() }
            );

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
        } catch (error) {
            dataLogger.error("Contribution approved on smart contract but DB failed to update", {
                taskId: relatedTask.id,
                error
            });
            throw error;
        }

    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: "system" },
            "bounty_payout_pr_merge_failed",
            undefined,
            {
                error: error instanceof Error ? error.message : "Unknown error",
                installationId: req.body?.installation?.id?.toString(),
                repositoryName: req.body?.repositoryName,
                prNumber: req.body?.prNumber?.toString()
            }
        );
        next(error);
    }
};
