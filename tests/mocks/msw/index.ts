/**
 * Central export point for MSW testing utilities
 */

export { handlers } from "./handlers";
export { server, mswServer, MSWTestHelpers, MockScenarios } from "./server";

// Re-export MSW types for convenience
export type { HttpHandler } from "msw";

/**
 * Quick setup function for MSW in tests
 * Use this in your test setup files for easy MSW configuration
 */
export const setupMSW = async () => {
    const { MSWTestHelpers } = await import("./server");
    MSWTestHelpers.setupServer();
};

/**
 * MSW configuration presets for different testing scenarios
 */
export const MSWPresets = {
    /**
     * Integration testing preset
     * Mocks all external APIs with realistic responses
     */
    integration: async () => {
        const { MockScenarios } = await import("./server");
        MockScenarios.github.success();
        MockScenarios.groq.success();
        MockScenarios.stellar.success();
    },

    /**
     * Error testing preset
     * Configures APIs to return various error responses
     */
    errorTesting: async () => {
        const { MockScenarios } = await import("./server");
        MockScenarios.github.serverError();
        MockScenarios.groq.apiError();
        MockScenarios.stellar.networkError();
    },

    /**
     * Rate limiting testing preset
     * Configures APIs to return rate limit responses
     */
    rateLimitTesting: async () => {
        const { MockScenarios } = await import("./server");
        MockScenarios.github.rateLimit();
        MockScenarios.groq.rateLimit();
    },

    /**
     * Offline testing preset
     * Simulates network unavailability
     */
    offline: async () => {
        const { MSWTestHelpers } = await import("./server");
        MSWTestHelpers.mockTimeout("https://api.github.com/*");
        MSWTestHelpers.mockTimeout("https://api.groq.com/*");
        MSWTestHelpers.mockTimeout("https://horizon-testnet.stellar.org/*");
    }
};
