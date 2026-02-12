import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { taskRoutes } from "../../../../api/routes/task.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { validateUser } from "../../../../api/middlewares/auth.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { dataLogger } from "../../../../api/config/logger.config";
import { apiLimiter } from "../../../../api/middlewares/rate-limit.middleware";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock Stellar service for wallet operations
jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: jest.fn(),
        transferAsset: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

// Mock Contract service for smart contract operations
jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        createEscrow: jest.fn(),
        refund: jest.fn()
    }
}));

// Mock Firebase service for task messaging
jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        createTask: jest.fn(),
        updateTaskStatus: jest.fn()
    }
}));

// Mock Octokit service for GitHub operations
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        addBountyLabelAndCreateBountyComment: jest.fn(),
        removeBountyLabelAndDeleteBountyComment: jest.fn(),
        customBountyMessage: jest.fn(),
        getOwnerAndRepo: jest.fn()
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
    }
}));

describe("Task API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;
    let mockFirebaseService: any;
    let mockOctokitService: any;
    let mockContractService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with task routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.TASK.PREFIX, (req, res, next) => {
            res.locals.user = {
                uid: req.headers["x-test-user-id"] || "test-user-1",
                admin: req.headers["x-test-admin"] === "true"
            };
            res.locals.userId = req.headers["x-test-user-id"] || "test-user-1";
            next();
        });

        app.use(ENDPOINTS.TASK.PREFIX, taskRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = await import("../../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;

        const { stellarService } = await import("../../../../api/services/stellar.service");
        mockStellarService = stellarService;

        const { FirebaseService } = await import("../../../../api/services/firebase.service");
        mockFirebaseService = FirebaseService;

        const { OctokitService } = await import("../../../../api/services/octokit.service");
        mockOctokitService = OctokitService;

        const { ContractService } = await import("../../../../api/services/contract.service");
        mockContractService = ContractService;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: "test-user-1",
            admin: false
        });

        mockStellarService.getAccountInfo.mockResolvedValue({
            balances: [
                {
                    asset_code: "USDC",
                    balance: "1000.0000000"
                }
            ]
        });

        mockStellarService.transferAsset.mockResolvedValue({
            txHash: "test-tx-hash-123"
        });

        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);

        mockFirebaseService.createTask.mockResolvedValue({
            id: "firebase_task_123",
            creatorId: "test-user-1",
            contributorId: null
        });

        mockFirebaseService.updateTaskStatus.mockResolvedValue(true);

        mockOctokitService.addBountyLabelAndCreateBountyComment.mockResolvedValue({
            id: 123456789
        });
        mockOctokitService.customBountyMessage.mockReturnValue("Bounty message");
        mockOctokitService.removeBountyLabelAndDeleteBountyComment.mockResolvedValue(true);
        mockOctokitService.getOwnerAndRepo.mockReturnValue(["test-owner", "test-repo"]);

        mockContractService.createEscrow.mockResolvedValue({
            success: true,
            txHash: "test-contract-tx-hash",
            approvalTxHash: "test-approval-tx-hash",
            result: { createdAt: 1234567890 }
        });

        mockContractService.refund.mockResolvedValue({
            success: true,
            txHash: "test-refund-tx-hash",
            result: { createdAt: 1234567890 }
        });

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "CREATE"])} - Create Task`, () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            // Create test user
            testUser = TestDataFactory.user({ userId: "task-creator-user" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            // Create test installation
            testInstallation = TestDataFactory.installation({
                id: "12345678"
            });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should create a new task successfully", async () => {
            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 6,
                    issue: TestDataFactory.githubIssue({
                        id: "12345",
                        bountyCommentId: "123456789"
                    })
                }
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.CREATED);

            // Verify task was created in database
            const createdTask = await prisma.task.findUnique({
                where: { id: response.body.data.id }
            });
            expect(createdTask).toBeTruthy();

            // Verify Contract service was called for escrow creation
            expect(mockContractService.createEscrow).toHaveBeenCalledTimes(1);
            expect(mockOctokitService.addBountyLabelAndCreateBountyComment).toHaveBeenCalledTimes(1);
        });



        it("should return error when installation not found", async () => {
            const taskData = {
                payload: {
                    installationId: "99999999",
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 7,
                    issue: TestDataFactory.githubIssue()
                }
            };

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when insufficient balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "50.0000000"
                    }
                ]
            });

            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 7,
                    issue: TestDataFactory.githubIssue()
                }
            };

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle partial success when bounty comment creation fails", async () => {
            mockOctokitService.addBountyLabelAndCreateBountyComment.mockRejectedValue(
                new Error("GitHub API error")
            );

            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 7,
                    issue: TestDataFactory.githubIssue()
                }
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body.data).toMatchObject({
                id: expect.any(String),
                bounty: 100
            });
            expect(response.body.warning).toContain("Failed to either post bounty comment or add bounty label");
        });

        it("should return error when creating task for archived installation", async () => {
            await prisma.installation.update({
                where: { id: testInstallation.id },
                data: { status: "ARCHIVED" }
            });

            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 7,
                    issue: TestDataFactory.githubIssue()
                }
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Cannot create task for an archived installation");
        });
    });

    describe(`GET ${getEndpointWithPrefix(["TASK", "GET_ALL"])} - Get Tasks`, () => {
        beforeEach(async () => {
            // Create test users
            const user1 = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user1, contributionSummary: { create: {} } }
            });

            // Create test installation
            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create multiple test tasks
            const tasks = [
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 100, status: "OPEN" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "user-1" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 200, status: "OPEN" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "user-1" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 150, status: "COMPLETED" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "user-1" } }
                }
            ];

            for (const task of tasks) {
                await prisma.task.create({ data: task });
            }
        });

        it("should get all open tasks with pagination", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "GET_ALL"])}?page=1&limit=10`)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject(
                expect.arrayContaining([
                    expect.objectContaining({
                        status: "OPEN",
                        bounty: expect.any(Number)
                    })
                ])
            );
            expect(response.body.pagination).toMatchObject({
                hasMore: false
            });

            expect(response.body.data.length).toBe(2);
        });

        it("should filter tasks by installation ID", async () => {
            const installation = await prisma.installation.findFirst();

            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "GET_ALL"])}?installationId=${installation.id}`)
                .expect(STATUS_CODES.SUCCESS);

            dataLogger.info("should filter tasks by installation ID", response.body.data);
            const validResult = (response.body.data as any[]).every(
                task => task.installationId === installation.id
            );
            expect(validResult).toBe(true);
        });

        it("should return detailed view when requested", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "GET_ALL"])}?detailed=true`)
                .expect(STATUS_CODES.SUCCESS);

            dataLogger.info("should return detailed view when requested", response.body.data);
            const validResult = (response.body.data as any[]).every(
                task => task.creator.userId === "user-1"
            );
            expect(validResult).toBe(true);
        });

        it("should sort tasks by creation date", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "GET_ALL"])}?sort=asc`)
                .expect(STATUS_CODES.SUCCESS);

            const dates = response.body.data.map((task: any) => new Date(task.createdAt).getTime());
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["TASK", "GET_BY_ID"])} - Get Task`, () => {
        let testTask: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                creatorId: "user-1",
                installationId: testInstallation.id,
                status: "OPEN"
            });
            const task = await prisma.task.create({ data: testTask });
            testTask = task;
        });

        it("should get task by ID successfully", async () => {
            const response = await request(app)
                .get(`/tasks/${testTask.id}`)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.id).toBe(testTask.id);
        });

        it("should return 404 when task not found", async () => {
            await request(app)
                .get("/tasks/non-existent-task-id-0000")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when task is not open", async () => {
            const closedTask = TestDataFactory.task({
                creatorId: "user-1",
                installationId: (await prisma.installation.findFirst()).id,
                status: "COMPLETED"
            });
            const created = await prisma.task.create({ data: closedTask });

            await request(app)
                .get(`/tasks/${created.id}`)
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`DELETE ${getEndpointWithPrefix(["TASK", "DELETE"])} - Delete Task`, () => {
        let testTask: any;
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "task-owner" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({
                id: "12345678"
            });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                creatorId: "task-owner",
                installationId: testInstallation.id,
                status: "OPEN",
                bounty: 100
            });
            testTask = await prisma.task.create({ data: testTask });
        });

        it("should delete task successfully and refund bounty", async () => {
            const response = await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                refunded: "100 USDC"
            });
            expect(response.body.message).toBe("Task deleted successfully");

            // Verify task was deleted
            const deletedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(deletedTask).toBeNull();

            // Verify bounty was refunded via contract
            expect(mockContractService.refund).toHaveBeenCalledTimes(1);
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "different-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task is not open", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "COMPLETED" }
            });

            await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when task has assigned contributor", async () => {
            let contributor = TestDataFactory.user({ userId: "task-contributor" });
            contributor = await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            await prisma.task.update({
                where: { id: testTask.id },
                data: { contributor: { connect: { userId: contributor.userId } } }
            });

            await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle partial success when GitHub operations fail", async () => {
            mockOctokitService.removeBountyLabelAndDeleteBountyComment.mockRejectedValue(
                new Error("GitHub API error")
            );

            const response = await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body.data).toMatchObject({
                refunded: "100 USDC"
            });
            expect(response.body.warning).toContain("Failed to either remove bounty label");
            expect(response.body.message).toBe("Task deleted successfully");

            // Verify task was still deleted
            const deletedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(deletedTask).toBeNull();
        });

        it("should return 404 when task does not exist", async () => {
            await request(app)
                .delete("/tasks/non-existent-task-id-0000")
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when deleting task for archived installation", async () => {
            await prisma.installation.update({
                where: { id: testInstallation.id },
                data: { status: "ARCHIVED" }
            });

            const response = await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set("x-test-user-id", "task-owner")
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Cannot delete task for an archived installation");
        });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(ENDPOINTS.TASK.PREFIX, validateUser as RequestHandler, taskRoutes);
            appWithoutAuth.use(apiLimiter);
            appWithoutAuth.use(errorHandler);

            await request(appWithoutAuth)
                .get(getEndpointWithPrefix(["TASK", "GET_ALL"]))
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get("/tasks/task-id")
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .send({ payload: {} })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .delete("/tasks/task-id")
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });
});
