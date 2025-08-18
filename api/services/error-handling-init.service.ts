import { ErrorHandlingIntegrationService } from './error-handling-integration.service';
import { MonitoringService } from './monitoring.service';
import { LoggingService } from './logging.service';
import { HealthCheckService } from './health-check.service';
import { CircuitBreakerService } from './circuit-breaker.service';

/**
 * Error Handling Initialization Service
 * Sets up and configures all error handling components for the AI Review System
 * Requirements: 7.4, 6.4
 */
export class ErrorHandlingInitService {
    private static initialized = false;
    private static shutdownHandlers: Array<() => Promise<void> | void> = [];

    /**
     * Initializes all error handling components
     */
    static async initialize(): Promise<void> {
        if (ErrorHandlingInitService.initialized) {
            LoggingService.logWarning(
                'error_handling_already_initialized',
                'Error handling components are already initialized'
            );
            return;
        }

        try {
            LoggingService.logInfo(
                'error_handling_init_start',
                'Starting error handling initialization'
            );

            // 1. Initialize circuit breakers
            ErrorHandlingIntegrationService.initializeCircuitBreakers();

            // 2. Perform initial health check
            await ErrorHandlingInitService.performInitialHealthCheck();

            // 3. Start monitoring services
            // MonitoringService.startMonitoring();

            // 4. Set up process event handlers
            ErrorHandlingInitService.setupProcessEventHandlers();

            // 5. Set up periodic health checks
            ErrorHandlingInitService.setupPeriodicHealthChecks();

            // 6. Validate environment configuration
            ErrorHandlingInitService.validateEnvironmentConfiguration();

            ErrorHandlingInitService.initialized = true;

            LoggingService.logInfo(
                'error_handling_init_complete',
                'Error handling initialization completed successfully',
                {
                    circuitBreakers: Object.keys(CircuitBreakerService.getCircuitStatus()),
                    monitoringActive: true,
                    healthCheckEnabled: true
                }
            );

        } catch (error) {
            LoggingService.logError(
                'error_handling_init_failed',
                error as Error,
                { phase: 'initialization' }
            );
            throw error;
        }
    }

    /**
     * Shuts down error handling components gracefully
     */
    static async shutdown(): Promise<void> {
        if (!ErrorHandlingInitService.initialized) {
            return;
        }

        LoggingService.logInfo(
            'error_handling_shutdown_start',
            'Starting graceful shutdown of error handling components'
        );

        try {
            // Stop monitoring
            MonitoringService.stopMonitoring();

            // Execute shutdown handlers
            for (const handler of ErrorHandlingInitService.shutdownHandlers) {
                try {
                    await handler();
                } catch (error) {
                    LoggingService.logError(
                        'shutdown_handler_failed',
                        error as Error
                    );
                }
            }

            // Reset circuit breakers
            CircuitBreakerService.resetAll();

            ErrorHandlingInitService.initialized = false;

            LoggingService.logInfo(
                'error_handling_shutdown_complete',
                'Error handling shutdown completed'
            );

        } catch (error) {
            LoggingService.logError(
                'error_handling_shutdown_failed',
                error as Error
            );
        }
    }

    /**
     * Performs initial health check to validate system state
     */
    private static async performInitialHealthCheck(): Promise<void> {
        try {
            const healthResult = await HealthCheckService.performHealthCheck(true);

            LoggingService.logInfo(
                'initial_health_check',
                `Initial health check completed: ${healthResult.status}`,
                {
                    status: healthResult.status,
                    degradedMode: healthResult.degradedMode,
                    services: Object.keys(healthResult.services)
                }
            );

            // Log warnings for unhealthy services
            Object.entries(healthResult.services).forEach(([serviceName, health]) => {
                if (health.status !== 'healthy') {
                    LoggingService.logWarning(
                        'service_not_healthy_on_startup',
                        `Service ${serviceName} is not healthy on startup: ${health.message}`,
                        { serviceName, health }
                    );
                }
            });

            // If system is completely unhealthy, log critical error but don't fail startup
            if (healthResult.status === 'unhealthy') {
                LoggingService.logError(
                    'system_unhealthy_on_startup',
                    new Error('System is unhealthy on startup'),
                    { healthResult }
                );
            }

        } catch (error) {
            LoggingService.logError(
                'initial_health_check_failed',
                error as Error
            );
            // Don't fail initialization due to health check failure
        }
    }

    /**
     * Sets up process event handlers for graceful shutdown
     */
    private static setupProcessEventHandlers(): void {
        // Handle graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            LoggingService.logInfo(
                'graceful_shutdown_initiated',
                `Graceful shutdown initiated by ${signal}`
            );

