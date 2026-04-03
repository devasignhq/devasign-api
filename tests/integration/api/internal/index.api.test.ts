import request from "supertest";
import express from "express";
import { internalRoutes } from "../../../../api/routes/internal.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { TestDataFactory } from "../../../helpers/test-data-factory";

// Mock services
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        extractLinkedIssues: jest.fn(),
        addBountyPaidLabel: jest.fn().mockResolvedValue(true)
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

jest.mock("../../../../api/services/socket.service", () => ({
    SocketService: {
        updateAppActivity: jest.fn().mockResolvedValue(true)
    }
}));

describe("Internal Routes API Integration Tests", () => {
    let app: express.Application;

    let mockOctokitService: any;
    let mockContractService: any;
    let mockFirebaseService: any;
    let mockSocketService: any;
    let prisma: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();
        app = express();
        app.use(express.json());
        
        // Mount internal routes
        app.use(ENDPOINTS.INTERNAL.PREFIX, internalRoutes);
        app.use(errorHandler);

        const { OctokitService } = await import("../../../../api/services/octokit.service");
        mockOctokitService = OctokitService;

        const { ContractService } = await import("../../../../api/services/contract.service");
        mockContractService = ContractService;

        const { FirebaseService } = await import("../../../../api/services/firebase.service");
        mockFirebaseService = FirebaseService;

        const { SocketService } = await import("../../../../api/services/socket.service");
        mockSocketService = SocketService;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`POST ${getEndpointWithPrefix(["INTERNAL", "BOUNTY_PAYOUT"])}`, () => {
        const route = getEndpointWithPrefix(["INTERNAL", "BOUNTY_PAYOUT"]);
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
            mockOctokitService.extractLinkedIssues.mockResolvedValue([
                { number: 1, title: "Test Issue" }
            ]);

            const payload = {
                taskId: testTask.id,
                linkedIssues: [{ number: 1, title: "Test Issue" }],
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
            expect(mockSocketService.updateAppActivity).toHaveBeenCalledTimes(2);

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
            mockOctokitService.extractLinkedIssues.mockResolvedValue([
                { number: 1, title: "Test Issue" }
            ]);

            mockFirebaseService.updateTaskStatus.mockRejectedValue(new Error("Firebase specific error"));

            const payload = {
                taskId: testTask.id,
                linkedIssues: [{ number: 1, title: "Test Issue" }],
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

        it("should handle PR merge with missing task ID", async () => {
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
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "Task ID is missing from payload"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should handle PR merge with no matching task in DB", async () => {
            const payload = {
                taskId: "non-existent-task-id",
                linkedIssues: [{ number: 999, title: "Different Issue" }],
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
                message: "Task not found"
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

            mockOctokitService.extractLinkedIssues.mockResolvedValue([
                { number: 2, title: "Test Issue 2" }
            ]);

            const taskWithoutWallet = await prisma.task.create({
                data: {
                    ...TestDataFactory.task({
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
                    }),
                    creator: { connect: { userId: "task-creator" } },
                    contributor: { connect: { userId: "no-wallet-user" } },
                    installation: { connect: { id: VALID_INSTALLATION_ID } }
                }
            });

            const payload = {
                taskId: taskWithoutWallet.id,
                linkedIssues: [{ number: 2, title: "Test Issue 2" }],
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
            mockContractService.approveCompletion.mockRejectedValue(mockError);

            const payload = {
                taskId: testTask.id,
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
            expect(mockSocketService.updateAppActivity).not.toHaveBeenCalled();
            expect(mockFirebaseService.updateTaskStatus).not.toHaveBeenCalled();
        });

        it("should reject non-POST requests", async () => {
            await request(app).get(route).expect(404);
            await request(app).put(route).expect(404);
            await request(app).delete(route).expect(404);
        });
    });
});
