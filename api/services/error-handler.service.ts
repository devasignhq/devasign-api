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
     * @returns A promise that resolves when initialization is complete
     */
    static async initialize(): Promise<void> {
        if (this.initialized) {
            messageLogger.info("Error handling components are already initialized");
            return;
        }

        try {
            messageLogger.info("Starting error handling initialization");

            // Set up process event handlers
            this.setupProcessEventHandlers();

            // Validate environment configuration
            this.validateEnvironmentConfiguration();

            this.initialized = true;

            dataLogger.info(
                "Error handling initialization completed successfully",
                {
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
     * @returns A promise that resolves when shutdown is complete
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

            this.initialized = false;

            messageLogger.info("Error handling shutdown completed");
        } catch (error) {
            dataLogger.error("Error handling shutdown failed", { error });
        }
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

        const requiredVars = [
            { keys: ["DATABASE_URL"], msg: "DATABASE_URL not configured - database operations will fail" },
            { keys: ["GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY"], msg: "GitHub app credentials not configured - GitHub integration will fail" },
            { keys: ["STELLAR_NETWORK"], msg: "STELLAR_NETWORK not configured - Stellar operations will fail" },
            { keys: ["STELLAR_HORIZON_URL"], msg: "STELLAR_HORIZON_URL not configured - Stellar Horizon API unavailable" },
            { keys: ["STELLAR_RPC_URL"], msg: "STELLAR_RPC_URL not configured - Soroban RPC unavailable" },
            { keys: ["STELLAR_MASTER_PUBLIC_KEY", "STELLAR_MASTER_SECRET_KEY"], msg: "Stellar master keypair not configured - Stellar transactions will fail" },
            { keys: ["TASK_ESCROW_CONTRACT_ID"], msg: "TASK_ESCROW_CONTRACT_ID not configured - escrow operations will fail" },
            { keys: ["FIREBASE_PROJECT_ID", "FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"], msg: "Firebase credentials not configured - Firebase integration will fail" },
            { keys: ["GCP_PROJECT_ID", "GCP_LOCATION_ID", "GCP_KEY_RING_ID", "GCP_KEY_ID"], msg: "GCP credentials not configured - wallet encryption will fail" },
            { keys: ["SUMSUB_APP_TOKEN", "SUMSUB_SECRET_KEY", "SUMSUB_LEVEL_NAME"], msg: "Sumsub misconfiguration" },
            { keys: ["CLOUD_RUN_SERVICE_URL", "CLOUD_RUN_PRIVATE_SERVICE_URL", "CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL"], msg: "Cloud Tasks credentials not configured - background job dispatch will fail" },
            { 
                keys: [
                    "CLOUD_TASKS_PR_ANALYSIS_QUEUE", 
                    "CLOUD_TASKS_MANUAL_PR_ANALYSIS_QUEUE",
                    "CLOUD_TASKS_REPO_INDEXING_QUEUE", 
                    "CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE", 
                    "CLOUD_TASKS_BOUNTY_PAYOUT_QUEUE", 
                    "CLOUD_TASKS_CLEAR_INSTALLATION_QUEUE", 
                    "CLOUD_TASKS_CLEAR_REPO_QUEUE"
                ], 
                msg: "Cloud Tasks queue names not configured - job routing will fail" 
            },
            { keys: ["X402_FACILITATOR_URL", "X402_PAYEE_ADDRESS", "X402_API_KEY"], msg: "x402 misconfiguration" }
        ];

        const warningVars = [
            { keys: ["GITHUB_WEBHOOK_SECRET"], msg: "GITHUB_WEBHOOK_SECRET not configured - pull request review disabled" },
            { keys: ["NODE_ENV"], msg: "NODE_ENV not configured - defaulting to development mode" },
            { keys: ["PORT"], msg: "PORT not configured - defaulting to 8080" },
            { keys: ["CONTRIBUTOR_APP_URL"], msg: "CONTRIBUTOR_APP_URL not configured - contributor redirects may fail" },
            { keys: ["DEFAULT_SUBSCRIPTION_PACKAGE_ID"], msg: "DEFAULT_SUBSCRIPTION_PACKAGE_ID not configured - subscription defaults unavailable" }
        ];

        requiredVars.forEach(({ keys, msg }) => {
            if (keys.some(key => !process.env[key])) errors.push(msg);
        });

        warningVars.forEach(({ keys, msg }) => {
            if (keys.some(key => !process.env[key])) warnings.push(msg);
        });

        if (process.env.NODE_ENV === "production" && !process.env.STATSIG_API_KEY) {
            warnings.push("STATSIG_API_KEY not configured - Statsig integration will fail");
        }

        // Log warnings and errors
        warnings.forEach(warning => messageLogger.warn(warning));
        errors.forEach(error => messageLogger.error(`Config validation error: ${error}`));

        dataLogger.info(
            "Environment configuration validation completed",
            {
                warnings: warnings.length,
                errors: errors.length,
                hasStellarConfig: !!(process.env.STELLAR_NETWORK && process.env.STELLAR_HORIZON_URL),
                hasContractConfig: !!(process.env.TASK_ESCROW_CONTRACT_ID && process.env.USDC_CONTRACT_ID),
                hasFirebase: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL),
                hasGCP: !!(process.env.GCP_PROJECT_ID && process.env.GCP_KEY_RING_ID),
                hasCloudTasks: !!(process.env.CLOUD_RUN_SERVICE_URL && process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL && process.env.CLOUD_TASKS_PR_ANALYSIS_QUEUE),
                hasStatsig: !!(process.env.NODE_ENV === "production" && process.env.STATSIG_API_KEY)
            }
        );
    }

    /**
     * Gets initialization status
     * @returns An object containing the initialization status
     */
    static getInitializationStatus() {
        return { initialized: this.initialized };
    }

    /**
     * Adds a shutdown handler
     * @param handler - The shutdown handler to add
     */
    static addShutdownHandler(handler: () => Promise<void> | void): void {
        this.shutdownHandlers.push(handler);
    }

    /**
     * Forces reinitialization (for testing or recovery)
     * @returns A promise that resolves when reinitialization is complete
     */
    static async forceReinitialize(): Promise<void> {
        messageLogger.warn("Forcing reinitialization of error handling components");

        await this.shutdown();
        this.initialized = false;
        await this.initialize();
    }
}
