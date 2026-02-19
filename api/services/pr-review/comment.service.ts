import { ReviewResult, FormattedReview, CodeSuggestion } from "../../models/ai-review.model";
import { GitHubAPIError } from "../../models/error.model";
import { OctokitService } from "../octokit.service";
import { prisma } from "../../config/database.config";
import { getFieldFromUnknownObject } from "../../utilities/helper";
import { InstallationOctokit } from "../../models/github.model";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * GitHub Comment Service
 * Handles formatting, posting, updating, and managing PR comments with AI review results.
 * Combines formatter, core logic, and integration/validation layers.
 */
export class AIReviewCommentService {

    // =========================================================================
    // Public API (Integration Layer)
    // =========================================================================

    /**
     * Posts or updates a complete AI review comment on a PR with retry logic and validation.
     * This is the main entry point for posting review results.
     */
    public static async postReviewResult(
        result: ReviewResult,
        maxRetries: number = 3
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
        attempts: number;
    }> {
        try {
            // Validate that we have the necessary data
            if (!this.validateReviewResult(result)) {
                return {
                    success: false,
                    error: "Invalid review result data",
                    attempts: 0
                };
            }

            let lastError: Error | null = null;
            let attempts = 0;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                attempts++;

                try {
                    const commentId = await this.postOrUpdateReviewInternal(result);
                    return {
                        success: true,
                        commentId,
                        attempts
                    };

                } catch (error) {
                    lastError = error as Error;

                    // Don't retry if it's a GitHub API error with certain status codes (Permission/Not Found)
                    if (error instanceof GitHubAPIError) {
                        if (error.statusCode === 403 || error.statusCode === 404) {
                            break;
                        }
                    }

                    // Wait before retrying (exponential backoff)
                    if (attempt < maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
                        messageLogger.info(`Review comment posting failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            return {
                success: false,
                error: lastError?.message || "Unknown error occurred",
                attempts
            };

        } catch (error) {
            dataLogger.error("Error posting review comment", { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
                attempts: 0
            };
        }
    }

    /**
     * Posts an error message when review analysis fails.
     */
    public static async postErrorComment(
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
            const errorComment = this.formatErrorComment(
                installationId,
                prNumber,
                error
            );

            const commentId = await this.createCommentInternal(
                installationId,
                repositoryName,
                prNumber,
                errorComment
            );

            messageLogger.info(`Posted error comment ${commentId} on PR #${prNumber}`);

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

    /**
     * Posts an initial "review in progress" comment at the start of PR analysis.
     */
    public static async postInProgressComment(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
    }> {
        try {
            const inProgressComment = this.formatInProgressComment(
                installationId,
                prNumber
            );

            const commentId = await this.createCommentInternal(
                installationId,
                repositoryName,
                prNumber,
                inProgressComment
            );

            messageLogger.info(`Posted in-progress comment ${commentId} on PR #${prNumber}`);

            return {
                success: true,
                commentId
            };

        } catch (postError) {
            dataLogger.error("Error posting in-progress comment", { postError });

            return {
                success: false,
                error: postError instanceof Error ? postError.message : "Unknown error occurred"
            };
        }
    }

    /**
     * Always creates a brand-new review comment for a follow-up review (triggered by
     * a new push to an already-reviewed PR). It never updates an existing comment so
     * contributors can see the full history of reviews.
     */
    public static async postFollowUpReviewResult(
        result: ReviewResult,
        maxRetries: number = 3
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
        attempts: number;
    }> {
        try {
            if (!this.validateReviewResult(result)) {
                return {
                    success: false,
                    error: "Invalid review result data",
                    attempts: 0
                };
            }

            let lastError: Error | null = null;
            let attempts = 0;

            for (let attempt = 0; attempt < maxRetries; attempt++) {
                attempts++;

                try {
                    // Check if there's already an in-progress comment for this specific follow-up cycle
                    const existingCommentId = await this.findExistingReviewComment(
                        result.installationId,
                        result.repositoryName,
                        result.prNumber,
                        result.id
                    );

                    const formattedReview = this.formatFollowUpReview(result);
                    let commentId: string;

                    if (existingCommentId) {
                        // Update the in-progress comment for this record
                        await this.updateCommentInternal(
                            result.installationId,
                            result.repositoryName,
                            existingCommentId,
                            formattedReview.fullComment
                        );
                        commentId = existingCommentId;
                        messageLogger.info(`Updated follow-up review comment ${commentId} on PR #${result.prNumber}`);
                    } else {
                        // Create a brand-new comment
                        commentId = await this.createCommentInternal(
                            result.installationId,
                            result.repositoryName,
                            result.prNumber,
                            formattedReview.fullComment
                        );
                        messageLogger.info(`Created new follow-up review comment ${commentId} on PR #${result.prNumber}`);
                    }

                    return {
                        success: true,
                        commentId,
                        attempts
                    };

                } catch (error) {
                    lastError = error as Error;

                    if (error instanceof GitHubAPIError) {
                        if (error.statusCode === 403 || error.statusCode === 404) {
                            break;
                        }
                    }

                    if (attempt < maxRetries - 1) {
                        const delay = Math.pow(2, attempt) * 1000;
                        messageLogger.info(`Follow-up comment posting failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            return {
                success: false,
                error: lastError?.message || "Unknown error occurred",
                attempts
            };

        } catch (error) {
            dataLogger.error("Error posting follow-up review comment", { error });
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error occurred",
                attempts: 0
            };
        }
    }

    /**
     * Posts a "follow-up review in progress" comment when new commits are detected on a PR
     * that has already been reviewed.
     */
    public static async postFollowUpInProgressComment(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<{
        success: boolean;
        commentId?: string;
        error?: string;
    }> {
        try {
            const comment = this.formatFollowUpInProgressComment(installationId, prNumber);

            const commentId = await this.createCommentInternal(
                installationId,
                repositoryName,
                prNumber,
                comment
            );

            messageLogger.info(`Posted follow-up in-progress comment ${commentId} on PR #${prNumber}`);

            return { success: true, commentId };

        } catch (postError) {
            dataLogger.error("Error posting follow-up in-progress comment", { postError });

            return {
                success: false,
                error: postError instanceof Error ? postError.message : "Unknown error occurred"
            };
        }
    }

    // =========================================================================
    // Private Core Logic (Comment Service)
    // =========================================================================

    /**
     * Posts or updates an AI review comment on a PR (Internal).
     */
    private static async postOrUpdateReviewInternal(result: ReviewResult): Promise<string> {
        try {
            // Try to find an existing AI review comment to update
            // We pass result.id to ensure we find the comment linked to this specific record
            const existingCommentId = await this.findExistingReviewComment(
                result.installationId,
                result.repositoryName,
                result.prNumber,
                result.id
            );

            // Format the review into a structured comment
            const formattedReview = this.formatReview(result);

            let commentId: string;

            if (existingCommentId) {
                // Update existing comment
                await this.updateCommentInternal(
                    result.installationId,
                    result.repositoryName,
                    existingCommentId,
                    formattedReview.fullComment
                );
                commentId = existingCommentId;
                messageLogger.info(`Updated existing AI review comment ${existingCommentId} on PR #${result.prNumber}`);
            } else {
                // Create new comment
                commentId = await this.createCommentInternal(
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
            dataLogger.error("Error posting/updating review comment (Internal)", { error });

            // Try to post an error comment instead if the main comment failed
            // Note: This matches the original service logic which tried to recover by posting an error
            try {
                const errorComment = this.formatErrorComment(
                    result.installationId,
                    result.prNumber,
                    error instanceof Error ? error.message : "Unknown error occurred"
                );

                const errorCommentId = await this.createCommentInternal(
                    result.installationId,
                    result.repositoryName,
                    result.prNumber,
                    errorComment
                );

                messageLogger.info(`Posted error comment ${errorCommentId} on PR #${result.prNumber}`);
                return errorCommentId; // Return error comment ID as fallback

            } catch (errorCommentError) {
                dataLogger.error("Failed to post error comment", { errorCommentError });
                throw error; // Throw original error if recovery fails
            }
        }
    }

    private static async createCommentInternal(
        installationId: string,
        repositoryName: string,
        prNumber: number,
        body: string
    ): Promise<string> {
        try {
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

    private static async updateCommentInternal(
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

    private static async findExistingReviewComment(
        installationId: string,
        repositoryName: string,
        prNumber: number,
        recordId?: string
    ): Promise<string | null> {
        try {
            // First, check if we have a specific record ID to look up
            if (recordId) {
                const storedResult = await prisma.aIReviewResult.findUnique({
                    where: { id: recordId },
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
                if (this.isAIReviewComment(comment.body || "")) {
                    const marker = this.extractReviewMarker(comment.body || "");
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

    private static async deleteReviewCommentInternal(
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

    private static async getAIReviewCommentsInternal(
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
                .filter((comment) => this.isAIReviewComment(comment.body || ""))
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

    // =========================================================================
    // Private Validation Logic
    // =========================================================================

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

        if (!Array.isArray(result.suggestions)) {
            messageLogger.error("suggestions is not an array");
            return false;
        }

        return true;
    }

    // =========================================================================
    // Private Formatting Logic (Review Formatter)
    // =========================================================================

    private static formatReview(result: ReviewResult): FormattedReview {
        const header = this.createHeader(result);
        const mergeScoreSection = this.createMergeScoreSection(result);
        const suggestionsSection = this.createSuggestionsSection(result);
        const footer = this.createFooter(result);

        const fullComment = [
            header,
            mergeScoreSection,
            suggestionsSection,
            footer
        ].join("\n\n");

        return {
            header,
            mergeScoreSection,
            suggestionsSection,
            footer,
            fullComment
        };
    }

    /**
     * Formats a follow-up review comment. Visually distinct from initial reviews — includes
     * a "follow-up" badge and a previous summary block if available.
     */
    private static formatFollowUpReview(result: ReviewResult): FormattedReview {
        const emoji = this.getMergeScoreEmoji(result.mergeScore);
        const status = this.getMergeScoreStatus(result.mergeScore);
        const scoreBar = this.createScoreBar(result.mergeScore);
        const recommendation = this.getMergeRecommendation(result.mergeScore);
        const processingTime = result.processingTime ? `${Math.round(result.processingTime / 1000)}s` : "N/A";
        const timestamp = result.createdAt.toISOString();

        const previousSummaryBlock = result.previousSummary
            ? `<details>\n<summary>📋 Previous Review Summary</summary>\n\n${result.previousSummary}\n\n</details>\n\n`
            : "";

        const header = `## 🔄 Follow-Up AI Code Review\n\n**Status:** ${status}  \n**Confidence:** ${Math.round(result.confidence * 100)}%\n\n---`;

        const mergeScoreSection = `### ${emoji} Updated Merge Score: ${result.mergeScore}/100\n\n${scoreBar}\n\n**Recommendation:** ${recommendation}\n\n${previousSummaryBlock}${result.summary}`;

        const suggestionsSection = this.createSuggestionsSection(result);

        const footer = `\n\n<details>\n<summary>📊 Review Metadata</summary>\n\n- **Processing Time:** ${processingTime}\n- **Analysis Date:** ${new Date(result.createdAt).toLocaleString()}\n- **Review Type:** Follow-Up (triggered by new push)\n\n</details>\n\n> 🤖 This is a follow-up review generated after new commits were pushed to the PR.\n> \n> 💬 Questions? [Open an issue](https://github.com/devasignhq/devasign-api/issues) or contact support.\n\n<!-- AI-REVIEW-MARKER:${result.installationId}:${result.prNumber}:${timestamp} -->`;

        const fullComment = [header, mergeScoreSection, suggestionsSection, footer].join("\n\n");

        return { header, mergeScoreSection, suggestionsSection, footer, fullComment };
    }

    private static createHeader(result: ReviewResult): string {
        const emoji = this.getMergeScoreEmoji(result.mergeScore);
        const status = this.getMergeScoreStatus(result.mergeScore);

        return `## ${emoji} AI Code Review Results

**Status:** ${status}  
**Confidence:** ${Math.round(result.confidence * 100)}%

---`;
    }

    private static createMergeScoreSection(result: ReviewResult): string {
        const scoreBar = this.createScoreBar(result.mergeScore);
        const recommendation = this.getMergeRecommendation(result.mergeScore);
        const emoji = this.getMergeScoreEmoji(result.mergeScore);

        return `### ${emoji} Merge Score: ${result.mergeScore}/100

${scoreBar}

**Recommendation:** ${recommendation}

${result.summary}`;
    }

    private static createSuggestionsSection(result: ReviewResult): string {
        if (result.suggestions.length === 0) {
            return `### 💡 Code Suggestions

✨ Great job! No specific suggestions at this time.`;
        }

        let section = `### 💡 Code Suggestions (${result.suggestions.length})

`;

        // Group suggestions by severity
        const groupedSuggestions = this.groupSuggestionsBySeverity(result.suggestions);

        ["high", "medium", "low"].forEach(severity => {
            const suggestions = groupedSuggestions[severity as keyof typeof groupedSuggestions];
            if (suggestions.length > 0) {
                const severityEmoji = this.getSuggestionSeverityEmoji(severity as "high" | "medium" | "low");
                const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

                section += `#### ${severityEmoji} ${severityLabel} Priority (${suggestions.length})

`;

                suggestions.forEach((suggestion, index) => {
                    const typeEmoji = this.getSuggestionTypeEmoji(suggestion.type);
                    const fileLabel = suggestion.file
                        ? `**${suggestion.file}**${suggestion.lineNumber ? ` (Line ${suggestion.lineNumber})` : ""}`
                        : "**General**";

                    section += `
${index + 1}. ${fileLabel}
${typeEmoji} ${suggestion.description}

💭 **Reasoning:** ${suggestion.reasoning}`;

                    if (suggestion.suggestedCode) {
                        section += `

**Suggested Code:**
\`\`\`${suggestion.language ?? ""}
${suggestion.suggestedCode}
\`\`\``;
                    }

                    section += "\n\n";
                });
            }
        });

        return section;
    }

    private static createFooter(result: ReviewResult): string {
        const processingTime = result.processingTime ? `${Math.round(result.processingTime / 1000)}s` : "N/A";
        const timestamp = result.createdAt.toISOString();

        return `

<details>
<summary>📊 Review Metadata</summary>

- **Processing Time:** ${processingTime}
- **Analysis Date:** ${new Date(result.createdAt).toLocaleString()}

</details>

> 🤖 This review was generated by AI. While we strive for accuracy, please use your judgment when applying suggestions.
> 
> 💬 Questions about this review? [Open an issue](https://github.com/devasignhq/devasign-api/issues) or contact support.

<!-- AI-REVIEW-MARKER:${result.installationId}:${result.prNumber}:${timestamp} -->`;
    }

    private static createScoreBar(score: number): string {
        const barLength = 20;
        const filledLength = Math.round((score / 100) * barLength);
        const emptyLength = barLength - filledLength;

        const filled = "█".repeat(filledLength);
        const empty = "░".repeat(emptyLength);

        let color = "🔴"; // Red for low scores
        if (score >= 70) color = "🟡"; // Yellow for medium scores
        if (score >= 85) color = "🟢"; // Green for high scores

        return `${color} \`${filled}${empty}\` ${score}%`;
    }

    private static getMergeScoreEmoji(score: number): string {
        if (score >= 85) return "🟢";
        if (score >= 70) return "🟡";
        if (score >= 50) return "🟠";
        return "🔴";
    }

    private static getMergeScoreStatus(score: number): string {
        if (score >= 85) return "Ready to Merge";
        if (score >= 70) return "Review Recommended";
        if (score >= 50) return "Changes Needed";
        return "Major Issues Found";
    }

    private static getMergeRecommendation(score: number): string {
        if (score >= 85) {
            return "✅ This PR looks great and is ready for merge!";
        } else if (score >= 70) {
            return "⚠️ This PR is mostly good but could benefit from some improvements before merging.";
        } else if (score >= 50) {
            return "❌ This PR needs significant improvements before it should be merged.";
        } else {
            return "🚫 This PR has major issues that must be addressed before merging.";
        }
    }

    private static getSuggestionSeverityEmoji(severity: "high" | "medium" | "low"): string {
        switch (severity) {
            case "high": return "🔴";
            case "medium": return "🟡";
            case "low": return "🔵";
            default: return "⚪";
        }
    }

    private static getSuggestionTypeEmoji(type: string): string {
        switch (type) {
            case "fix": return "🔧";
            case "improvement": return "✨";
            case "optimization": return "⚡";
            case "style": return "🎨";
            default: return "💡";
        }
    }

    private static groupSuggestionsBySeverity(suggestions: CodeSuggestion[]): {
        high: CodeSuggestion[];
        medium: CodeSuggestion[];
        low: CodeSuggestion[];
    } {
        return suggestions.reduce((groups, suggestion) => {
            groups[suggestion.severity].push(suggestion);
            return groups;
        }, { high: [] as CodeSuggestion[], medium: [] as CodeSuggestion[], low: [] as CodeSuggestion[] });
    }

    private static extractReviewMarker(commentBody: string): {
        installationId: string;
        prNumber: number;
        timestamp: string;
    } | null {
        const markerRegex = /<!-- AI-REVIEW-MARKER:([^:]+):(\d+):([^:]+) -->/;
        const match = commentBody.match(markerRegex);

        if (match) {
            return {
                installationId: match[1],
                prNumber: parseInt(match[2]),
                timestamp: match[3]
            };
        }

        return null;
    }

    private static isAIReviewComment(commentBody: string): boolean {
        return commentBody.includes("<!-- AI-REVIEW-MARKER:") &&
            (commentBody.includes("## 🔍 PR Review In Progress") ||
                commentBody.includes("## 🤖 PR Review Results") ||
                commentBody.includes("## 🟢 PR Review Results") ||
                commentBody.includes("## 🟡 PR Review Results") ||
                commentBody.includes("## 🟠 PR Review Results") ||
                commentBody.includes("## 🔴 PR Review Results"));
    }

    private static formatInProgressComment(
        installationId: string,
        prNumber: number
    ): string {
        const timestamp = new Date().toISOString();

        return `## 🔍 PR Review In Progress

---

A review of this pull request has been triggered and is currently running.
This comment will be updated automatically once the analysis is complete.

### What's happening?

- 🔎 Analysing the diff and changed files
- 🧠 Evaluating code quality, patterns, and potential issues
- 📝 Generating actionable suggestions

> ⏳ This usually takes a minute or two. Please hang tight!

<!-- AI-REVIEW-MARKER:${installationId}:${prNumber}:${timestamp} -->`;
    }

    /**
     * Formats a "follow-up review in progress" notification comment, shown when new
     * commits are detected on an already-reviewed PR.
     */
    private static formatFollowUpInProgressComment(
        installationId: string,
        prNumber: number
    ): string {
        const timestamp = new Date().toISOString();

        return `## 🔄 Follow-Up Review In Progress

---

New commits have been pushed to this pull request since the last review.
A follow-up review has been triggered and is currently running.

### What's happening?

- 🔎 Comparing new changes against the previous review
- 🧠 Checking whether earlier concerns were addressed
- 📝 Identifying any new issues introduced by the latest push

> ⏳ This usually takes a minute or two. Please hang tight!

<!-- AI-REVIEW-MARKER:${installationId}:${prNumber}:${timestamp} -->`;
    }

    public static formatErrorComment(
        installationId: string,
        prNumber: number,
        error: string
    ): string {
        const timestamp = new Date().toISOString();

        return `## ❌ PR Review Failed

---

### Error Details

The PR review system encountered an error while analyzing this pull request:

\`\`\`
${error}
\`\`\`

### What to do next

1. **Manual Review:** Please proceed with manual code review
2. **Retry:** You can manually trigger a new analysis if the issue was temporary
3. **Support:** If this error persists, please contact support

---

> 🤖 This is an automated error message from the PR review system.
> 
> 💬 Need help? [Open an issue](https://github.com/devasign/issues) or contact support.

<!-- AI-REVIEW-MARKER:${installationId}:${prNumber}:${timestamp} -->`;
    }
}
