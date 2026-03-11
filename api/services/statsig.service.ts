import statsig, { StatsigUser } from "statsig-node";
import { dataLogger } from "../config/logger.config";

/**
 * Statsig service to check feature gates
 */
class StatsigService {
    private isInitialized = false;

    /**
     * Initialize Statsig
     */
    public async initialize() {
        if (this.isInitialized) return;

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
        // Default to false if Statsig is not initialized
        if (!this.isInitialized) {
            dataLogger.warn("Statsig checkGate called before initialization. Defaulting to false.", { gateName });
            return false;
        }

        // Check if the feature gate is enabled for the user
        return statsig.checkGate(user, gateName);
    }
}

export const statsigService = new StatsigService();
