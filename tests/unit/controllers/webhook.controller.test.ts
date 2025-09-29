import { Request, Response, NextFunction } from "express";
import {
    handlePRWebhook,
    webhookHealthCheck,
    getJobStatus,
    getQueueStats,
    getWorkflowStatus,
    triggerManualAnalysis,
    getIntelligentContextConfig,
    updateIntelligentContextConfig
} from "../../../api/controllers/webhook.controller";
import { WorkflowIntegrationService } from "../../../api/services/workflow-integration.service";
import { JobQueueService } from "../../../api/services/job-queue.service";
import { PRAnalysisService } from "../../../api/services/pr-analysis.service";
import { OctokitService } from "../../../api/services/octokit.service";
import { LoggingService } from "../../../api/services/logging.service";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { createMockRequest, createMockResponse, createMockNext } from "../../helpers/test-utils";

// Mock dependencies
jest.mock("../../../api/services/workflow-integration.service", () => ({
    WorkflowIntegrationService: {
        getInstance: jest.fn()
    }
}));

jest.mock("../../../api/services/job-queue.service", () => ({
    JobQueueService: {
        getInstance: jest.fn()
    }
}));

jest.mock("../../../api/services/pr-analysis.service", () => ({
    PRAnalysisService: {
        getConfigService: jest.fn()
    }
}));

jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getOctokit: jest.fn(),
        getOwnerAndRepo: jest.fn()
    }
}));

jest.mock("../../../api/services/logging.service", () => ({
    LoggingService: {
        logError: jest.fn(),
        logInfo: jest.fn()
    }
}));

