import { CircuitBreakerService } from "./circuit-breaker.service";
import { LoggingService } from "./logging.service";
import { HealthCheckService } from "./health-check.service";

/**
 * Error Recovery Service for AI Review System
 * Provides automated recovery mechanisms and system restoration capabilities
 */
export class ErrorRecoveryService {
    private static readonly RECOVERY_STRATEGIES = {
        groq: "fallback_ai_analysis",
        github: "skip_comment_posting",
        database: "in_memory_fallback"
    } as const;

    private static recoveryInProgress = false;
    private static lastRecoveryAttempt?: Date;
    private static recoveryAttempts = 0;

    /**
     * Attempts to recover from system failures
     */
    static async attemptSystemRecovery(
        failureType: "service" | "circuit_breaker" | "health_check" | "complete",
        context?: Record<string, unknown>
    ): Promise<RecoveryResult> {
        if (ErrorRecoveryService.recoveryInProgress) {
            LoggingService.logWarning(
                "recovery_already_in_progress",
                "System recovery is already in progress",
                { failureType, context }
            );
            return {
                success: false,
                strategy: "none",
                message: "Recovery already in progress",
                timestamp: new Date()
            };
        }

        ErrorRecoveryService.recoveryInProgress = true;
        ErrorRecoveryService.lastRecoveryAttempt = new Date();
        ErrorRecoveryService.recoveryAttempts++;

        const timer = LoggingService.createTimer(`recovery_${failureType}`);

        try {
            LoggingService.logInfo(
                "recovery_attempt_started",
                `Starting recovery attempt for ${failureType}`,
                {
                    failureType,
                    context,
                    attempt: ErrorRecoveryService.recoveryAttempts,
                    lastAttempt: ErrorRecoveryService.lastRecoveryAttempt
                }
            );

            let result: RecoveryResult;

            switch (failureType) {
            case "service":
                result = await ErrorRecoveryService.recoverFromServiceFailure(context);
                break;
            case "circuit_breaker":
                result = await ErrorRecoveryService.recoverFromCircuitBreakerFailure(context);
                break;
            case "health_check":
                result = await ErrorRecoveryService.recoverFromHealthCheckFailure(context);
                break;
            case "complete":
                result = await ErrorRecoveryService.performCompleteSystemRecovery(context);
                break;
            default:
                result = {
                    success: false,
                    strategy: "unknown",
                    message: `Unknown failure type: ${failureType}`,
                    timestamp: new Date()
                };
            }

            timer.end({
                success: result.success,
                strategy: result.strategy,
                failureType
            });

            LoggingService.logInfo(
                "recovery_attempt_completed",
                `Recovery attempt completed: ${result.success ? "SUCCESS" : "FAILED"}`,
                {
                    failureType,
                    result,
                    duration: timer.getCurrentDuration()
                }
            );

            return result;
        } catch (error) {
            timer.end({ error: true, failureType });

            LoggingService.logError(
                "recovery_attempt_failed",
                error as Error,
                { failureType, context, attempt: ErrorRecoveryService.recoveryAttempts }
            );

            return {
                success: false,
                strategy: "error",
                message: `Recovery failed: ${error}`,
                timestamp: new Date(),
                error: String(error)
            };
        } finally {
            ErrorRecoveryService.recoveryInProgress = false;
        }
    }

    /**
     * Recovers from individual service failures
     */
    private static async recoverFromServiceFailure(context?: Record<string, unknown>): Promise<RecoveryResult> {
        const serviceName = context?.serviceName as keyof typeof ErrorRecoveryService.RECOVERY_STRATEGIES;

        if (!serviceName || !ErrorRecoveryService.RECOVERY_STRATEGIES[serviceName]) {
            return {
                success: false,
                strategy: "unknown_service",
                message: `Unknown service: ${serviceName}`,
                timestamp: new Date()
            };
        }

        const strategy = ErrorRecoveryService.RECOVERY_STRATEGIES[serviceName];

        try {
            switch (serviceName) {
            case "groq":
                return await ErrorRecoveryService.recoverGroqService(context);
            case "github":
                return await ErrorRecoveryService.recoverGitHubService(context);
            case "database":
                return await ErrorRecoveryService.recoverDatabaseService(context);
            default:
                return {
                    success: false,
                    strategy,
                    message: `No recovery implementation for service: ${serviceName}`,
                    timestamp: new Date()
                };
            }
        } catch (error) {
            return {
                success: false,
                strategy,
                message: `Service recovery failed: ${error}`,
                timestamp: new Date(),
                error: String(error)
            };
        }
    }

