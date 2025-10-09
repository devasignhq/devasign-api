import request from "supertest";
import express from "express";
import crypto from "crypto";
import { webhookRoutes } from "../../../api/routes/webhook.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { TestDataFactory } from "../../helpers/test-data-factory";

// Mock external services
jest.mock("../../../api/services/workflow-integration.service");
jest.mock("../../../api/services/job-queue.service");
jest.mock("../../../api/services/pr-analysis.service");
jest.mock("../../../api/services/octokit.service");
jest.mock("../../../api/services/logging.service");

describe("Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockWorkflowService: any;
    let mockJobQueueService: any;
    let mockOctokitService: any;
    let mockLoggingService: any;

    const WEBHOOK_SECRET = "test-webhook-secret";
    const VALID_INSTALLATION_ID = "12345";
    const VALID_REPO_NAME = "test/repo";

    beforeAll(async () => {
        // Set up test environment
        process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
        process.env.NODE_ENV = "test";

        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with webhook routes
        app = express();

        // Use raw middleware for webhook signature validation
        app.use("/webhooks", express.raw({ type: "application/json" }));
        app.use("/webhooks", webhookRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { WorkflowIntegrationService } = await import("../../../api/services/workflow-integration.service");
        const { JobQueueService } = await import("../../../api/services/job-queue.service");
        const { OctokitService } = await import("../../../api/services/octokit.service");
        const { LoggingService } = await import("../../../api/services/logging.service");

        mockWorkflowService = {
            getInstance: jest.fn().mockReturnThis(),
            processWebhookWorkflow: jest.fn(),
            healthCheck: jest.fn(),
            getWorkflowStatus: jest.fn()
        };
        WorkflowIntegrationService.getInstance = jest.fn(() => mockWorkflowService);

        mockJobQueueService = {
            getInstance: jest.fn().mockReturnThis(),
            getJobStatus: jest.fn(),
            getQueueStats: jest.fn(),
            getActiveJobsCount: jest.fn()
        };
        JobQueueService.getInstance = jest.fn(() => mockJobQueueService);

        mockOctokitService = {
            getOctokit: jest.fn(),
            getOwnerAndRepo: jest.fn(),
            getDefaultBranch: jest.fn()
        };
        Object.assign(OctokitService, mockOctokitService);

        mockLoggingService = {
            logError: jest.fn(),
            logInfo: jest.fn(),
            logWarning: jest.fn()
        };
        Object.assign(LoggingService, mockLoggingService);
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
            success: true,
            jobId: "test-job-123",
            prData: {
                installationId: VALID_INSTALLATION_ID,
                repositoryName: VALID_REPO_NAME,
                prNumber: 1,
                prUrl: "https://github.com/test/repo/pull/1",
                linkedIssues: [{ number: 1, title: "Test Issue" }],
                changedFiles: [{ filename: "test.ts", status: "modified" }]
            }
        });

        mockWorkflowService.healthCheck.mockResolvedValue({
            healthy: true,
            services: { groq: true, github: true }
        });

        mockWorkflowService.getWorkflowStatus.mockReturnValue({
            activeJobs: 0,
            queueSize: 0,
            lastProcessed: new Date().toISOString()
        });

        mockJobQueueService.getJobStatus.mockReturnValue({
            id: "test-job-123",
            status: "completed",
            data: { prNumber: 1, repositoryName: VALID_REPO_NAME },
            createdAt: new Date(),
            completedAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
            result: {
                mergeScore: 85,
                reviewStatus: "COMPLETED",
                suggestions: [],
                rulesViolated: [],
                summary: "Test review completed"
            }
        });

        mockJobQueueService.getQueueStats.mockReturnValue({
            pending: 0,
            active: 0,
            completed: 5,
            failed: 0
        });

        mockJobQueueService.getActiveJobsCount.mockReturnValue(0);

        mockOctokitService.getDefaultBranch.mockResolvedValue("main");
        mockOctokitService.getOwnerAndRepo.mockReturnValue(["test", "repo"]);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // Helper function to create valid webhook signature
    const createWebhookSignature = (payload: string): string => {
        return `sha256=${crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(payload)
            .digest("hex")}`;
    };

    // Helper function to create GitHub webhook payload
    const createWebhookPayload = (overrides: any = {}) => {
        return {
            action: "opened",
            number: 1,
            pull_request: TestDataFactory.githubPullRequest({
                number: 1,
                title: "Test PR",
                body: "Closes #1",
                draft: false,
                base: { ref: "main" },
                head: { ref: "feature-branch" },
                ...overrides.pull_request
            }),
            repository: {
                id: 123456,
                name: "repo",
                full_name: VALID_REPO_NAME,
                private: false,
                html_url: "https://github.com/test/repo",
                owner: {
                    id: 12345,
                    login: "test",
                    avatar_url: "https://github.com/test.png",
                    html_url: "https://github.com/test"
                },
                ...overrides.repository
            },
            installation: {
                id: parseInt(VALID_INSTALLATION_ID),
                account: {
                    id: 12345,
                    login: "test",
                    avatar_url: "https://github.com/test.png",
                    html_url: "https://github.com/test"
                },
                ...overrides.installation
            },
            ...overrides
        };
    };

    describe("POST /webhooks/github/pr-review - GitHub Webhook Processing", () => {
        it("should process valid PR webhook with realistic payload successfully", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(202);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR webhook processed successfully - analysis queued",
                data: {
                    jobId: "test-job-123",
                    installationId: VALID_INSTALLATION_ID,
                    repositoryName: VALID_REPO_NAME,
                    prNumber: 1,
                    prUrl: "https://github.com/test/repo/pull/1",
                    linkedIssuesCount: 1,
                    changedFilesCount: 1,
                    eligibleForAnalysis: true,
                    status: "queued"
                },
                timestamp: expect.any(String)
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "opened",
                    number: 1,
                    pull_request: expect.objectContaining({
                        number: 1,
                        title: "Test PR"
                    }),
                    webhookMeta: expect.objectContaining({
                        eventType: "pull_request",
                        action: "opened",
                        deliveryId: "test-delivery-123"
                    })
                })
            );
        });

        it("should handle PR not eligible for analysis", async () => {
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: true,
                reason: "No linked issues found",
                jobId: null
            });

            const payload = createWebhookPayload({
                pull_request: { body: "No issue links" }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR not eligible for analysis: No linked issues found",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    reason: "No linked issues found"
                }
            });
        });

        it("should handle workflow processing errors", async () => {
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: false,
                error: "GitHub API rate limit exceeded"
            });

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(500);

            expect(response.body).toMatchObject({
                success: false,
                error: "GitHub API rate limit exceeded",
                timestamp: expect.any(String)
            });
        });

        it("should validate webhook signature and reject invalid signatures", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const invalidSignature = "sha256=invalid_signature";

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .send(payloadString)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid webhook signature",
                code: "GITHUB_WEBHOOK_ERROR"
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should reject webhooks without signature", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .send(payloadString)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "Missing webhook signature",
                code: "GITHUB_WEBHOOK_ERROR"
            });
        });

        it("should skip non-PR events", async () => {
            const payload = { action: "opened", issue: { number: 1 } };
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "issues")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: "Event type not processed",
                eventType: "issues"
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip non-relevant PR actions", async () => {
            const payload = createWebhookPayload({ action: "closed" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR action not processed",
                action: "closed"
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip PRs not targeting default branch", async () => {
            const payload = createWebhookPayload({
                pull_request: { base: { ref: "develop" } }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR not targeting default branch - skipping review",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    targetBranch: "develop",
                    defaultBranch: "main",
                    reason: "not_default_branch"
                }
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should handle malformed JSON payload", async () => {
            const invalidJson = "{ invalid json }";
            const signature = createWebhookSignature(invalidJson);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(invalidJson)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid JSON payload",
                code: "GITHUB_WEBHOOK_ERROR"
            });
        });

        it("should process synchronize action for PR updates", async () => {
            const payload = createWebhookPayload({ action: "synchronize" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(202);

            expect(response.body.success).toBe(true);
            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "synchronize"
                })
            );
        });

        it("should process ready_for_review action for draft PRs", async () => {
            const payload = createWebhookPayload({ action: "ready_for_review" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(202);

            expect(response.body.success).toBe(true);
            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "ready_for_review"
                })
            );
        });
    });

    describe("Error Handling and Retry Mechanisms", () => {
        it("should handle GitHub API errors gracefully", async () => {
            const { GitHubAPIError } = await import("../../../api/models/error.model");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new GitHubAPIError("API rate limit exceeded", 429, 0)
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: "API rate limit exceeded",
                code: "GITHUB_API_ERROR",
                timestamp: expect.any(String)
            });

            expect(mockLoggingService.logError).toHaveBeenCalledWith(
                "PR webhook processing failed",
                expect.objectContaining({
                    error: "API rate limit exceeded"
                })
            );
        });

        it("should handle PR analysis errors with context", async () => {
            const { PRAnalysisError } = await import("../../../api/models/error.model");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new PRAnalysisError(1, VALID_REPO_NAME, "Failed to analyze PR changes")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: "Failed to analyze PR changes",
                code: "PR_ANALYSIS_ERROR",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME
                }
            });
        });

        it("should handle unexpected errors and pass to error middleware", async () => {
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new Error("Unexpected database connection error")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(500);

            expect(response.body).toMatchObject({
                success: false,
                error: "Internal Server Error"
            });
        });

        it("should handle default branch validation errors gracefully", async () => {
            mockOctokitService.getDefaultBranch.mockRejectedValue(
                new Error("Failed to fetch repository info")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            // Should still process the webhook despite default branch validation error
            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(202);

            expect(response.body.success).toBe(true);
            expect(mockLoggingService.logWarning).toHaveBeenCalledWith(
                "default_branch_validation_error",
                "Failed to validate default branch, continuing with processing",
                expect.objectContaining({
                    repositoryName: VALID_REPO_NAME,
                    targetBranch: "main"
                })
            );
        });
    });

    describe("Webhook Security Validation", () => {
        it("should reject webhooks when secret is not configured", async () => {
            delete process.env.GITHUB_WEBHOOK_SECRET;

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", "sha256=test")
                .send(payloadString)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "GitHub webhook secret not configured",
                code: "GITHUB_WEBHOOK_ERROR"
            });

            // Restore secret for other tests
            process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
        });

        it("should use timing-safe comparison for signature validation", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            // Create a signature that has the same length but different content
            const validSignature = createWebhookSignature(payloadString);
            const invalidSignature = validSignature.replace(/[0-9]/g, "a");

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .send(payloadString)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid webhook signature"
            });
        });

        it("should handle non-Buffer request body gracefully", async () => {
            // Create a custom app that doesn't use express.raw middleware
            const testApp = express();
            testApp.use(express.json()); // This will parse JSON instead of keeping raw buffer
            testApp.use("/webhooks", webhookRoutes);
            testApp.use(errorHandler);

            const payload = createWebhookPayload();
            const signature = createWebhookSignature(JSON.stringify(payload));

            const response = await request(testApp)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payload)
                .expect(401);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid request body format",
                code: "GITHUB_WEBHOOK_ERROR"
            });
        });
    });

    describe("GET /webhooks/health - Health Check", () => {
        it("should return healthy status when all services are operational", async () => {
            const response = await request(app)
                .get("/webhooks/health")
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                message: "Webhook service is healthy",
                data: {
                    health: {
                        healthy: true,
                        services: { groq: true, github: true }
                    },
                    workflow: {
                        activeJobs: 0,
                        queueSize: 0,
                        lastProcessed: expect.any(String)
                    }
                },
                service: "ai-pr-review-webhook"
            });
        });

        it("should return unhealthy status when services have issues", async () => {
            mockWorkflowService.healthCheck.mockResolvedValue({
                healthy: false,
                services: { groq: false, github: true },
                errors: ["Groq API connection failed"]
            });

            const response = await request(app)
                .get("/webhooks/health")
                .expect(503);

            expect(response.body).toMatchObject({
                success: false,
                message: "Webhook service has issues",
                data: {
                    health: {
                        healthy: false,
                        services: { groq: false, github: true }
                    }
                }
            });
        });

        it("should handle health check failures", async () => {
            mockWorkflowService.healthCheck.mockRejectedValue(
                new Error("Health check service unavailable")
            );

            const response = await request(app)
                .get("/webhooks/health")
                .expect(503);

            expect(response.body).toMatchObject({
                success: false,
                message: "Health check failed",
                error: "Health check service unavailable",
                service: "ai-pr-review-webhook"
            });
        });
    });

    describe("GET /webhooks/jobs/:jobId - Job Status", () => {
        it("should return job status for valid job ID", async () => {
            const response = await request(app)
                .get("/webhooks/jobs/test-job-123")
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    jobId: "test-job-123",
                    status: "completed",
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    createdAt: expect.any(String),
                    completedAt: expect.any(String),
                    retryCount: 0,
                    maxRetries: 3,
                    result: {
                        mergeScore: 85,
                        reviewStatus: "COMPLETED",
                        suggestionsCount: 0,
                        rulesViolatedCount: 0,
                        summary: "Test review completed"
                    }
                }
            });
        });

        it("should return 404 for non-existent job", async () => {
            mockJobQueueService.getJobStatus.mockReturnValue(null);

            const response = await request(app)
                .get("/webhooks/jobs/non-existent-job")
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: "Job not found"
            });
        });
    });

    describe("GET /webhooks/queue/stats - Queue Statistics", () => {
        it("should return queue statistics", async () => {
            const response = await request(app)
                .get("/webhooks/queue/stats")
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    queue: {
                        pending: 0,
                        active: 0,
                        completed: 5,
                        failed: 0
                    },
                    activeJobs: 0,
                    timestamp: expect.any(String)
                }
            });
        });

        it("should handle queue stats service errors", async () => {
            mockJobQueueService.getQueueStats.mockImplementation(() => {
                throw new Error("Queue service unavailable");
            });

            const response = await request(app)
                .get("/webhooks/queue/stats")
                .expect(500);

            expect(response.body).toMatchObject({
                success: false,
                error: "Internal server error"
            });
        });
    });

    describe("GET /webhooks/workflow/status - Workflow Status", () => {
        it("should return comprehensive workflow status", async () => {
            const response = await request(app)
                .get("/webhooks/workflow/status")
                .expect(200);

            expect(response.body).toMatchObject({
                success: true,
                data: {
                    activeJobs: 0,
                    queueSize: 0,
                    lastProcessed: expect.any(String)
                },
                timestamp: expect.any(String)
            });
        });
    });

    describe("POST /webhooks/github/manual-analysis - Manual Analysis Trigger", () => {
        beforeEach(() => {
            const mockOctokit = {
                rest: {
                    pulls: {
                        get: jest.fn().mockResolvedValue({
                            data: TestDataFactory.githubPullRequest()
                        })
                    }
                },
                request: jest.fn()
                    .mockResolvedValueOnce({
                        data: { id: parseInt(VALID_INSTALLATION_ID) }
                    })
                    .mockResolvedValueOnce({
                        data: { full_name: VALID_REPO_NAME }
                    })
            };
            mockOctokitService.getOctokit.mockResolvedValue(mockOctokit);
        });

        it("should trigger manual analysis successfully", async () => {
            const requestData = {
                installationId: VALID_INSTALLATION_ID,
                repositoryName: VALID_REPO_NAME,
                prNumber: 1,
                reason: "Manual review requested",
                userId: "test-user"
            };

            const response = await request(app)
                .post("/webhooks/github/manual-analysis")
                .send(requestData)
                .expect(202);

            expect(response.body).toMatchObject({
                success: true,
                message: "Manual analysis queued successfully",
                data: {
                    jobId: "test-job-123",
                    installationId: VALID_INSTALLATION_ID,
                    repositoryName: VALID_REPO_NAME,
                    prNumber: 1,
                    status: "queued",
                    reason: "Manual review requested"
                }
            });
        });

        it("should validate await importd fields for manual analysis", async () => {
            const response = await request(app)
                .post("/webhooks/github/manual-analysis")
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                success: false,
                error: "Missing await importd fields: installationId, repositoryName, prNumber"
            });
        });

        it("should handle GitHub API errors during manual analysis", async () => {
            mockOctokitService.getOctokit.mockRejectedValue(
                new Error("Installation not found")
            );

            const requestData = {
                installationId: "invalid-installation",
                repositoryName: VALID_REPO_NAME,
                prNumber: 1
            };

            const response = await request(app)
                .post("/webhooks/github/manual-analysis")
                .send(requestData)
                .expect(500);

            expect(response.body).toMatchObject({
                success: false,
                error: "Internal Server Error"
            });
        });
    });

    describe("AI Review Workflow Integration", () => {
        it("should trigger complete AI review workflow for eligible PR", async () => {
            const payload = createWebhookPayload({
                pull_request: {
                    body: "This PR closes #123 and resolves #456",
                    changed_files: 5,
                    additions: 100,
                    deletions: 20
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: true,
                jobId: "workflow-job-456",
                prData: {
                    installationId: VALID_INSTALLATION_ID,
                    repositoryName: VALID_REPO_NAME,
                    prNumber: 1,
                    prUrl: "https://github.com/test/repo/pull/1",
                    linkedIssues: [
                        { number: 123, title: "Bug fix" },
                        { number: 456, title: "Feature request" }
                    ],
                    changedFiles: [
                        { filename: "src/main.ts", status: "modified" },
                        { filename: "tests/main.test.ts", status: "added" }
                    ]
                }
            });

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(202);

            expect(response.body.data).toMatchObject({
                jobId: "workflow-job-456",
                linkedIssuesCount: 2,
                changedFilesCount: 2,
                eligibleForAnalysis: true
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    pull_request: expect.objectContaining({
                        body: "This PR closes #123 and resolves #456"
                    })
                })
            );
        });

        it("should handle workflow processing with context analysis", async () => {
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: true,
                jobId: "context-job-789",
                prData: {
                    installationId: VALID_INSTALLATION_ID,
                    repositoryName: VALID_REPO_NAME,
                    prNumber: 1,
                    prUrl: "https://github.com/test/repo/pull/1",
                    linkedIssues: [{ number: 1, title: "Test Issue" }],
                    changedFiles: [{ filename: "complex-feature.ts", status: "added" }]
                },
                contextAnalysisUsed: true,
                processingTimeMs: 5000
            });

            const payload = createWebhookPayload({
                pull_request: {
                    body: "Implements complex feature as requested in #1",
                    changed_files: 1,
                    additions: 500,
                    deletions: 0
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhooks/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(202);

            expect(response.body.success).toBe(true);
            expect(response.body.data.jobId).toBe("context-job-789");
        });
    });

    describe("Concurrent Webhook Processing", () => {
        it("should handle multiple concurrent webhook requests", async () => {
            const webhookPromises = Array.from({ length: 5 }, (_, i) => {
                const payload = createWebhookPayload({
                    number: i + 1,
                    pull_request: { number: i + 1, title: `PR ${i + 1}` }
                });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                    success: true,
                    jobId: `concurrent-job-${i + 1}`,
                    prData: {
                        installationId: VALID_INSTALLATION_ID,
                        repositoryName: VALID_REPO_NAME,
                        prNumber: i + 1,
                        prUrl: `https://github.com/test/repo/pull/${i + 1}`,
                        linkedIssues: [{ number: i + 1, title: `Issue ${i + 1}` }],
                        changedFiles: [{ filename: `file${i + 1}.ts`, status: "modified" }]
                    }
                });

                return request(app)
                    .post("/webhooks/github/pr-review")
                    .set("X-GitHub-Event", "pull_request")
                    .set("X-Hub-Signature-256", signature)
                    .send(payloadString);
            });

            const responses = await Promise.all(webhookPromises);

            responses.forEach((response, i) => {
                expect(response.status).toBe(202);
                expect(response.body.success).toBe(true);
                expect(response.body.data.prNumber).toBe(i + 1);
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledTimes(5);
        });
    });
});
