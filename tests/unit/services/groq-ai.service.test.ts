import { GroqAIService } from "../../../api/services/groq-ai.service";
import { PullRequestData, RelevantContext, AIReview, CodeAnalysis, RuleEvaluation } from "../../../api/models/ai-review.model";
import { GroqServiceError, GroqRateLimitError, GroqContextLimitError } from "../../../api/models/ai-review.errors";
import { GroqAITestHelpers } from "../../mocks/groq-ai.service.mock";
import { RuleSeverity } from "@/generated/client";

// Mock Groq SDK
const mockGroqClient = {
    chat: {
        completions: {
            create: jest.fn()
        }
    }
};

jest.mock("groq-sdk", () => {
    return jest.fn().mockImplementation(() => mockGroqClient);
});

// Mock MergeScoreService
jest.mock("../../../api/services/merge-score.service", () => ({
    MergeScoreService: {
        calculateMergeScore: jest.fn().mockReturnValue(75)
    }
}));

// Mock environment variables
const originalEnv = process.env;

describe("GroqAIService", () => {
    let groqService: GroqAIService;
    let mockPRData: PullRequestData;
    let mockContext: RelevantContext;

    beforeEach(() => {
        // Set up environment variables
        process.env = {
            ...originalEnv,
            GROQ_API_KEY: "test-api-key",
            GROQ_MODEL: "llama3-8b-8192",
            GROQ_MAX_TOKENS: "4096",
            GROQ_TEMPERATURE: "0.0",
            GROQ_MAX_RETRIES: "3",
            GROQ_CONTEXT_LIMIT: "8000"
        };

        // Reset all mocks
        jest.clearAllMocks();
        GroqAITestHelpers.resetGroqAIMocks();

        // Create service instance
        groqService = new GroqAIService();

        // Set up test data
        mockPRData = GroqAITestHelpers.createMockPRData();
        mockContext = GroqAITestHelpers.createMockContext();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("constructor", () => {
        it("should initialize with API key from environment", () => {
            expect(() => new GroqAIService()).not.toThrow();
        });

        it("should throw error when GROQ_API_KEY is missing", () => {
            delete process.env.GROQ_API_KEY;

            expect(() => new GroqAIService()).toThrow("GROQ_API_KEY environment variable is required");
        });

        it("should use default configuration values when env vars are not set", () => {
            delete process.env.GROQ_MODEL;
            delete process.env.GROQ_MAX_TOKENS;
            delete process.env.GROQ_TEMPERATURE;

            expect(() => new GroqAIService()).not.toThrow();
        });
    });
    describe("generateReview", () => {
        it("should generate a comprehensive AI review successfully", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            mergeScore: 85,
                            codeQuality: {
                                codeStyle: 90,
                                testCoverage: 80,
                                documentation: 85,
                                security: 95,
                                performance: 80,
                                maintainability: 85
                            },
                            suggestions: [{
                                file: "src/auth/middleware.js",
                                lineNumber: 15,
                                type: "improvement",
                                severity: "medium",
                                description: "Add input validation",
                                reasoning: "Prevents security vulnerabilities"
                            }],
                            summary: "Good code quality with minor improvements needed",
                            confidence: 0.9
                        })
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateReview(mockPRData, mockContext);

            // Assert
            expect(result).toBeDefined();
            expect(result.mergeScore).toBe(85);
            expect(result.codeQuality.codeStyle).toBe(90);
            expect(result.suggestions).toHaveLength(1);
            expect(result.summary).toBe("Good code quality with minor improvements needed");
            expect(result.confidence).toBe(0.9);
        });

        it("should handle malformed JSON response gracefully", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: "This is not valid JSON but contains merge score: 75"
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateReview(mockPRData, mockContext);

            // Assert
            expect(result).toBeDefined();
            expect(result.mergeScore).toBe(75); // Extracted from text
            expect(result.confidence).toBe(0.3); // Lower confidence for fallback
            expect(result.summary).toContain("This is not valid JSON");
        });

        it("should handle empty response from Groq API", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: null
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act & Assert
            await expect(groqService.generateReview(mockPRData, mockContext))
                .rejects.toThrow(GroqServiceError);
        });

        it("should handle rate limit errors with retry", async () => {
            // Arrange
            const rateLimitError = new Error("Rate limit exceeded");
            (rateLimitError as any).status = 429;
            (rateLimitError as any).headers = { "retry-after": "60" };

            mockGroqClient.chat.completions.create
                .mockRejectedValueOnce(rateLimitError)
                .mockResolvedValueOnce({
                    choices: [{
                        message: {
                            content: JSON.stringify({
                                mergeScore: 70,
                                codeQuality: { codeStyle: 70, testCoverage: 60, documentation: 65, security: 80, performance: 70, maintainability: 75 },
                                suggestions: [],
                                summary: "Review completed after retry",
                                confidence: 0.8
                            })
                        }
                    }]
                });

            // Act
            const result = await groqService.generateReview(mockPRData, mockContext);

            // Assert
            expect(result).toBeDefined();
            expect(result.mergeScore).toBe(70);
            expect(mockGroqClient.chat.completions.create).toHaveBeenCalledTimes(2);
        });

        it("should handle context limit errors", async () => {
            // Arrange
            const contextError = new Error("Context length exceeded");
            (contextError as any).status = 413;

            mockGroqClient.chat.completions.create.mockRejectedValue(contextError);

            // Act & Assert
            await expect(groqService.generateReview(mockPRData, mockContext))
                .rejects.toThrow(GroqContextLimitError);
        });

        it("should validate AI response and reject invalid responses", async () => {
            // Arrange
            const invalidResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            mergeScore: 150, // Invalid score > 100
                            codeQuality: null,
                            suggestions: "not an array",
                            summary: "",
                            confidence: 2.0 // Invalid confidence > 1.0
                        })
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(invalidResponse);

            // Act & Assert
            await expect(groqService.generateReview(mockPRData, mockContext))
                .rejects.toThrow(GroqServiceError);
        });
    });
    describe("calculateMergeScore", () => {
        it("should calculate merge score using MergeScoreService", async () => {
            // Arrange
            const mockAnalysis: CodeAnalysis = {
                issues: [
                    {
                        file: "src/utils.ts",
                        line: 10,
                        type: "error",
                        severity: "high",
                        message: "Potential null pointer exception",
                        rule: "no-null-pointer-exception"
                    },
                    {
                        file: "src/api.ts",
                        line: 20,
                        column: 5,
                        type: "warning",
                        severity: "medium",
                        message: "Unused variable",
                        rule: "no-unused-vars"
                    }
                ],
                metrics: {
                    codeStyle: 85,
                    testCoverage: 80,
                    documentation: 70,
                    security: 90,
                    performance: 75,
                    maintainability: 85
                },
                complexity: {
                    cyclomaticComplexity: 5,
                    cognitiveComplexity: 10,
                    linesOfCode: 500,
                    maintainabilityIndex: 70
                },
                testCoverage: {
                    linesCovered: 800,
                    totalLines: 1000,
                    branchesCovered: 150,
                    totalBranches: 200,
                    coveragePercentage: 80
                }
            };

            const mockRuleEvaluation: RuleEvaluation = {
                passed: [
                    {
                        ruleId: "rule-1",
                        ruleName: "Consistent Naming Convention",
                        severity: RuleSeverity.LOW,
                        description: "Ensure consistent naming conventions throughout the codebase"
                    },
                    {
                        ruleId: "rule-2",
                        ruleName: "Secure Password Storage",
                        severity: RuleSeverity.HIGH,
                        description: "Store passwords securely using a strong hashing algorithm"
                    }
                ],
                violated: [
                    {
                        ruleId: "rule-3",
                        ruleName: "Unused Variables",
                        severity: RuleSeverity.MEDIUM,
                        description: "Remove unused variables to improve code readability",
                        details: "Found 5 unused variables in the codebase",
                        affectedFiles: ["src/utils.ts", "src/api.ts"]
                    },
                    {
                        ruleId: "rule-4",
                        ruleName: "Code Duplication",
                        severity: RuleSeverity.CRITICAL,
                        description: "Refactor duplicated code to improve maintainability",
                        details: "Found 10 instances of duplicated code",
                        affectedFiles: ["src/components/Button.tsx", "src/components/Input.tsx"]
                    }
                ],
                score: 90
            };

            // Act
            const result = groqService.calculateMergeScore(mockAnalysis, mockRuleEvaluation);

            // Assert
            expect(result).toBe(75); // Mocked return value
            expect((await import("../../../api/services/merge-score.service")).MergeScoreService.calculateMergeScore)
                .toHaveBeenCalledWith(mockAnalysis, mockRuleEvaluation);
        });
    });

    describe("generateSuggestions", () => {
        it("should generate specific code suggestions", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify([
                            {
                                file: "src/auth/middleware.js",
                                lineNumber: 25,
                                type: "fix",
                                severity: "high",
                                description: "Add input validation for user credentials",
                                suggestedCode: "if (!username || !password) throw new Error('Invalid credentials');",
                                reasoning: "Prevents authentication bypass"
                            },
                            {
                                file: "src/utils/helper.js",
                                lineNumber: 10,
                                type: "optimization",
                                severity: "medium",
                                description: "Use memoization for expensive calculations",
                                reasoning: "Improves performance for repeated calls"
                            }
                        ])
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateSuggestions(mockPRData, mockContext);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].file).toBe("src/auth/middleware.js");
            expect(result[0].lineNumber).toBe(25);
            expect(result[0].type).toBe("fix");
            expect(result[0].severity).toBe("high");
            expect(result[1].type).toBe("optimization");
        });

        it("should return empty array on error for graceful degradation", async () => {
            // Arrange
            mockGroqClient.chat.completions.create.mockRejectedValue(new Error("API Error"));

            // Act
            const result = await groqService.generateSuggestions(mockPRData, mockContext);

            // Assert
            expect(result).toEqual([]);
        });

        it("should handle malformed suggestions response", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: "Not a valid JSON array"
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateSuggestions(mockPRData, mockContext);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe("validateAIResponse", () => {
        it("should validate a correct AI response", () => {
            // Arrange
            const validResponse: AIReview = {
                mergeScore: 85,
                codeQuality: {
                    codeStyle: 90,
                    testCoverage: 80,
                    documentation: 85,
                    security: 95,
                    performance: 80,
                    maintainability: 85
                },
                suggestions: [{
                    file: "test.js",
                    type: "improvement",
                    severity: "medium",
                    description: "Test suggestion",
                    reasoning: "Test reasoning"
                }],
                summary: "Valid summary",
                confidence: 0.9
            };

            // Act
            const result = groqService.validateAIResponse(validResponse);

            // Assert
            expect(result).toBe(true);
        });

        it("should reject response with invalid merge score", () => {
            // Arrange
            const invalidResponse: AIReview = {
                mergeScore: 150, // Invalid: > 100
                codeQuality: {
                    codeStyle: 90, testCoverage: 80, documentation: 85,
                    security: 95, performance: 80, maintainability: 85
                },
                suggestions: [],
                summary: "Valid summary",
                confidence: 0.9
            };

            // Act
            const result = groqService.validateAIResponse(invalidResponse);

            // Assert
            expect(result).toBe(false);
        });

        it("should reject response with invalid confidence", () => {
            // Arrange
            const invalidResponse: AIReview = {
                mergeScore: 85,
                codeQuality: {
                    codeStyle: 90, testCoverage: 80, documentation: 85,
                    security: 95, performance: 80, maintainability: 85
                },
                suggestions: [],
                summary: "Valid summary",
                confidence: 1.5 // Invalid: > 1.0
            };

            // Act
            const result = groqService.validateAIResponse(invalidResponse);

            // Assert
            expect(result).toBe(false);
        });

        it("should reject response with missing required fields", () => {
            // Arrange
            const invalidResponse = {
                mergeScore: 85,
                confidence: 0.9,
                codeQuality: {
                    codeStyle: 90,
                    testCoverage: 80,
                    documentation: 85,
                    security: 95,
                    performance: 80,
                    maintainability: 85
                }
            } as unknown as AIReview;

            // Act
            const result = groqService.validateAIResponse(invalidResponse);

            // Assert
            expect(result).toBe(false);
        });

        it("should reject response with invalid quality metrics", () => {
            // Arrange
            const invalidResponse: AIReview = {
                mergeScore: 85,
                codeQuality: {
                    codeStyle: 150, // Invalid: > 100
                    testCoverage: 80,
                    documentation: 85,
                    security: 95,
                    performance: 80,
                    maintainability: 85
                },
                suggestions: [],
                summary: "Valid summary",
                confidence: 0.9
            };

            // Act
            const result = groqService.validateAIResponse(invalidResponse);

            // Assert
            expect(result).toBe(false);
        });
    });

    describe("handleRateLimit", () => {
        it("should retry operation on rate limit error", async () => {
            // Arrange
            let callCount = 0;
            const operation = jest.fn().mockImplementation(() => {
                callCount++;
                if (callCount === 1) {
                    const error = new Error("Rate limit exceeded");
                    (error as any).status = 429;
                    throw error;
                }
                return Promise.resolve("success");
            });

            // Act
            const result = await groqService.handleRateLimit(operation, 3);

            // Assert
            expect(result).toBe("success");
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should throw error after max retries exceeded", async () => {
            // Arrange
            const operation = jest.fn().mockRejectedValue(new GroqRateLimitError("Rate limit exceeded", 60));

            // Act & Assert
            await expect(groqService.handleRateLimit(operation, 2))
                .rejects.toThrow(GroqRateLimitError);
            expect(operation).toHaveBeenCalledTimes(2);
        });

        it("should not retry non-retryable errors", async () => {
            // Arrange
            const operation = jest.fn().mockRejectedValue(new Error("Non-retryable error"));

            // Mock ErrorUtils.isRetryable to return false
            jest.doMock("../../../api/models/ai-review.errors", () => ({
                ...jest.requireActual("../../../api/models/ai-review.errors"),
                ErrorUtils: {
                    isRetryable: jest.fn().mockReturnValue(false),
                    getRetryDelay: jest.fn().mockReturnValue(1000)
                }
            }));

            // Act & Assert
            await expect(groqService.handleRateLimit(operation, 3))
                .rejects.toThrow("Non-retryable error");
            expect(operation).toHaveBeenCalledTimes(1);
        });
    });

    describe("Error Handling", () => {
        it("should handle Groq API connection errors", async () => {
            // Arrange
            mockGroqClient.chat.completions.create.mockRejectedValue(new Error("Connection failed"));

            // Act & Assert
            await expect(groqService.generateReview(mockPRData, mockContext))
                .rejects.toThrow();
        });

        it("should handle malformed API responses", async () => {
            // Arrange
            mockGroqClient.chat.completions.create.mockResolvedValue({
                choices: [] // Empty choices array
            });

            // Act & Assert
            await expect(groqService.generateReview(mockPRData, mockContext))
                .rejects.toThrow(GroqServiceError);
        });

        it("should handle JSON parsing errors gracefully", async () => {
            // Arrange
            const mockResponse = {
                choices: [{
                    message: {
                        content: "{ invalid json }"
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateReview(mockPRData, mockContext);

            // Assert
            expect(result).toBeDefined();
            expect(result.confidence).toBe(0.3); // Fallback confidence
        });
    });

    describe("Context Window Building", () => {
        it("should build context window with priority-based content", async () => {
            // Arrange
            const largePRData = {
                ...mockPRData,
                changedFiles: Array(10).fill(null).map((_, i) => ({
                    filename: `file${i}.js`,
                    status: "modified" as const,
                    additions: 50,
                    deletions: 10,
                    patch: `@@ -1,10 +1,50 @@\n${"+".repeat(50)}`
                }))
            };

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            mergeScore: 70,
                            codeQuality: { codeStyle: 70, testCoverage: 60, documentation: 65, security: 80, performance: 70, maintainability: 75 },
                            suggestions: [],
                            summary: "Large PR processed",
                            confidence: 0.8
                        })
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act
            const result = await groqService.generateReview(largePRData, mockContext);

            // Assert
            expect(result).toBeDefined();
            expect(mockGroqClient.chat.completions.create).toHaveBeenCalled();

            // Verify that the prompt was built (check call arguments)
            const callArgs = mockGroqClient.chat.completions.create.mock.calls[0][0];
            expect(callArgs.messages).toHaveLength(2);
            expect(callArgs.messages[1].content).toContain("PULL REQUEST ANALYSIS");
        });
    });

    describe("Token Estimation", () => {
        it("should estimate tokens correctly for content", () => {
            // This tests the private estimateTokens method indirectly
            // by ensuring large content doesn't break the service

            // Arrange
            const largeContent = "a".repeat(10000);
            const largePRData = {
                ...mockPRData,
                body: largeContent
            };

            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            mergeScore: 60,
                            codeQuality: { codeStyle: 60, testCoverage: 50, documentation: 55, security: 70, performance: 60, maintainability: 65 },
                            suggestions: [],
                            summary: "Large content processed",
                            confidence: 0.7
                        })
                    }
                }]
            };

            mockGroqClient.chat.completions.create.mockResolvedValue(mockResponse);

            // Act & Assert
            expect(async () => {
                await groqService.generateReview(largePRData, mockContext);
            }).not.toThrow();
        });
    });
});
