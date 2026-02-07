import { CircuitBreakerService } from "./circuit-breaker.service";
import { dataLogger, messageLogger } from "../config/logger.config";

/**
 * Sets up and configures all error handling components for the AI Review System
 */
export class ErrorHandlerService {
    private static initialized = false;
    private static shutdownHandlers: Array<() => Promise<void> | void> = [];
    private static readonly CIRCUIT_BREAKER_CONFIG = {
        gemini: { failureThreshold: 3, recoveryTimeout: 120000 }, // 2 minutes
        github: { failureThreshold: 10, recoveryTimeout: 30000 }, // 30 seconds
        database: { failureThreshold: 3, recoveryTimeout: 60000 } // 1 minute
    };

    /**
     * Initializes all error handling components
     */
    static async initialize(): Promise<void> {
        if (this.initialized) {
            messageLogger.info("Error handling components are already initialized");
            return;
        }

        try {
            messageLogger.info("Starting error handling initialization");

            // Initialize circuit breakers
            this.initializeCircuitBreakers();

            // Set up process event handlers
            this.setupProcessEventHandlers();

            // Validate environment configuration
            this.validateEnvironmentConfiguration();

            this.initialized = true;

            dataLogger.info(
                "Error handling initialization completed successfully",
                {
                    circuitBreakers: Object.keys(CircuitBreakerService.getCircuitStatus()),
                    monitoringActive: true,
                    healthCheckEnabled: true
                }
            );
        } catch (error) {
            dataLogger.error("Error handling initialization failed", { error });
            throw error;
        }
    }

    /**
     * Shuts down error handling components gracefully
     */
    static async shutdown(): Promise<void> {
        if (!this.initialized) {
            return;
        }

        messageLogger.info("Starting graceful shutdown of error handling components");

        try {

            // Execute shutdown handlers
            for (const handler of this.shutdownHandlers) {
                try {
                    await handler();
                } catch (error) {
                    dataLogger.error("Shutdown handler failed", { error });
                }
            }

            // Reset circuit breakers
            CircuitBreakerService.resetAll();

            this.initialized = false;

            messageLogger.info("Error handling shutdown completed");
        } catch (error) {
            dataLogger.error("Error handling shutdown failed", { error });
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

        dataLogger.info(
            "Circuit breakers initialized for all services",
            { services: Object.keys(this.CIRCUIT_BREAKER_CONFIG) }
        );
    }

    /**
     * Sets up process event handlers for graceful shutdown
     */
    private static setupProcessEventHandlers(): void {
        // Handle graceful shutdown
        const gracefulShutdown = async (signal: string) => {
            messageLogger.info(`Graceful shutdown initiated by ${signal}`);

            await this.shutdown();
            process.exit(0);
        };

        // Handle uncaught exceptions
        process.on("uncaughtException", (error: Error) => {
            dataLogger.error("Uncaught exception", { error, fatal: true });

            // Give time for logging to complete
            setTimeout(() => {
                process.exit(1);
            }, 1000);
        });

        // Handle unhandled promise rejections
        process.on("unhandledRejection", (reason: unknown, promise: Promise<unknown>) => {
            dataLogger.error(
                "Unhandled rejection",
                {
                    reason: reason instanceof Error ? reason : new Error(String(reason)),
                    promise: promise.toString()
                }
            );
        });

        // Handle shutdown signals
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));

        // Handle warnings
        process.on("warning", (warning: Error) => {
            dataLogger.warn(warning.message, { warning: warning.stack });
        });

