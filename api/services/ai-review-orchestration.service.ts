import {
    PullRequestData,
    RelevantContext,
    AIReview,
    RuleEvaluation,
    ReviewResult,
    CodeAnalysis,
    GitHubWebhookPayload,
    ManualTriggerRequest,
} from '../models/ai-review.model';
import {
    PRAnalysisError,
    TimeoutError,
    ErrorUtils,
    AIReviewError
} from '../models/ai-review.errors';
import { ReviewCommentIntegrationService } from './review-comment-integration.service';
import { ReviewStatus, AIReviewRule } from '../generated/client';
import { prisma } from '../config/database.config';

// Import existing services
import { PRAnalysisService } from './pr-analysis.service';
import { RAGContextServiceImpl } from './rag-context.service';
import { GroqAIService } from './groq-ai.service';
import { RuleEngineService } from './rule-engine.service';
import { MergeScoreService } from './merge-score.service';

/**
 * AI Review Orchestration Service
 * Main service that coordinates the entire PR analysis workflow
 * Requirements: 4.1, 4.2, 4.3, 5.4
 */
export class AIReviewOrchestrationService {
    private ragContextService: RAGContextServiceImpl;
    private groqAIService: GroqAIService;

    // Configuration for async processing and retries
    private readonly config = {
        maxRetries: parseInt(process.env.AI_REVIEW_MAX_RETRIES || '3'),
        timeoutMs: parseInt(process.env.AI_REVIEW_TIMEOUT_MS || '300000'), // 5 minutes
        retryDelayMs: parseInt(process.env.AI_REVIEW_RETRY_DELAY_MS || '5000'), // 5 seconds
        enableGracefulDegradation: process.env.AI_REVIEW_GRACEFUL_DEGRADATION !== 'false'
    };

    constructor() {
        this.ragContextService = new RAGContextServiceImpl();
        this.groqAIService = new GroqAIService();
    }

    /**
     * Main orchestration method for PR analysis workflow
     * Requirement 4.1: System shall provide specific, actionable code suggestions
     * Requirement 4.2: System shall include line numbers and file references
     * Requirement 4.3: System shall be based on best practices and repository patterns
     */
    async analyzePR(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        let reviewResult: ReviewResult;

        try {
            // Step 1: Create initial review result record
            reviewResult = await this.createInitialReviewResult(prData);

            // Step 2: Update status to in progress
            await this.updateReviewStatus(reviewResult.installationId, reviewResult.prNumber, reviewResult.repositoryName, ReviewStatus.IN_PROGRESS);

            // Step 3: Execute analysis workflow with timeout
            const analysisResult = await this.executeWithTimeout(
                () => this.executeAnalysisWorkflow(prData),
                this.config.timeoutMs,
                'PR analysis workflow'
            );

            // Step 4: Compile final results
            const finalResult = await this.compileResults(prData, analysisResult, startTime);

            // Step 5: Store results and update status
            await this.storeReviewResult(finalResult);
            await this.updateReviewStatus(finalResult.installationId, finalResult.prNumber, finalResult.repositoryName, ReviewStatus.COMPLETED);

            // Step 6: Post review comment to GitHub
            await this.postReviewComment(finalResult);

            // Step 7: Store context for future RAG queries
            await this.storeContextForFutureUse(prData, finalResult);

            return finalResult;

        } catch (error) {
            console.error('Error in PR analysis orchestration:', error);

            // Handle error and update status
            const errorResult = await this.handleAnalysisError(prData, error as Error, startTime);

            try {
                await this.updateReviewStatus(prData.installationId, prData.prNumber, prData.repositoryName, ReviewStatus.FAILED);
            } catch (statusError) {
                console.error('Failed to update review status to FAILED:', statusError);
            }

            return errorResult;
        }
    }

