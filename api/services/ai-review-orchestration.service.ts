import {
    PullRequestData,
    AIReview,
    RuleEvaluation,
    ReviewResult,
    CodeAnalysis,
    GitHubWebhookPayload,
    CodeSuggestion
} from "../models/ai-review.model";
import {
    PRAnalysisError,
    TimeoutError,
    ErrorUtils,
    AIReviewError
} from "../models/ai-review.errors";
import { ReviewCommentIntegrationService } from "./review-comment-integration.service";
import { ReviewStatus, AIReviewRule, Prisma, $Enums } from "../generated/client";
import { prisma } from "../config/database.config";

// Import existing services
import { PRAnalysisService } from "./pr-analysis.service";
import { GroqAIService } from "./groq-ai.service";
import { RuleEngineService, RuleResult } from "./rule-engine.service";
import { MergeScoreService } from "./merge-score.service";
import { IntelligentContextConfig } from "../models/intelligent-context.model";

/**
 * AI Review Orchestration Service
 * Main service that coordinates the entire PR analysis workflow
 */
export class AIReviewOrchestrationService {
    private groqAIService: GroqAIService;

    // Configuration for async processing and retries
    private readonly config = {
        maxRetries: parseInt(process.env.AI_REVIEW_MAX_RETRIES || "3"),
        timeoutMs: parseInt(process.env.AI_REVIEW_TIMEOUT_MS || "300000"), // 5 minutes
        retryDelayMs: parseInt(process.env.AI_REVIEW_RETRY_DELAY_MS || "5000"), // 5 seconds
        enableGracefulDegradation: process.env.AI_REVIEW_GRACEFUL_DEGRADATION !== "false"
    };

    constructor() {
        this.groqAIService = new GroqAIService();
    }

    /**
     * Main orchestration method for PR analysis workflow
     */
    async analyzePR(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();

        try {
            // Execute analysis workflow with timeout
            const analysisResult = await this.executeWithTimeout(
                () => this.executeAnalysisWorkflow(prData),
                this.config.timeoutMs,
                "PR analysis workflow"
            );

            // Compile final results
            const finalResult = await this.compileResults(prData, analysisResult, startTime);

            // Store results and update status
            await this.storeReviewResult(finalResult);
            await this.updateReviewStatus(finalResult.installationId, finalResult.prNumber, finalResult.repositoryName, ReviewStatus.COMPLETED);

            // Post review comment to GitHub
            await this.postReviewComment(finalResult);

            return finalResult;

        } catch (error) {
            console.error("Error in PR analysis orchestration:", error);

            // Handle error and update status
            const errorResult = await this.handleAnalysisError(prData, error as Error, startTime);

            try {
                await this.updateReviewStatus(prData.installationId, prData.prNumber, prData.repositoryName, ReviewStatus.FAILED);
            } catch (statusError) {
                console.error("Failed to update review status to FAILED:", statusError);
            }

            return errorResult;
        }
    }

    /**
     * Executes the core analysis workflow with proper error handling
     */
    private async executeAnalysisWorkflow(prData: PullRequestData): Promise<{
        ruleEvaluation: RuleEvaluation;
        aiReview: AIReview;
        codeAnalysis: CodeAnalysis;
    }> {
        // Step 1: Get custom rules
        const customRules = await this.getCustomRulesWithRetry(prData.installationId);

        // Step 2: Evaluate rules
        const ruleEvaluation = await this.evaluateRulesWithRetry(prData, customRules);

        // Step 3: Generate AI review without context
        const aiReview = await this.generateAIReviewWithRetry(prData);

        // Step 4: Create comprehensive code analysis
        const codeAnalysis = this.createCodeAnalysis(aiReview, ruleEvaluation);

        return {
            ruleEvaluation,
            aiReview,
            codeAnalysis
        };
    }



    /**
     * Gets custom rules with retry logic
     */
    private async getCustomRulesWithRetry(installationId: string): Promise<AIReviewRule[]> {
        return this.executeWithRetry(
            async () => {
                try {
                    return await prisma.aIReviewRule.findMany({
                        where: {
                            installationId,
                            active: true
                        }
                    });
                } catch (error) {
                    if (this.config.enableGracefulDegradation) {
                        console.warn("Failed to fetch custom rules, using empty array:", error);
                        return [];
                    }
                    throw error;
                }
            },
            "Custom rules retrieval",
            this.config.maxRetries
        );
    }