        messageLogger.info("Process event handlers have been set up");
    }

    /**
     * Validates environment configuration for error handling
     */
    private static validateEnvironmentConfiguration(): void {
        const warnings: string[] = [];
        const errors: string[] = [];

        // Database Configuration (Critical)
        if (!process.env.DATABASE_URL) {
            errors.push("DATABASE_URL not configured - database operations will fail");
        }

        // GitHub Configuration (Critical)
        if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
            errors.push("GitHub app credentials not configured - GitHub integration will fail");
        }

        if (!process.env.GITHUB_WEBHOOK_SECRET) {
            warnings.push("GITHUB_WEBHOOK_SECRET not configured - pull request review disabled");
        }

        // Stellar Configuration (Critical for blockchain operations)
        if (!process.env.STELLAR_NETWORK) {
            errors.push("STELLAR_NETWORK not configured - Stellar operations will fail");
        }

        if (!process.env.STELLAR_HORIZON_URL) {
            errors.push("STELLAR_HORIZON_URL not configured - Stellar Horizon API unavailable");
        }

        if (!process.env.STELLAR_RPC_URL) {
            errors.push("STELLAR_RPC_URL not configured - Soroban RPC unavailable");
        }

        if (!process.env.STELLAR_MASTER_PUBLIC_KEY || !process.env.STELLAR_MASTER_SECRET_KEY) {
            errors.push("Stellar master keypair not configured - Stellar transactions will fail");
        }

        // Smart Contract Configuration (Critical)
        if (!process.env.TASK_ESCROW_CONTRACT_ID) {
            errors.push("TASK_ESCROW_CONTRACT_ID not configured - escrow operations will fail");
        }

        if (!process.env.USDC_CONTRACT_ID) {
            errors.push("USDC_CONTRACT_ID not configured - USDC token operations will fail");
        }

        // Firebase Configuration (Critical)
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
            errors.push("Firebase credentials not configured - Firebase integration will fail");
        }

        // GCP Configuration (Critical)
        if (!process.env.GCP_PROJECT_ID || !process.env.GCP_LOCATION_ID || !process.env.GCP_KEY_RING_ID || !process.env.GCP_KEY_ID) {
            errors.push("GCP credentials not configured - wallet encryption will fail");
        }

        // Sumsub Configuration (Critical)
        if (!process.env.SUMSUB_APP_TOKEN || !process.env.SUMSUB_SECRET_KEY || !process.env.SUMSUB_LEVEL_NAME) {
            errors.push("Sumsub misconfiguration");
        }

        // Application Configuration
        if (!process.env.NODE_ENV) {
            warnings.push("NODE_ENV not configured - defaulting to development mode");
        }

        if (!process.env.PORT) {
            warnings.push("PORT not configured - defaulting to 8080");
        }

        if (!process.env.CONTRIBUTOR_APP_URL) {
            warnings.push("CONTRIBUTOR_APP_URL not configured - contributor redirects may fail");
        }

        if (!process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID) {
            warnings.push("DEFAULT_SUBSCRIPTION_PACKAGE_ID not configured - subscription defaults unavailable");
        }

        // Log warnings
        warnings.forEach(warning => {
            messageLogger.warn(warning);
        });

        // Log errors
        errors.forEach(error => {
            messageLogger.error(`Config validation error: ${error}`);
        });

        dataLogger.info(
            "Environment configuration validation completed",
            {
                warnings: warnings.length,
                errors: errors.length,
                hasMonitoring: !!process.env.MONITORING_WEBHOOK_URL,
                hasAlerting: !!process.env.ALERT_WEBHOOK_URL,
                hasStellarConfig: !!(process.env.STELLAR_NETWORK && process.env.STELLAR_HORIZON_URL),
                hasContractConfig: !!(process.env.TASK_ESCROW_CONTRACT_ID && process.env.USDC_CONTRACT_ID),
                hasFirebase: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL),
                hasGCP: !!(process.env.GCP_PROJECT_ID && process.env.GCP_KEY_RING_ID)
            }
        );
    }

    /**
     * Gets initialization status
     */
    static getInitializationStatus() {
        return {
            initialized: this.initialized,
            circuitBreakers: CircuitBreakerService.getCircuitStatus()
        };
    }

    /**
     * Adds a shutdown handler
     */
    static addShutdownHandler(handler: () => Promise<void> | void): void {
        this.shutdownHandlers.push(handler);
    }

    /**
     * Forces reinitialization (for testing or recovery)
     */
    static async forceReinitialize(): Promise<void> {
        messageLogger.warn("Forcing reinitialization of error handling components");

        await this.shutdown();
        this.initialized = false;
        await this.initialize();
    }
}
