import request from "supertest";
import express from "express";
import { internalRoutes } from "../../../../api/routes/internal.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { PRAnalysisError } from "../../../../api/models/error.model";
import { dataLogger } from "../../../../api/config/logger.config";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { DatabaseTestHelper } from "../../../../tests/helpers/database-test-helper";
import { TestDataFactory } from "../../../../tests/helpers/test-data-factory";

// Mock services
jest.mock("../../../../api/services/pr-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        createCompletePRData: jest.fn(),
        extractLinkedIssues: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/comment.service", () => ({
    AIReviewCommentService: {
        postErrorComment: jest.fn()
    }
}));

jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        updateTaskStatus: jest.fn().mockResolvedValue(true),
        updateAppActivity: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        approveCompletion: jest.fn()
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
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
    let mockContractService: any;
    let mockFirebaseService: any;
    let prisma: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();
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

        const { ContractService } = await import("../../../../api/services/contract.service");
        mockContractService = ContractService;

        const { FirebaseService } = await import("../../../../api/services/firebase.service");
        mockFirebaseService = FirebaseService;

        mockDataLogger = dataLogger as jest.Mocked<typeof dataLogger>;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
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

    describe(`POST ${getEndpointWithPrefix(["INTERNAL", "JOBS", "BOUNTY_PAYOUT"])}`, () => {
        const route = getEndpointWithPrefix(["INTERNAL", "JOBS", "BOUNTY_PAYOUT"]);
        const VALID_INSTALLATION_ID = "12345678";
        const VALID_REPO_NAME = "test/repo";

        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            // Create test user with wallet
            const contributor = TestDataFactory.user({ userId: "test-contributor", username: "test-contributor" });
            await prisma.user.create({
                data: {
                    ...contributor,
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });

            // Create test installation with wallet and escrow
            const installation = TestDataFactory.installation({ id: VALID_INSTALLATION_ID });
            await prisma.installation.create({
                data: {
                    ...installation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create test task
            testTask = TestDataFactory.task({
                status: "MARKED_AS_COMPLETED",
                bounty: 100,
                issue: {
                    number: 1,
                    title: "Test Issue",
                    url: "https://github.com/test/repo/issues/1"
                },
                contributorId: undefined,
                creatorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    creator: { connect: { userId: creator.userId } },
                    contributor: { connect: { userId: contributor.userId } },
                    installation: { connect: { id: VALID_INSTALLATION_ID } }
                }
            });

            mockContractService.approveCompletion.mockResolvedValue({
                success: true,
                txHash: "test-approve-completion-tx-hash",
                result: { createdAt: 1234567890 }
            });
        });

        it("should process bounty payout correctly", async () => {
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 1, title: "Test Issue" }
            ]);

            const payload = {
                pull_request: {
                    number: 1,
                    html_url: "https://github.com/test/repo/pull/1",
                    body: "Closes #1",
                    user: { login: "test-contributor" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR merged - Payment processed successfully",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    linkedIssues: [1]
                }
            });

            // Verify Contract service was called
            expect(mockContractService.approveCompletion).toHaveBeenCalledTimes(1);
            expect(mockFirebaseService.updateTaskStatus).toHaveBeenCalledTimes(1);
            expect(mockFirebaseService.updateAppActivity).toHaveBeenCalledTimes(2);

            // Verify task was updated
            const updatedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(updatedTask?.status).toBe("COMPLETED");
            expect(updatedTask?.settled).toBe(true);
            expect(updatedTask?.completedAt).toBeTruthy();

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: { taskId: testTask.id }
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.category).toBe("BOUNTY");
            expect(transaction?.amount).toBe(100);
        });

        it("should not crash if FirebaseService fails", async () => {
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 1, title: "Test Issue" }
            ]);

            mockFirebaseService.updateTaskStatus.mockRejectedValue(new Error("Firebase specific error"));

            const payload = {
                pull_request: {
                    number: 1,
                    html_url: "https://github.com/test/repo/pull/1",
                    body: "Closes #1",
                    user: { login: "test-contributor" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR merged - Payment processed successfully",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    linkedIssues: [1]
                }
            });

            // Verify Contract service was called completely unaffected
            expect(mockContractService.approveCompletion).toHaveBeenCalledTimes(1);
            expect(mockFirebaseService.updateTaskStatus).toHaveBeenCalledTimes(1);
        });

        it("should handle PR merge with no linked issues", async () => {
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([]);

            const payload = {
                pull_request: {
                    number: 1,
                    html_url: "https://github.com/test/repo/pull/1",
                    body: "No issues",
                    user: { login: "test-contributor" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No linked issues found - no payment triggered"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should handle PR merge with no matching task", async () => {
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 999, title: "Different Issue" }
            ]);

            const payload = {
                pull_request: {
                    number: 1,
                    html_url: "https://github.com/test/repo/pull/1",
                    body: "Closes #999",
                    user: { login: "test-contributor" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No matching active or submitted task found"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should handle contributor without wallet address", async () => {
            // Create user without wallet
            const userWithoutWallet = TestDataFactory.user({
                userId: "no-wallet-user",
                username: "no-wallet-user"
            });

            await prisma.user.create({
                data: {
                    ...userWithoutWallet,
                    contributionSummary: { create: {} }
                }
            });

            // Create task for this user
            const taskWithoutWallet = TestDataFactory.task({
                status: "MARKED_AS_COMPLETED",
                bounty: 50,
                issue: {
                    number: 2,
                    title: "Test Issue 2",
                    url: "https://github.com/test/repo/issues/2"
                },
                contributorId: undefined,
                creatorId: undefined,
                installationId: undefined
            });
            await prisma.task.create({
                data: {
                    ...taskWithoutWallet,
                    creator: { connect: { userId: "task-creator" } },
                    contributor: { connect: { userId: "no-wallet-user" } },
                    installation: { connect: { id: VALID_INSTALLATION_ID } }
                }
            });

            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 2, title: "Test Issue 2" }
            ]);

            const payload = {
                pull_request: {
                    number: 2,
                    html_url: "https://github.com/test/repo/pull/2",
                    body: "Closes #2",
                    user: { login: "no-wallet-user" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No wallet address found for contributor"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should pass unexpected errors to next()", async () => {
            const mockError = new Error("Database connection failed");
            mockPRAnalysisService.extractLinkedIssues.mockRejectedValue(mockError);

            const payload = {
                pull_request: {
                    number: 1,
                    html_url: "https://github.com/test/repo/pull/1",
                    body: "Closes #1",
                    user: { login: "test-contributor" }
                },
                repository: { full_name: VALID_REPO_NAME },
                installation: { id: parseInt(VALID_INSTALLATION_ID) }
            };

            const response = await request(app)
                .post(route)
                .send(payload)
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.message).toBe("Database connection failed");
            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should reject non-POST requests", async () => {
            await request(app).get(route).expect(404);
            await request(app).put(route).expect(404);
            await request(app).delete(route).expect(404);
        });
    });
});
