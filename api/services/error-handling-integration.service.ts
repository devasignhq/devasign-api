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
        Object.entries(this.CIRCUIT_BREAKER_CONFIG).forEach(
            ([serviceName, config]) => {
                CircuitBreakerService.getCircuit(serviceName, config);
            }
        );

        LoggingService.logInfo(
            'circuit_breakers_initialized',
            'Circuit breakers initialized for all services',
            { services: Object.keys(this.CIRCUIT_BREAKER_CONFIG) }
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