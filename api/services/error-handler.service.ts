import {
    GroqServiceError,
    GitHubAPIError,
    TimeoutError,
    ErrorUtils
} from "../models/ai-review.errors";
import {
    PullRequestData,
    AIReview,
    RuleEvaluation,
    CodeSuggestion
} from "../models/ai-review.model";

/**
 * Error Handler Service for AI Review System
 * Implements fallback mechanisms and graceful degradation
 */
export class ErrorHandlerService {
    private static readonly MAX_RETRIES = 3;
    private static readonly TIMEOUT_MS = 60000; // 60 seconds

    /**
     * Executes operation with retry logic and exponential backoff
     */
    static async withRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
        maxRetries: number = ErrorHandlerService.MAX_RETRIES,
        timeoutMs: number = ErrorHandlerService.TIMEOUT_MS
    ): Promise<T> {
        if (maxRetries <= 0) {
            throw new Error(`Invalid maxRetries value: ${maxRetries}. Must be greater than 0.`);
        }

        let lastError: Error | undefined;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Wrap operation with timeout
                return await ErrorHandlerService.withTimeout(operation, operationName, timeoutMs);
            } catch (err) {
                const error = err as Error;
                lastError = error;

                // Log the attempt
                console.warn(`Attempt ${attempt + 1}/${maxRetries} failed for ${operationName}:`, {
                    error: error.message,
                    retryable: ErrorUtils.isRetryable(error)
                });

                // Don't retry if error is not retryable
                if (!ErrorUtils.isRetryable(error)) {
                    console.error(`Non-retryable error for ${operationName}, aborting:`, error);
                    throw error;
                }

                // Don't wait after the last attempt
                if (attempt < maxRetries - 1) {
                    const delay = ErrorUtils.getRetryDelay(error, attempt);
                    console.log(`Waiting ${delay}ms before retry ${attempt + 2}/${maxRetries} for ${operationName}`);
                    await ErrorHandlerService.sleep(delay);
                }
            }
        }

        // All retries exhausted - lastError should be defined here since maxRetries > 0
        console.error(`All ${maxRetries} retries exhausted for ${operationName}:`, lastError);
        throw ErrorUtils.wrapError(lastError!, `Failed after ${maxRetries} retries: ${operationName}`);
    }

    /**
     * Wraps operation with timeout
     */
    static async withTimeout<T>(
        operation: () => Promise<T>,
        operationName: string,
        timeoutMs: number
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
     * Handles Groq AI service failures with fallback
     */
    static async handleGroqFailure(
        prData: PullRequestData,
        ruleEvaluation: RuleEvaluation,
        error: GroqServiceError
    ): Promise<AIReview> {
        console.warn("Groq AI service failed, using fallback review generation:", {
            error: error.message,
            code: error.code,
            prNumber: prData.prNumber,
            repository: prData.repositoryName
        });

        // Generate fallback review based on rule evaluation and basic analysis
        return ErrorHandlerService.generateFallbackReview(prData, ruleEvaluation, error);
    }



    /**
     * Handles GitHub API failures with fallback
     */
    static async handleGitHubFailure(
        installationId: string,
        repositoryName: string,
        prNumber: number,
        operation: string,
        error: GitHubAPIError
    ): Promise<boolean> {
        console.warn("GitHub API operation failed:", {
            error: error.message,
            code: error.code,
            statusCode: error.statusCode,
            operation,
            installationId,
            repositoryName,
            prNumber
        });

        // For rate limiting, we should retry
        if (error.statusCode === 429) {
            console.log("GitHub API rate limited, operation will be retried by retry mechanism");
            throw error; // Let retry mechanism handle this
        }

        // For other errors, log and continue without the operation
        console.error(`GitHub API operation '${operation}' failed permanently:`, error);
        return false;
    }

    /**
     * Handles database operation failures
     */
    static async handleDatabaseFailure<T>(
        operation: string,
        fallbackValue: T,
        error: Error
    ): Promise<T> {
        console.warn("Database operation failed, using fallback:", {
            operation,
            error: error.message,
            fallbackValue: typeof fallbackValue
        });

        // Log to external monitoring if available
        await ErrorHandlerService.logToMonitoring("database_failure", {
            operation,
            error: error.message,
            timestamp: new Date().toISOString()
        });

        return fallbackValue;
    }

    /**
     * Generates fallback AI review when Groq is unavailable
     */
    private static generateFallbackReview(
        prData: PullRequestData,
        ruleEvaluation: RuleEvaluation,
        error: GroqServiceError
    ): AIReview {
        // Calculate basic merge score from rule evaluation
        const ruleScore = ErrorHandlerService.calculateRuleBasedScore(ruleEvaluation);

        // Generate basic quality metrics
        const codeQuality = ErrorHandlerService.generateBasicQualityMetrics(prData, ruleEvaluation);

        // Generate basic suggestions from rule violations
        const suggestions = ErrorHandlerService.generateBasicSuggestions(prData, ruleEvaluation);

        return {
            mergeScore: ruleScore,
            codeQuality,
            suggestions,
            summary: `Automated review completed with rule-based analysis. AI analysis unavailable: ${error.message}. Manual review recommended for comprehensive feedback.`,
            confidence: 0.3 // Low confidence for fallback review
        };
    }

    /**
     * Calculates merge score based on rule evaluation only
     */
    private static calculateRuleBasedScore(ruleEvaluation: RuleEvaluation): number {
        const totalRules = ruleEvaluation.passed.length + ruleEvaluation.violated.length;
        if (totalRules === 0) return 50; // Default score when no rules

        const passedRules = ruleEvaluation.passed.length;
        const baseScore = (passedRules / totalRules) * 100;

        // Apply penalties for critical violations
        const criticalViolations = ruleEvaluation.violated.filter(v => v.severity === "CRITICAL").length;
        const highViolations = ruleEvaluation.violated.filter(v => v.severity === "HIGH").length;

        const penalty = (criticalViolations * 20) + (highViolations * 10);

        return Math.max(0, Math.min(100, baseScore - penalty));
    }

    /**
     * Generates basic quality metrics from PR data and rules
     */
    private static generateBasicQualityMetrics(
        prData: PullRequestData,
        ruleEvaluation: RuleEvaluation
    ) {
        const hasTests = prData.changedFiles.some(f =>
            f.filename.includes("test") ||
            f.filename.includes("spec") ||
            f.filename.includes("__tests__")
        );

        const hasDocumentation = prData.changedFiles.some(f =>
            f.filename.toLowerCase().includes("readme") ||
            f.filename.toLowerCase().includes("doc") ||
            f.filename.endsWith(".md")
        );

        const securityViolations = ruleEvaluation.violated.filter(v =>
            v.ruleName.toLowerCase().includes("security")
        ).length;

        return {
            codeStyle: ErrorHandlerService.calculateMetricFromRules(ruleEvaluation, "CODE_QUALITY"),
            testCoverage: hasTests ? 70 : 30,
            documentation: hasDocumentation ? 80 : 40,
            security: securityViolations > 0 ? 30 : 80,
            performance: ErrorHandlerService.calculateMetricFromRules(ruleEvaluation, "PERFORMANCE"),
            maintainability: ErrorHandlerService.calculateMetricFromRules(ruleEvaluation, "MAINTAINABILITY")
        };
    }

    /**
     * Calculates metric score from rule evaluation for specific category
     */
    private static calculateMetricFromRules(ruleEvaluation: RuleEvaluation, category: string): number {
        const categoryRules = [
            ...ruleEvaluation.passed.filter(r => r.ruleName.includes(category)),
            ...ruleEvaluation.violated.filter(r => r.ruleName.includes(category))
        ];

        if (categoryRules.length === 0) return 60; // Default score

        const passedCount = ruleEvaluation.passed.filter(r => r.ruleName.includes(category)).length;
        return Math.round((passedCount / categoryRules.length) * 100);
    }

    /**
     * Generates basic suggestions from rule violations
     */
    private static generateBasicSuggestions(
        prData: PullRequestData,
        ruleEvaluation: RuleEvaluation
    ) {
        const suggestions: CodeSuggestion[] = [];

        // Convert rule violations to suggestions
        for (const violation of ruleEvaluation.violated) {
            suggestions.push({
                file: violation.affectedFiles?.[0] || "multiple files",
                lineNumber: undefined,
                type: "fix",
                severity: violation.severity.toLowerCase() as ("low" | "medium" | "high"),
                description: `${violation.ruleName}: ${violation.description}`,
                suggestedCode: undefined,
                reasoning: violation.details || "Rule violation detected by automated analysis"
            });
        }

        // Add basic suggestions based on PR characteristics
        if (!prData.changedFiles.some(f => f.filename.includes("test"))) {
            suggestions.push({
                file: "tests",
                lineNumber: undefined,
                type: "improvement",
                severity: "medium",
                description: "Consider adding tests for the changes in this PR",
                suggestedCode: undefined,
                reasoning: "No test files were modified or added in this PR"
            });
        }

        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }



    /**
     * Logs errors to monitoring system
     */
    private static async logToMonitoring(eventType: string, data: unknown): Promise<void> {
        try {
            // Use the new LoggingService for structured logging
            const { LoggingService } = await import("./logging.service");

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            LoggingService.logError(eventType, new Error((data as any)?.error || "Unknown error"), {
                ...(typeof data === "object" ? data : { data }),
                source: "error_handler_service"
            });
        } catch (error) {
            // Don't let monitoring failures break the main flow
            console.error("Failed to log to monitoring:", error);
        }
    }

    /**
     * Sleep utility for delays
     */
    private static sleep(ms: number): Promise<void> {
         
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
