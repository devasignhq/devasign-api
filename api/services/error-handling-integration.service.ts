import { ErrorHandlerService } from './error-handler.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { LoggingService } from './logging.service';
import { HealthCheckService } from './health-check.service';
import {
    AIReviewError,
    GroqServiceError,
    PineconeServiceError,
    GitHubAPIError,
    TimeoutError,
    DatabaseError,
    ErrorUtils
} from '../models/ai-review.errors';
import {
    PullRequestData,
    RelevantContext,
    AIReview,
    RuleEvaluation
} from '../models/ai-review.model';

/**
 * Error Handling Integration Service for AI Review System
 * Provides centralized error handling with fallback mechanisms and graceful degradation
 * Requirements: 7.4, 6.4
 */
export class ErrorHandlingIntegrationService {
    private static readonly SERVICE_TIMEOUTS = {
        groq: 60000,      // 60 seconds for AI analysis
        pinecone: 30000,  // 30 seconds for vector operations
        github: 20000,    // 20 seconds for GitHub API calls
        database: 10000   // 10 seconds for database operations
    };

    private static readonly CIRCUIT_BREAKER_CONFIG = {
        groq: { failureThreshold: 3, recoveryTimeout: 120000 }, // 2 minutes
        pinecone: { failureThreshold: 5, recoveryTimeout: 60000 }, // 1 minute
        github: { failureThreshold: 10, recoveryTimeout: 30000 }, // 30 seconds
        database: { failureThreshold: 3, recoveryTimeout: 60000 } // 1 minute
    };

    /**
     * Executes AI review operation with comprehensive error handling
     * Requirement 7.4: System shall gracefully handle service unavailability
     */
    static async executeAIReviewWithErrorHandling(
        prData: PullRequestData,
        operation: () => Promise<AIReview>
    ): Promise<AIReview> {
        const timer = LoggingService.createTimer('ai_review_execution');

        try {
            // Check system health before proceeding
            const healthStatus = await ErrorHandlingIntegrationService.checkSystemHealth();

            if (healthStatus.status === 'unhealthy') {
                throw new Error('System is unhealthy, cannot perform AI review');
            }

            // Execute with circuit breaker and retry logic
            const result = await CircuitBreakerService.execute(
                'ai_review',
                async () => {
                    return await ErrorHandlerService.withRetry(
                        operation,
                        'ai_review_operation',
                        3, // max retries
                        ErrorHandlingIntegrationService.SERVICE_TIMEOUTS.groq
                    );
                },
                // Fallback function
                async () => {
                    LoggingService.logWarning(
                        'ai_review_fallback',
                        'Using fallback AI review due to service failure',
                        { prNumber: prData.prNumber, repository: prData.repositoryName }
                    );

                    return await ErrorHandlingIntegrationService.generateFallbackAIReview(prData);
                }
            );

            timer.end({
                success: true,
                prNumber: prData.prNumber,
                repository: prData.repositoryName,
                mergeScore: result.mergeScore
            });

            LoggingService.logAIReviewEvent(
                'completed',
                prData.installationId,
                prData.prNumber,
                prData.repositoryName,
                { mergeScore: result.mergeScore, confidence: result.confidence }
            );

            return result;
        } catch (error: any) {
            timer.end({
                error: true,
                errorType: error.constructor.name,
                prNumber: prData.prNumber,
                repository: prData.repositoryName
            });

            LoggingService.logAIReviewEvent(
                'failed',
                prData.installationId,
                prData.prNumber,
                prData.repositoryName,
                { error: error.message, code: error.code }
            );

            // Handle specific error types with appropriate fallbacks
            if (error instanceof GroqServiceError) {
                return await ErrorHandlingIntegrationService.handleGroqServiceFailure(prData, error);
            }

            // Re-throw if it's already an AIReviewError
            if (error instanceof AIReviewError) {
                throw error;
            }

            // Wrap unknown errors
            throw ErrorUtils.wrapError(error, 'AI review execution failed');
        }
    }