describe("WebhookController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockWorkflowService = {
        processWebhookWorkflow: jest.fn(),
        healthCheck: jest.fn(),
        getWorkflowStatus: jest.fn()
    };

    const mockJobQueueService = {
        getJobStatus: jest.fn(),
        getQueueStats: jest.fn(),
        getActiveJobsCount: jest.fn()
    };

    const mockConfigService = {
        getConfig: jest.fn(),
        getFeatureFlags: jest.fn(),
        getConfigSummary: jest.fn(),
        updateConfig: jest.fn(),
        updateFeatureFlags: jest.fn(),
        validateConfig: jest.fn()
    };

    const mockOctokit = {
        rest: {
            pulls: {
                get: jest.fn()
            }
        },
        request: jest.fn()
    };

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
        TestDataFactory.resetCounters();

        // Setup mock implementations
        (WorkflowIntegrationService.getInstance as jest.Mock).mockReturnValue(mockWorkflowService);
        (JobQueueService.getInstance as jest.Mock).mockReturnValue(mockJobQueueService);
        (PRAnalysisService.getConfigService as jest.Mock).mockReturnValue(mockConfigService);
        (OctokitService.getOctokit as jest.Mock).mockResolvedValue(mockOctokit);
        (OctokitService.getOwnerAndRepo as jest.Mock).mockReturnValue(["owner", "repo"]);
    });

    describe("handlePRWebhook", () => {
        const mockWebhookPayload = {
            action: "opened",
            number: 123,
            pull_request: TestDataFactory.githubPullRequest({ number: 123 }),
            repository: {
                full_name: "test/repo",
                name: "repo",
                owner: { login: "test" }
            },
            installation: {
                id: 12345
            }
        };

        beforeEach(() => {
            mockRequest.body = mockWebhookPayload;
        });

        it("should process PR webhook successfully and queue analysis", async () => {
            const mockResult = {
                success: true,
                jobId: "job-123",
                prData: {
                    installationId: "12345",
                    repositoryName: "test/repo",
                    prNumber: 123,
                    prUrl: "https://github.com/test/repo/pull/123",
                    linkedIssues: [{ number: 456, url: "https://github.com/test/repo/issues/456", linkType: "closes" }],
                    changedFiles: [{ filename: "src/main.ts", status: "modified" }]
                }
            };

            mockWorkflowService.processWebhookWorkflow.mockResolvedValue(mockResult);

            await handlePRWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(mockWebhookPayload);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "PR webhook processed successfully - analysis queued",
                data: {
                    jobId: "job-123",
                    installationId: "12345",
                    repositoryName: "test/repo",
                    prNumber: 123,
                    prUrl: "https://github.com/test/repo/pull/123",
                    linkedIssuesCount: 1,
                    changedFilesCount: 1,
                    eligibleForAnalysis: true,
                    status: "queued"
                },
                timestamp: expect.any(String)
            });
        });

        it("should handle PR not eligible for analysis", async () => {
            const mockResult = {
                success: true,
                reason: "PR does not link to any issues",
                jobId: null,
                prData: null
            };

            mockWorkflowService.processWebhookWorkflow.mockResolvedValue(mockResult);

            await handlePRWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "PR not eligible for analysis: PR does not link to any issues",
                data: {
                    prNumber: 123,
                    repositoryName: "test/repo",
                    reason: "PR does not link to any issues"
                },
                timestamp: expect.any(String)
            });
        });

        it("should handle workflow processing failure", async () => {
            const mockResult = {
                success: false,
                error: "GitHub API rate limit exceeded"
            };

            mockWorkflowService.processWebhookWorkflow.mockResolvedValue(mockResult);

            await handlePRWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "GitHub API rate limit exceeded",
                timestamp: expect.any(String)
            });
        });

        it("should handle unexpected errors", async () => {
            const error = new Error("Unexpected error");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(error);

            await handlePRWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(LoggingService.logError).toHaveBeenCalledWith("PR webhook processing failed", {
                error: "Unexpected error"
            });

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("webhookHealthCheck", () => {
        it("should return healthy status when all services are healthy", async () => {
            const mockHealthCheck = {
                healthy: true,
                services: {
                    jobQueue: { status: "healthy" },
                    prAnalysis: { status: "healthy" },
                    github: { status: "healthy" }
                }
            };

            const mockWorkflowStatus = {
                totalJobsProcessed: 100,
                activeJobs: 2,
                failedJobs: 1
            };

            mockWorkflowService.healthCheck.mockResolvedValue(mockHealthCheck);
            mockWorkflowService.getWorkflowStatus.mockReturnValue(mockWorkflowStatus);

            await webhookHealthCheck(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Webhook service is healthy",
                data: {
                    health: mockHealthCheck,
                    workflow: mockWorkflowStatus
                },
                timestamp: expect.any(String),
                service: "ai-pr-review-webhook"
            });
        });

        it("should return unhealthy status when services have issues", async () => {
            const mockHealthCheck = {
                healthy: false,
                services: {
                    jobQueue: { status: "unhealthy", error: "Queue connection failed" },
                    prAnalysis: { status: "healthy" },
                    github: { status: "healthy" }
                }
            };

            mockWorkflowService.healthCheck.mockResolvedValue(mockHealthCheck);
            mockWorkflowService.getWorkflowStatus.mockReturnValue({});

            await webhookHealthCheck(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(503);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: "Webhook service has issues",
                data: expect.any(Object),
                timestamp: expect.any(String),
                service: "ai-pr-review-webhook"
            });
        });

        it("should handle health check errors", async () => {
            const error = new Error("Health check failed");
            mockWorkflowService.healthCheck.mockRejectedValue(error);

            await webhookHealthCheck(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(503);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                message: "Health check failed",
                error: "Health check failed",
                timestamp: expect.any(String),
                service: "ai-pr-review-webhook"
            });
        });
    });

    describe("getJobStatus", () => {
        const testParams = {
            jobId: "job-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
        });

        it("should return job status when job exists", async () => {
            const mockJob = {
                id: "job-123",
                status: "completed",
                data: {
                    prNumber: 123,
                    repositoryName: "test/repo"
                },
                createdAt: new Date(),
                startedAt: new Date(),
                completedAt: new Date(),
                retryCount: 0,
                maxRetries: 3,
                error: null,
                result: {
                    mergeScore: 85,
                    reviewStatus: "approved",
                    suggestions: [{ file: "src/main.ts", suggestion: "Consider refactoring" }],
                    rulesViolated: [],
                    summary: "Code looks good overall"
                }
            };

            mockJobQueueService.getJobStatus.mockReturnValue(mockJob);

            await getJobStatus(mockRequest as Request, mockResponse as Response);

            expect(mockJobQueueService.getJobStatus).toHaveBeenCalledWith("job-123");

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    jobId: "job-123",
                    status: "completed",
                    prNumber: 123,
                    repositoryName: "test/repo",
                    createdAt: mockJob.createdAt,
                    startedAt: mockJob.startedAt,
                    completedAt: mockJob.completedAt,
                    retryCount: 0,
                    maxRetries: 3,
                    error: null,
                    result: {
                        mergeScore: 85,
                        reviewStatus: "approved",
                        suggestionsCount: 1,
                        rulesViolatedCount: 0,
                        summary: "Code looks good overall"
                    }
                },
                timestamp: expect.any(String)
            });
        });

        it("should return 404 when job not found", async () => {
            mockJobQueueService.getJobStatus.mockReturnValue(null);

            await getJobStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Job not found"
            });
        });

        it("should return 400 when job ID is missing", async () => {
            mockRequest.params = {};

            await getJobStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Job ID is required"
            });
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("Database connection failed");
            mockJobQueueService.getJobStatus.mockImplementation(() => {
                throw error;
            });

            await getJobStatus(mockRequest as Request, mockResponse as Response);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error getting job status", { error });

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Internal server error"
            });
        });
    });

    describe("getQueueStats", () => {
        it("should return queue statistics successfully", async () => {
            const mockStats = {
                pending: 5,
                active: 2,
                completed: 100,
                failed: 3,
                delayed: 1
            };

            mockJobQueueService.getQueueStats.mockReturnValue(mockStats);
            mockJobQueueService.getActiveJobsCount.mockReturnValue(2);

            await getQueueStats(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    queue: mockStats,
                    activeJobs: 2,
                    timestamp: expect.any(String)
                }
            });
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("Queue service unavailable");
            mockJobQueueService.getQueueStats.mockImplementation(() => {
                throw error;
            });

            await getQueueStats(mockRequest as Request, mockResponse as Response);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error getting queue stats", { error });

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Internal server error"
            });
        });
    });

    describe("getWorkflowStatus", () => {
        it("should return workflow status successfully", async () => {
            const mockStatus = {
                totalJobsProcessed: 150,
                activeJobs: 3,
                failedJobs: 2,
                averageProcessingTime: 45000,
                lastProcessedAt: new Date(),
                queueHealth: "healthy"
            };

            mockWorkflowService.getWorkflowStatus.mockReturnValue(mockStatus);

            await getWorkflowStatus(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockStatus,
                timestamp: expect.any(String)
            });
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("Workflow service error");
            mockWorkflowService.getWorkflowStatus.mockImplementation(() => {
                throw error;
            });

            await getWorkflowStatus(mockRequest as Request, mockResponse as Response);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error getting workflow status", { error });

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Internal server error",
                timestamp: expect.any(String)
            });
        });
    }); 
    describe("triggerManualAnalysis", () => {
        const testBody = {
            installationId: "12345",
            repositoryName: "test/repo",
            prNumber: 123,
            reason: "Manual review requested",
            userId: "user-123"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
        });

        it("should trigger manual analysis successfully", async () => {
            const mockPullRequest = TestDataFactory.githubPullRequest({ number: 123 });
            const mockInstallation = { id: 12345 };
            const mockRepository = { full_name: "test/repo", name: "repo", owner: { login: "test" } };

            const mockResult = {
                success: true,
                jobId: "manual-job-456"
            };

            mockOctokit.rest.pulls.get.mockResolvedValue({ data: mockPullRequest });
            mockOctokit.request
                .mockResolvedValueOnce({ data: mockInstallation })
                .mockResolvedValueOnce({ data: mockRepository });
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue(mockResult);

            await triggerManualAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
                owner: "owner",
                repo: "repo",
                pull_number: 123
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith({
                action: "opened",
                number: 123,
                pull_request: mockPullRequest,
                repository: mockRepository,
                installation: mockInstallation
            });

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Manual analysis queued successfully",
                data: {
                    jobId: "manual-job-456",
                    installationId: "12345",
                    repositoryName: "test/repo",
                    prNumber: 123,
                    status: "queued",
                    reason: "Manual review requested"
                },
                timestamp: expect.any(String)
            });
        });

        it("should return 400 for missing required fields", async () => {
            mockRequest.body = { installationId: "12345" }; // Missing repositoryName and prNumber

            await triggerManualAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Missing required fields: installationId, repositoryName, prNumber"
            });
        });

        it("should handle workflow processing failure", async () => {
            const mockPullRequest = TestDataFactory.githubPullRequest();
            const mockInstallation = { id: 12345 };
            const mockRepository = { full_name: "test/repo" };

            const mockResult = {
                success: false,
                error: "Analysis service unavailable"
            };

            mockOctokit.rest.pulls.get.mockResolvedValue({ data: mockPullRequest });
            mockOctokit.request
                .mockResolvedValueOnce({ data: mockInstallation })
                .mockResolvedValueOnce({ data: mockRepository });
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue(mockResult);

            await triggerManualAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Analysis service unavailable",
                timestamp: expect.any(String)
            });
        });

        it("should handle GitHub API errors", async () => {
            const error = new Error("GitHub API error");
            mockOctokit.rest.pulls.get.mockRejectedValue(error);

            await triggerManualAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error in manual analysis trigger", { error });
            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe("getIntelligentContextConfig", () => {
        it("should return intelligent context configuration successfully", async () => {
            const mockConfig = {
                maxContextFiles: 10,
                contextTimeoutMs: 30000,
                enableIntelligentContext: true
            };

            const mockFeatureFlags = {
                intelligentContextEnabled: true,
                fallbackOnError: true,
                enableMetrics: true
            };

            const mockConfigSummary = {
                totalRules: 15,
                activeFeatures: 8,
                lastUpdated: new Date()
            };

            mockConfigService.getConfig.mockReturnValue(mockConfig);
            mockConfigService.getFeatureFlags.mockReturnValue(mockFeatureFlags);
            mockConfigService.getConfigSummary.mockReturnValue(mockConfigSummary);

            // Mock environment variables
            process.env.INTELLIGENT_CONTEXT_ENABLED = "true";
            process.env.MAX_INTELLIGENT_CONTEXT_TIME = "30000";
            process.env.FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR = "true";
            process.env.ENABLE_INTELLIGENT_CONTEXT_METRICS = "true";

            await getIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: {
                    configuration: mockConfig,
                    featureFlags: mockFeatureFlags,
                    summary: mockConfigSummary,
                    environmentVariables: {
                        INTELLIGENT_CONTEXT_ENABLED: "true",
                        MAX_INTELLIGENT_CONTEXT_TIME: "30000",
                        FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR: "true",
                        ENABLE_INTELLIGENT_CONTEXT_METRICS: "true"
                    }
                },
                timestamp: expect.any(String)
            });
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("Config service error");
            mockConfigService.getConfig.mockImplementation(() => {
                throw error;
            });

            await getIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error getting intelligent context config", { error });

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Internal server error",
                timestamp: expect.any(String)
            });
        });
    });

    describe("updateIntelligentContextConfig", () => {
        const testBody = {
            configuration: {
                maxContextFiles: 15,
                contextTimeoutMs: 45000
            },
            featureFlags: {
                intelligentContextEnabled: true,
                fallbackOnError: false
            }
        };

        beforeEach(() => {
            mockRequest.body = testBody;
        });

        it("should update configuration successfully", async () => {
            const mockUpdatedConfig = {
                maxContextFiles: 15,
                contextTimeoutMs: 45000,
                enableIntelligentContext: true
            };

            const mockUpdatedFeatureFlags = {
                intelligentContextEnabled: true,
                fallbackOnError: false,
                enableMetrics: true
            };

            const mockConfigSummary = {
                totalRules: 15,
                activeFeatures: 7,
                lastUpdated: new Date()
            };

            const mockValidation = {
                valid: true,
                errors: []
            };

            mockConfigService.updateConfig.mockReturnValue(undefined);
            mockConfigService.validateConfig.mockReturnValue(mockValidation);
            mockConfigService.updateFeatureFlags.mockReturnValue(undefined);
            mockConfigService.getConfig.mockReturnValue(mockUpdatedConfig);
            mockConfigService.getFeatureFlags.mockReturnValue(mockUpdatedFeatureFlags);
            mockConfigService.getConfigSummary.mockReturnValue(mockConfigSummary);

            await updateIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(mockConfigService.updateConfig).toHaveBeenCalledWith(testBody.configuration);
            expect(mockConfigService.updateFeatureFlags).toHaveBeenCalledWith(testBody.featureFlags);

            expect(LoggingService.logInfo).toHaveBeenCalledWith(
                "updateIntelligentContextConfig",
                "Intelligent context configuration updated",
                {
                    configuration: mockUpdatedConfig,
                    featureFlags: mockUpdatedFeatureFlags
                }
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Configuration updated successfully",
                data: {
                    configuration: mockUpdatedConfig,
                    featureFlags: mockUpdatedFeatureFlags,
                    summary: mockConfigSummary
                },
                timestamp: expect.any(String)
            });
        });

        it("should return 400 for invalid configuration", async () => {
            const mockValidation = {
                valid: false,
                errors: ["maxContextFiles must be positive", "contextTimeoutMs must be greater than 1000"]
            };

            mockConfigService.updateConfig.mockReturnValue(undefined);
            mockConfigService.validateConfig.mockReturnValue(mockValidation);

            await updateIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Invalid configuration",
                details: mockValidation.errors,
                timestamp: expect.any(String)
            });
        });

        it("should return 400 when neither configuration nor featureFlags provided", async () => {
            mockRequest.body = {};

            await updateIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Either configuration or featureFlags must be provided",
                timestamp: expect.any(String)
            });
        });

        it("should update only feature flags when configuration not provided", async () => {
            mockRequest.body = { featureFlags: testBody.featureFlags };

            const mockUpdatedFeatureFlags = testBody.featureFlags;
            const mockConfig = { maxContextFiles: 10 };
            const mockConfigSummary = { totalRules: 15 };

            mockConfigService.updateFeatureFlags.mockReturnValue(undefined);
            mockConfigService.getConfig.mockReturnValue(mockConfig);
            mockConfigService.getFeatureFlags.mockReturnValue(mockUpdatedFeatureFlags);
            mockConfigService.getConfigSummary.mockReturnValue(mockConfigSummary);

            await updateIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(mockConfigService.updateConfig).not.toHaveBeenCalled();
            expect(mockConfigService.updateFeatureFlags).toHaveBeenCalledWith(testBody.featureFlags);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should handle errors gracefully", async () => {
            const error = new Error("Config update failed");
            mockConfigService.updateConfig.mockImplementation(() => {
                throw error;
            });

            await updateIntelligentContextConfig(mockRequest as Request, mockResponse as Response);

            expect(LoggingService.logError).toHaveBeenCalledWith("Error updating intelligent context config", { error });

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: "Internal server error",
                timestamp: expect.any(String)
            });
        });
    });
});
