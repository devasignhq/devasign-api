import { GeminiAIService } from "./gemini-ai.service";
import { GeminiServiceError } from "../../models/error.model";
import { PullRequestData, ReviewContext, CodeChunkResult } from "../../models/ai-review.model";
import { VectorStoreService } from "./vector-store.service";
import { OctokitService } from "../octokit.service";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * Uses AI and Vector Store to determine and fetch relevant context for PR review
 */
export class PullRequestContextAnalyzerService {
    private geminiService: GeminiAIService;
    private vectorStoreService: VectorStoreService;
    constructor() {
        this.geminiService = new GeminiAIService();
        this.vectorStoreService = new VectorStoreService();
    }

    /**
     * Builds the comprehensive context for the PR review
     * @param prData - The pull request data
     * @returns A promise that resolves to the review context
     */
    async buildReviewContext(prData: PullRequestData): Promise<ReviewContext> {
        messageLogger.info(`Starting context analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        try {
            // Fetch Style Guide (CONTRIBUTING.md)
            const styleGuide = await this.getStyleGuide(prData.installationId, prData.repositoryName);

            // Fetch Readme (README.md)
            const readme = await this.getReadme(prData.installationId, prData.repositoryName);

            // Find Relevant Code Chunks using Vector Search
            const relevantChunks = await this.getRelevantCodeChunks(prData);

            messageLogger.info("Context analysis completed.");

            return {
                prData,
                styleGuide,
                readme,
                relevantChunks
            };

        } catch (error) {
            dataLogger.error("Error in context analysis", { error });
            throw new GeminiServiceError("Context analysis failed", error);
        }
    }

    /**
     * Fetches CONTRIBUTING.md or similar style guide if it exists
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @returns A promise that resolves to the style guide content or null
     */
    private async getStyleGuide(installationId: string, repositoryName: string): Promise<string | null> {
        const potentialPaths = ["CONTRIBUTING.md", "docs/CONTRIBUTING.md", ".github/CONTRIBUTING.md"];

        // Iterate through potential paths and fetch the style guide
        for (const path of potentialPaths) {
            try {
                const content = await OctokitService.getFileContent(installationId, repositoryName, path);
                if (content) return content;
            } catch {
                // Continue to next path
            }
        }
        return null;
    }

    /**
     * Fetches README.md if it exists
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @returns A promise that resolves to the README content or null
     */
    private async getReadme(installationId: string, repositoryName: string): Promise<string | null> {
        const potentialPaths = ["README.md", "docs/README.md"];

        // Iterate through potential paths and fetch the README
        for (const path of potentialPaths) {
            try {
                const content = await OctokitService.getFileContent(installationId, repositoryName, path);
                if (content) return content;
            } catch {
                // Continue to next path
            }
        }
        return null;
    }

    /**
     * Finds relevant code chunks using vector search based on PR content
     * @param prData - The pull request data
     * @returns A promise that resolves to an array of relevant code chunks
     */
    private async getRelevantCodeChunks(prData: PullRequestData): Promise<CodeChunkResult[]> {
        // Skips retrieval
        if (process.env.SKIP_CODE_CHUNKS === "true") {
            messageLogger.info("Skipping relevant code chunk retrieval");
            return [];
        }

        try {
            // Construct a query from PR title, description, and git diff
            const linkedIssuesInfo = prData.linkedIssues.map(issue =>
                `Issue #${issue.number}: ${issue.title}\n${issue.body}`
            ).join("\n\n");

            // Build the query
            const query = `
                PR Title: ${prData.title}
                PR Description: ${prData.body}
                Linked Issues: ${linkedIssuesInfo}
                Changed Files (Git Diff): ${prData.changedFiles.map(f => f.filename).join(", ")}
            `;

            // Generate embedding for the query
            const embedding = await this.geminiService.generateEmbedding(query);

            // Search vector store
            const chunks = await this.vectorStoreService.findSimilarChunks(
                embedding,
                prData.installationId,
                prData.repositoryName,
                10, // Limit to 10 most relevant chunks
                0.6 // Similarity threshold
            );

            return chunks.map(chunk => ({
                filePath: chunk.filePath,
                content: chunk.content,
                similarity: chunk.similarity,
                chunkIndex: chunk.chunkIndex
            }));

        } catch (error) {
            dataLogger.error("Failed to get relevant code chunks", { error });
            return [];
        }
    }
}
