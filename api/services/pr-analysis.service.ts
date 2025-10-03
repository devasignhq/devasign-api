import {
    PullRequestData,
    LinkedIssue,
    ChangedFile,
    GitHubWebhookPayload,
    AIReview,
    ReviewResult
} from "../models/ai-review.model";
import {
    PRNotEligibleError,
    PRAnalysisError,
    GitHubAPIError
} from "../models/ai-review.errors";
import { OctokitService } from "./octokit.service";
import { GitHubFile } from "../models/github.model";
import { ContextAnalysisRequest, ProcessingTimes } from "../models/ai-review-context.model";
import { RawCodeChangesExtractor } from "./raw-code-changes-extractor.service";
import { RepositoryFilePath } from "./repository-file-path.service";
import { ReviewContextAnalyzerService } from "./context-analyzer.service";
import { SelectiveFileFetcherService } from "./selective-file-fetcher.service";
import { GroqAIService } from "./groq-ai.service";
import { getFieldFromUnknownObject } from "../helper";

/**
 * Service for analyzing PR events and determining eligibility for AI review
 */
export class PRAnalysisService {
    private static contextAnalyzer = new ReviewContextAnalyzerService();
    private static fileFetcher = new SelectiveFileFetcherService();
    private static groqService = new GroqAIService();