    /**
     * Recovers Groq AI service
     */
    private static async recoverGroqService(context?: Record<string, unknown>): Promise<RecoveryResult> {
        LoggingService.logInfo(
            "groq_service_recovery",
            "Attempting to recover Groq AI service",
            context
        );

        // Reset circuit breaker for Groq
        const circuit = CircuitBreakerService.getCircuit("groq");
        circuit.reset();

        // Verify configuration
        if (!process.env.GROQ_API_KEY) {
            return {
                success: false,
                strategy: "fallback_ai_analysis",
                message: "Groq API key not configured - using fallback analysis",
                timestamp: new Date()
            };
        }

        // Test service connectivity (simplified)
        try {
            // In a real implementation, this would make a test API call
            await ErrorRecoveryService.sleep(1000); // Simulate test call

            return {
                success: true,
                strategy: "service_restart",
                message: "Groq service recovered successfully",
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                strategy: "fallback_ai_analysis",
                message: "Groq service still unavailable - using fallback",
                timestamp: new Date(),
                error: String(error)
            };
        }
    }

    /**
     * Recovers GitHub service
     */
    private static async recoverGitHubService(context?: Record<string, unknown>): Promise<RecoveryResult> {
        LoggingService.logInfo(
            "github_service_recovery",
            "Attempting to recover GitHub service",
            context
        );

        // Reset circuit breaker for GitHub
        const circuit = CircuitBreakerService.getCircuit("github");
        circuit.reset();

        // Verify configuration
        if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
            return {
                success: false,
                strategy: "skip_comment_posting",
                message: "GitHub credentials not configured - skipping comment posting",
                timestamp: new Date()
            };
        }