    /**
     * Executes RAG context retrieval with error handling
     * Requirement 7.4: System shall provide limited review without RAG
     */
    static async executeRAGContextWithErrorHandling(
        prData: PullRequestData,
        operation: () => Promise<RelevantContext>
    ): Promise<RelevantContext> {
        const timer = LoggingService.createTimer('rag_context_retrieval');

        try {
            return await CircuitBreakerService.execute(
                'pinecone',
                async () => {
                    return await ErrorHandlerService.withRetry(
                        operation,
                        'rag_context_retrieval',
                        2, // fewer retries for context
                        ErrorHandlingIntegrationService.SERVICE_TIMEOUTS.pinecone
                    );
                },
                // Fallback to basic context
                async () => {
                    LoggingService.logWarning(
                        'rag_context_fallback',
                        'Using basic context due to RAG service failure',
                        { prNumber: prData.prNumber, repository: prData.repositoryName }
                    );

                    return await ErrorHandlerService.handlePineconeFailure(
                        prData,
                        new PineconeServiceError('RAG service unavailable')
                    );
                }
            );
        } catch (error: any) {
            timer.end({ error: true, errorType: error.constructor.name });

            // Always return basic context rather than failing
            LoggingService.logWarning(
                'rag_context_complete_fallback',
                'RAG context retrieval failed completely, using minimal context',
                { prNumber: prData.prNumber, repository: prData.repositoryName, error: error.message }
            );

            return {
                similarPRs: [],
                relevantFiles: [],
                codePatterns: [],
                projectStandards: []
            };
        } finally {
            timer.end({ prNumber: prData.prNumber, repository: prData.repositoryName });
        }
    }

    /**
     * Executes GitHub API operations with error handling
     * Requirement 6.4: System shall skip comment posting if necessary
     */
    static async executeGitHubOperationWithErrorHandling<T>(
        operationName: string,
        installationId: string,
        repositoryName: string,
        prNumber: number,
        operation: () => Promise<T>,
        fallbackValue?: T
    ): Promise<T | null> {
        const timer = LoggingService.createTimer(`github_${operationName}`);

        try {
            return await CircuitBreakerService.execute(
                'github',
                async () => {
                    return await ErrorHandlerService.withRetry(
                        operation,
                        `github_${operationName}`,
                        3,
                        ErrorHandlingIntegrationService.SERVICE_TIMEOUTS.github
                    );
                },
                // Fallback function
                fallbackValue ? async () => fallbackValue : undefined
            );
        } catch (error: any) {
            timer.end({ error: true, errorType: error.constructor.name });

            LoggingService.logExternalServiceCall(
                'github',
                operationName,
                'failure',
                timer.getCurrentDuration(),
                {
                    installationId,
                    repositoryName,
                    prNumber,
                    error: error.message
                }
            );

            // Handle GitHub-specific errors
            if (error instanceof GitHubAPIError) {
                const handled = await ErrorHandlerService.handleGitHubFailure(
                    installationId,
                    repositoryName,
                    prNumber,
                    operationName,
                    error
                );

                if (!handled && fallbackValue !== undefined) {
                    return fallbackValue;
                }
            }

            // Return fallback value if available, otherwise return null
            if (fallbackValue !== undefined) {
                LoggingService.logWarning(
                    'github_operation_fallback',
                    `GitHub operation ${operationName} failed, using fallback value`,
                    { installationId, repositoryName, prNumber, error: error.message }
                );
                return fallbackValue;
            }

            LoggingService.logWarning(
                'github_operation_skipped',
                `GitHub operation ${operationName} failed and will be skipped`,
                { installationId, repositoryName, prNumber, error: error.message }
            );

            return null;
        } finally {
            timer.end({
                installationId,
                repositoryName,
                prNumber,
                operation: operationName
            });
        }
    }

    /**
     * Executes database operations with error handling
     * Requirement 7.4: System shall continue with in-memory fallback
     */
    static async executeDatabaseOperationWithErrorHandling<T>(
        operationName: string,
        operation: () => Promise<T>,
        fallbackValue: T
    ): Promise<T> {
        const timer = LoggingService.createTimer(`database_${operationName}`);

        try {
            return await CircuitBreakerService.execute(
                'database',
                async () => {
                    return await ErrorHandlerService.withRetry(
                        operation,
                        `database_${operationName}`,
                        2,
                        ErrorHandlingIntegrationService.SERVICE_TIMEOUTS.database
                    );
                },
                async () => fallbackValue
            );
        } catch (error: any) {
            timer.end({ error: true, errorType: error.constructor.name });

            LoggingService.logError(
                'database_operation_failed',
                error,
                { operation: operationName }
            );

            return await ErrorHandlerService.handleDatabaseFailure(
                operationName,
                fallbackValue,
                error
            );
        } finally {
            timer.end({ operation: operationName });
        }
    }

    /**
     * Handles Groq service failures with comprehensive fallback
     */
    private static async handleGroqServiceFailure(
        prData: PullRequestData,
        error: GroqServiceError
    ): Promise<AIReview> {
        LoggingService.logWarning(
            'groq_service_failure',
            'Groq AI service failed, generating fallback review',
            {
                prNumber: prData.prNumber,
                repository: prData.repositoryName,
                error: error.message,
                code: error.code
            }
        );

        // Get basic rule evaluation for fallback
        const basicRuleEvaluation: RuleEvaluation = {
            passed: [],
            violated: [],
            score: 50
        };

        const basicContext: RelevantContext = {
            similarPRs: [],
            relevantFiles: [],
            codePatterns: [],
            projectStandards: []
        };

        return await ErrorHandlerService.handleGroqFailure(
            prData,
            basicContext,
            basicRuleEvaluation,
            error
        );
    }