    /**
     * Determines if a PR should be analyzed
     */
    public static shouldAnalyzePR(prData: PullRequestData): boolean {
        // Skip draft PRs
        if (prData.isDraft) {
            return false;
        }

        // Must link to at least one issue
        if (prData.linkedIssues.length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Extracts PR data from GitHub webhook payload
     */
    public static extractPRDataFromWebhook(payload: GitHubWebhookPayload): PullRequestData {
        const { pull_request, repository, installation } = payload;

        if (!pull_request || !repository || !installation) {
            throw new PRAnalysisError(
                pull_request?.number || 0,
                repository?.full_name || "unknown",
                "Invalid webhook payload: missing required fields",
                { payload }
            );
        }

        const linkedIssues = this.extractLinkedIssues(pull_request.body || "");

        // Fix relative issue URLs to use current repository
        const fixedLinkedIssues = linkedIssues.map(issue => ({
            ...issue,
            url: issue.url.startsWith("#")
                ? `https://github.com/${repository.full_name}/issues/${issue.number}`
                : issue.url
        }));

        return {
            installationId: installation.id.toString(),
            repositoryName: repository.full_name,
            prNumber: pull_request.number,
            prUrl: pull_request.html_url,
            title: pull_request.title,
            body: pull_request.body || "",
            changedFiles: [], // Will be populated by fetchChangedFiles
            linkedIssues: fixedLinkedIssues,
            author: pull_request.user.login,
            isDraft: pull_request.draft
        };
    }

    /**
     * Extracts linked issues from PR body using keywords
     */
    public static extractLinkedIssues(prBody: string): LinkedIssue[] {
        const linkedIssues: LinkedIssue[] = [];

        // Regex patterns to match issue references
        const patterns = [
            // "closes #123", "fixes #456"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+#(\d+)/gi,
            // "closes https://github.com/owner/repo/issues/123"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(prBody)) !== null) {
                let issueNumber: number;
                let repositoryPath = "";

                if (match.length === 2) {
                    // Pattern: "closes #123"
                    issueNumber = parseInt(match[1]);
                } else if (match.length === 4) {
                    // Pattern: "closes https://github.com/owner/repo/issues/123" or "closes owner/repo#123"
                    issueNumber = parseInt(match[3]);
                    repositoryPath = `${match[1]}/${match[2]}`;
                } else {
                    continue;
                }

                const linkTypeRaw = match[0].toLowerCase().split(/\s+/)[0];

                // Normalize link type
                const normalizedLinkType = linkTypeRaw === "close" ? "closes" :
                    linkTypeRaw === "resolve" ? "resolves" :
                        linkTypeRaw === "fix" ? "fixes" :
                            linkTypeRaw as "closes" | "resolves" | "fixes";

                // Build issue URL
                let issueUrl: string;
                if (repositoryPath) {
                    issueUrl = `https://github.com/${repositoryPath}/issues/${issueNumber}`;
                } else {
                    // Use placeholder for current repository (will be filled in by caller)
                    issueUrl = `#${issueNumber}`;
                }

                // Avoid duplicates
                if (!linkedIssues.some(issue => issue.number === issueNumber && issue.url === issueUrl)) {
                    // TODO: Fetch issue title, body, and comments
                    linkedIssues.push({
                        number: issueNumber,
                        title: "",
                        body: "",
                        url: issueUrl,
                        linkType: normalizedLinkType
                    });
                }
            }
        }

        return linkedIssues;
    }

    /**
     * Fetches changed files from GitHub API
     */
    public static async fetchChangedFiles(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<ChangedFile[]> {
        try {
            // Use OctokitService to get PR files
            const files = await OctokitService.getPRFiles(installationId, repositoryName, prNumber);

            return files.map((file: GitHubFile) => ({
                filename: file.filename,
                status: this.normalizeFileStatus(file.status),
                additions: file.additions,
                deletions: file.deletions,
                patch: file.patch || ""
            }));

        } catch (error) {
            throw new GitHubAPIError(
                `Failed to fetch changed files for PR #${prNumber}`,
                getFieldFromUnknownObject<number>(error, "status"),
                undefined,
                { installationId, repositoryName, prNumber, originalError: getFieldFromUnknownObject<string>(error, "message") }
            );
        }
    }

    /**
     * Creates a complete PR data object with all required information
     * Combines webhook data with additional API calls
     */
    public static async createCompletePRData(payload: GitHubWebhookPayload): Promise<PullRequestData> {
        const prData = this.extractPRDataFromWebhook(payload);

        // Check if PR should be analyzed
        if (!this.shouldAnalyzePR(prData)) {
            if (prData.isDraft) {
                throw new PRNotEligibleError(
                    prData.prNumber,
                    prData.repositoryName,
                    "PR is in draft status"
                );
            } else {
                throw new PRNotEligibleError(
                    prData.prNumber,
                    prData.repositoryName,
                    "PR does not link to any issues"
                );
            }
        }

        // Fetch additional data
        try {
            prData.changedFiles = await this.fetchChangedFiles(
                prData.installationId,
                prData.repositoryName,
                prData.prNumber
            );

            return prData;
        } catch (error) {
            if (error instanceof PRNotEligibleError) {
                throw error;
            }

            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to create complete PR data",
                { originalError: error instanceof Error ? error.message : String(error) }
            );
        }
    }

    /**
     * Normalizes GitHub file status to our expected format
     */
    private static normalizeFileStatus(status: string): "added" | "modified" | "removed" {
        switch (status) {
        case "added":
            return "added";
        case "removed":
            return "removed";
        case "modified":
        case "renamed":
        case "copied":
        case "changed":
        case "unchanged":
        default:
            return "modified";
        }
    }

    /**
     * Extracts file extensions from changed files for analysis
     */
    public static getFileExtensions(changedFiles: ChangedFile[]): string[] {
        const extensions = new Set<string>();

        changedFiles.forEach(file => {
            const extension = file.filename.split(".").pop()?.toLowerCase();
            if (extension) {
                extensions.add(extension);
            }
        });

        return Array.from(extensions);
    }

    /**
     * Logs PR analysis decision for monitoring
     */
    public static logAnalysisDecision(
        prData: PullRequestData,
        shouldAnalyze: boolean,
        reason?: string
    ): void {
        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            prUrl: prData.prUrl,
            author: prData.author,
            isDraft: prData.isDraft,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            shouldAnalyze,
            reason,
            timestamp: new Date().toISOString()
        };

        if (shouldAnalyze) {
            console.log("PR eligible for AI review:", JSON.stringify(logData, null, 2));
        } else {
            console.log("PR not eligible for AI review:", JSON.stringify(logData, null, 2));
        }
    }

    /**
     * Logs PR data extraction results for monitoring and debugging
     */
    public static logExtractionResult(
        prData: PullRequestData,
        extractionTime: number,
        success: boolean = true,
        error?: Error
    ): void {
        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            prUrl: prData.prUrl,
            author: prData.author,
            isDraft: prData.isDraft,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            extractionTimeMs: extractionTime,
            success,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (success) {
            console.log("PR data extraction successful:", JSON.stringify(logData, null, 2));
        } else {
            console.error("PR data extraction failed:", JSON.stringify(logData, null, 2));
        }
    }

