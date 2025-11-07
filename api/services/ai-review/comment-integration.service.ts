import { ReviewResult } from "../../models/ai-review.model";
import { ReviewFormatterService } from "./comment-formatter.service";
import { AIReviewCommentService } from "./comment.service";
import { GitHubAPIError } from "../../models/error.model";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * Integrates review formatting and GitHub comment posting
 */
export class ReviewCommentIntegrationService {

    /**
     * Posts or updates a complete AI review comment on a PR
     * This is the main entry point for posting review results
     */
    public static async postReviewComment(result: ReviewResult): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
    }> {
        try {
            // Validate that we have the necessary data
            if (!this.validateReviewResult(result)) {
                return {
                    success: false,
                    error: "Invalid review result data"
                };
            }

            // Post or update the review comment
            const commentId = await AIReviewCommentService.postOrUpdateReview(result);

            return {
                success: true,
                commentId
            };

        } catch (error) {
            dataLogger.error("Error posting review comment", { error });

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Gets a preview of how the review comment will look
     * Useful for testing and debugging
     */
    public static previewReviewComment(result: ReviewResult): {
        success: boolean;
        preview?: string;
        compactSummary?: string;
        error?: string;
    } {
        try {
            if (!this.validateReviewResult(result)) {
                return {
                    success: false,
                    error: "Invalid review result data"
                };
            }

            const formattedReview = ReviewFormatterService.formatReview(result);
            const compactSummary = ReviewFormatterService.formatCompactSummary(result);

            return {
                success: true,
                preview: formattedReview.fullComment,
                compactSummary
            };

        } catch (error) {
            dataLogger.error("Error generating review preview", { error });

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Deletes an AI review comment (for cleanup or error recovery)
     */
    public static async deleteReviewComment(
        installationId: string,
        repositoryName: string,
        commentId: string
    ): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            await AIReviewCommentService.deleteReviewComment(
                installationId,
                repositoryName,
                commentId
            );

            return {
                success: true
            };

        } catch (error) {
            dataLogger.error("Error deleting review comment", { error });

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Gets all AI review comments for a PR
     */
    public static async getReviewComments(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<{
        success: boolean;
        comments?: Array<{ id: string; body: string; createdAt: string; updatedAt: string }>;
        error?: string;
    }> {
        try {
            const comments = await AIReviewCommentService.getAIReviewComments(
                installationId,
                repositoryName,
                prNumber
            );

            return {
                success: true,
                comments
            };

        } catch (error) {
            dataLogger.error("Error getting review comments", { error });

            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Handles the complete workflow of posting a review with error handling
     * This method includes retry logic and graceful degradation
     */
    public static async postReviewWithRetry(
        result: ReviewResult,
        maxRetries: number = 3
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
        attempts: number;
    }> {
        let lastError: Error | null = null;
        let attempts = 0;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            attempts++;

            try {
                const response = await this.postReviewComment(result);

                if (response.success) {
                    return {
                        success: true,
                        commentId: response.commentId,
                        attempts
                    };
                } else {
                    lastError = new Error(response.error || "Unknown error");

                    // Don't retry if it's a permission error
                    if (response.error?.includes("permission")) {
                        break;
                    }
                }

            } catch (error) {
                lastError = error as Error;

                // Don't retry if it's a GitHub API error with certain status codes
                if (error instanceof GitHubAPIError) {
                    if (error.statusCode === 403 || error.statusCode === 404) {
                        break; // Don't retry permission or not found errors
                    }
                }
            }

            // Wait before retrying (exponential backoff)
            if (attempt < maxRetries - 1) {
                const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                messageLogger.info(`Review comment posting failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        return {
            success: false,
            error: lastError?.message || "Unknown error occurred",
            attempts
        };
    }

    /**
     * Validates that a review result has all required data for posting
     */
    private static validateReviewResult(result: ReviewResult): boolean {
        if (!result) {
            messageLogger.error("Review result is null or undefined");
            return false;
        }

        const requiredFields = [
            "installationId",
            "repositoryName",
            "prNumber",
            "mergeScore"
        ];

        for (const field of requiredFields) {
            if (!(field in result) || result[field as keyof ReviewResult] === undefined) {
                messageLogger.error(`Review result missing required field: ${field}`);
                return false;
            }
        }

        // Validate merge score is within valid range
        if (typeof result.mergeScore !== "number" || result.mergeScore < 0 || result.mergeScore > 100) {
            messageLogger.error(`Invalid merge score: ${result.mergeScore}`);
            return false;
        }

        // Validate arrays exist (even if empty)
        if (!Array.isArray(result.rulesViolated)) {
            messageLogger.error("rulesViolated is not an array");
            return false;
        }

        if (!Array.isArray(result.rulesPassed)) {
            messageLogger.error("rulesPassed is not an array");
            return false;
        }

        if (!Array.isArray(result.suggestions)) {
            messageLogger.error("suggestions is not an array");
            return false;
        }

        return true;
    }

    /**
     * Creates a test review result for testing the comment formatting
     */
    public static createTestReviewResult(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): ReviewResult {
        return {
            installationId,
            repositoryName,
            prNumber,
            mergeScore: 75,
            rulesViolated: [
                {
                    ruleId: "test-rule-1",
                    ruleName: "Code Style Violation",
                    severity: "MEDIUM",
                    description: "Missing semicolons detected in JavaScript files",
                    details: "Found 3 instances of missing semicolons",
                    affectedFiles: ["src/main.js", "src/utils.js"]
                }
            ],
            rulesPassed: [
                {
                    ruleId: "test-rule-2",
                    ruleName: "Security Check",
                    severity: "HIGH",
                    description: "No security vulnerabilities detected"
                },
                {
                    ruleId: "test-rule-3",
                    ruleName: "Documentation",
                    severity: "LOW",
                    description: "All public functions have documentation"
                }
            ],
            suggestions: [
                {
                    file: "src/main.js",
                    lineNumber: 42,
                    type: "fix",
                    severity: "medium",
                    description: "Add semicolon at end of statement",
                    suggestedCode: "const result = calculateValue();",
                    reasoning: "Consistent code style improves readability and prevents potential issues"
                },
                {
                    file: "src/utils.js",
                    type: "improvement",
                    severity: "low",
                    description: "Consider using const instead of let for immutable variables",
                    reasoning: "Using const makes the code more predictable and prevents accidental reassignment"
                }
            ],
            reviewStatus: "COMPLETED",
            summary: "This PR shows good overall quality with minor style issues that should be addressed.",
            confidence: 0.85,
            processingTime: 15000,
            createdAt: new Date()
        };
    }

    /**
     * Formats an error message for posting when review analysis fails
     */
    public static async postAnalysisErrorComment(
        installationId: string,
        repositoryName: string,
        prNumber: number,
        error: string
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
    }> {
        try {
            const errorComment = ReviewFormatterService.formatErrorComment(
                installationId,
                prNumber,
                repositoryName,
                error
            );

            const commentId = await AIReviewCommentService.createComment(
                installationId,
                repositoryName,
                prNumber,
                errorComment
            );

            return {
                success: true,
                commentId
            };

        } catch (postError) {
            dataLogger.error("Error posting analysis error comment", { postError });

            return {
                success: false,
                error: postError instanceof Error ? postError.message : "Unknown error occurred"
            };
        }
    }
}