    /**
     * Generates fallback AI review when all AI services fail
     */
    private static async generateFallbackAIReview(prData: PullRequestData): Promise<AIReview> {
        LoggingService.logWarning(
            'complete_ai_fallback',
            'All AI services failed, generating basic fallback review',
            { prNumber: prData.prNumber, repository: prData.repositoryName }
        );

        // Calculate basic metrics from PR data
        const hasTests = prData.changedFiles.some(f =>
            f.filename.includes('test') ||
            f.filename.includes('spec') ||
            f.filename.includes('__tests__')
        );

        const hasDocumentation = prData.changedFiles.some(f =>
            f.filename.toLowerCase().includes('readme') ||
            f.filename.toLowerCase().includes('doc') ||
            f.filename.endsWith('.md')
        );

        const totalChanges = prData.changedFiles.reduce((sum, f) => sum + f.additions + f.deletions, 0);
        const sizeScore = totalChanges < 100 ? 80 : totalChanges < 500 ? 60 : 40;

        const baseScore = Math.round((
            (hasTests ? 80 : 40) +
            (hasDocumentation ? 70 : 50) +
            sizeScore
        ) / 3);

        return {
            mergeScore: Math.max(30, Math.min(85, baseScore)), // Cap between 30-85 for fallback
            codeQuality: {
                codeStyle: 60,
                testCoverage: hasTests ? 70 : 30,
                documentation: hasDocumentation ? 80 : 40,
                security: 60,
                performance: 60,
                maintainability: 60
            },
            suggestions: [
                {
                    file: 'general',
                    lineNumber: undefined,
                    type: 'improvement' as const,
                    severity: 'medium' as const,
                    description: 'AI analysis unavailable - manual review recommended',
                    suggestedCode: undefined,
                    reasoning: 'AI services are currently unavailable. Please perform manual code review to ensure quality and security standards.'
                },
                ...(hasTests ? [] : [{
                    file: 'tests',
                    lineNumber: undefined,
                    type: 'improvement' as const,
                    severity: 'high' as const,
                    description: 'Consider adding tests for the changes in this PR',
                    suggestedCode: undefined,
                    reasoning: 'No test files were modified or added in this PR'
                }])
            ],
            summary: `Fallback review completed. AI analysis services are currently unavailable. This PR modifies ${prData.changedFiles.length} files with ${totalChanges} total changes. Manual review is strongly recommended.`,
            confidence: 0.2 // Very low confidence for complete fallback
        };
    }

    /**
     * Checks overall system health for AI review operations
     */
    private static async checkSystemHealth(): Promise<{
        status: 'healthy' | 'degraded' | 'unhealthy';
        services: Record<string, any>;
    }> {
        try {
            const healthResult = await HealthCheckService.performHealthCheck(false);
            return {
                status: healthResult.status,
                services: healthResult.services
            };
        } catch (error) {
            LoggingService.logError('health_check_failed', error as Error);
            return {
                status: 'unhealthy',
                services: {}
            };
        }
    }

    /**
     * Initializes circuit breakers with appropriate configurations
     */
    static initializeCircuitBreakers(): void {
        // Initialize circuit breakers for each service
        Object.entries(ErrorHandlingIntegrationService.CIRCUIT_BREAKER_CONFIG).forEach(
            ([serviceName, config]) => {
                CircuitBreakerService.getCircuit(serviceName, config);
            }
        );

        LoggingService.logInfo(
            'circuit_breakers_initialized',
            'Circuit breakers initialized for all services',
            { services: Object.keys(ErrorHandlingIntegrationService.CIRCUIT_BREAKER_CONFIG) }
        );
    }

    /**
     * Gets current error handling status
     */
    static getErrorHandlingStatus(): {
        circuitBreakers: Record<string, any>;
        systemHealth: any;
        lastHealthCheck: any;
    } {
        return {
            circuitBreakers: CircuitBreakerService.getCircuitStatus(),
            systemHealth: HealthCheckService.getCachedHealthStatus(),
            lastHealthCheck: HealthCheckService.getCachedHealthStatus()?.timestamp
        };
    }

    /**
     * Resets all error handling mechanisms (for testing or recovery)
     */
    static resetErrorHandling(): void {
        CircuitBreakerService.resetAll();
        LoggingService.logInfo(
            'error_handling_reset',
            'All error handling mechanisms have been reset'
        );
    }
}