import {
    PullRequestData,
    LinkedIssue,
    ChangedFile,
    GitHubWebhookPayload,
    AIReview,
    RuleEvaluation,
    ReviewResult
} from "../models/ai-review.model";
import {
    PRNotEligibleError,
    PRAnalysisError,
    GitHubAPIError
} from "../models/ai-review.errors";
import { OctokitService } from "./octokit.service";
import { GitHubFile } from "../models/github.model";
import {
    ContextAnalysisRequest,
    EnhancedReviewContext,
    ContextMetrics,
    ProcessingTimes,
    ContextEnhancedResult,
    IntelligentContextConfig
} from "../models/intelligent-context.model";

// Import intelligent context services
import { RawCodeChangesExtractor } from "./raw-code-changes-extractor.service";
import { RepositoryFilePath } from "./repository-file-path.service";
import { IntelligentContextAnalyzerService } from "./intelligent-context-analyzer.service";
import { SelectiveFileFetcherService } from "./selective-file-fetcher.service";
import { EnhancedContextBuilder } from "./enhanced-context-builder.service";
import { IntelligentContextConfigService } from "./intelligent-context-config.service";

// Import existing services for integration
import { RAGContextServiceImpl } from "./rag-context.service";
import { GroqAIService } from "./groq-ai.service";
import { RuleEngineService } from "./rule-engine.service";
import { getFieldFromUnknownObject } from "../helper";

/**
 * Service for analyzing PR events and determining eligibility for AI review
 * Enhanced with intelligent context fetching capabilities
 */
export class PRAnalysisService {
    
    // Intelligent context services
    private static contextAnalyzer = new IntelligentContextAnalyzerService();
    private static fileFetcher = new SelectiveFileFetcherService();
    
    // Existing services for integration
    private static ragService = new RAGContextServiceImpl();
    private static groqService = new GroqAIService();
    
    // Configuration service for intelligent context processing
    private static configService = IntelligentContextConfigService.getInstance();

