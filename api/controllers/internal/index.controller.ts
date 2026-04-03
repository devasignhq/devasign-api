import { Request, Response, NextFunction } from "express";
import { statsigService } from "../../services/statsig.service";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { prisma } from "../../config/database.config";
import { KMSService } from "../../services/kms.service";
import { ContractService } from "../../services/contract.service";
import { FirebaseService } from "../../services/firebase.service";
import { OctokitService } from "../../services/octokit.service";
import { TaskIssue } from "../../models/task.model";
import { SocketService } from "../../services/socket.service";
import { LinkedIssue } from "../../models/ai-review.model";

/**
 * Handles incoming Cloud Tasks jobs for Bounty Payout
 */
export const handleBountyPayoutJob = async (req: Request, res: Response, next: NextFunction) => {
    const { pull_request, repository, installation, taskId } = req.body;

    const linkedIssues: LinkedIssue[] = req.body.linkedIssues || [];
    const prNumber = pull_request.number;
    const prUrl = pull_request.html_url;
    const repositoryName = repository.full_name;
    const installationId = installation.id.toString();

    try {
        // Check if taskId is present in the payload
        if (!taskId) {
            return responseWrapper({
                res,
                status: STATUS_CODES.SERVER_ERROR,
                data: { prNumber, repositoryName, prUrl },
                message: "Task ID is missing from payload"
            });
        }

        // Fetch related task details securely within the job
        const relatedTask = await prisma.task.findUnique({
            where: { id: taskId },
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

        if (!relatedTask) {
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { prNumber, repositoryName, prUrl },
                message: "Task not found"
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

        // Decrypt installation wallet secret
        const decryptedWalletSecret = await KMSService.decryptWallet(relatedTask.installation.wallet);
        
        // Approve completion via smart contract
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

            // Execute post-payout side effects concurrently
            await Promise.allSettled([
                // Add bounty paid label to the issue
                OctokitService.addBountyPaidLabel(
                    relatedTask.installation.id,
                    (relatedTask.issue as TaskIssue).id
                ).catch(
                    error => dataLogger.warn("Failed to add bounty paid label", { taskId: relatedTask.id, error })
                ),

                // Disable chat for the task
                FirebaseService.updateTaskStatus(relatedTask.id).catch(
                    error => dataLogger.warn("Failed to disable chat", { taskId: relatedTask.id, error })
                ),

                // Update contributor activity for live updates
                SocketService.updateAppActivity({
                    userId: relatedTask.contributor.userId,
                    type: "contributor"
                }).catch(
                    (error: Error) => dataLogger.warn(
                        "Failed to update contributor activity for live updates",
                        { contributorId: relatedTask.contributor?.userId, error }
                    )
                ),

                // Update installation activity for live updates
                SocketService.updateAppActivity({
                    userId: relatedTask.creatorId,
                    type: "installation",
                    installationId: relatedTask.installation.id,
                    operation: "task_completed",
                    issueUrl: prUrl,
                    message: "PR merged - Payment processed successfully",
                    metadata: { taskId: relatedTask.id, ...updatedTask }
                }).catch(
                    (error: Error) => dataLogger.warn(
                        "Failed to update installation activity for live updates",
                        { installationId: installation.id, prUrl, error }
                    )
                )
            ]);

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
