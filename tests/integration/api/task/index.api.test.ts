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
import { encrypt } from "../../../../api/utilities/helper";
import { dataLogger } from "../../../../api/config/logger.config";

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
        transferAssetViaSponsor: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
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
        customBountyMessage: jest.fn()
    }
}));

describe("Task API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;
    let mockFirebaseService: any;
    let mockOctokitService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with task routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.TASK.PREFIX, (req, res, next) => {
            req.body = {
                ...req.body,
                currentUser: {
                    uid: req.headers["x-test-user-id"] || "test-user-1",
                    admin: req.headers["x-test-admin"] === "true"
                },
                userId: req.headers["x-test-user-id"] || "test-user-1"
            };
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

        mockStellarService.transferAssetViaSponsor.mockResolvedValue({
            txHash: "test-refund-tx-hash"
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

            // Create test installation with encrypted secrets
            testInstallation = TestDataFactory.installation({
                id: "12345678",
                walletSecret: encrypt("SINSTALLTEST000000000000000000000000000000000"),
                escrowSecret: encrypt("SESCROWTEST0000000000000000000000000000000000")
            });
            await prisma.installation.create({
                data: testInstallation
            });
        });

        it("should create a new task successfully", async () => {
            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 6,
                    timelineType: "DAY",
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
                .expect(STATUS_CODES.POST);

            // Verify task was created in database
            const createdTask = await prisma.task.findUnique({
                where: { id: response.body.id }
            });
            expect(createdTask).toBeTruthy();

            // Verify Stellar service was called for transfer
            expect(mockStellarService.transferAsset).toHaveBeenCalledTimes(1);
            expect(mockOctokitService.addBountyLabelAndCreateBountyComment).toHaveBeenCalledTimes(1);
        });

        it("should convert timeline from days to weeks when > 6 days", async () => {
            const taskData = {
                payload: {
                    installationId: testInstallation.id,
                    bountyLabelId: "label-123",
                    bounty: "50",
                    timeline: 14,
                    timelineType: "DAY",
                    issue: TestDataFactory.githubIssue()
                }
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                timeline: 2,
                timelineType: "WEEK"
            });
        });

        it("should return error when installation not found", async () => {
            const taskData = {
                payload: {
                    installationId: "99999999",
                    bountyLabelId: "label-123",
                    bounty: "100",
                    timeline: 7,
                    timelineType: "DAY",
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
                    timelineType: "DAY",
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
                    timelineType: "DAY",
                    issue: TestDataFactory.githubIssue()
                }
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "CREATE"]))
                .set("x-test-user-id", "task-creator-user")
                .send(taskData)
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body).toMatchObject({
                task: expect.any(Object),
                error: expect.any(Object),
                message: expect.stringContaining("Failed to either create bounty comment")
            });
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
            let installation = TestDataFactory.installation({ id: "12345678" });
            installation = await prisma.installation.create({ data: installation });

            // Create multiple test tasks
            const tasks = [
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 100, status: "OPEN" }), 
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: installation.id } },
                    creator: { connect: { userId: "user-1" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 200, status: "OPEN" }), 
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: installation.id } },
                    creator: { connect: { userId: "user-1" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 150, status: "COMPLETED" }), 
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: installation.id } },
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

            expect(response.body).toMatchObject({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        status: "OPEN",
                        bounty: expect.any(Number)
                    })
                ]),
                pagination: expect.objectContaining({
                    currentPage: 1,
                    totalPages: expect.any(Number),
                    totalItems: 2,
                    itemsPerPage: 10
                })
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

            const installation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({ data: installation });

            testTask = TestDataFactory.task({
                creatorId: "user-1",
                installationId: installation.id,
                status: "OPEN"
            });
            const task = await prisma.task.create({ data: testTask });
            testTask = task;
        });

        it("should get task by ID successfully", async () => {
            const response = await request(app)
                .get(`/tasks/${testTask.id}`)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.id).toBe(testTask.id);
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
                id: "12345678",
                walletSecret: "encrypted-wallet-secret",
                escrowSecret: "encrypted-escrow-secret"
            });
            await prisma.installation.create({ data: testInstallation });

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

            expect(response.body).toMatchObject({
                message: "Task deleted successfully",
                refunded: "100 USDC"
            });

            // Verify task was deleted
            const deletedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(deletedTask).toBeNull();

            // Verify bounty was refunded
            expect(mockStellarService.transferAssetViaSponsor).toHaveBeenCalledTimes(1);
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

            expect(response.body).toMatchObject({
                error: expect.any(Object),
                data: expect.objectContaining({
                    message: "Task deleted successfully",
                    refunded: "100 USDC"
                }),
                message: expect.stringContaining("Failed to either remove bounty label")
            });

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
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use("/tasks", validateUser as RequestHandler, taskRoutes);
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
