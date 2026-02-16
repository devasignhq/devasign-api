import { GeminiAIService } from "./gemini-ai.service";
import { GeminiServiceError } from "../../models/error.model";
import { PullRequestData, ReviewContext, CodeChunkResult } from "../../models/ai-review.model";
import { VectorStoreService } from "../vector-store.service";
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
     * Fetches the file structure of the repository
     */
    private async getFileStructure(installationId: string, repositoryName: string): Promise<string[]> {
        try {
            return await OctokitService.getAllFilePathsFromTree(installationId, repositoryName);
        } catch (error) {
            dataLogger.warn("Failed to fetch file structure", { error });
            return [];
        }
    }

    /**
     * Fetches CONTRIBUTING.md or similar style guide if it exists
     */
    private async getStyleGuide(installationId: string, repositoryName: string): Promise<string | null> {
        const potentialPaths = ["CONTRIBUTING.md", "docs/CONTRIBUTING.md", ".github/CONTRIBUTING.md"];

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
     */
    private async getReadme(installationId: string, repositoryName: string): Promise<string | null> {
        const potentialPaths = ["README.md", "docs/README.md"];

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
