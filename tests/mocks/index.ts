/**
 * Mock Services Index
 * Central export point for all mock implementations
 * Requirements: 1.2, 3.2, 5.4
 */

// Firebase Service Mocks
import {
    createFirebaseServiceMock,
    FirebaseTestHelpers
} from './firebase.service.mock';
export {
    MockFirebaseService,
    createFirebaseServiceMock,
    mockFirestoreDB,
    mockTimestamp,
    FirebaseTestHelpers
} from './firebase.service.mock';

// GroqAI Service Mocks
import {
    MockGroqAIService,
    createGroqAIServiceMock,
    GroqAITestHelpers
} from './groq-ai.service.mock';
export {
    MockGroqAIService,
    createGroqAIServiceMock,
    GroqAITestHelpers
} from './groq-ai.service.mock';

// Stellar Service Mocks
import {
    MockStellarService,
    createStellarServiceMock,
    StellarTestHelpers
} from './stellar.service.mock';
export {
    MockStellarService,
    createStellarServiceMock,
    mockAssetIds,
    StellarTestHelpers
} from './stellar.service.mock';

// Octokit Service Mocks
import {
    MockOctokitService,
    createOctokitServiceMock,
    OctokitTestHelpers
} from './octokit.service.mock';
export {
    MockOctokitService,
    createOctokitServiceMock,
    OctokitTestHelpers
} from './octokit.service.mock';

// MSW (Mock Service Worker) Setup
import {
    MSWTestHelpers,
    setupMSW,
    MSWPresets
} from './msw';
export {
    handlers,
    server,
    mswServer,
    MSWTestHelpers,
    MockScenarios,
    setupMSW,
    MSWPresets
} from './msw';

/**
 * Comprehensive mock setup for all services
 * Use this function to set up all mocks at once
 */
export const setupAllMocks = () => {
    // Setup MSW server
    setupMSW();

    // Reset all service mocks
    FirebaseTestHelpers.resetFirebaseMocks();
    GroqAITestHelpers.resetGroqAIMocks();
    StellarTestHelpers.resetStellarMocks();
    OctokitTestHelpers.resetOctokitMocks();

    return {
        firebase: FirebaseTestHelpers,
        groqAI: GroqAITestHelpers,
        stellar: StellarTestHelpers,
        octokit: OctokitTestHelpers,
        msw: MSWTestHelpers
    };
};

/**
 * Mock factory for creating service mocks
 */
export const MockFactory = {
    /**
     * Creates all service mocks for dependency injection
     */
    createAllServiceMocks: () => ({
        FirebaseService: createFirebaseServiceMock(),
        GroqAIService: createGroqAIServiceMock(),
        StellarService: createStellarServiceMock(),
        OctokitService: createOctokitServiceMock()
    }),

    /**
     * Creates individual service mocks
     */
    firebase: createFirebaseServiceMock,
    groqAI: createGroqAIServiceMock,
    stellar: createStellarServiceMock,
    octokit: createOctokitServiceMock
};

/**
 * Test scenarios for different testing needs
 */
export const TestScenarios = {
    /**
     * Happy path scenario - all services work correctly
     */
    happyPath: () => {
        MSWPresets.integration();
        FirebaseTestHelpers.setupFirebaseMocks();
        GroqAITestHelpers.setupGroqAIMocks();
        StellarTestHelpers.setupStellarMocks();
        OctokitTestHelpers.setupOctokitMocks();
    },

    /**
     * Error scenario - services return errors
     */
    errorScenario: () => {
        MSWPresets.errorTesting();
        MockGroqAIService.simulateError('api_error');
        MockStellarService.simulateError('network');
        MockOctokitService.simulateError('network');
    },

    /**
     * Rate limiting scenario - services are rate limited
     */
    rateLimitScenario: () => {
        MSWPresets.rateLimitTesting();
        MockGroqAIService.simulateError('rate_limit');
        MockStellarService.simulateError('rate_limit');
        MockOctokitService.simulateError('rate_limit');
    },

    /**
     * Security scenario - test security-related functionality
     */
    securityScenario: () => {
        MSWPresets.integration();

        // Set up security-focused AI responses
        const securityPRData = GroqAITestHelpers.createMockPRData({
            title: "Add authentication middleware",
            changedFiles: [
                {
                    filename: "src/auth/middleware.js",
                    status: "added",
                    additions: 50,
                    deletions: 0,
                    patch: "@@ -0,0 +1,50 @@\n+const jwt = require('jsonwebtoken');\n+// Auth implementation"
                }
            ]
        });

        MockGroqAIService.setMockResponse(securityPRData, {
            mergeScore: 25,
            codeQuality: {
                codeStyle: 70,
                testCoverage: 60,
                documentation: 65,
                security: 15,
                performance: 70,
                maintainability: 60
            },
            suggestions: [
                {
                    file: "src/auth/middleware.js",
                    lineNumber: 28,
                    type: "fix",
                    severity: "high",
                    description: "JWT token validation is missing",
                    reasoning: "Authentication bypass vulnerability detected"
                }
            ],
            summary: "Critical security vulnerabilities found.",
            confidence: 0.95
        });
    },

    /**
     * Performance scenario - test performance-related functionality
     */
    performanceScenario: () => {
        MSWPresets.integration();

        // Add delays to simulate slow responses
        MSWTestHelpers.mockResponse('https://api.github.com/*', {}, { delay: 2000 });
        MSWTestHelpers.mockResponse('https://api.groq.com/*', {}, { delay: 5000 });
    }
};

/**
 * Cleanup function to reset all mocks
 */
export const cleanupAllMocks = () => {
    FirebaseTestHelpers.resetFirebaseMocks();
    GroqAITestHelpers.resetGroqAIMocks();
    StellarTestHelpers.resetStellarMocks();
    OctokitTestHelpers.resetOctokitMocks();
};