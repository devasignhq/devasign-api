import { ReviewResult } from "../../models/ai-review.model";
import { GitHubAPIError } from "../../models/error.model";
import { ReviewFormatterService } from "./comment-formatter.service";
import { OctokitService } from "../octokit.service";
import { prisma } from "../../config/database.config";
import { getFieldFromUnknownObject } from "../../utilities/helper";
import { InstallationOctokit } from "../../models/github.model";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * GitHub Comment Service
 * Handles posting and updating PR comments with AI review results
 */
export class AIReviewCommentService {

    /**
     * Posts or updates an AI review comment on a PR
     */
    public static async postOrUpdateReview(result: ReviewResult): Promise<string> {
        try {
            // Format the review into a structured comment
            const formattedReview = ReviewFormatterService.formatReview(result);

            // Check if there's already an AI review comment on this PR
            const existingCommentId = await this.findExistingReviewComment(
                result.installationId,
                result.repositoryName,
                result.prNumber
            );

            let commentId: string;

            if (existingCommentId) {
                // Update existing comment
                await this.updateComment(
                    result.installationId,
                    result.repositoryName,
                    existingCommentId,
                    formattedReview.fullComment
                );
                commentId = existingCommentId;
                messageLogger.info(`Updated existing AI review comment ${existingCommentId} on PR #${result.prNumber}`);
            } else {
                // Create new comment
                commentId = await this.createComment(
                    result.installationId,
                    result.repositoryName,
                    result.prNumber,
                    formattedReview.fullComment
                );
                messageLogger.info(`Created new AI review comment ${commentId} on PR #${result.prNumber}`);
            }

            // Store the comment ID in the database for future updates
            await this.storeCommentId(result, commentId);

            return commentId;

        } catch (error) {
            dataLogger.error("Error posting/updating review comment", { error });

            // Try to post an error comment instead
            try {
                const errorComment = ReviewFormatterService.formatErrorComment(
                    result.installationId,
                    result.prNumber,
                    result.repositoryName,
                    error instanceof Error ? error.message : "Unknown error occurred"
                );

                const errorCommentId = await this.createComment(
                    result.installationId,
                    result.repositoryName,
                    result.prNumber,
                    errorComment
                );

                messageLogger.info(`Posted error comment ${errorCommentId} on PR #${result.prNumber}`);
                return errorCommentId;

            } catch (errorCommentError) {
                dataLogger.error("Failed to post error comment", { errorCommentError });
                throw error; // Throw original error
            }
        }
    }

    /**
     * Creates a new comment on a PR
     */
    public static async createComment(
        installationId: string,
        repositoryName: string,
        prNumber: number,
        body: string
    ): Promise<string> {
        try {
            // Use the existing OctokitService to create the comment
            // Note: This assumes OctokitService has a method for creating PR comments
            // If not, we'll need to extend it or use the GitHub API directly

            const comment = await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                const response = await octokit.rest.issues.createComment({
                    owner,
                    repo,
                    issue_number: prNumber,
                    body
                });

                return response.data;
            });

