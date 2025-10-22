import request from "supertest";
import express from "express";
import crypto from "crypto";
import { webhookRoutes } from "../../../api/routes/webhook.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { STATUS_CODES } from "../../../api/helper";

// Mock external services
jest.mock("../../../api/services/ai-review/workflow-integration.service");
jest.mock("../../../api/services/ai-review/job-queue.service");
jest.mock("../../../api/services/ai-review/pr-analysis.service");
jest.mock("../../../api/services/octokit.service");

describe("Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockWorkflowService: any;
    let mockJobQueueService: any;
    let mockOctokitService: any;

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
        app.use("/webhook/github/pr-review", express.raw({ type: "application/json" }));
        app.use("/webhook", webhookRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { WorkflowIntegrationService } = await import("../../../api/services/ai-review/workflow-integration.service");
        const { JobQueueService } = await import("../../../api/services/ai-review/job-queue.service");
        const { OctokitService } = await import("../../../api/services/octokit.service");

        mockWorkflowService = {
            getInstance: jest.fn().mockReturnThis(),
            processWebhookWorkflow: jest.fn(),
            healthCheck: jest.fn(),
            getWorkflowStatus: jest.fn()
        };
        WorkflowIntegrationService.getInstance = jest.fn(() => mockWorkflowService);

        mockJobQueueService = {
            getInstance: jest.fn().mockReturnThis(),
            getJobData: jest.fn(),
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

        mockJobQueueService.getJobData.mockReturnValue({
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

    describe("POST /webhook/github/pr-review - GitHub Webhook Processing", () => {
        it("should process valid PR webhook with realistic payload successfully", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

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
                reason: "PR not eligible for analysis: No linked issues found",
                jobId: null
            });

            const payload = createWebhookPayload({
                pull_request: { 
                    ...createWebhookPayload().pull_request,
                    body: "No issue links" 
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR not eligible for analysis: No linked issues found",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME
                },
                timestamp: expect.any(String)
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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.success).toBe(false);
        });

        it("should validate webhook signature and reject invalid signatures", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const invalidSignature = `sha256=${crypto
                .createHmac("sha256", "invalid_secret")
                .update("invalid_payload")
                .digest("hex")}`;

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.error).toBe("Invalid webhook signature");
            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should reject webhook without signature", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.error).toBe("Missing webhook signature");
            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip non-PR events", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "issues")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR action not processed",
                action: "closed"
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip PRs not targeting default branch", async () => {
            const payload = createWebhookPayload({
                pull_request: { 
                    ...createWebhookPayload().pull_request,
                    base: { ref: "develop" }
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(invalidJson)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.error).toBe("Invalid request body format");
        });

        it("should process synchronize action for PR updates", async () => {
            const payload = createWebhookPayload({ action: "synchronize" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

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
                new GitHubAPIError("API rate limit exceeded", null, 429, 0)
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.GITHUB_API_ERROR);

            expect(response.body.message).toBe("API rate limit exceeded");
            expect(response.body.code).toBe("GITHUB_API_ERROR");
        });

        it("should handle PR analysis errors with context", async () => {
            const { PRAnalysisError } = await import("../../../api/models/error.model");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new PRAnalysisError(1, VALID_REPO_NAME, "Failed to analyze PR changes", {})
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Failed to analyze PR changes");
            expect(response.body.code).toBe("PR_ANALYSIS_ERROR");
            expect(response.body.repositoryName).toBe(VALID_REPO_NAME);
            expect(response.body.prNumber).toBe(1);
        });

        it("should handle unexpected errors and pass to error middleware", async () => {
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new Error("Unexpected database connection error")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.message).toBe("Unexpected database connection error");
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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body.success).toBe(true);
        });
    });

    describe("Webhook Security Validation", () => {
        it("should reject webhook when secret is not configured", async () => {
            delete process.env.GITHUB_WEBHOOK_SECRET;

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", "sha256=test")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

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
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid webhook signature"
            });
        });

        it("should handle non-Buffer request body gracefully", async () => {
            // Create a custom app that doesn't use express.raw middleware
            const testApp = express();
            testApp.use(express.json()); // This will parse JSON instead of keeping raw buffer
            testApp.use("/webhook", webhookRoutes);
            testApp.use(errorHandler);

            const payload = createWebhookPayload();
            const signature = createWebhookSignature(JSON.stringify(payload));

            const response = await request(testApp)
                .post("/webhook/github/pr-review")
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payload)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                success: false,
                error: "Invalid request body format",
                code: "GITHUB_WEBHOOK_ERROR"
            });
        });
    });

    describe("GET /webhook/health - Health Check", () => {
        it("should return healthy status when all services are operational", async () => {
            const response = await request(app)
                .get("/webhook/health")
                .expect(STATUS_CODES.SUCCESS);

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

        it("should handle health check failures", async () => {
            mockWorkflowService.healthCheck.mockRejectedValue(
                new Error("Health check service unavailable")
            );

            const response = await request(app)
                .get("/webhook/health")
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("Health check failed");
        });
    });

    describe("GET /webhook/jobs/:jobId - Job Data", () => {
        it("should return job data for valid job ID", async () => {
            const response = await request(app)
                .get("/webhook/jobs/test-job-123")
                .expect(STATUS_CODES.SUCCESS);

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
            mockJobQueueService.getJobData.mockReturnValue(null);

            const response = await request(app)
                .get("/webhook/jobs/non-existent-job")
                .expect(404);

            expect(response.body).toMatchObject({
                success: false,
                error: "Job not found"
            });
        });
    });

    describe("GET /webhook/queue/stats - Queue Statistics", () => {
        it("should return queue statistics", async () => {
            const response = await request(app)
                .get("/webhook/queue/stats")
                .expect(STATUS_CODES.SUCCESS);

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
                .get("/webhook/queue/stats")
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                success: false,
                error: "Queue service unavailable"
            });
        });
    });

    describe("GET /webhook/workflow/status - Workflow Status", () => {
        it("should return comprehensive workflow status", async () => {
            const response = await request(app)
                .get("/webhook/workflow/status")
                .expect(STATUS_CODES.SUCCESS);

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

    describe("Concurrent Webhook Processing", () => {
        it("should handle multiple concurrent webhook requests", async () => {
            const webhookPromises = Array.from({ length: 5 }, (_, i) => {
                const payload = createWebhookPayload({
                    number: i + 1,
                    pull_request: { 
                        ...createWebhookPayload().pull_request,
                        number: i + 1, 
                        title: `PR ${i + 1}` 
                    }
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
                    .post("/webhook/github/pr-review")
                    .set("X-GitHub-Event", "pull_request")
                    .set("X-Hub-Signature-256", signature)
                    .set("X-GitHub-Delivery", `test-delivery-${i + 1}`)
                    .set("Content-Type", "application/json")
                    .send(payloadString);
            });

            const responses = await Promise.all(webhookPromises);

            responses.forEach((response, _i) => {
                expect(response.status).toBe(STATUS_CODES.BACKGROUND_JOB);
                expect(response.body.success).toBe(true);
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledTimes(5);
        });
    });
});
