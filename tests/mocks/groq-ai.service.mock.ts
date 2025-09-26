import {
    PullRequestData,
    RelevantContext,
    AIReview,
    CodeAnalysis,
    RuleEvaluation,
    CodeSuggestion
} from "../../api/models/ai-review.model";

/**
 * Mock GroqAI Service for testing
 * Provides realistic AI responses for testing AI review functionality
 */

/**
 * Mock AI review responses with realistic data
 */
const mockAIReviews: Record<string, AIReview> = {
    high_quality: {
        mergeScore: 85,
        codeQuality: {
            codeStyle: 90,
            testCoverage: 80,
            documentation: 85,
            security: 95,
            performance: 80,
            maintainability: 85
        },
        suggestions: [
            {
                file: "src/components/UserProfile.tsx",
                lineNumber: 42,
                type: "improvement",
                severity: "medium",
                description: "Consider using React.memo to optimize re-renders",
                suggestedCode: "export const UserProfile = React.memo(({ user }) => {",
                reasoning: "This component receives props that don't change frequently"
            }
        ],
        summary: "High-quality pull request with good code structure and comprehensive tests. Minor optimization opportunities identified.",
        confidence: 0.92
    },

    low_quality: {
        mergeScore: 35,
        codeQuality: {
            codeStyle: 40,
            testCoverage: 20,
            documentation: 30,
            security: 60,
            performance: 40,
            maintainability: 35
        },
        suggestions: [
            {
                file: "src/utils/dataProcessor.js",
                lineNumber: 15,
                type: "fix",
                severity: "high",
                description: "Potential SQL injection vulnerability",
                suggestedCode: "const query = 'SELECT * FROM users WHERE id = ?';",
                reasoning: "Direct string concatenation in SQL queries is dangerous"
            },
            {
                file: "src/components/Dashboard.jsx",
                type: "improvement",
                severity: "medium",
                description: "Missing error handling for async operations",
                reasoning: "Unhandled promise rejections can crash the application"
            }
        ],
        summary: "Pull request needs significant improvements in security, testing, and error handling before merge.",
        confidence: 0.88
    },

    security_issues: {
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
                suggestedCode: "if (!jwt.verify(token, process.env.JWT_SECRET)) { throw new Error('Invalid token'); }",
                reasoning: "Authentication bypass vulnerability detected"
            },
            {
                file: "src/api/routes.js",
                lineNumber: 45,
                type: "fix",
                severity: "high",
                description: "Input sanitization required",
                reasoning: "User input is not validated, potential XSS vulnerability"
            }
        ],
        summary: "Critical security vulnerabilities found. Do not merge until security issues are resolved.",
        confidence: 0.95
    }
};

/**
 * Mock code suggestions for different scenarios
 */
const mockCodeSuggestions: CodeSuggestion[] = [
    {
        file: "src/components/Button.tsx",
        lineNumber: 12,
        type: "style",
        severity: "low",
        description: "Use consistent naming convention",
        suggestedCode: "const handleButtonClick = () => {",
        reasoning: "Consistent naming improves code readability"
    },
    {
        file: "src/utils/api.js",
        lineNumber: 67,
        type: "optimization",
        severity: "medium",
        description: "Add request caching to improve performance",
        suggestedCode: "const cachedResponse = cache.get(url); if (cachedResponse) return cachedResponse;",
        reasoning: "Caching reduces API calls and improves user experience"
    }
];

/**
 * Mock GroqAI Service class
 */
export class MockGroqAIService {
    private static mockResponses = new Map<string, AIReview>();
    private static shouldSimulateError = false;
    private static errorType: "rate_limit" | "context_limit" | "api_error" | null = null;

