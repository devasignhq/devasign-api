import { Statsig } from "@statsig/statsig-node-core";
import { messageLogger } from "./logger.config";

export let statsig: Statsig | null = null;

// Initialize Statsig
if (process.env.NODE_ENV === "production" && process.env.STATSIG_API_KEY) {
    (async () => {
        const statsigInstance = new Statsig(process.env.STATSIG_API_KEY!);
        await statsigInstance.initialize();
        statsig = statsigInstance;
        messageLogger.info("Statsig initialized successfully.");
    })().catch(error => {
        messageLogger.error("Failed to initialize Statsig", { error });
    });
}
