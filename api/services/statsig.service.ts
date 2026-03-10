import statsig, { StatsigUser } from "statsig-node";
import { dataLogger } from "../config/logger.config";

class StatsigService {
    private isInitialized = false;

    public async initialize() {
        if (this.isInitialized) return;

        const serverSecret = process.env.STATSIG_SERVER_SECRET;
        if (!serverSecret) {
            dataLogger.warn("STATSIG_SERVER_SECRET is not set. Statsig will not be initialized.");
            return;
        }

        try {
            await statsig.initialize(serverSecret);
            this.isInitialized = true;
            dataLogger.info("Statsig initialized successfully");
        } catch (error) {
            dataLogger.error("Failed to initialize Statsig", { error });
        }
    }

    public async checkGate(user: StatsigUser, gateName: string): Promise<boolean> {
        if (!this.isInitialized) {
            // Default to false or handle it according to requirements
            return false; 
        }

        return statsig.checkGate(user, gateName);
    }
}

export const statsigService = new StatsigService();
