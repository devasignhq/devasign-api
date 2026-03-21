import request from "supertest";
import express from "express";
import { internalRoutes } from "../../../../api/routes/internal.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { PRAnalysisError } from "../../../../api/models/error.model";
import { dataLogger } from "../../../../api/config/logger.config";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock services
jest.mock("../../../../api/services/pr-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        createCompletePRData: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/orchestration.service", () => ({
    orchestrationService: {
        updateExistingReview: jest.fn(),
        analyzePullRequest: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/comment.service", () => ({
    AIReviewCommentService: {
        postErrorComment: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/indexing.service", () => ({
    indexingService: {
        indexRepository: jest.fn(),
        indexChangedFiles: jest.fn()
    }
}));

jest.mock("../../../../api/config/logger.config", () => ({
    dataLogger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

describe("Internal Routes API Integration Tests", () => {
    let app: express.Application;

    let mockPRAnalysisService: any;
    let mockOrchestrationService: any;
    let mockIndexingService: any;
    let mockDataLogger: any;

    beforeAll(async () => {
        app = express();
        app.use(express.json());
        
        // Mount internal routes
        app.use(ENDPOINTS.INTERNAL.PREFIX, internalRoutes);
        app.use(errorHandler);

        const { PRAnalysisService } = await import("../../../../api/services/pr-review/pr-analysis.service");
        mockPRAnalysisService = PRAnalysisService;

        const { orchestrationService } = await import("../../../../api/services/pr-review/orchestration.service");
        mockOrchestrationService = orchestrationService;

        const { indexingService } = await import("../../../../api/services/pr-review/indexing.service");
        mockIndexingService = indexingService;

        mockDataLogger = dataLogger as jest.Mocked<typeof dataLogger>;
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe(`POST ${getEndpointWithPrefix(["INTERNAL", "JOBS", "PR_ANALYSIS"])}`, () => {
        const route = getEndpointWithPrefix(["INTERNAL", "JOBS", "PR_ANALYSIS"]);
        
        it("should successfully handle a new PR analysis job", async () => {
            const mockPRData = { id: 123, pendingCommentId: undefined };
            mockPRAnalysisService.createCompletePRData.mockResolvedValue(mockPRData);
            mockOrchestrationService.analyzePullRequest.mockResolvedValue(undefined);

            const payload = {
                payload: {
                    pull_request: { number: 1 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                },
                isActualFollowUp: false
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(response.body.message).toBe("PR Analysis job completed");
            expect(mockPRAnalysisService.createCompletePRData).toHaveBeenCalledWith(payload.payload);
            expect(mockOrchestrationService.analyzePullRequest).toHaveBeenCalledWith(mockPRData);
            expect(mockOrchestrationService.updateExistingReview).not.toHaveBeenCalled();
        });

        it("should successfully handle a follow-up PR analysis job", async () => {
            const mockPRData = { id: 123, pendingCommentId: 456 };
            mockPRAnalysisService.createCompletePRData.mockResolvedValue(mockPRData);
            mockOrchestrationService.updateExistingReview.mockResolvedValue(undefined);

            const payload = {
                payload: {
                    pull_request: { number: 1 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                },
                isActualFollowUp: true,
                pendingCommentId: 456
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(response.body.message).toBe("PR Analysis job completed");
            expect(mockPRAnalysisService.createCompletePRData).toHaveBeenCalledWith(payload.payload);
            expect(mockOrchestrationService.updateExistingReview).toHaveBeenCalledWith(mockPRData);
            expect(mockOrchestrationService.analyzePullRequest).not.toHaveBeenCalled();
        });

        it("should set pendingCommentId on prData from request body", async () => {
            const mockPRData = { id: 123, pendingCommentId: undefined };
            mockPRAnalysisService.createCompletePRData.mockResolvedValue(mockPRData);
            mockOrchestrationService.analyzePullRequest.mockResolvedValue(undefined);

            const payload = {
                payload: {
                    pull_request: { number: 1 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                },
                isActualFollowUp: false,
                pendingCommentId: 789
            };

            await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            // Verify pendingCommentId was assigned to prData before calling analyzePullRequest
            expect(mockOrchestrationService.analyzePullRequest).toHaveBeenCalledWith(
                expect.objectContaining({ pendingCommentId: 789 })
            );
        });

        it("should throw error when createCompletePRData fails", async () => {
            const mockError = new PRAnalysisError(1, "test/repo", "Some error", null, "PR_ANALYSIS_ERROR");
            mockPRAnalysisService.createCompletePRData.mockRejectedValue(mockError);

            const payload = {
                payload: {
                    pull_request: { number: 1 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                },
                isActualFollowUp: false
            };

            await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(mockOrchestrationService.analyzePullRequest).not.toHaveBeenCalled();
        });

        it("should pass unexpected errors to next()", async () => {
            const mockError = new Error("Unexpected error");
            mockPRAnalysisService.createCompletePRData.mockRejectedValue(mockError);

            const payload = {
                payload: {
                    pull_request: { number: 1 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.UNKNOWN); // Handled by errorHandler -> 500

            expect(response.body.message).toBe("Unexpected error");
        });

        it("should log receipt of PR analysis job", async () => {
            const mockPRData = { id: 123, pendingCommentId: undefined };
            mockPRAnalysisService.createCompletePRData.mockResolvedValue(mockPRData);
            mockOrchestrationService.analyzePullRequest.mockResolvedValue(undefined);

            const payload = {
                payload: {
                    pull_request: { number: 42 },
                    repository: { full_name: "test/repo" },
                    installation: { id: 1234 }
                },
                isActualFollowUp: false
            };

            await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(mockDataLogger.info).toHaveBeenCalledWith(
                "Received PR Analysis job from Cloud Tasks",
                { prNumber: 42 }
            );
        });

        it("should reject non-POST requests", async () => {
            await request(app).get(route).expect(404);
            await request(app).put(route).expect(404);
            await request(app).delete(route).expect(404);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["INTERNAL", "JOBS", "REPOSITORY_INDEXING"])}`, () => {
        const route = getEndpointWithPrefix(["INTERNAL", "JOBS", "REPOSITORY_INDEXING"]);
        
        it("should complete repository indexing successfully", async () => {
            mockIndexingService.indexRepository.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo"
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(response.body.message).toBe("Repository Indexing job completed");
            expect(mockIndexingService.indexRepository).toHaveBeenCalledWith("inst_123", "test/repo");
        });

        it("should log receipt of repository indexing job", async () => {
            mockIndexingService.indexRepository.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_456",
                repositoryName: "org/another-repo"
            };

            await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(mockDataLogger.info).toHaveBeenCalledWith(
                "Received Repository Indexing job from Cloud Tasks",
                { installationId: "inst_456", repositoryName: "org/another-repo" }
            );
        });

        it("should pass undefined body fields to indexRepository", async () => {
            mockIndexingService.indexRepository.mockResolvedValue(undefined);

            await request(app)
                .post(route)
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(mockIndexingService.indexRepository).toHaveBeenCalledWith(undefined, undefined);
        });

        it("should pass indexing errors to next()", async () => {
            const mockError = new Error("Indexing failed");
            mockIndexingService.indexRepository.mockRejectedValue(mockError);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo"
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.message).toBe("Indexing failed");
        });

        it("should reject non-POST requests", async () => {
            await request(app).get(route).expect(404);
            await request(app).put(route).expect(404);
            await request(app).delete(route).expect(404);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["INTERNAL", "JOBS", "INCREMENTAL_INDEXING"])}`, () => {
        const route = getEndpointWithPrefix(["INTERNAL", "JOBS", "INCREMENTAL_INDEXING"]);
        
        it("should complete incremental indexing successfully", async () => {
            mockIndexingService.indexChangedFiles.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo",
                filesToIndex: ["file1.ts", "file2.ts"],
                filesToRemove: ["oldFile.ts"]
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(response.body.message).toBe("Incremental Indexing job completed");
            expect(mockIndexingService.indexChangedFiles).toHaveBeenCalledWith(
                "inst_123",
                "test/repo",
                ["file1.ts", "file2.ts"],
                ["oldFile.ts"]
            );
        });

        it("should log receipt of incremental indexing job with file counts", async () => {
            mockIndexingService.indexChangedFiles.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo",
                filesToIndex: ["a.ts", "b.ts", "c.ts"],
                filesToRemove: ["d.ts"]
            };

            await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(mockDataLogger.info).toHaveBeenCalledWith(
                "Received Incremental Indexing job from Cloud Tasks",
                {
                    installationId: "inst_123",
                    repositoryName: "test/repo",
                    filesToIndex: 3,
                    filesToRemove: 1
                }
            );
        });

        it("should handle empty file arrays", async () => {
            mockIndexingService.indexChangedFiles.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo",
                filesToIndex: [],
                filesToRemove: []
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(mockIndexingService.indexChangedFiles).toHaveBeenCalledWith(
                "inst_123",
                "test/repo",
                [],
                []
            );
        });

        it("should handle undefined file arrays", async () => {
            mockIndexingService.indexChangedFiles.mockResolvedValue(undefined);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo"
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.success).toBe(true);
            expect(mockIndexingService.indexChangedFiles).toHaveBeenCalledWith(
                "inst_123",
                "test/repo",
                undefined,
                undefined
            );
        });

        it("should pass incremental indexing errors to next()", async () => {
            const mockError = new Error("Incremental indexing failed");
            mockIndexingService.indexChangedFiles.mockRejectedValue(mockError);

            const payload = {
                installationId: "inst_123",
                repositoryName: "test/repo"
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.message).toBe("Incremental indexing failed");
        });

        it("should reject non-POST requests", async () => {
            await request(app).get(route).expect(404);
            await request(app).put(route).expect(404);
            await request(app).delete(route).expect(404);
        });
    });
});
