import { PullRequestData, ReviewResult } from "../../models/ai-review.model";
import { PRAnalysisError } from "../../models/error.model";
import { AIReviewCommentService } from "./comment.service";
import { ReviewStatus } from "../../../prisma_client";
import { prisma } from "../../config/database.config";
import { PRAnalysisService } from "./pr-analysis.service";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * AI Review Orchestration Service
 * Main service that coordinates the entire PR analysis workflow
 */
export class AIReviewOrchestrationService {

    // Configuration for async processing and retries
    private readonly config = {
        maxRetries: parseInt(process.env.AI_REVIEW_MAX_RETRIES || "3"),
        timeoutMs: parseInt(process.env.AI_REVIEW_TIMEOUT_MS || "300000"), // 5 minutes
        retryDelayMs: parseInt(process.env.AI_REVIEW_RETRY_DELAY_MS || "5000"), // 5 seconds
        enableGracefulDegradation: process.env.AI_REVIEW_GRACEFUL_DEGRADATION !== "false"
    };

    /**
     * Creates initial review result record in database.
     * Always creates a new record for every analysis cycle (initial or follow-up).
     */
    private async createInitialReviewResult(prData: PullRequestData) {
        try {
            // Always create a new record so we have a full history of reviews
            const created = await prisma.aIReviewResult.create({
                data: {
                    installationId: prData.installationId,
                    prNumber: prData.prNumber,
                    prUrl: prData.prUrl,
                    repositoryName: prData.repositoryName,
                    commentId: prData.pendingCommentId,
                    mergeScore: 0,
                    rulesViolated: [],
                    rulesPassed: [],
                    suggestions: [],
                    reviewStatus: ReviewStatus.IN_PROGRESS
                }
            });

            return created;
        } catch (error) {
            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to create initial review result",
                { originalError: error instanceof Error ? error.message : String(error) }
            );
        }
    }

    /**
     * Updates review status in database for a specific record.
     */
    private async updateReviewStatus(
        id: string,
        status: ReviewStatus
    ): Promise<void> {
        try {
            await prisma.aIReviewResult.update({
                where: { id },
                data: {
                    reviewStatus: status,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            dataLogger.error("Failed to update review status", { id, error });
        }
    }

    /**
     * Checks whether a completed initial review already exists in the database for this PR.
     * Used by the workflow layer to determine if a `synchronize` event should trigger a
     * follow-up review instead of a fresh initial review.
     */
    public async hasCompletedReview(
        installationId: string,
        prNumber: number,
        repositoryName: string
    ): Promise<boolean> {
        try {
            const existing = await prisma.aIReviewResult.findFirst({
                where: {
                    installationId,
                    prNumber,
                    repositoryName,
                    reviewStatus: ReviewStatus.COMPLETED
                },
                select: { id: true }
            });
            return !!existing;
        } catch (error) {
            dataLogger.error("Failed to check existing review status", { error });
            return false;
        }
    }

    /**
     * Stores final review result in database for a specific record.
     */
    private async storeReviewResult(id: string, result: ReviewResult): Promise<void> {
        try {
            await prisma.aIReviewResult.update({
                where: { id },
                data: {
                    mergeScore: result.mergeScore,
                    suggestions: result.suggestions,
                    reviewStatus: result.reviewStatus,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            dataLogger.error("Failed to store review result", { id, error });
        }
    }

    /**
     * Posts review comment to GitHub PR and persists the commentId.
     */
    private async postReviewComment(id: string, result: ReviewResult): Promise<void> {
        try {
            const commentResult = await AIReviewCommentService.postReviewResult(result, 3);

            if (commentResult.success && commentResult.commentId) {
                await prisma.aIReviewResult.update({
                    where: { id },
                    data: { commentId: commentResult.commentId }
                });
                messageLogger.info(`Successfully posted review comment ${commentResult.commentId} for PR #${result.prNumber}`);
            } else if (!commentResult.success) {
                messageLogger.error(`Failed to post review comment for PR #${result.prNumber}`, { error: commentResult.error });

                try {
                    await AIReviewCommentService.postErrorComment(
                        result.installationId,
                        result.repositoryName,
                        result.prNumber,
                        "Review analysis completed but failed to post detailed results. Please check the logs.",
                        result.commentId
                    );
                } catch (errorCommentError) {
                    dataLogger.error("Failed to post error comment", { errorCommentError });
                }
            }
        } catch (error) {
            dataLogger.error("Error in review comment posting", { id, error });
        }
    }

    /**
     * Posts a follow-up review as a brand-new comment and persists the commentId.
     */
    private async postFollowUpReviewComment(id: string, result: ReviewResult): Promise<void> {
        try {
            const commentResult = await AIReviewCommentService.postFollowUpReviewResult(result, 3);

            if (commentResult.success && commentResult.commentId) {
                await prisma.aIReviewResult.update({
                    where: { id },
                    data: { commentId: commentResult.commentId }
                });
                messageLogger.info(`Successfully posted follow-up review comment ${commentResult.commentId} for PR #${result.prNumber}`);
            } else if (!commentResult.success) {
                messageLogger.error(`Failed to post follow-up review comment for PR #${result.prNumber}`, { error: commentResult.error });

                try {
                    await AIReviewCommentService.postErrorComment(
                        result.installationId,
                        result.repositoryName,
                        result.prNumber,
                        "Follow-up review analysis completed but failed to post results. Please check the logs.",
                        result.commentId
                    );
                } catch (errorCommentError) {
                    dataLogger.error("Failed to post error comment", { errorCommentError });
                }
            }
        } catch (error) {
            dataLogger.error("Error posting follow-up review comment", { id, error });
        }
    }

    /**
     * Analyzes PR
     */
    async analyzePullRequest(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        let initialResultId: string | undefined;

        try {
            // Create initial review result record
            const initialResult = await this.createInitialReviewResult(prData);
            initialResultId = initialResult.id;

            // Execute analysis
            const reviewResult = await PRAnalysisService.analyzePullRequest(prData);

            // Carry the record ID for database lookups during comment updates
            reviewResult.id = initialResult.id;

            // Update the result with processing time
            reviewResult.processingTime = Date.now() - startTime;

            // Store results and update status
            await this.storeReviewResult(initialResult.id, reviewResult);

            // Persist the initial diff+summary into contextMetrics so the first follow-up
            // has something meaningful to compare against.
            try {
                const initialDiff = prData.changedFiles.map((file) =>
                    `\n--- ${file.filename} (${file.status}) ---\n${file.patch}`
                ).join("\n");

                await prisma.aIReviewResult.update({
                    where: { id: initialResult.id },
                    data: {
                        contextMetrics: {
                            lastReviewSummary: reviewResult.summary,
                            lastReviewDiff: initialDiff
                        }
                    }
                });
            } catch (persistError) {
                dataLogger.error("Failed to persist initial diff/summary", { persistError });
            }

            // Post review comment to GitHub
            await this.postReviewComment(initialResult.id, reviewResult);

            messageLogger.info(`Pull request context analysis completed successfully for PR #${prData.prNumber} in ${reviewResult.processingTime}ms`);

            return reviewResult;

        } catch (error) {
            dataLogger.error(
                `Analysis failed for PR #${prData.prNumber} in ${prData.repositoryName}`,
                {
                    error,
                    processingTime: Date.now() - startTime
                }
            );

            if (initialResultId) {
                await this.updateReviewStatus(initialResultId, ReviewStatus.FAILED);
            }

            try {
                await AIReviewCommentService.postErrorComment(
                    prData.installationId,
                    prData.repositoryName,
                    prData.prNumber,
                    `Review failed: ${(error as Error).message}. Please review manually.`,
                    prData.pendingCommentId
                );
            } catch (commentError) {
                dataLogger.error("Failed to post error comment", { commentError });
            }

            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to complete initial review",
                error
            );
        }
    }

    /**
     * Handles a follow-up review triggered when new commits are pushed to an already-reviewed PR.
     * Always posts a NEW comment (never updates the original review comment).
     */
    async updateExistingReview(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        let recordId: string | undefined;

        try {
            messageLogger.info(`Starting follow-up review for PR #${prData.prNumber} in ${prData.repositoryName}`);

            // Always create a NEW record for the follow-up
            const initialResult = await this.createInitialReviewResult(prData);
            recordId = initialResult.id;

            // Run the follow-up analysis
            const reviewResult = await PRAnalysisService.analyzePullRequestFollowUp(prData);

            // Carry the record ID
            reviewResult.id = recordId;

            reviewResult.processingTime = Date.now() - startTime;

            // Update the specific record for this follow-up
            await this.storeReviewResult(recordId, reviewResult);

            // Persist the CURRENT diff + summary so the NEXT follow-up has context
            try {
                const currentDiff = prData.changedFiles.map((file) =>
                    `\n--- ${file.filename} (${file.status}) ---\n${file.patch}`
                ).join("\n");

                await prisma.aIReviewResult.update({
                    where: { id: recordId },
                    data: {
                        contextMetrics: {
                            lastReviewSummary: reviewResult.summary,
                            lastReviewDiff: currentDiff
                        }
                    }
                });
            } catch (persistError) {
                dataLogger.error("Failed to persist follow-up diff/summary", { persistError });
            }

            // Post the follow-up review as a BRAND-NEW comment
            await this.postFollowUpReviewComment(recordId, reviewResult);

            messageLogger.info(`Follow-up review completed for PR #${prData.prNumber} in ${reviewResult.processingTime}ms`);

            return reviewResult;

        } catch (error) {
            dataLogger.error("Follow-up review failed", { error, prNumber: prData.prNumber });

            if (recordId) {
                await this.updateReviewStatus(recordId, ReviewStatus.FAILED);
            }

            try {
                await AIReviewCommentService.postErrorComment(
                    prData.installationId,
                    prData.repositoryName,
                    prData.prNumber,
                    `Follow-up review failed: ${(error as Error).message}. Please review manually.`,
                    prData.pendingCommentId
                );
            } catch (commentError) {
                dataLogger.error("Failed to post error comment", { commentError });
            }

            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to complete follow-up review",
                error
            );
        }
    }
}