    /**
     * Analyzes PR with review context fetching workflow
     */
    public static async analyzeWithReviewContext(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        const processingTimes: ProcessingTimes = {
            codeExtraction: 0,
            pathRetrieval: 0,
            aiAnalysis: 0,
            fileFetching: 0,
            total: 0
        };

        console.log(`Starting review context analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        try {
            // Execute review context workflow with timeout
            const review = await this.executeWithTimeout(
                () => this.executeReviewContextWorkflow(prData, processingTimes),
                150000, // 2(1/2) minutes
                "Review context analysis"
            );

            processingTimes.total = Date.now() - startTime;

            console.log(`Review context analysis completed in ${processingTimes.total}ms for PR #${prData.prNumber}`);

            return review;

        } catch (error) {
            console.error("Review context analysis failed:", error);

            // Track processing time even on failure
            processingTimes.total = Date.now() - startTime;

            throw error;
        }
    }

    /**
     * Executes the review context workflow
     */
    private static async executeReviewContextWorkflow(
        prData: PullRequestData,
        processingTimes: ProcessingTimes
    ): Promise<ReviewResult> {
        // Extract raw code changes
        const extractStart = Date.now();
        const rawCodeChanges = await RawCodeChangesExtractor.extractCodeChanges(
            prData.installationId,
            prData.repositoryName,
            prData.prNumber
        );
        processingTimes.codeExtraction = Date.now() - extractStart;

        // Get repository structure
        const pathStart = Date.now();
        const repositoryStructure = await RepositoryFilePath.getRepositoryStructure(
            prData.installationId,
            prData.repositoryName
        );
        processingTimes.pathRetrieval = Date.now() - pathStart;

        // AI-powered context analysis
        const analysisStart = Date.now();
        const contextAnalysisRequest: ContextAnalysisRequest = {
            codeChanges: rawCodeChanges,
            repositoryStructure,
            prMetadata: {
                title: prData.title,
                description: prData.body,
                linkedIssues: prData.linkedIssues,
                author: prData.author
            }
        };
        
        const contextAnalysis = await this.contextAnalyzer.analyzeContextNeeds(contextAnalysisRequest);
        processingTimes.aiAnalysis = Date.now() - analysisStart;

        // Selective file fetching
        const fetchStart = Date.now();
        const fetchedFiles = await this.fileFetcher.fetchRelevantFiles(
            prData.installationId,
            prData.repositoryName,
            contextAnalysis.relevantFiles
        );
        processingTimes.fileFetching = Date.now() - fetchStart;

        // Generate AI review with enhanced context
        const aiReview = await this.groqService.generateReview(
            prData,
            rawCodeChanges,
            repositoryStructure,
            contextAnalysis,
            fetchedFiles
        );

        // Rule evaluation
        // const ruleEvaluation = await RuleEngineService.evaluateRules(prData, []);

        return this.buildReviewResult(prData, aiReview);
    }

    /**
     * Builds standard review result from AI review and rule evaluation
     */
    private static buildReviewResult(prData: PullRequestData, aiReview: AIReview): ReviewResult {
        return {
            installationId: prData.installationId,
            prNumber: prData.prNumber,
            repositoryName: prData.repositoryName,
            mergeScore: aiReview.mergeScore,
            rulesViolated: [],
            rulesPassed: [],
            suggestions: aiReview.suggestions,
            reviewStatus: "COMPLETED",
            summary: aiReview.summary,
            confidence: aiReview.confidence,
            processingTime: 0, // Will be set by caller
            createdAt: new Date()
        };
    }

    /**
     * Executes operation with timeout
     */
    private static async executeWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
                 
                setTimeout(() => {
                    reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    }

    /**
     * Logs review context analysis metrics
     */
    public static logReviewContextMetrics(
        prData: PullRequestData,
        result: ReviewResult,
        success: boolean = true,
        error?: Error
    ): void {
        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            success,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (success) {
            console.log("Review context analysis metrics:", JSON.stringify(logData, null, 2));
        } else {
            console.error("Review context analysis failed metrics:", JSON.stringify(logData, null, 2));
        }
    }
}