    /**
     * Evaluates rules with retry logic
     */
    private async evaluateRulesWithRetry(prData: PullRequestData, customRules: AIReviewRule[]): Promise<RuleEvaluation> {
        return this.executeWithRetry(
            async () => {
                try {
                    return await RuleEngineService.evaluateRules(prData, customRules);
                } catch (error) {
                    if (this.config.enableGracefulDegradation) {
                        console.warn("Rule evaluation failed, using default evaluation:", error);
                        return {
                            passed: [],
                            violated: [],
                            score: 50 // Neutral score when rules can't be evaluated
                        };
                    }
                    throw error;
                }
            },
            "Rule evaluation",
            this.config.maxRetries
        );
    }

    /**
     * Generates AI review with retry logic
     */
    private async generateAIReviewWithRetry(prData: PullRequestData): Promise<AIReview> {
        return this.executeWithRetry(
            async () => {
                try {
                    return await this.groqAIService.generateReview(prData);
                } catch (error) {
                    if (this.config.enableGracefulDegradation) {
                        console.warn("AI review generation failed, using fallback review:", error);
                        return this.createFallbackAIReview(prData);
                    }
                    throw error;
                }
            },
            "AI review generation",
            this.config.maxRetries
        );
    }

    /**
     * Creates a comprehensive code analysis from AI review and rule evaluation
     */
    private createCodeAnalysis(aiReview: AIReview, ruleEvaluation: RuleEvaluation): CodeAnalysis {
        return {
            issues: [
                // Convert rule violations to code issues
                ...ruleEvaluation.violated.map(rule => ({
                    file: rule.affectedFiles?.[0] || "unknown",
                    line: 0,
                    type: rule.ruleId,
                    severity: this.mapRuleSeverityToCodeSeverity(rule.severity),
                    message: rule.description,
                    rule: rule.ruleName
                })),
                // Convert AI suggestions to code issues
                ...aiReview.suggestions.map(suggestion => ({
                    file: suggestion.file,
                    line: suggestion.lineNumber || 0,
                    type: suggestion.type,
                    severity: suggestion.severity,
                    message: suggestion.description,
                    rule: "ai-suggestion"
                }))
            ],
            metrics: aiReview.codeQuality,
            complexity: {
                cyclomaticComplexity: this.estimateComplexity(aiReview.codeQuality.maintainability),
                cognitiveComplexity: this.estimateComplexity(aiReview.codeQuality.maintainability),
                linesOfCode: this.estimateLinesOfCode(aiReview.suggestions),
                maintainabilityIndex: aiReview.codeQuality.maintainability
            },
            testCoverage: {
                linesCovered: Math.round(aiReview.codeQuality.testCoverage * 0.8), // Estimate
                totalLines: Math.round(aiReview.codeQuality.testCoverage * 1.0), // Estimate
                branchesCovered: Math.round(aiReview.codeQuality.testCoverage * 0.7), // Estimate
                totalBranches: Math.round(aiReview.codeQuality.testCoverage * 1.0), // Estimate
                coveragePercentage: aiReview.codeQuality.testCoverage
            }
        };
    }

    /**
     * Compiles final results from analysis workflow
     */
    private async compileResults(
        prData: PullRequestData,
        analysisResult: {
            ruleEvaluation: RuleEvaluation;
            aiReview: AIReview;
            codeAnalysis: CodeAnalysis;
        },
        startTime: number
    ): Promise<ReviewResult> {
        const { ruleEvaluation, aiReview, codeAnalysis } = analysisResult;

        // Calculate merge score using the existing service
        const mergeScore = MergeScoreService.calculateMergeScore(codeAnalysis, ruleEvaluation);

        return {
            installationId: prData.installationId,
            prNumber: prData.prNumber,
            repositoryName: prData.repositoryName,
            mergeScore,
            rulesViolated: ruleEvaluation.violated,
            rulesPassed: ruleEvaluation.passed,
            suggestions: aiReview.suggestions,
            reviewStatus: ReviewStatus.COMPLETED,
            summary: aiReview.summary,
            confidence: aiReview.confidence,
            processingTime: Date.now() - startTime,
            createdAt: new Date()
        };
    }

