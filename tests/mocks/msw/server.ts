import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/**
 * MSW Server setup for Node.js testing environment
 * Configures Mock Service Worker for HTTP request mocking in tests
 * Requirements: 3.2, 4.4
 */

/**
 * Create MSW server instance with default handlers
 */
export const server = setupServer(...handlers);

/**
 * Server configuration and lifecycle management
 */
export const mswServer = {
    /**
     * Start the MSW server
     * Should be called in test setup (beforeAll)
     */
    start: () => {
        server.listen({
            onUnhandledRequest: 'warn' // Warn about unhandled requests instead of erroring
        });
    },

    /**
     * Stop the MSW server
     * Should be called in test teardown (afterAll)
     */
    stop: () => {
        server.close();
    },

    /**
     * Reset handlers between tests
     * Should be called in test cleanup (afterEach)
     */
    reset: () => {
        server.resetHandlers();
    },

    /**
     * Add runtime handlers for specific tests
     */
    use: (...handlers: Parameters<typeof server.use>) => {
        server.use(...handlers);
    },

    /**
     * Reset to original handlers
     */
    restoreHandlers: () => {
        server.restoreHandlers();
    }
};

/**
 * Test helper functions for MSW server management
 */
export const MSWTestHelpers = {
    /**
     * Setup MSW server for test suite
     * Call this in your test setup file or beforeAll hook
     */
    setupServer: () => {
        // Start server before all tests
        beforeAll(() => {
            mswServer.start();
        });

        // Reset handlers after each test
        afterEach(() => {
            mswServer.reset();
        });

        // Stop server after all tests
        afterAll(() => {
            mswServer.stop();
        });
    },

    /**
     * Mock specific API responses for individual tests
     */
    mockResponse: (url: string, response: any, options?: { status?: number; delay?: number }) => {
        const { http, HttpResponse } = require('msw');

        const handler = http.get(url, async () => {
            if (options?.delay) {
                await new Promise(resolve => setTimeout(resolve, options.delay));
            }

            return HttpResponse.json(response, {
                status: options?.status || 200
            });
        });

        mswServer.use(handler);
    },

    /**
     * Mock API errors for testing error handling
     */
    mockError: (url: string, status: number = 500, message?: string) => {
        const { http, HttpResponse } = require('msw');

        const handler = http.get(url, () => {
            return new HttpResponse(message || 'Server Error', { status });
        });

        mswServer.use(handler);
    },

    /**
     * Mock network timeouts for testing timeout handling
     */
    mockTimeout: (url: string, delay: number = 500000) => {
        const { http } = require('msw');

        const handler = http.get(url, async () => {
            return new Promise(() => {
                // Never resolves - simulates timeout
                setTimeout(() => { }, delay);
            });
        });

        mswServer.use(handler);
    },

    /**
     * Mock rate limiting responses
     */
    mockRateLimit: (url: string, retryAfter: number = 60) => {
        const { http, HttpResponse } = require('msw');

        const handler = http.get(url, () => {
            return new HttpResponse('Rate limit exceeded', {
                status: 429,
                headers: {
                    'retry-after': String(retryAfter),
                    'x-ratelimit-remaining': '0'
                }
            });
        });

        mswServer.use(handler);
    }
};

/**
 * Predefined mock scenarios for common testing patterns
 */
export const MockScenarios = {
    /**
     * GitHub API scenarios
     */
    github: {
        /**
         * Mock successful GitHub operations
         */
        success: () => {
            // Handlers are already set up in handlers.ts
            // This is a no-op but provides semantic clarity
        },

        /**
         * Mock GitHub API rate limiting
         */
        rateLimit: () => {
            MSWTestHelpers.mockRateLimit('https://api.github.com/*', 3600);
        },

        /**
         * Mock GitHub API errors
         */
        serverError: () => {
            MSWTestHelpers.mockError('https://api.github.com/*', 500, 'GitHub API Error');
        },

        /**
         * Mock GitHub authentication errors
         */
        unauthorized: () => {
            MSWTestHelpers.mockError('https://api.github.com/*', 401, 'Unauthorized');
        }
    },

    /**
     * Groq AI API scenarios
     */
    groq: {
        /**
         * Mock successful AI responses
         */
        success: () => {
            // Default handlers provide successful responses
        },

        /**
         * Mock Groq rate limiting
         */
        rateLimit: () => {
            MSWTestHelpers.mockRateLimit('https://api.groq.com/*', 60);
        },

        /**
         * Mock Groq API errors
         */
        apiError: () => {
            MSWTestHelpers.mockError('https://api.groq.com/*', 500, 'Groq API Error');
        },

        /**
         * Mock context length exceeded error
         */
        contextLimit: () => {
            MSWTestHelpers.mockError('https://api.groq.com/*', 413, 'Context length exceeded');
        }
    },

    /**
     * Stellar Network scenarios
     */
    stellar: {
        /**
         * Mock successful Stellar operations
         */
        success: () => {
            // Default handlers provide successful responses
        },

        /**
         * Mock Stellar network errors
         */
        networkError: () => {
            MSWTestHelpers.mockError('https://horizon-testnet.stellar.org/*', 503, 'Network Error');
        },

        /**
         * Mock insufficient funds error
         */
        insufficientFunds: () => {
            const { http, HttpResponse } = require('msw');

            const handler = http.post('https://horizon-testnet.stellar.org/transactions', () => {
                return HttpResponse.json({
                    type: 'https://stellar.org/horizon-errors/transaction_failed',
                    title: 'Transaction Failed',
                    status: 400,
                    extras: {
                        result_codes: {
                            transaction: 'tx_insufficient_balance'
                        }
                    }
                }, { status: 400 });
            });

            mswServer.use(handler);
        },

        /**
         * Mock account not found error
         */
        accountNotFound: () => {
            MSWTestHelpers.mockError('https://horizon-testnet.stellar.org/accounts/*', 404, 'Account not found');
        }
    }
};

export default server;