import { GroqAIService } from "./groq-ai.service";
import { GroqServiceError, GroqRateLimitError } from "../models/ai-review.errors";
import { FetchedFile, PullRequestData, RelevantFileRecommendation } from "../models/ai-review.model";
import { FileFetcherService } from "./file-fetcher.service";

/**
 * Uses AI to determine which files are most relevant for PR
 */
export class PullRequestContextAnalyzerService {
    private groqService: GroqAIService;
    private fileFetcher: FileFetcherService;
    private readonly config: {
        analysisTimeout: number;
        maxRetries: number;
    };

    constructor() {
        this.groqService = new GroqAIService();
        this.fileFetcher = new FileFetcherService();

        this.config = {
            analysisTimeout: parseInt(process.env.ANALYSIS_TIMEOUT || "30000"), // 30 seconds
            maxRetries: parseInt(process.env.CONTEXT_ANALYSIS_MAX_RETRIES || "3")
        };
    }

    /**
     * Analyzes code changes to determine relevant files
     */
    async analyzeContextNeeds(prData: PullRequestData): Promise<RelevantFileRecommendation[]> {
        console.log(`Starting context analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        try {
            // Build specialized prompt for context analysis
            const prompt = this.buildContextPrompt(prData);

            // Call AI service with timeout
            const aiResponse = await this.callAIWithTimeout(prompt);

            // Parse and validate AI response
            const parsedResponse = this.groqService.parseAIResponse<{ relevantFiles: RelevantFileRecommendation[] }>(aiResponse);
            if (!parsedResponse) {
                throw new GroqServiceError("AI response validation failed", { response: aiResponse });
            }

            const relevantFiles = this.validateAndNormalizeRecommendations(parsedResponse.relevantFiles || []);

            const fetchedFiles = await this.fileFetcher.fetchRelevantFiles(
                prData.installationId,
                prData.repositoryName,
                relevantFiles
            );

            for (const file of fetchedFiles) {
                if (!file.fetchSuccess) {
                    console.warn(`Skipping optimization for ${file.filePath} due to fetch failure`);
                    continue;
                }
                
                if (!file.filePath.includes("CONTRIBUTING.md")) {
                    // Build specialized prompt for optimizing file content
                    const prompt = this.buildOptimizeFetchedFilesPrompt(prData, file);

                    // Call AI service with timeout
                    const aiResponse = await this.callAIWithTimeout(prompt);
                    const optimizedFile = this.groqService.parseAIResponse<{ file: string, content: string }>(aiResponse);
                    if (!optimizedFile) {
                        console.warn(`"AI response validation failed for: ${file.filePath}`, { response: aiResponse });
                        continue;
                    }

                    const fileRIndex = relevantFiles.findIndex(fileR => fileR.filePath === file.filePath);
                    if (fileRIndex !== -1) {
                        relevantFiles[fileRIndex].content = optimizedFile.content;
                    } else {
                        console.warn(`Could not find ${file.filePath} in relevantFiles to update content`);
                    }
                } else {
                    const contributingMDFile = fetchedFiles.find(fileF => fileF.filePath.includes("CONTRIBUTING.md"));
                    const fileRIndex = relevantFiles.findIndex(fileR => fileR.filePath === file.filePath);
                    if (fileRIndex !== -1 && contributingMDFile) {
                        relevantFiles[fileRIndex].content = contributingMDFile.content;
                    } else {
                        console.warn(`Could not find ${file.filePath} in relevantFiles to update content`);
                    }
                }
            }

            console.log("Context analysis completed.");

            return relevantFiles;

        } catch (error) {
            console.error("Error in context analysis:", error);

            // Handle specific error types
            if (error instanceof GroqRateLimitError) {
                console.log("Rate limit hit");
            }

            throw new GroqServiceError("Context analysis validation failed", error);
        }
    }

    /**
     * Builds specialized prompt for AI context analysis
     */
    buildContextPrompt(prData: PullRequestData): string {
        return `You are an expert code reviewer analyzing pull requests.

${prData.formattedPullRequest}

TASK:
Analyze the code changes and determine which changed files require fetching their complete contents would be most helpful for providing comprehensive context.
Note: Always include CONTRIBUTING.md in your selection.

RESPONSE FORMAT (JSON only):
{
  "relevantFiles": [
    {
      "filePath": "exact/path/to/file.ext",
      "reason": "This file defines the interface that the changed code implements",
      "priority": "high"
    }
  ],
}

Priority Types:
- "high": Critical for understanding the changes
- "medium": Helpful for context
- "low": Nice to have for completeness

IMPORTANT:
- Respond with ONLY the JSON object. Do not include any text before or after.
- Use exact file paths.
- If no additional files need to be fetched, return an empty array: {"relevantFiles": []}`;
    }
    
    /**
     * Extract relevant portions of each contextual file
     */
    private buildOptimizeFetchedFilesPrompt(prData: PullRequestData, fetchedFile: FetchedFile): string {
        const changedFilesInfo = prData.changedFiles.map(file =>
            `${file.filename} (${file.status}, +${file.additions}/-${file.deletions})${file.previousFilename ? ` (renamed from ${file.previousFilename})` : ""}`
        ).join("\n");

        // Format linked issues
        const linkedIssuesInfo = prData.linkedIssues.map(issue => `- #${issue.number}:\n
            title: ${issue.title}\n
            body: ${issue.body}\n
            labels: ${issue.labels.map(label => `${label.name} (${label.description}), `)}`).join("\n\n");

        const changedFile = prData.changedFiles.find(file => file.filename === fetchedFile.filePath)!;
        const changePreview = `\n--- ${changedFile.filename} ---\n${changedFile.patch}`;

        return `You are an expert code reviewer analyzing a pull request.

Here's the pull request summary:

PULL REQUEST CHANGES:
Repository: ${prData.repositoryName}
PR #${prData.prNumber}: ${prData.title}
Author: ${prData.author}

Body:
${prData.body || "No body provided"}

Linked Issue(s):
${linkedIssuesInfo}

CHANGED FILES:
${changedFilesInfo}

CONTEXTUAL FILES: ${changedFile.filename}

File Change Preview:
${changePreview}

Full File Content:
${fetchedFile.content}

TASK:
Extract and return ONLY the relevant portions of the contextual file that is directly related to understanding the changes made to it or the pull request changes as a whole. 
Remove any code, sections, or content that is not pertinent to reviewing this PR.

RESPONSE FORMAT (JSON only):
{
    "file": "exact/path/to/file.ext",
    "content": "actual code or content snippet"
}

GUIDELINES:
- Include function/class signatures, interfaces, types, and imports that are referenced in the PR
- Include relevant documentation or comments that explain the context
- Exclude boilerplate, unrelated functions, and irrelevant code sections
- Preserve enough context to understand the code structure (e.g., class names, namespaces)

IMPORTANT:
- Respond with ONLY the JSON object. Do not include any text before or after.
- Use exact file paths matching the input files.
- Line markings (\n) should be approximate positions in the original file if known, otherwise use discretion.`;
    }

    /**
     * Calls AI service with timeout handling
     */
    private async callAIWithTimeout(prompt: string): Promise<string> {
        const operationPromise = this.groqService.callGroqAPI(prompt);

        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Context analysis timed out after ${this.config.analysisTimeout}ms`));
            }, this.config.analysisTimeout);
        });

        return Promise.race([
            operationPromise,
            timeoutPromise
        ]);
    }

    /**
     * Validates and normalizes file recommendations
     */
    private validateAndNormalizeRecommendations(recommendations: RelevantFileRecommendation[]): RelevantFileRecommendation[] {
        if (!Array.isArray(recommendations)) {
            return [];
        }

        return recommendations
            .filter(rec => rec && typeof rec === "object")
            .map(rec => ({
                filePath: typeof rec.filePath === "string" ? rec.filePath : "unknown",
                reason: typeof rec.reason === "string" ? rec.reason : "No reason provided",
                priority: this.validatePriority(rec.priority)
            }))
            .filter(rec => rec.filePath !== "unknown");
    }

    /**
     * Validates recommendation priority
     */
    private validatePriority(priority: RelevantFileRecommendation["priority"]) {
        const validPriorities = ["high", "medium", "low"];
        return validPriorities.includes(priority) ? priority : "medium";
    }
}