    /**
     * Creates initial review result record in database
     */
    private async createInitialReviewResult(prData: PullRequestData): Promise<ReviewResult> {
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

                return this.mapDatabaseResultToReviewResult(updated);
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

                return this.mapDatabaseResultToReviewResult(created);
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
     * Handles analysis errors and creates error result
     */
    private async handleAnalysisError(prData: PullRequestData, error: Error, startTime: number): Promise<ReviewResult> {
        console.error(`Analysis failed for PR #${prData.prNumber} in ${prData.repositoryName}:`, error);

        // Create error result
        const errorResult: ReviewResult = {
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
                reasoning: error instanceof AIReviewError ? error.message : "Unknown error occurred during analysis"
            }],
            reviewStatus: ReviewStatus.FAILED,
            summary: `Analysis failed: ${error.message}. Please review manually.`,
            confidence: 0,
            processingTime: Date.now() - startTime,
            createdAt: new Date()
        };

        // Try to store error result
        try {
            await this.storeReviewResult(errorResult);
        } catch (storeError) {
            console.error("Failed to store error result:", storeError);
        }

        return errorResult;
    }

    /**
     * Creates fallback AI review when AI service fails
     */
    private createFallbackAIReview(prData: PullRequestData): AIReview {
        return {
            mergeScore: 50, // Neutral score
            codeQuality: {
                codeStyle: 50,
                testCoverage: 50,
                documentation: 50,
                security: 50,
                performance: 50,
                maintainability: 50
            },
            suggestions: [{
                file: "system",
                type: "improvement",
                severity: "medium",
                description: "AI analysis unavailable. Consider manual code review.",
                reasoning: "AI service was unavailable during analysis"
            }],
            summary: `AI analysis unavailable for PR #${prData.prNumber}. Manual review recommended.`,
            confidence: 0.1
        };
    }

    /**
     * Generic retry wrapper with exponential backoff
     */
    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = this.config.maxRetries
    ): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Don't retry if error is not retryable
                if (!ErrorUtils.isRetryable(lastError)) {
                    throw lastError;
                }

                // Don't retry on last attempt
                if (attempt === maxRetries - 1) {
                    break;
                }

                // Calculate delay and wait
                const delay = ErrorUtils.getRetryDelay(lastError, attempt);
                console.log(`${operationName} failed (attempt ${attempt + 1}/${maxRetries}), retrying in ${delay}ms:`, lastError.message);

                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    /**
     * Executes operation with timeout
     */
    private async executeWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new TimeoutError(operationName, timeoutMs));
                }, timeoutMs);
            })
        ]);
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Maps database result to ReviewResult interface
     */
    private mapDatabaseResultToReviewResult(dbResult: Prisma.$AIReviewResultPayload["scalars"]): ReviewResult {
        return {
            installationId: dbResult.installationId,
            prNumber: dbResult.prNumber,
            repositoryName: dbResult.repositoryName,
            mergeScore: dbResult.mergeScore,
            rulesViolated: Array.isArray(dbResult.rulesViolated) ? dbResult.rulesViolated as unknown as RuleResult[] : [],
            rulesPassed: Array.isArray(dbResult.rulesPassed) ? dbResult.rulesPassed as unknown as RuleResult[] : [],
            suggestions: Array.isArray(dbResult.suggestions) ? dbResult.suggestions as unknown as CodeSuggestion[] : [],
            reviewStatus: dbResult.reviewStatus,
            summary: "",
            confidence: 0,
            processingTime: 0,
            createdAt: dbResult.createdAt
        };
    }

    /**
     * Maps rule severity to code issue severity
     */
    private mapRuleSeverityToCodeSeverity(severity: $Enums.RuleSeverity): "low" | "medium" | "high" | "critical" {
        switch (severity) {
        case "LOW": return "low";
        case "MEDIUM": return "medium";
        case "HIGH": return "high";
        case "CRITICAL": return "critical";
        default: return "medium";
        }
    }

    /**
     * Estimates complexity from maintainability score
     */
    private estimateComplexity(maintainability: number): number {
        // Inverse relationship: higher maintainability = lower complexity
        return Math.max(1, Math.round((100 - maintainability) / 10));
    }

    /**
     * Estimates lines of code from suggestions count
     */
    private estimateLinesOfCode(suggestions: unknown[]): number {
        // Rough estimate based on number of suggestions
        return Math.max(100, suggestions.length * 50);
    }

    // ============================================================================
    // Public API Methods
    // ============================================================================

    /**
     * Processes GitHub webhook for PR analysis with intelligent context
     */
    async processWebhookPR(payload: GitHubWebhookPayload): Promise<ReviewResult | null> {
        try {
            // Extract PR data from webhook
            const prData = PRAnalysisService.extractPRDataFromWebhook(payload);

            // Check if PR should be analyzed
            if (!PRAnalysisService.shouldAnalyzePR(prData)) {
                console.log(`PR #${prData.prNumber} in ${prData.repositoryName} is not eligible for analysis`);
                return null;
            }

            // Fetch additional PR data (changed files, etc.)
            const completePRData = await PRAnalysisService.createCompletePRData(payload);

            // Use intelligent context analysis as the primary method
            return await this.analyzeWithIntelligentContext(completePRData);

        } catch (error) {
            console.error("Error processing webhook PR:", error);
            throw ErrorUtils.wrapError(error as Error, "Webhook PR processing");
        }
    }

    /**
     * Gets analysis status for a PR
     */
    async getAnalysisStatus(installationId: string, prNumber: number, repositoryName: string): Promise<ReviewResult | null> {
        try {
            const dbResult = await prisma.aIReviewResult.findUnique({
                where: {
                    installationId_prNumber_repositoryName: {
                        installationId,
                        prNumber,
                        repositoryName
                    }
                }
            });

            return dbResult ? this.mapDatabaseResultToReviewResult(dbResult) : null;

        } catch (error) {
            console.error("Error getting analysis status:", error);
            return null;
        }
    }

    /**
     * Analyzes PR with intelligent context fetching as the primary method
     */
    async analyzeWithIntelligentContext(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();

        try {
            // Create initial review result record
            await this.createInitialReviewResult(prData);

            // Execute intelligent context analysis
            const enhancedResult = await PRAnalysisService.analyzeWithIntelligentContext(prData);

            // Extract the standard result for processing
            const standardResult = enhancedResult.standardResult;

            // Update the result with processing time
            standardResult.processingTime = Date.now() - startTime;

            // Store results and update status
            await this.storeReviewResult(standardResult);
            await this.updateReviewStatus(standardResult.installationId, standardResult.prNumber, standardResult.repositoryName, ReviewStatus.COMPLETED);

            // Post review comment to GitHub
            await this.postReviewComment(standardResult);

            // Log intelligent context metrics
            PRAnalysisService.logIntelligentContextMetrics(prData, enhancedResult, true);

            console.log(`Intelligent context analysis completed successfully for PR #${prData.prNumber} in ${standardResult.processingTime}ms`);

            return standardResult;

        } catch (error) {
            console.error("Intelligent context analysis failed:", error);

            // Handle error and update status
            const errorResult = await this.handleAnalysisError(prData, error as Error, startTime);

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

            return errorResult;
        }
    }

    /**
     * Updates existing review for a PR with intelligent context
     */
    async updateExistingReview(prData: PullRequestData): Promise<ReviewResult> {
        // Use intelligent context analysis for updates as well
        try {
            console.log(`Updating existing review with intelligent context for PR #${prData.prNumber}`);
            return await this.analyzeWithIntelligentContext(prData);
        } catch (error) {
            console.error("Error updating existing review with intelligent context:", error);
            throw ErrorUtils.wrapError(error as Error, "Update existing review");
        }
    }

    /**
     * Gets intelligent context configuration
     */
    getIntelligentContextConfig() {
        return PRAnalysisService.getIntelligentContextConfig();
    }

    /**
     * Updates intelligent context configuration
     */
    updateIntelligentContextConfig(updates: Partial<IntelligentContextConfig>): void {
        PRAnalysisService.updateIntelligentContextConfig(updates);
    }
}