    /**
     * Mock generateReview method
     */
    static async generateReview(prData: PullRequestData, context: RelevantContext): Promise<AIReview> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));

        // Simulate errors if configured
        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        // Return specific mock response if set
        const mockKey = this.generateMockKey(prData);
        if (this.mockResponses.has(mockKey)) {
            return this.mockResponses.get(mockKey)!;
        }

        // Return default response based on PR characteristics
        return this.generateRealisticResponse(prData, context);
    }

    /**
     * Mock calculateMergeScore method
     */
    static calculateMergeScore(analysis: CodeAnalysis, ruleEvaluation: RuleEvaluation): number {
        // Simple mock calculation
        const baseScore = 50;
        const qualityBonus = analysis.complexity?.cyclomaticComplexity ? Math.max(0, 10 - analysis.complexity.cyclomaticComplexity) : 5;
        const securityBonus = ruleEvaluation.score || 0;

        return Math.min(100, Math.max(0, baseScore + qualityBonus + securityBonus));
    }

    /**
     * Mock generateSuggestions method
     */
    static async generateSuggestions(prData: PullRequestData, _context: RelevantContext): Promise<CodeSuggestion[]> {
        await new Promise(resolve => setTimeout(resolve, 50));

        if (this.shouldSimulateError) {
            return [];
        }

        return mockCodeSuggestions.filter(suggestion =>
            prData.changedFiles.some(file => file.filename.includes(suggestion.file.split("/").pop() || ""))
        );
    }

    /**
     * Mock validateAIResponse method
     */
    static validateAIResponse(review: AIReview): boolean {
        return !!(
            review.mergeScore >= 0 && review.mergeScore <= 100 &&
            review.summary && review.summary.length > 0 &&
            review.confidence >= 0 && review.confidence <= 1 &&
            review.codeQuality &&
            Array.isArray(review.suggestions)
        );
    }

    /**
     * Mock handleRateLimit method
     */
    static async handleRateLimit<T>(operation: () => Promise<T>, maxRetries: number = 3): Promise<T> {
        let attempts = 0;

        while (attempts < maxRetries) {
            try {
                return await operation();
            } catch (error: any) {
                attempts++;

                if (error.name === "GroqRateLimitError" && attempts < maxRetries) {
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
                    continue;
                }

                throw error;
            }
        }

        throw new Error("Max retries exceeded");
    }

    /**
     * Test utility methods
     */
    static setMockResponse(prData: PullRequestData, response: AIReview) {
        const key = this.generateMockKey(prData);
        this.mockResponses.set(key, response);
    }

    static simulateError(errorType: "rate_limit" | "context_limit" | "api_error") {
        this.shouldSimulateError = true;
        this.errorType = errorType;
    }

    static clearErrorSimulation() {
        this.shouldSimulateError = false;
        this.errorType = null;
    }

    static clearMockResponses() {
        this.mockResponses.clear();
    }

    /**
     * Private helper methods
     */
    private static generateMockKey(prData: PullRequestData): string {
        return `${prData.repositoryName}_${prData.prNumber}`;
    }

    private static generateRealisticResponse(prData: PullRequestData, _context: RelevantContext): AIReview {
        // Analyze PR characteristics to determine response type
        const hasTests = prData.changedFiles.some(file =>
            file.filename.includes("test") || file.filename.includes("spec")
        );

        const hasSecurityFiles = prData.changedFiles.some(file =>
            file.filename.includes("auth") || file.filename.includes("security")
        );

        const linesChanged = prData.changedFiles.reduce((total, file) =>
            total + file.additions + file.deletions, 0
        );

        // Determine response type based on characteristics
        if (hasSecurityFiles && !hasTests) {
            return mockAIReviews.security_issues;
        } else if (linesChanged > 500 || !hasTests) {
            return mockAIReviews.low_quality;
        } else {
            return mockAIReviews.high_quality;
        }
    }

    private static throwMockError() {
        switch (this.errorType) {
        case "rate_limit":
            const rateLimitError = new Error("Rate limit exceeded");
            rateLimitError.name = "GroqRateLimitError";
            throw rateLimitError;

        case "context_limit":
            const contextError = new Error("Context length exceeded");
            contextError.name = "GroqContextLimitError";
            throw contextError;

        case "api_error":
        default:
            const apiError = new Error("Groq API error");
            apiError.name = "GroqServiceError";
            throw apiError;
        }
    }
}

/**
 * Jest mock factory for GroqAIService
 */