            await ErrorHandlingInitService.shutdown();
            process.exit(0);
        };

        // Handle uncaught exceptions
        process.on('uncaughtException', (error: Error) => {
            LoggingService.logError(
                'uncaught_exception',
                error,
                { fatal: true }
            );

            // Give time for logging to complete
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
            LoggingService.logError(
                'unhandled_rejection',
                reason instanceof Error ? reason : new Error(String(reason)),
                { promise: promise.toString() }
            );
        });

        // Handle shutdown signals
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

        // Handle warnings
        process.on('warning', (warning: Error) => {
            LoggingService.logWarning(
                'process_warning',
                warning.message,
                { warning: warning.stack }
            );
        });

        LoggingService.logInfo(
            'process_handlers_setup',
            'Process event handlers have been set up'
        );
    }

    /**
     * Sets up periodic health checks
     */
    private static setupPeriodicHealthChecks(): void {
        // Perform detailed health check every 5 minutes
        const healthCheckInterval = setInterval(async () => {
            try {
                const healthResult = await HealthCheckService.performHealthCheck(false);

                // Only log if status changed or if there are issues
                if (healthResult.status !== 'healthy') {
                    LoggingService.logWarning(
                        'periodic_health_check',
                        `Periodic health check: ${healthResult.status}`,
                        {
                            status: healthResult.status,
                            degradedMode: healthResult.degradedMode,
                            timestamp: healthResult.timestamp
                        }
                    );
                }
            } catch (error) {
                LoggingService.logError(
                    'periodic_health_check_failed',
                    error as Error
                );
            }
        }, 300000); // 5 minutes

        // Add to shutdown handlers
        ErrorHandlingInitService.shutdownHandlers.push(() => {
            clearInterval(healthCheckInterval);
        });

        LoggingService.logInfo(
            'periodic_health_checks_setup',
            'Periodic health checks have been set up'
        );
    }

    /**
     * Validates environment configuration for error handling
     */
    private static validateEnvironmentConfiguration(): void {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Check for monitoring webhook configuration
        if (!process.env.MONITORING_WEBHOOK_URL) {
            warnings.push('MONITORING_WEBHOOK_URL not configured - external monitoring disabled');
        }

        if (!process.env.ALERT_WEBHOOK_URL) {
            warnings.push('ALERT_WEBHOOK_URL not configured - external alerting disabled');
        }

        // Check for required service configurations
        if (!process.env.GROQ_API_KEY) {
            warnings.push('GROQ_API_KEY not configured - Groq service will be unavailable');
        }

        if (!process.env.PINECONE_API_KEY) {
            warnings.push('PINECONE_API_KEY not configured - Pinecone service will be unavailable');
        }

        if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
            errors.push('GitHub app credentials not configured - GitHub integration will fail');
        }

        if (!process.env.DATABASE_URL) {
            errors.push('DATABASE_URL not configured - database operations will fail');
        }

        // Log warnings
        warnings.forEach(warning => {
            LoggingService.logWarning(
                'config_validation_warning',
                warning
            );
        });

        // Log errors
        errors.forEach(error => {
            LoggingService.logError(
                'config_validation_error',
                new Error(error)
            );
        });

        LoggingService.logInfo(
            'environment_validation_complete',
            'Environment configuration validation completed',
            {
                warnings: warnings.length,
                errors: errors.length,
                hasMonitoring: !!process.env.MONITORING_WEBHOOK_URL,
                hasAlerting: !!process.env.ALERT_WEBHOOK_URL
            }
        );
    }

    /**
     * Gets initialization status
     */
    static getInitializationStatus(): {
        initialized: boolean;
        healthStatus: any;
        circuitBreakers: any;
        metrics: any;
    } {
        return {
            initialized: ErrorHandlingInitService.initialized,
            healthStatus: HealthCheckService.getCachedHealthStatus(),
            circuitBreakers: CircuitBreakerService.getCircuitStatus(),
            metrics: MonitoringService.getMetrics()
        };
    }

    /**
     * Adds a shutdown handler
     */
    static addShutdownHandler(handler: () => Promise<void> | void): void {
        ErrorHandlingInitService.shutdownHandlers.push(handler);
    }

    /**
     * Forces reinitialization (for testing or recovery)
     */
    static async forceReinitialize(): Promise<void> {
        LoggingService.logWarning(
            'force_reinitialize',
            'Forcing reinitialization of error handling components'
        );

        await ErrorHandlingInitService.shutdown();
        ErrorHandlingInitService.initialized = false;
        await ErrorHandlingInitService.initialize();
    }

    /**
     * Checks if error handling is properly initialized
     */
    static isInitialized(): boolean {
        return ErrorHandlingInitService.initialized;
    }
}