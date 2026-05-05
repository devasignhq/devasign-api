import { dataLogger, messageLogger } from "../config/logger.config.js";
import { Env } from "../utils/env.js";

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
            { values: [Env.databaseUrl()], msg: "DATABASE_URL not configured - database operations will fail" },
            { values: [Env.githubAppId(), Env.githubAppPrivateKey()], msg: "GitHub app credentials not configured - GitHub integration will fail" },
            { values: [Env.stellarNetwork()], msg: "STELLAR_NETWORK not configured - Stellar operations will fail" },
            { values: [Env.stellarHorizonUrl()], msg: "STELLAR_HORIZON_URL not configured - Stellar Horizon API unavailable" },
            { values: [Env.stellarRpcUrl()], msg: "STELLAR_RPC_URL not configured - Soroban RPC unavailable" },
            { values: [Env.stellarMasterPublicKey(), Env.stellarMasterSecretKey()], msg: "Stellar master keypair not configured - Stellar transactions will fail" },
            { values: [Env.taskEscrowContractId()], msg: "TASK_ESCROW_CONTRACT_ID not configured - escrow operations will fail" },
            { values: [Env.firebaseProjectId(), Env.firebaseClientEmail(), Env.firebasePrivateKey()], msg: "Firebase credentials not configured - Firebase integration will fail" },
            { values: [Env.gcpProjectId(), Env.gcpLocationId(), Env.gcpKeyRingId(), Env.gcpKeyId()], msg: "GCP credentials not configured - wallet encryption will fail" },
            { values: [Env.sumsubAppToken(), Env.sumsubSecretKey(), Env.sumsubLevelName()], msg: "Sumsub misconfiguration" },
            { values: [Env.cloudRunServiceUrl(), Env.cloudRunPrivateServiceUrl(), Env.cloudTasksServiceAccountEmail()], msg: "Cloud Tasks credentials not configured - background job dispatch will fail" },
            { 
                values: [
                    Env.cloudTasksPrAnalysisQueue(), 
                    Env.cloudTasksManualPrAnalysisQueue(),
                    Env.cloudTasksRepoIndexingQueue(), 
                    Env.cloudTasksIncrementalIndexingQueue(), 
                    Env.cloudTasksBountyPayoutQueue(), 
                    Env.cloudTasksClearInstallationQueue(), 
                    Env.cloudTasksClearRepoQueue()
                ], 
                msg: "Cloud Tasks queue names not configured - job routing will fail" 
            },
            { values: [Env.x402FacilitatorUrl(), Env.x402PayeeAddress(), Env.x402ApiKey()], msg: "x402 misconfiguration" }
        ];

        const warningVars = [
            { values: [Env.githubWebhookSecret()], msg: "GITHUB_WEBHOOK_SECRET not configured - pull request review disabled" },
            { values: [Env.nodeEnv()], msg: "NODE_ENV not configured - defaulting to development mode" },
            { values: [Env.port()], msg: "PORT not configured - defaulting to 8080" },
            { values: [Env.contributorAppUrl()], msg: "CONTRIBUTOR_APP_URL not configured - contributor redirects may fail" },
            { values: [Env.defaultSubscriptionPackageId()], msg: "DEFAULT_SUBSCRIPTION_PACKAGE_ID not configured - subscription defaults unavailable" }
        ];

        requiredVars.forEach(({ values, msg }) => {
            if (values.some(val => !val)) errors.push(msg);
        });

        warningVars.forEach(({ values, msg }) => {
            if (values.some(val => !val)) warnings.push(msg);
        });

        if (Env.nodeEnv() === "production" && !Env.statsigApiKey()) {
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
                hasStellarConfig: !!(Env.stellarNetwork() && Env.stellarHorizonUrl()),
                hasContractConfig: !!(Env.taskEscrowContractId() && Env.usdcContractId()),
                hasFirebase: !!(Env.firebaseProjectId() && Env.firebaseClientEmail()),
                hasGCP: !!(Env.gcpProjectId() && Env.gcpKeyRingId()),
                hasCloudTasks: !!(Env.cloudRunServiceUrl() && Env.cloudTasksServiceAccountEmail() && Env.cloudTasksPrAnalysisQueue()),
                hasStatsig: !!(Env.nodeEnv() === "production" && Env.statsigApiKey())
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