            return comment.id.toString();

        } catch (error) {
            throw new GitHubAPIError(
                `Failed to create comment on PR #${prNumber} in ${repositoryName}`,
                {
                    installationId,
                    repositoryName,
                    prNumber,
                    bodyLength: body.length,
                    originalError: getFieldFromUnknownObject<string>(error, "message"),
                    operation: "createComment"
                },
                getFieldFromUnknownObject<number>(error, "status") || 500,
                getFieldFromUnknownObject<number>(error, "rateLimitRemaining") || 0
            );
        }
    }

    /**
     * Updates an existing comment on a PR
     */
    private static async updateComment(
        installationId: string,
        repositoryName: string,
        commentId: string,
        body: string
    ): Promise<void> {
        try {
            await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                await octokit.rest.issues.updateComment({
                    owner,
                    repo,
                    comment_id: parseInt(commentId),
                    body
                });
            });

        } catch (error) {
            throw new GitHubAPIError(
                `Failed to update comment ${commentId} in ${repositoryName}`,
                {
                    installationId,
                    repositoryName,
                    commentId,
                    bodyLength: body.length,
                    originalError: getFieldFromUnknownObject<string>(error, "message"),
                    operation: "updateComment"
                },
                getFieldFromUnknownObject<number>(error, "status") || 500,
                getFieldFromUnknownObject<number>(error, "rateLimitRemaining") || 0
            );
        }
    }

    /**
     * Finds existing AI review comment on a PR
     */
    private static async findExistingReviewComment(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<string | null> {
        try {
            // First, check if we have a stored comment ID in the database
            const storedResult = await prisma.aIReviewResult.findUnique({
                where: {
                    installationId_prNumber_repositoryName: {
                        installationId,
                        prNumber,
                        repositoryName
                    }
                },
                select: { commentId: true }
            });

            if (storedResult?.commentId) {
                // Verify the comment still exists
                const commentExists = await this.verifyCommentExists(
                    installationId,
                    repositoryName,
                    storedResult.commentId
                );

                if (commentExists) {
                    return storedResult.commentId;
                }
            }

            // If no stored comment ID or comment doesn't exist, search through PR comments
            const comments = await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                const response = await octokit.rest.issues.listComments({
                    owner,
                    repo,
                    issue_number: prNumber,
                    per_page: 100 // Should be enough for most PRs
                });

                return response.data;
            });

            // Look for AI review comment by checking for the marker
            for (const comment of comments) {
                if (ReviewFormatterService.isAIReviewComment(comment.body || "")) {
                    const marker = ReviewFormatterService.extractReviewMarker(comment.body || "");
                    if (marker && marker.installationId === installationId && marker.prNumber === prNumber) {
                        return comment.id.toString();
                    }
                }
            }

            return null;

        } catch (error) {
            dataLogger.error("Error finding existing review comment", { error });
            return null; // Return null to create a new comment instead
        }
    }

    /**
     * Verifies that a comment still exists
     */
    private static async verifyCommentExists(
        installationId: string,
        repositoryName: string,
        commentId: string
    ): Promise<boolean> {
        try {
            await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                await octokit.rest.issues.getComment({
                    owner,
                    repo,
                    comment_id: parseInt(commentId)
                });
            });

            return true;

        } catch (error) {
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");
            if (errorStatus === 404) {
                return false; // Comment doesn't exist
            }
            throw error; // Other errors should be propagated
        }
    }

    /**
     * Stores the comment ID in the database for future updates
     */
    private static async storeCommentId(result: ReviewResult, commentId: string): Promise<void> {
        try {
            await prisma.aIReviewResult.updateMany({
                where: {
                    installationId: result.installationId,
                    prNumber: result.prNumber,
                    repositoryName: result.repositoryName
                },
                data: {
                    commentId,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            dataLogger.error("Failed to store comment ID", { error });
            // Don't throw error to avoid breaking the main workflow
        }
    }

    /**
     * Deletes an AI review comment (for cleanup or error recovery)
     */
    public static async deleteReviewComment(
        installationId: string,
        repositoryName: string,
        commentId: string
    ): Promise<void> {
        try {
            await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                await octokit.rest.issues.deleteComment({
                    owner,
                    repo,
                    comment_id: parseInt(commentId)
                });
            });

            messageLogger.info(`Deleted AI review comment ${commentId} from ${repositoryName}`);

        } catch (error) {
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");
            if (errorStatus === 404) {
                messageLogger.info(`Comment ${commentId} already deleted or doesn't exist`);
                return; // Comment already deleted, no error
            }

            throw new GitHubAPIError(
                `Failed to delete comment ${commentId} in ${repositoryName}`,
                {
                    installationId,
                    repositoryName,
                    commentId,
                    originalError: getFieldFromUnknownObject<string>(error, "message"),
                    operation: "deleteComment"
                },
                errorStatus || 500,
                getFieldFromUnknownObject<number>(error, "rateLimitRemaining") || 0
            );
        }
    }

    /**
     * Gets all AI review comments for a PR (for debugging or management)
     */
    public static async getAIReviewComments(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<Array<{ id: string; body: string; createdAt: string; updatedAt: string }>> {
        try {
            const comments = await this.callGitHubAPI(installationId, async (octokit) => {
                const [owner, repo] = repositoryName.split("/");

                const response = await octokit.rest.issues.listComments({
                    owner,
                    repo,
                    issue_number: prNumber,
                    per_page: 100
                });

                return response.data;
            });

            // Filter for AI review comments
            return comments
                .filter((comment) => ReviewFormatterService.isAIReviewComment(comment.body || ""))
                .map((comment) => ({
                    id: comment.id.toString(),
                    body: comment.body || "",
                    createdAt: comment.created_at,
                    updatedAt: comment.updated_at
                }));

        } catch (error) {
            throw new GitHubAPIError(
                `Failed to get AI review comments for PR #${prNumber} in ${repositoryName}`,
                {
                    installationId,
                    repositoryName,
                    prNumber,
                    originalError: getFieldFromUnknownObject<string>(error, "message"),
                    operation: "getAIReviewComments"
                },
                getFieldFromUnknownObject<number>(error, "status") || 500,
                getFieldFromUnknownObject<number>(error, "rateLimitRemaining") || 0
            );
        }
    }

    /**
     * Helper method to call GitHub API with proper error handling and rate limiting
     */
    private static async callGitHubAPI<T>(
        installationId: string,
        operation: (octokit: InstallationOctokit) => Promise<T>
    ): Promise<T> {
        try {
            // Get Octokit instance for the installation using the private method pattern
            const octokit = await OctokitService.getOctokit(installationId);

            // Execute the operation with rate limiting
            return await this.withRateLimit(operation, octokit);

        } catch (error) {
            // Enhance error with installation context
            if (error instanceof GitHubAPIError) {
                throw error;
            }

            throw new GitHubAPIError(
                `GitHub API call failed for installation ${installationId}`,
                {
                    installationId,
                    originalError: getFieldFromUnknownObject<string>(error, "message"),
                    operation: "callGitHubAPI"
                },
                getFieldFromUnknownObject<number>(error, "status") || 500,
                getFieldFromUnknownObject<number>(error, "rateLimitRemaining") || 0
            );
        }
    }

    /**
     * Handles GitHub API rate limiting with exponential backoff
     */
    private static async withRateLimit<T>(
        operation: (octokit: InstallationOctokit) => Promise<T>,
        octokit: InstallationOctokit,
        maxRetries: number = 3
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation(octokit);
            } catch (error) {
                lastError = error;
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");

                if (errorStatus === 429 || errorStatus === 403) {
                    // Rate limited, wait and retry
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    messageLogger.info(`GitHub API rate limited, waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }

                // Non-rate-limit error, don't retry
                throw error;
            }
        }

        throw lastError!;
    }
}
