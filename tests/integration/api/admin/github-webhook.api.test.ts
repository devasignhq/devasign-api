import request from "supertest";
import express from "express";
import { adminRoutes } from "../../../../api/routes/admin.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock Workflow Integration Service
jest.mock("../../../../api/services/ai-review/workflow-integration.service");

// Mock Job Queue Service
jest.mock("../../../../api/services/background-job.service");

describe("Admin GitHub Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockWorkflowService: any;
    let mockBackgroundJobService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with admin routes
        app = express();
        app.use(express.json());
        app.use(ENDPOINTS.ADMIN.PREFIX, adminRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { WorkflowIntegrationService } = await import("../../../../api/services/ai-review/workflow-integration.service");
        const { BackgroundJobService } = await import("../../../../api/services/background-job.service");

        mockWorkflowService = {
            getInstance: jest.fn().mockReturnThis(),
            healthCheck: jest.fn(),
            getWorkflowStatus: jest.fn()
        };
        WorkflowIntegrationService.getInstance = jest.fn(() => mockWorkflowService);

        mockBackgroundJobService = {
            getInstance: jest.fn().mockReturnThis(),
            getJobData: jest.fn(),
            getQueueStats: jest.fn(),
            getActiveJobsCount: jest.fn()
        };
        BackgroundJobService.getInstance = jest.fn(() => mockBackgroundJobService);
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        // Setup default mock implementations
        mockWorkflowService.healthCheck.mockResolvedValue({
            healthy: true,
            components: {
                BackgroundJob: { status: "healthy", activeJobs: 2 },
                orchestration: { status: "healthy" },
                database: { status: "healthy" }
            },
            timestamp: new Date().toISOString()
        });

        mockWorkflowService.getWorkflowStatus.mockReturnValue({
            initialized: true,
            activeJobs: 2,
            queueSize: 5,
            processingRate: 10,
            uptime: 3600000
        });

        mockBackgroundJobService.getJobData.mockReturnValue({
            id: "test-job-123",
            status: "completed",
            data: {
                prNumber: 1,
                repositoryName: "test/repo",
                installationId: "12345"
            },
            createdAt: new Date().toISOString(),
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            retryCount: 0,
            maxRetries: 3,
            result: {
                mergeScore: 85,
                reviewStatus: "COMPLETED",
                suggestions: [
                    { type: "improvement", message: "Consider adding tests" }
                ],
                summary: "PR looks good overall"
            }
        });

        mockBackgroundJobService.getQueueStats.mockReturnValue({
            pending: 3,
            active: 2,
            completed: 10,
            failed: 1,
            total: 16
        });

        mockBackgroundJobService.getActiveJobsCount.mockReturnValue(2);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"])} - Webhook Health Check`, () => {
        it("should return healthy status when all components are working", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Webhook service is healthy",
                data: {
                    health: expect.objectContaining({
                        healthy: true,
                        components: expect.objectContaining({
                            BackgroundJob: expect.objectContaining({ status: "healthy" }),
                            orchestration: expect.objectContaining({ status: "healthy" }),
                            database: expect.objectContaining({ status: "healthy" })
                        })
                    }),
                    workflow: expect.objectContaining({
                        initialized: true,
                        activeJobs: 2,
                        queueSize: 5
                    }),
                    timestamp: expect.any(String),
                    service: "ai-pr-review-webhook"
                }
            });

            expect(mockWorkflowService.healthCheck).toHaveBeenCalled();
            expect(mockWorkflowService.getWorkflowStatus).toHaveBeenCalled();
        });

        it("should return unhealthy status when components have issues", async () => {
            mockWorkflowService.healthCheck.mockResolvedValue({
                healthy: false,
                components: {
                    BackgroundJob: { status: "unhealthy", error: "Queue connection lost" },
                    orchestration: { status: "healthy" },
                    database: { status: "degraded", warning: "High latency" }
                },
                timestamp: new Date().toISOString()
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "Webhook service has issues",
                data: {
                    health: expect.objectContaining({
                        healthy: false,
                        components: expect.objectContaining({
                            BackgroundJob: expect.objectContaining({
                                status: "unhealthy",
                                error: "Queue connection lost"
                            })
                        })
                    })
                }
            });
        });

        it("should handle health check errors gracefully", async () => {
            mockWorkflowService.healthCheck.mockRejectedValue(
                new Error("Health check service unavailable")
            );

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Health check failed",
                warning: "Health check service unavailable",
                data: {
                    timestamp: expect.any(String),
                    service: "ai-pr-review-webhook"
                }
            });
        });

        it("should include workflow status in health check", async () => {
            mockWorkflowService.getWorkflowStatus.mockReturnValue({
                initialized: true,
                activeJobs: 5,
                queueSize: 10,
                processingRate: 15,
                uptime: 7200000,
                lastProcessedJob: {
                    jobId: "job-456",
                    timestamp: new Date().toISOString()
                }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.workflow).toMatchObject({
                initialized: true,
                activeJobs: 5,
                queueSize: 10,
                processingRate: 15,
                uptime: 7200000
            });
        });
    });

    describe(`GET ${getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"])} - Get Job Data`, () => {
        it("should get job data by ID successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "test-job-123"))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Job data retrieved successfully",
                data: {
                    jobId: "test-job-123",
                    status: "completed",
                    prNumber: 1,
                    repositoryName: "test/repo",
                    createdAt: expect.any(String),
                    startedAt: expect.any(String),
                    completedAt: expect.any(String),
                    retryCount: 0,
                    maxRetries: 3,
                    result: {
                        mergeScore: 85,
                        reviewStatus: "COMPLETED",
                        suggestionsCount: 1,
                        summary: "PR looks good overall"
                    },
                    timestamp: expect.any(String)
                }
            });

            expect(mockBackgroundJobService.getJobData).toHaveBeenCalledWith("test-job-123");
        });

        it("should return 404 when job not found", async () => {
            mockBackgroundJobService.getJobData.mockReturnValue(null);

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "non-existent-job"))
                .expect(STATUS_CODES.NOT_FOUND);

            expect(response.body).toMatchObject({
                message: "Job not found",
                data: {}
            });
        });

        it("should handle job data with error information", async () => {
            mockBackgroundJobService.getJobData.mockReturnValue({
                id: "failed-job-456",
                status: "failed",
                data: {
                    prNumber: 2,
                    repositoryName: "test/repo",
                    installationId: "12345"
                },
                createdAt: new Date().toISOString(),
                startedAt: new Date().toISOString(),
                completedAt: new Date().toISOString(),
                retryCount: 3,
                maxRetries: 3,
                error: {
                    message: "GitHub API rate limit exceeded",
                    code: "RATE_LIMIT_ERROR",
                    timestamp: new Date().toISOString()
                },
                result: null
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "failed-job-456"))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                jobId: "failed-job-456",
                status: "failed",
                retryCount: 3,
                maxRetries: 3,
                error: expect.objectContaining({
                    message: "GitHub API rate limit exceeded",
                    code: "RATE_LIMIT_ERROR"
                }),
                result: null
            });
        });

        it("should handle job data retrieval errors", async () => {
            mockBackgroundJobService.getJobData.mockImplementation(() => {
                throw new Error("Database connection error");
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "test-job-123"))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Failed to get job data",
                warning: "Database connection error",
                data: {}
            });
        });

        it("should return job data for pending jobs", async () => {
            mockBackgroundJobService.getJobData.mockReturnValue({
                id: "pending-job-789",
                status: "pending",
                data: {
                    prNumber: 3,
                    repositoryName: "test/repo",
                    installationId: "12345"
                },
                createdAt: new Date().toISOString(),
                startedAt: null,
                completedAt: null,
                retryCount: 0,
                maxRetries: 3,
                error: null,
                result: null
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "pending-job-789"))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                jobId: "pending-job-789",
                status: "pending",
                startedAt: null,
                completedAt: null,
                result: null
            });
        });
    });

    describe(`GET ${getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"])} - Get Queue Statistics`, () => {
        it("should get queue statistics successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Queue statistics retrieved successfully",
                data: {
                    queue: {
                        pending: 3,
                        active: 2,
                        completed: 10,
                        failed: 1,
                        total: 16
                    },
                    activeJobs: 2,
                    timestamp: expect.any(String)
                }
            });

            expect(mockBackgroundJobService.getQueueStats).toHaveBeenCalled();
            expect(mockBackgroundJobService.getActiveJobsCount).toHaveBeenCalled();
        });

        it("should handle empty queue statistics", async () => {
            mockBackgroundJobService.getQueueStats.mockReturnValue({
                pending: 0,
                active: 0,
                completed: 0,
                failed: 0,
                total: 0
            });
            mockBackgroundJobService.getActiveJobsCount.mockReturnValue(0);

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.queue).toMatchObject({
                pending: 0,
                active: 0,
                completed: 0,
                failed: 0,
                total: 0
            });
            expect(response.body.data.activeJobs).toBe(0);
        });

        it("should handle queue statistics retrieval errors", async () => {
            mockBackgroundJobService.getQueueStats.mockImplementation(() => {
                throw new Error("Queue service unavailable");
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Failed to fetch queue stats",
                warning: "Queue service unavailable",
                data: {}
            });
        });

        it("should include detailed queue metrics", async () => {
            mockBackgroundJobService.getQueueStats.mockReturnValue({
                pending: 5,
                active: 3,
                completed: 25,
                failed: 2,
                total: 35,
                averageProcessingTime: 5000,
                successRate: 0.93
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.queue).toMatchObject({
                pending: 5,
                active: 3,
                completed: 25,
                failed: 2,
                total: 35,
                averageProcessingTime: 5000,
                successRate: 0.93
            });
        });
    });

    describe(`GET ${getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"])} - Get Workflow Status`, () => {
        it("should get workflow status successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Workflow status retrieved successfully",
                data: {
                    initialized: true,
                    activeJobs: 2,
                    queueSize: 5,
                    processingRate: 10,
                    uptime: 3600000,
                    timestamp: expect.any(String)
                }
            });

            expect(mockWorkflowService.getWorkflowStatus).toHaveBeenCalled();
        });

        it("should handle uninitialized workflow", async () => {
            mockWorkflowService.getWorkflowStatus.mockReturnValue({
                initialized: false,
                activeJobs: 0,
                queueSize: 0,
                processingRate: 0,
                uptime: 0,
                error: "Workflow service not initialized"
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                initialized: false,
                error: "Workflow service not initialized"
            });
        });

        it("should include detailed workflow metrics", async () => {
            mockWorkflowService.getWorkflowStatus.mockReturnValue({
                initialized: true,
                activeJobs: 4,
                queueSize: 8,
                processingRate: 12,
                uptime: 10800000,
                totalProcessed: 150,
                successRate: 0.95,
                averageProcessingTime: 4500,
                lastProcessedJob: {
                    jobId: "job-999",
                    prNumber: 10,
                    repositoryName: "test/repo",
                    timestamp: new Date().toISOString()
                }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                initialized: true,
                activeJobs: 4,
                queueSize: 8,
                processingRate: 12,
                uptime: 10800000,
                totalProcessed: 150,
                successRate: 0.95,
                averageProcessingTime: 4500,
                lastProcessedJob: expect.objectContaining({
                    jobId: "job-999",
                    prNumber: 10
                })
            });
        });

        it("should handle workflow status retrieval errors", async () => {
            mockWorkflowService.getWorkflowStatus.mockImplementation(() => {
                throw new Error("Workflow service error");
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Failed to get workflow status",
                warning: "Workflow service error",
                data: {
                    timestamp: expect.any(String)
                }
            });
        });
    });

    describe("Error Handling and Edge Cases", () => {
        it("should handle service initialization failures", async () => {
            const { WorkflowIntegrationService } = await import("../../../../api/services/ai-review/workflow-integration.service");
            WorkflowIntegrationService.getInstance = jest.fn(() => {
                throw new Error("Service initialization failed");
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Health check failed"
            });

            // Restore mock
            WorkflowIntegrationService.getInstance = jest.fn(() => mockWorkflowService);
        });

        it("should handle concurrent requests to admin endpoints", async () => {
            const requests = [
                request(app).get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"])),
                request(app).get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"])),
                request(app).get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "WORKFLOW_STATUS"])),
                request(app).get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", "test-job-123"))
            ];

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(STATUS_CODES.SUCCESS);
                expect(response.body.message).toBeDefined();
                expect(response.body.data).toBeDefined();
            });
        });

        it("should handle malformed job IDs gracefully", async () => {
            mockBackgroundJobService.getJobData.mockReturnValue(null);

            const malformedIds = ["", " ", "null", "undefined", "../../etc/passwd"];

            for (const jobId of malformedIds) {
                const response = await request(app)
                    .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "GET_JOB"]).replace(":jobId", encodeURIComponent(jobId)));

                expect([STATUS_CODES.NOT_FOUND, STATUS_CODES.SERVER_ERROR]).toContain(response.status);
            }
        });
    });

    describe("Performance and Monitoring", () => {
        it("should return response times within acceptable limits", async () => {
            const startTime = Date.now();

            await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "HEALTH"]))
                .expect(STATUS_CODES.SUCCESS);

            const responseTime = Date.now() - startTime;

            // Health check should respond within 1 second
            expect(responseTime).toBeLessThan(1000);
        });

        it("should handle high queue statistics efficiently", async () => {
            mockBackgroundJobService.getQueueStats.mockReturnValue({
                pending: 1000,
                active: 50,
                completed: 10000,
                failed: 100,
                total: 11150
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "WEBHOOK", "QUEUE_STATS"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.queue.total).toBe(11150);
        });
    });
});
