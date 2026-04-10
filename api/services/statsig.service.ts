import statsigPkg, { type StatsigUser } from "statsig-node";
import { dataLogger } from "../config/logger.config.js";

const statsig = statsigPkg.default || statsigPkg;

/**
 * Statsig service to check feature gates
 */
class StatsigService {
    private isInitialized = false;
    private isProduction = process.env.NODE_ENV === "production";

    /**
     * Initialize Statsig
     */
    public async initialize() {
        if (this.isInitialized) return;

        if (!this.isProduction) {
            dataLogger.info("Skipping Statsig initialization (not in production environment)");
            return;
        }

        // Check if STATSIG_API_KEY is set
        const serverSecret = process.env.STATSIG_API_KEY;
        if (!serverSecret) {
            dataLogger.warn("STATSIG_API_KEY is not set. Statsig will not be initialized.");
            return;
        }

        try {
            // Initialize Statsig
            await statsig.initialize(serverSecret);
            this.isInitialized = true;
            dataLogger.info("Statsig initialized successfully");
        } catch (error) {
            dataLogger.error("Failed to initialize Statsig", { error });
        }
    }

    /**
     * Check if a feature gate is enabled for a user
     * @param user - Statsig user object
     * @param gateName - Name of the feature gate
     * @returns True if the feature gate is enabled, false otherwise
     */
    public async checkGate(user: StatsigUser, gateName: string): Promise<boolean> {
        if (!this.isProduction) return false;

        // Default to false if Statsig is not initialized
        if (!this.isInitialized) {
            dataLogger.warn("Statsig checkGate called before initialization. Defaulting to false.", { gateName });
            return false;
        }

        // Check if the feature gate is enabled for the user
        return statsig.checkGate(user, gateName);
    }

    /**
     * Log a custom event to Statsig
     * @param user - Statsig user object
     * @param eventName - Name of the event to log
     * @param value - Optional value associated with the event (e.g. amount, duration)
     * @param metadata - Optional key-value pairs of metadata associated with the event
     */
    public logEvent(
        user: StatsigUser,
        eventName: string,
        value?: string | number,
        metadata?: Record<string, string>
    ): void {
        if (!this.isProduction) return;

        if (!this.isInitialized) {
            dataLogger.warn("Statsig logEvent called before initialization.", { eventName });
            return;
        }

        statsig.logEvent(user, eventName, value ?? null, metadata ?? null);
    }

    /**
     * Get a Dynamic Config from Statsig
     * @param user - Statsig user object
     * @param configName - Name of the dynamic config
     */
    public getConfig(user: StatsigUser, configName: string) {
        if (!this.isProduction) return null;

        if (!this.isInitialized) {
            dataLogger.warn("Statsig getConfig called before initialization.", { configName });
            return null;
        }

        return statsig.getConfig(user, configName);
    }

    /**
     * Get an Experiment from Statsig
     * @param user - Statsig user object
     * @param experimentName - Name of the experiment
     */
    public getExperiment(user: StatsigUser, experimentName: string) {
        if (!this.isProduction) return null;

        if (!this.isInitialized) {
            dataLogger.warn("Statsig getExperiment called before initialization.", { experimentName });
            return null;
        }

        return statsig.getExperiment(user, experimentName);
    }
}

export const statsigService = new StatsigService();