    /**
     * Determines if a PR should be analyzed based on requirements
     */
    public static shouldAnalyzePR(prData: PullRequestData): boolean {
        // Skip draft PRs (Requirement 1.4)
        if (prData.isDraft) {
            return false;
        }

        // Must link to at least one issue (Requirement 1.1, 1.3)
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
            /(?:closes|resolves|fixes|close|resolve|fix)\s+https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/gi,
            // "closes owner/repo#123"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+([^\/\s]+)\/([^\/\s#]+)#(\d+)/gi
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
                    linkedIssues.push({
                        number: issueNumber,
                        title: "", // Will be populated by fetchIssueDetails if needed
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
     * Validates PR data completeness
     * Ensures all required data is present for analysis
     */
    public static validatePRData(prData: PullRequestData): void {
        const requiredFields = [
            "installationId",
            "repositoryName",
            "prNumber",
            "prUrl",
            "title",
            "author"
        ];

        const missingFields = requiredFields.filter(field =>
            !prData[field as keyof PullRequestData]
        );

        if (missingFields.length > 0) {
            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                `Missing required PR data fields: ${missingFields.join(", ")}`,
                { missingFields },
                false
            );
        }

        if (prData.linkedIssues.length === 0) {
            throw new PRNotEligibleError(
                prData.prNumber,
                prData.repositoryName,
                "No linked issues found",
                { prBody: prData.body }
            );
        }
    }

    /**
     * Creates a complete PR data object with all required information
     * Combines webhook data with additional API calls
     */
    public static async createCompletePRData(payload: GitHubWebhookPayload): Promise<PullRequestData> {
        const prData = this.extractPRDataFromWebhook(payload);

        // Validate basic data
        this.validatePRData(prData);

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
     * Fetches additional PR details from GitHub API
     */
    public static async fetchPRDetails(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<Partial<PullRequestData>> {
        try {
            // This can be extended to fetch additional PR details like:
            // - PR reviews and review comments
            // - PR timeline events
            // - Commit details and messages
            // - Branch comparison data

            // For now, return empty object as the basic webhook data is sufficient
            return {};
        } catch (error) {
            throw new GitHubAPIError(
                `Failed to fetch PR details for PR #${prNumber}`,
                getFieldFromUnknownObject<number>(error, "status"),
                undefined,
                { installationId, repositoryName, prNumber, originalError: getFieldFromUnknownObject<string>(error, "message") }
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
     * Calculates PR complexity metrics based on changed files
     */
    public static calculatePRComplexity(changedFiles: ChangedFile[]): {
        totalFiles: number;
        totalAdditions: number;
        totalDeletions: number;
        totalChanges: number;
        averageChangesPerFile: number;
        fileTypes: string[];
    } {
        const totalFiles = changedFiles.length;
        const totalAdditions = changedFiles.reduce((sum, file) => sum + file.additions, 0);
        const totalDeletions = changedFiles.reduce((sum, file) => sum + file.deletions, 0);
        const totalChanges = totalAdditions + totalDeletions;
        const averageChangesPerFile = totalFiles > 0 ? totalChanges / totalFiles : 0;
        const fileTypes = this.getFileExtensions(changedFiles);

        return {
            totalFiles,
            totalAdditions,
            totalDeletions,
            totalChanges,
            averageChangesPerFile: Math.round(averageChangesPerFile * 100) / 100,
            fileTypes
        };
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

    // ============================================================================
    // Intelligent Context Fetching Methods
    // ============================================================================

    /**
     * Analyzes PR with intelligent context fetching workflow
     */
    public static async analyzeWithIntelligentContext(prData: PullRequestData): Promise<ContextEnhancedResult> {
        const startTime = Date.now();
        const processingTimes: ProcessingTimes = {
            codeExtraction: 0,
            pathRetrieval: 0,
            aiAnalysis: 0,
            fileFetching: 0,
            total: 0
        };

        console.log(`Starting intelligent context analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        try {
            // Get current configuration
            const config = this.configService.getConfig();
            
            // Check if intelligent context is enabled
            if (!config.enabled) {
                console.log("Intelligent context disabled, falling back to standard analysis");
                return this.wrapStandardResult(await this.fallbackToStandardAnalysis(prData), "Intelligent context disabled");
            }

            // Execute intelligent context workflow with timeout
            const enhancedResult = await this.executeWithTimeout(
                () => this.executeIntelligentContextWorkflow(prData, processingTimes),
                config.maxProcessingTime,
                "Intelligent context analysis"
            );

            processingTimes.total = Date.now() - startTime;

            console.log(`Intelligent context analysis completed in ${processingTimes.total}ms for PR #${prData.prNumber}`);

            return enhancedResult;

        } catch (error) {
            console.error("Intelligent context analysis failed:", error);

            // Track processing time even on failure
            processingTimes.total = Date.now() - startTime;

            // Fallback to standard analysis if enabled
            const config = this.configService.getConfig();
            if (config.fallbackOnError) {
                console.log("Falling back to standard analysis due to error");
                const standardResult = await this.fallbackToStandardAnalysis(prData);
                return this.wrapStandardResult(standardResult, `Intelligent context failed: ${(error as Error).message}`);
            }

            throw error;
        }
    }

    /**
     * Executes the intelligent context workflow
     */
    private static async executeIntelligentContextWorkflow(
        prData: PullRequestData,
        processingTimes: ProcessingTimes
    ): Promise<ContextEnhancedResult> {
        // Step 1: Extract raw code changes
        const extractStart = Date.now();
        const rawCodeChanges = await RawCodeChangesExtractor.extractCodeChanges(
            prData.installationId,
            prData.repositoryName,
            prData.prNumber
        );
        processingTimes.codeExtraction = Date.now() - extractStart;

        // Step 2: Get repository structure
        const pathStart = Date.now();
        const repositoryStructure = await RepositoryFilePath.getRepositoryStructure(
            prData.installationId,
            prData.repositoryName
        );
        processingTimes.pathRetrieval = Date.now() - pathStart;

        // Step 3: AI-powered context analysis
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

        // Step 4: Selective file fetching
        const fetchStart = Date.now();
        const fetchedFiles = await this.fileFetcher.fetchRelevantFiles(
            prData.installationId,
            prData.repositoryName,
            contextAnalysis.relevantFiles
        );
        processingTimes.fileFetching = Date.now() - fetchStart;

        // Step 5: Build enhanced context
        const existingContext = await this.ragService.getRelevantContext(prData);
        const enhancedContext = await EnhancedContextBuilder.buildEnhancedContext(
            rawCodeChanges,
            repositoryStructure,
            contextAnalysis,
            fetchedFiles,
            existingContext
        );

        // Step 6: Generate AI review with enhanced context
        const aiReview = await this.groqService.generateReview(prData, enhancedContext);

        // Step 7: Rule evaluation (using existing service)
        const ruleEvaluation = await RuleEngineService.evaluateRules(prData, []);

        // Step 8: Build enhanced result
        const standardResult = this.buildStandardResult(prData, aiReview, ruleEvaluation);
        
        return this.buildEnhancedResult(
            prData,
            aiReview,
            ruleEvaluation,
            enhancedContext,
            processingTimes,
            standardResult
        );
    }

    /**
     * Builds enhanced result with intelligent context metrics
     */
    public static buildEnhancedResult(
        prData: PullRequestData,
        aiReview: AIReview,
        ruleEvaluation: RuleEvaluation,
        enhancedContext: EnhancedReviewContext,
        processingTimes: ProcessingTimes,
        standardResult?: ReviewResult
    ): ContextEnhancedResult {
        // Build standard result if not provided
        const baseResult = standardResult || this.buildStandardResult(prData, aiReview, ruleEvaluation);

        // Calculate context metrics
        const contextMetrics = enhancedContext.contextMetrics;

        return {
            standardResult: baseResult,
            contextMetrics,
            intelligentContextUsed: true,
            enhancedFeatures: {
                aiRecommendedFiles: enhancedContext.contextAnalysis.relevantFiles.map(f => f.filePath),
                contextQualityScore: contextMetrics.contextQualityScore || 0,
                processingTimeBreakdown: processingTimes
            }
        };
    }

    /**
     * Fallback to standard analysis when intelligent context fails or is disabled
     */
    public static async fallbackToStandardAnalysis(prData: PullRequestData): Promise<ReviewResult> {
        console.log(`Executing standard analysis for PR #${prData.prNumber}`);

        try {
            // Get existing context using RAG service
            const existingContext = await this.ragService.getRelevantContext(prData);

            // Generate AI review with existing context
            const aiReview = await this.groqService.generateReview(prData, existingContext);

            // Rule evaluation
            const ruleEvaluation = await RuleEngineService.evaluateRules(prData, []);

            // Build standard result
            return this.buildStandardResult(prData, aiReview, ruleEvaluation);

        } catch (error) {
            console.error("Standard analysis also failed:", error);
            
            // Return minimal result to prevent complete failure
            return this.buildMinimalResult(prData, error as Error);
        }
    }

    /**
     * Builds standard review result from AI review and rule evaluation
     */
    private static buildStandardResult(
        prData: PullRequestData,
        aiReview: AIReview,
        ruleEvaluation: RuleEvaluation
    ): ReviewResult {
        return {
            installationId: prData.installationId,
            prNumber: prData.prNumber,
            repositoryName: prData.repositoryName,
            mergeScore: aiReview.mergeScore,
            rulesViolated: ruleEvaluation.violated,
            rulesPassed: ruleEvaluation.passed,
            suggestions: aiReview.suggestions,
            reviewStatus: "COMPLETED",
            summary: aiReview.summary,
            confidence: aiReview.confidence,
            processingTime: 0, // Will be set by caller
            createdAt: new Date()
        };
    }

    /**
     * Builds minimal result when all analysis methods fail
     */
    private static buildMinimalResult(prData: PullRequestData, error: Error): ReviewResult {
        return {
            installationId: prData.installationId,
            prNumber: prData.prNumber,
            repositoryName: prData.repositoryName,
            mergeScore: 0,
            rulesViolated: [],
            rulesPassed: [],
            suggestions: [{
                file: "system",
                type: "fix",
                severity: "high",
                description: "AI review failed. Manual review recommended.",
                reasoning: `Analysis failed: ${error.message}`
            }],
            reviewStatus: "FAILED",
            summary: `Analysis failed: ${error.message}. Please review manually.`,
            confidence: 0,
            processingTime: 0,
            createdAt: new Date()
        };
    }

    /**
     * Wraps standard result in enhanced result format
     */
    private static wrapStandardResult(standardResult: ReviewResult, fallbackReason: string): ContextEnhancedResult {
        return {
            standardResult,
            contextMetrics: this.createEmptyContextMetrics(),
            intelligentContextUsed: false,
            fallbackReason,
            enhancedFeatures: {
                aiRecommendedFiles: [],
                contextQualityScore: 0,
                processingTimeBreakdown: {
                    codeExtraction: 0,
                    pathRetrieval: 0,
                    aiAnalysis: 0,
                    fileFetching: 0,
                    total: 0
                }
            }
        };
    }

    /**
     * Creates empty context metrics for fallback scenarios
     */
    private static createEmptyContextMetrics(): ContextMetrics {
        return {
            totalFilesInRepo: 0,
            filesAnalyzedByAI: 0,
            filesRecommended: 0,
            filesFetched: 0,
            fetchSuccessRate: 0,
            processingTime: {
                codeExtraction: 0,
                pathRetrieval: 0,
                aiAnalysis: 0,
                fileFetching: 0,
                total: 0
            }
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
     * Logs intelligent context analysis metrics
     */
    public static logIntelligentContextMetrics(
        prData: PullRequestData,
        result: ContextEnhancedResult,
        success: boolean = true,
        error?: Error
    ): void {
        const config = this.configService.getConfig();
        if (!config.enableMetrics) {
            return;
        }

        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            intelligentContextUsed: result.intelligentContextUsed,
            fallbackReason: result.fallbackReason,
            contextMetrics: result.contextMetrics,
            enhancedFeatures: result.enhancedFeatures,
            success,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (success) {
            console.log("Intelligent context analysis metrics:", JSON.stringify(logData, null, 2));
        } else {
            console.error("Intelligent context analysis failed metrics:", JSON.stringify(logData, null, 2));
        }
    }

    /**
     * Gets intelligent context configuration
     */
    public static getIntelligentContextConfig() {
        return this.configService.getConfig();
    }

    /**
     * Gets intelligent context configuration service
     */
    public static getConfigService() {
        return this.configService;
    }

    /**
     * Updates intelligent context configuration
     */
    public static updateIntelligentContextConfig(updates: Partial<IntelligentContextConfig>) {
        this.configService.updateConfig(updates);
        console.log("Intelligent context configuration updated:", this.configService.getConfig());
    }
}
