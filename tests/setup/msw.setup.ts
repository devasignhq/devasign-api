/**
 * MSW Setup for Jest Testing Environment
 * Configures Mock Service Worker for HTTP request mocking in tests
 */

import { setupMSW } from "../mocks/msw";

/**
 * Global MSW setup for all tests
 * This file should be included in Jest setupFilesAfterEnv
 */

// Set up MSW server lifecycle
setupMSW();

/**
 * Global test environment configuration
 */

// Increase timeout for tests that involve network mocking
jest.setTimeout(10000);

// Mock console methods to reduce noise in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
    // Suppress MSW warnings in test output
    console.error = (...args: any[]) => {
        if (
            typeof args[0] === "string" &&
            (args[0].includes("[MSW]") ||
                args[0].includes("Warning: ReactDOM.render"))
        ) {
            return;
        }
        originalConsoleError.call(console, ...args);
    };

    console.warn = (...args: any[]) => {
        if (
            typeof args[0] === "string" &&
            args[0].includes("[MSW]")
        ) {
            return;
        }
        originalConsoleWarn.call(console, ...args);
    };
});

afterAll(() => {
    // Restore original console methods
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
});

/**
 * Global error handling for unhandled promise rejections
 */
process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

/**
 * Environment variables for testing
 */
process.env.NODE_ENV = "test";
process.env.GROQ_API_KEY = "test_groq_api_key";
process.env.STELLAR_MASTER_SECRET_KEY = "test_stellar_secret";
process.env.STELLAR_MASTER_PUBLIC_KEY = "test_stellar_public";
process.env.GITHUB_APP_ID = "test_github_app_id";
process.env.GITHUB_APP_PRIVATE_KEY = "test_github_private_key";

/**
 * Global test utilities
 */
declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace jest {
        interface Matchers<R> {
            toBeValidAIReview(): R;
            toHaveValidStellarTransaction(): R;
            toMatchGitHubAPIResponse(): R;
        }
    }
}

/**
 * Custom Jest matchers for testing external API responses
 */
expect.extend({
    /**
     * Validates AI review response structure
     */
    toBeValidAIReview(received: any) {
        const pass =
            typeof received === "object" &&
            typeof received.mergeScore === "number" &&
            received.mergeScore >= 0 && received.mergeScore <= 100 &&
            typeof received.summary === "string" &&
            typeof received.confidence === "number" &&
            received.confidence >= 0 && received.confidence <= 1 &&
            Array.isArray(received.suggestions) &&
            typeof received.codeQuality === "object";

        return {
            message: () =>
                pass
                    ? `Expected ${received} not to be a valid AI review`
                    : `Expected ${received} to be a valid AI review with mergeScore (0-100), summary, confidence (0-1), suggestions array, and codeQuality object`,
            pass
        };
    },

    /**
     * Validates Stellar transaction response structure
     */
    toHaveValidStellarTransaction(received: any) {
        const pass =
            typeof received === "object" &&
            typeof received.txHash === "string" &&
            received.txHash.length > 0;

        return {
            message: () =>
                pass
                    ? `Expected ${received} not to have a valid Stellar transaction`
                    : `Expected ${received} to have a valid txHash string`,
            pass
        };
    },

    /**
     * Validates GitHub API response structure
     */
    toMatchGitHubAPIResponse(received: any) {
        const pass =
            typeof received === "object" &&
            received !== null;

        return {
            message: () =>
                pass
                    ? `Expected ${received} not to match GitHub API response format`
                    : `Expected ${received} to be a valid GitHub API response object`,
            pass
        };
    }
});

export { };
