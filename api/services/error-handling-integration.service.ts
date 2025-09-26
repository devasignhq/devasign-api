import { CircuitBreakerService } from "./circuit-breaker.service";
import { LoggingService } from "./logging.service";
import { HealthCheckService } from "./health-check.service";

/**
 * Error Handling Integration Service for AI Review System
 * Provides centralized error handling with fallback mechanisms and graceful degradation
 */
export class ErrorHandlingIntegrationService {
    private static readonly CIRCUIT_BREAKER_CONFIG = {
        groq: { failureThreshold: 3, recoveryTimeout: 120000 }, // 2 minutes
        pinecone: { failureThreshold: 5, recoveryTimeout: 60000 }, // 1 minute
        github: { failureThreshold: 10, recoveryTimeout: 30000 }, // 30 seconds
        database: { failureThreshold: 3, recoveryTimeout: 60000 } // 1 minute
    };

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
            "circuit_breakers_initialized",
            "Circuit breakers initialized for all services",
            { services: Object.keys(this.CIRCUIT_BREAKER_CONFIG) }
        );
    }

    /**
     * Gets current error handling status
     */
    static getErrorHandlingStatus() {
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
            "error_handling_reset",
            "All error handling mechanisms have been reset"
        );
    }
}