    /**
     * Executes the core analysis workflow with proper error handling
     * Requirement 5.4: System shall limit results to most relevant information
     */
    private async executeAnalysisWorkflow(prData: PullRequestData): Promise<{
        context: RelevantContext;
        ruleEvaluation: RuleEvaluation;
        aiReview: AIReview;
        codeAnalysis: CodeAnalysis;
    }> {
        // Step 1: Gather context in parallel with rule evaluation
        const [context, customRules] = await Promise.all([
            this.gatherContextWithRetry(prData),
            this.getCustomRulesWithRetry(prData.installationId)
        ]);

        // Step 2: Evaluate rules
        const ruleEvaluation = await this.evaluateRulesWithRetry(prData, customRules);

        // Step 3: Generate AI review with context
        const aiReview = await this.generateAIReviewWithRetry(prData, context);

        // Step 4: Create comprehensive code analysis
        const codeAnalysis = this.createCodeAnalysis(aiReview, ruleEvaluation);

        return {
            context,
            ruleEvaluation,
            aiReview,
            codeAnalysis
        };
    }

    /**
     * Gathers relevant context with retry logic
     * Requirement 5.4: System shall limit results to most relevant information
     */
    private async gatherContextWithRetry(prData: PullRequestData): Promise<RelevantContext> {
        return this.executeWithRetry(
            async () => {
                try {
                    return await this.ragContextService.getRelevantContext(prData);
                } catch (error) {
                    if (this.config.enableGracefulDegradation) {
                        console.warn('RAG context service failed, using empty context:', error);
                        return {
                            similarPRs: [],
                            relevantFiles: [],
                            codePatterns: [],
                            projectStandards: []
                        };
                    }
                    throw error;
                }
            },
            'Context gathering',
            this.config.maxRetries
        );
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
                        console.warn('Failed to fetch custom rules, using empty array:', error);
                        return [];
                    }
                    throw error;
                }
            },
            'Custom rules retrieval',
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
                        console.warn('Rule evaluation failed, using default evaluation:', error);
                        return {
                            passed: [],
                            violated: [],
                            score: 50 // Neutral score when rules can't be evaluated
                        };
                    }
                    throw error;
                }
            },
            'Rule evaluation',
            this.config.maxRetries
        );
    }

    /**
     * Generates AI review with retry logic
     * Requirement 4.1: System shall provide specific, actionable code suggestions
     */
    private async generateAIReviewWithRetry(prData: PullRequestData, context: RelevantContext): Promise<AIReview> {
        return this.executeWithRetry(
            async () => {
                try {
                    return await this.groqAIService.generateReview(prData, context);
                } catch (error) {
                    if (this.config.enableGracefulDegradation) {
                        console.warn('AI review generation failed, using fallback review:', error);
                        return this.createFallbackAIReview(prData);
                    }
                    throw error;
                }
            },
            'AI review generation',
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
                    file: rule.affectedFiles?.[0] || 'unknown',
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
                    rule: 'ai-suggestion'
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
            context: RelevantContext;
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
                        reviewStatus: ReviewStatus.PENDING,
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
                        reviewStatus: ReviewStatus.PENDING
                    }
                });

                return this.mapDatabaseResultToReviewResult(created);
            }
        } catch (error) {
            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                'Failed to create initial review result',
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
            console.error('Failed to update review status:', error);
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
                    rulesViolated: result.rulesViolated as any,
                    rulesPassed: result.rulesPassed as any,
                    suggestions: result.suggestions as any,
                    reviewStatus: result.reviewStatus,
                    updatedAt: new Date()
                }
            });
        } catch (error) {
            console.error('Failed to store review result:', error);
            // Don't throw error to avoid breaking main workflow
        }
    }

    /**
     * Posts review comment to GitHub PR
     * Requirement 6.1: System SHALL post comprehensive comment on PR
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
                        'Review analysis completed but failed to post detailed results. Please check the logs.'
                    );
                } catch (errorCommentError) {
                    console.error('Failed to post error comment:', errorCommentError);
                }
            }
        } catch (error) {
            console.error('Error in review comment posting:', error);
            // Don't throw error to avoid breaking main workflow
        }
    }

    /**
     * Stores context for future RAG queries
     */
    private async storeContextForFutureUse(prData: PullRequestData, result: ReviewResult): Promise<void> {
        try {
            await this.ragContextService.storePRContext(prData, result);
        } catch (error) {
            console.error('Failed to store PR context for future use:', error);
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
                file: 'system',
                type: 'fix',
                severity: 'high',
                description: 'AI review failed. Manual review recommended.',
                reasoning: error instanceof AIReviewError ? error.message : 'Unknown error occurred during analysis'
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
            console.error('Failed to store error result:', storeError);
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
                file: 'system',
                type: 'improvement',
                severity: 'medium',
                description: 'AI analysis unavailable. Consider manual code review.',
                reasoning: 'AI service was unavailable during analysis'
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
    private mapDatabaseResultToReviewResult(dbResult: any): ReviewResult {
        return {
            installationId: dbResult.installationId,
            prNumber: dbResult.prNumber,
            repositoryName: dbResult.repositoryName,
            mergeScore: dbResult.mergeScore,
            rulesViolated: Array.isArray(dbResult.rulesViolated) ? dbResult.rulesViolated : [],
            rulesPassed: Array.isArray(dbResult.rulesPassed) ? dbResult.rulesPassed : [],
            suggestions: Array.isArray(dbResult.suggestions) ? dbResult.suggestions : [],
            reviewStatus: dbResult.reviewStatus,
            summary: dbResult.summary || '',
            confidence: dbResult.confidence || 0,
            processingTime: 0,
            createdAt: dbResult.createdAt
        };
    }

    /**
     * Maps rule severity to code issue severity
     */
    private mapRuleSeverityToCodeSeverity(severity: any): 'low' | 'medium' | 'high' | 'critical' {
        switch (severity) {
            case 'LOW': return 'low';
            case 'MEDIUM': return 'medium';
            case 'HIGH': return 'high';
            case 'CRITICAL': return 'critical';
            default: return 'medium';
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
    private estimateLinesOfCode(suggestions: any[]): number {
        // Rough estimate based on number of suggestions
        return Math.max(100, suggestions.length * 50);
    }

    // ============================================================================
    // Public API Methods
    // ============================================================================

    /**
     * Processes GitHub webhook for PR analysis
     * Requirement 4.1: System shall trigger AI review process for qualifying PRs
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

            // Execute analysis
            return await this.analyzePR(completePRData);

        } catch (error) {
            console.error('Error processing webhook PR:', error);
            throw ErrorUtils.wrapError(error as Error, 'Webhook PR processing');
        }
    }

    /**
     * Manually triggers PR analysis
     * Requirement 4.1: System shall provide manual trigger capability
     */
    async triggerManualAnalysis(request: ManualTriggerRequest): Promise<ReviewResult> {
        try {
            // Create PR data from manual request
            const prData: PullRequestData = {
                installationId: request.installationId,
                repositoryName: request.repositoryName,
                prNumber: request.prNumber,
                prUrl: `https://github.com/${request.repositoryName}/pull/${request.prNumber}`,
                title: 'Manual Analysis Request',
                body: request.reason || 'Manually triggered analysis',
                changedFiles: [], // Will be fetched
                linkedIssues: [], // Will be extracted
                author: request.userId,
                isDraft: false
            };

            // Fetch complete PR data from GitHub
            // Note: This would require additional GitHub API calls to get full PR data
            // For now, we'll proceed with the basic data

            return await this.analyzePR(prData);

        } catch (error) {
            console.error('Error in manual analysis trigger:', error);
            throw ErrorUtils.wrapError(error as Error, 'Manual analysis trigger');
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
            console.error('Error getting analysis status:', error);
            return null;
        }
    }

    /**
     * Updates existing review for a PR
     */
    async updateExistingReview(prData: PullRequestData): Promise<ReviewResult> {
        // For updates, we can reuse the same analysis workflow
        return await this.analyzePR(prData);
    }
}