export const createGroqAIServiceMock = () => {
    return {
        generateReview: jest.fn().mockImplementation(MockGroqAIService.generateReview),
        calculateMergeScore: jest.fn().mockImplementation(MockGroqAIService.calculateMergeScore),
        generateSuggestions: jest.fn().mockImplementation(MockGroqAIService.generateSuggestions),
        validateAIResponse: jest.fn().mockImplementation(MockGroqAIService.validateAIResponse),
        handleRateLimit: jest.fn().mockImplementation(MockGroqAIService.handleRateLimit)
    };
};

/**
 * Test helper functions for GroqAI mocking
 */
export const GroqAITestHelpers = {
    /**
     * Creates mock PR data for testing
     */
    createMockPRData: (overrides: Partial<PullRequestData> = {}): PullRequestData => ({
        installationId: "71129222",
        title: "Add user authentication feature",
        body: "This PR adds JWT-based authentication to the application",
        author: "test-developer",
        repositoryName: "test-repo",
        prUrl: "",
        prNumber: 123,
        isDraft: false,
        changedFiles: [
            {
                filename: "src/auth/middleware.js",
                status: "added",
                additions: 45,
                deletions: 0,
                patch: "@@ -0,0 +1,45 @@\n+const jwt = require('jsonwebtoken');\n+module.exports = (req, res, next) => {\n+  // Auth logic\n+};"
            }
        ],
        linkedIssues: [
            {
                number: 456,
                title: "Implement user authentication",
                linkType: "closes",
                body: "",
                url: ""
            }
        ],
        ...overrides
    }),

    /**
     * Creates mock relevant context for testing
     */
    createMockContext: (_overrides: Partial<RelevantContext> = {}): RelevantContext => ({
        similarPRs: [
            {
                prNumber: 123,
                title: "Fix bug in login feature",
                description: "Resolve issue with user authentication",
                linkedIssues: ["issue-123"],
                outcome: "merged",
                reviewComments: ["LGTM", "Needs more testing"],
                similarity: 0.8
            },
            {
                prNumber: 456,
                title: "Improve performance of dashboard",
                description: "Optimize queries for faster load times",
                linkedIssues: ["issue-456"],
                outcome: "closed",
                reviewComments: ["Needs more info"],
                similarity: 0.6
            }
        ],
        relevantFiles: [
            {
                filename: "login.ts",
                content: "console.log('login feature');",
                language: "typescript",
                similarity: 0.9,
                lastModified: "2022-01-01T12:00:00.000Z"
            },
            {
                filename: "dashboard.js",
                content: "console.log('dashboard feature');",
                language: "javascript",
                similarity: 0.7,
                lastModified: "2022-01-02T12:00:00.000Z"
            }
        ],
        codePatterns: [
            {
                pattern: "console.log",
                description: "Logging statement",
                examples: ["console.log('hello world');"],
                frequency: 10
            },
            {
                pattern: "try-catch",
                description: "Error handling block",
                examples: ["try { ... } catch (error) { ... }"],
                frequency: 5
            }
        ],
        projectStandards: [
            {
                category: "Best Practices",
                rule: "Use semicolons",
                description: "Consistently use semicolons to end statements",
                examples: ["const x = 5;"]
            },
            {
                category: "Security",
                rule: "Validate user input",
                description: "Always validate user input to prevent security vulnerabilities",
                examples: ["if (userInput === 'expectedValue') { ... }"]
            }
        ]
    }),

    /**
     * Sets up GroqAI mocks with realistic responses
     */
    setupGroqAIMocks: () => {
        MockGroqAIService.clearMockResponses();
        MockGroqAIService.clearErrorSimulation();

        return {
            mockService: MockGroqAIService,
            mockResponses: mockAIReviews,
            mockSuggestions: mockCodeSuggestions
        };
    },

    /**
     * Resets all GroqAI mocks
     */
    resetGroqAIMocks: () => {
        MockGroqAIService.clearMockResponses();
        MockGroqAIService.clearErrorSimulation();
        jest.clearAllMocks();
    }
};