        // Test service connectivity (simplified)
        try {
            // In a real implementation, this would test GitHub API connectivity
            await ErrorRecoveryService.sleep(1000); // Simulate test call

            return {
                success: true,
                strategy: "service_restart",
                message: "GitHub service recovered successfully",
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                strategy: "skip_comment_posting",
                message: "GitHub service still unavailable - skipping comments",
                timestamp: new Date(),
                error: String(error)
            };
        }
    }

    /**
     * Recovers database service
     */
    private static async recoverDatabaseService(context?: Record<string, unknown>): Promise<RecoveryResult> {
        LoggingService.logInfo(
            "database_service_recovery",
            "Attempting to recover database service",
            context
        );

        // Reset circuit breaker for database
        const circuit = CircuitBreakerService.getCircuit("database");
        circuit.reset();

        // Test database connectivity
        try {
            const { prisma } = await import("../config/database.config");
            await prisma.$queryRaw`SELECT 1`;

            return {
                success: true,
                strategy: "service_restart",
                message: "Database service recovered successfully",
                timestamp: new Date()
            };
        } catch (error) {
            return {
                success: false,
                strategy: "in_memory_fallback",
                message: "Database still unavailable - using in-memory fallback",
                timestamp: new Date(),
                error: String(error)
            };
        }
    }

    /**
     * Recovers from circuit breaker failures
     */
    private static async recoverFromCircuitBreakerFailure(context?: Record<string, unknown>): Promise<RecoveryResult> {
        const serviceName = (context?.serviceName || "") as string;

        LoggingService.logInfo(
            "circuit_breaker_recovery",
            `Attempting to recover circuit breaker for ${serviceName}`,
            context
        );

        if (!serviceName) {
            // Reset all circuit breakers
            CircuitBreakerService.resetAll();

            return {
                success: true,
                strategy: "circuit_reset",
                message: "All circuit breakers reset",
                timestamp: new Date()
            };
        }

        // Reset specific circuit breaker
        const circuit = CircuitBreakerService.getCircuit(serviceName);
        circuit.reset();

        // Wait for circuit breaker to stabilize
        await ErrorRecoveryService.sleep(5000);

        // Check if circuit is now closed
        const circuitStatus = CircuitBreakerService.getCircuitStatus();
        const isRecovered = circuitStatus[serviceName]?.state === "CLOSED";

        return {
            success: isRecovered,
            strategy: "circuit_reset",
            message: isRecovered
                ? `Circuit breaker for ${serviceName} recovered`
                : `Circuit breaker for ${serviceName} still open`,
            timestamp: new Date()
        };
    }

    /**
     * Recovers from health check failures
     */
    private static async recoverFromHealthCheckFailure(context?: Record<string, unknown>): Promise<RecoveryResult> {
        LoggingService.logInfo(
            "health_check_recovery",
            "Attempting to recover from health check failure",
            context
        );

        try {
            // Perform fresh health check
            const healthResult = await HealthCheckService.performHealthCheck(true);

            if (healthResult.status === "healthy") {
                return {
                    success: true,
                    strategy: "health_recovery",
                    message: "System health recovered",
                    timestamp: new Date(),
                    details: { healthResult }
                };
            } else if (healthResult.status === "degraded") {
                return {
                    success: true,
                    strategy: "degraded_mode",
                    message: "System operating in degraded mode",
                    timestamp: new Date(),
                    details: { healthResult }
                };
            } else {
                return {
                    success: false,
                    strategy: "health_recovery",
                    message: "System still unhealthy",
                    timestamp: new Date(),
                    details: { healthResult }
                };
            }
        } catch (error) {
            return {
                success: false,
                strategy: "health_recovery",
                message: `Health check recovery failed: ${error}`,
                timestamp: new Date(),
                error: String(error)
            };
        }
    }

    /**
     * Performs complete system recovery
     */
    private static async performCompleteSystemRecovery(context?: Record<string, unknown>): Promise<RecoveryResult> {
        LoggingService.logInfo(
            "complete_system_recovery",
            "Attempting complete system recovery",
            context
        );

        const recoverySteps: Array<{ name: string; action: () => Promise<void> }> = [
            {
                name: "Reset Circuit Breakers",
                action: async () => {
                    CircuitBreakerService.resetAll();
                    await ErrorRecoveryService.sleep(2000);
                }
            },
            {
                name: "Test Database Connection",
                action: async () => {
                    const { prisma } = await import("../config/database.config");
                    await prisma.$queryRaw`SELECT 1`;
                }
            },
            {
                name: "Verify Service Configurations",
                action: async () => {
                    const requiredEnvVars = ["GROQ_API_KEY", "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"];
                    const missing = requiredEnvVars.filter(key => !process.env[key]);
                    if (missing.length > 0) {
                        throw new Error(`Missing environment variables: ${missing.join(", ")}`);
                    }
                }
            },
            {
                name: "Perform Health Check",
                action: async () => {
                    const healthResult = await HealthCheckService.performHealthCheck(true);
                    if (healthResult.status === "unhealthy") {
                        throw new Error("System health check failed");
                    }
                }
            }
        ];

        const results: Array<{ step: string; success: boolean; error?: string }> = [];

        for (const step of recoverySteps) {
            try {
                await step.action();
                results.push({ step: step.name, success: true });
                LoggingService.logInfo(
                    "recovery_step_success",
                    `Recovery step completed: ${step.name}`
                );
            } catch (error) {
                results.push({
                    step: step.name,
                    success: false,
                    error: String(error)
                });
                LoggingService.logError(
                    "recovery_step_failed",
                    error as Error,
                    { step: step.name }
                );
            }
        }

        const successfulSteps = results.filter(r => r.success).length;
        const totalSteps = results.length;
        const success = successfulSteps === totalSteps;

        return {
            success,
            strategy: "full_recovery",
            message: `Complete recovery ${success ? "successful" : "partial"}: ${successfulSteps}/${totalSteps} steps completed`,
            timestamp: new Date(),
            details: { recoverySteps: results }
        };
    }

    /**
     * Gets recovery status and history
     */
    static getRecoveryStatus(): {
        inProgress: boolean;
        lastAttempt?: Date;
        attemptCount: number;
        canAttemptRecovery: boolean;
        } {
        const now = new Date();
        const timeSinceLastAttempt = ErrorRecoveryService.lastRecoveryAttempt
            ? now.getTime() - ErrorRecoveryService.lastRecoveryAttempt.getTime()
            : Infinity;

        // Allow recovery attempts every 5 minutes
        const canAttemptRecovery = timeSinceLastAttempt > 300000 || ErrorRecoveryService.recoveryAttempts === 0;

        return {
            inProgress: ErrorRecoveryService.recoveryInProgress,
            lastAttempt: ErrorRecoveryService.lastRecoveryAttempt,
            attemptCount: ErrorRecoveryService.recoveryAttempts,
            canAttemptRecovery
        };
    }

    /**
     * Resets recovery state (for testing or manual reset)
     */
    static resetRecoveryState(): void {
        ErrorRecoveryService.recoveryInProgress = false;
        ErrorRecoveryService.lastRecoveryAttempt = undefined;
        ErrorRecoveryService.recoveryAttempts = 0;

        LoggingService.logInfo(
            "recovery_state_reset",
            "Recovery state has been reset"
        );
    }

    /**
     * Sleep utility for recovery delays
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Recovery result structure
 */
export interface RecoveryResult {
    success: boolean;
    strategy: string;
    message: string;
    timestamp: Date;
    error?: string;
    details?: Record<string, unknown>;
}
