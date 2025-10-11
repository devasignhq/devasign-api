import { PullRequestData, ReviewResult } from "../models/ai-review.model";
import { PRAnalysisError } from "../models/error.model";
import { ReviewCommentIntegrationService } from "./review-comment-integration.service";
import { ReviewStatus } from "../generated/client";
import { prisma } from "../config/database.config";
import { PRAnalysisService } from "./pr-analysis.service";

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
     * Creates initial review result record in database
     */
    private async createInitialReviewResult(prData: PullRequestData) {
        try {
            const existingResult = await prisma.aIReviewResult.findUnique({
                where: {
                    installationId_prNumber_repositoryName: {
                        installationId: prData.installationId,
                        prNumber: prData.prNumber,
                        repositoryName: prData.repositoryName
                    }
                }
            });

            if (existingResult) {
                // Update existing record
                const updated = await prisma.aIReviewResult.update({
                    where: { id: existingResult.id },
                    data: {
                        reviewStatus: ReviewStatus.IN_PROGRESS,
                        updatedAt: new Date()
                    }
                });

                return updated;
            } else {
                // Create new record
                const created = await prisma.aIReviewResult.create({
                    data: {
                        installationId: prData.installationId,
                        prNumber: prData.prNumber,
                        prUrl: prData.prUrl,
                        repositoryName: prData.repositoryName,
                        mergeScore: 0,
                        rulesViolated: [],
                        rulesPassed: [],
                        suggestions: [],
                        reviewStatus: ReviewStatus.IN_PROGRESS
                    }
                });

                return created;
            }
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
     * Updates review status in database
     */
    private async updateReviewStatus(
        installationId: string,
        prNumber: number,
        repositoryName: string,
        status: ReviewStatus
    ): Promise<void> {
        try {
            await prisma.aIReviewResult.updateMany({
                where: {
                    installationId,
                    prNumber,
                    repositoryName
                },
                data: {
                    reviewStatus: status,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error("Failed to update review status:", error);
            // Don't throw error to avoid breaking main workflow
        }
    }

    /**
     * Stores final review result in database
     */
    private async storeReviewResult(result: ReviewResult): Promise<void> {
        try {
            await prisma.aIReviewResult.updateMany({
                where: {
                    installationId: result.installationId,
                    prNumber: result.prNumber,
                    repositoryName: result.repositoryName
                },
                data: {
                    mergeScore: result.mergeScore,
                    rulesViolated: result.rulesViolated,
                    rulesPassed: result.rulesPassed,
                    suggestions: result.suggestions,
                    reviewStatus: result.reviewStatus,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error("Failed to store review result:", error);
            // Don't throw error to avoid breaking main workflow
        }
    }

    /**
     * Posts review comment to GitHub PR
     */
    private async postReviewComment(result: ReviewResult): Promise<void> {
        try {
            const commentResult = await ReviewCommentIntegrationService.postReviewWithRetry(result, 3);

            if (commentResult.success) {
                console.log(`Successfully posted review comment ${commentResult.commentId} for PR #${result.prNumber}`);
            } else {
                console.error(`Failed to post review comment for PR #${result.prNumber}:`, commentResult.error);

                // Try to post a simple error comment instead
                try {
                    await ReviewCommentIntegrationService.postAnalysisErrorComment(
                        result.installationId,
                        result.repositoryName,
                        result.prNumber,
                        "Review analysis completed but failed to post detailed results. Please check the logs."
                    );
                } catch (errorCommentError) {
                    console.error("Failed to post error comment:", errorCommentError);
                }
            }
        } catch (error) {
            console.error("Error in review comment posting:", error);
            // Don't throw error to avoid breaking main workflow
        }
    }

    /**
     * Analyzes PR
     */
    async analyzePullRequest(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();

        try {
            // Create initial review result record
            await this.createInitialReviewResult(prData);

            // Execute analysis
            const reviewResult = await PRAnalysisService.analyzePullRequest(prData);

            // Update the result with processing time
            reviewResult.processingTime = Date.now() - startTime;

            // Store results and update status
            await this.storeReviewResult(reviewResult);

            // Post review comment to GitHub
            await this.postReviewComment(reviewResult);

            console.log(`Pull request context analysis completed successfully for PR #${prData.prNumber} in ${reviewResult.processingTime}ms`);

            return reviewResult;

        } catch (error) {
            console.error(
                `Analysis failed for PR #${prData.prNumber} in ${prData.repositoryName}:`, 
                error,
                `processingTime: ${Date.now() - startTime}`
            );

            try {
                await this.updateReviewStatus(prData.installationId, prData.prNumber, prData.repositoryName, ReviewStatus.FAILED);
            } catch (statusError) {
                console.error("Failed to update review status to FAILED:", statusError);
            }

            // Try to post error comment
            try {
                await ReviewCommentIntegrationService.postAnalysisErrorComment(
                    prData.installationId,
                    prData.repositoryName,
                    prData.prNumber,
                    `Analysis failed: ${(error as Error).message}. Please review manually.`
                );
            } catch (commentError) {
                console.error("Failed to post error comment:", commentError);
            }

            throw error;
        }
    }

    /**
     * Updates existing review for a PR
     */
    async updateExistingReview(prData: PullRequestData): Promise<ReviewResult> {
        // Use analysis for updates as well
        try {
            console.log(`Updating existing review for PR #${prData.prNumber}`);
            return await this.analyzePullRequest(prData);
        } catch (error) {
            console.error("Error updating existing review:", error);
            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to update existing review",
                error
            );
        }
    }
}
