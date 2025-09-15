/**
 * MSW (Mock Service Worker) exports
 * Central export point for MSW testing utilities
 * Requirements: 3.2, 4.4
 */

export { handlers } from './handlers';
export { server, mswServer, MSWTestHelpers, MockScenarios } from './server';

// Re-export MSW types for convenience
export type { HttpHandler } from 'msw';

/**
 * Quick setup function for MSW in tests
 * Use this in your test setup files for easy MSW configuration
 */
export const setupMSW = () => {
    const { MSWTestHelpers } = require('./server');
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
    integration: () => {
        const { MockScenarios } = require('./server');
        MockScenarios.github.success();
        MockScenarios.groq.success();
        MockScenarios.stellar.success();
    },

    /**
     * Error testing preset
     * Configures APIs to return various error responses
     */
    errorTesting: () => {
        const { MockScenarios } = require('./server');
        MockScenarios.github.serverError();
        MockScenarios.groq.apiError();
        MockScenarios.stellar.networkError();
    },

    /**
     * Rate limiting testing preset
     * Configures APIs to return rate limit responses
     */
    rateLimitTesting: () => {
        const { MockScenarios } = require('./server');
        MockScenarios.github.rateLimit();
        MockScenarios.groq.rateLimit();
    },

    /**
     * Offline testing preset
     * Simulates network unavailability
     */
    offline: () => {
        const { MSWTestHelpers } = require('./server');
        MSWTestHelpers.mockTimeout('https://api.github.com/*');
        MSWTestHelpers.mockTimeout('https://api.groq.com/*');
        MSWTestHelpers.mockTimeout('https://horizon-testnet.stellar.org/*');
    }
};