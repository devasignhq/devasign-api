import request from "supertest";
import express from "express";
import cuid from "cuid";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { taskRoutes } from "../../../../api/routes/task.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

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

describe("Task Contributor API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with task routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.TASK.PREFIX, (req, _res, next) => {
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
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        mockFirebaseAuth.mockResolvedValue({
            uid: "test-user-1",
            admin: false
        });

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])} - Get Contributor Tasks`, () => {
        let testContributor: any;
        let testInstallation: any;

        beforeEach(async () => {
            // Create test contributor
            testContributor = TestDataFactory.user({ userId: "contributor-user" });
            testContributor = await prisma.user.create({
                data: { ...testContributor, contributionSummary: { create: {} } }
            });

            // Create test creator
            const creator = TestDataFactory.user({ userId: "creator-user" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            // Create test installation
            testInstallation = TestDataFactory.installation({ id: "12345678" });
            testInstallation = await prisma.installation.create({ data: testInstallation });

            // Create multiple test tasks assigned to contributor
            const tasks = [
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 100, status: "IN_PROGRESS" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "creator-user" } },
                    contributor: { connect: { userId: "contributor-user" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 200, status: "MARKED_AS_COMPLETED" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "creator-user" } },
                    contributor: { connect: { userId: "contributor-user" } }
                },
                {
                    ...TestDataFactory.filterData(
                        TestDataFactory.task({ bounty: 150, status: "COMPLETED" }),
                        ["creatorId", "installationId", "contributorId", "acceptedAt", "completedAt"]
                    ),
                    installation: { connect: { id: testInstallation.id } },
                    creator: { connect: { userId: "creator-user" } },
                    contributor: { connect: { userId: "contributor-user" } }
                }
            ];

            for (const task of tasks) {
                await prisma.task.create({ data: task });
            }
        });

        it("should get all tasks for contributor with pagination", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])}?page=1&limit=10`)
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                pagination: expect.objectContaining({
                    currentPage: 1,
                    totalPages: expect.any(Number),
                    totalItems: 3,
                    itemsPerPage: 10
                })
            });

            expect(response.body.data.length).toBe(3);
        });

        it("should filter tasks by status", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])}?status=IN_PROGRESS`)
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0]).toMatchObject({
                status: "IN_PROGRESS"
            });
        });

        it("should filter tasks by installation ID", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])}?installationId=${testInstallation.id}`)
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toEqual(expect.any(Array));
            const validResult = (response.body.data as any[]).every(
                task => task.contributorId === "contributor-user"
            );
            expect(validResult).toBe(true);
        });

        it("should return detailed view when requested", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])}?detailed=true`)
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data[0]).toMatchObject({
                installation: expect.objectContaining({
                    account: expect.any(Object)
                }),
                creator: expect.objectContaining({
                    userId: "creator-user"
                }),
                contributor: expect.objectContaining({
                    userId: "contributor-user"
                })
            });
        });

        it("should return empty array when contributor has no tasks", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: { ...otherUser, contributionSummary: { create: {} } }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"]))
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(0);
        });

        it("should sort tasks by creation date", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASKS"])}?sort=asc`)
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            const dates = response.body.data.map((task: any) => new Date(task.createdAt).getTime());
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASK"])} - Get Contributor Task`, () => {
        let testContributor: any;
        let testTask: any;

        beforeEach(async () => {
            // Create test contributor
            testContributor = TestDataFactory.user({ userId: "contributor-user" });
            await prisma.user.create({
                data: { ...testContributor, contributionSummary: { create: {} } }
            });

            // Create test creator
            const creator = TestDataFactory.user({ userId: "creator-user" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            // Create test installation
            const installation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({ data: installation });

            // Create test task assigned to contributor
            testTask = TestDataFactory.task({
                creatorId: "creator-user",
                installationId: "12345678",
                contributorId: "contributor-user",
                status: "IN_PROGRESS"
            });
            testTask = await prisma.task.create({ data: testTask });
        });

        it("should get specific task for contributor", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASK"]).replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                id: testTask.id,
                installation: expect.objectContaining({
                    id: "12345678"
                }),
                creator: expect.objectContaining({
                    userId: "creator-user"
                }),
                contributor: expect.objectContaining({
                    userId: "contributor-user"
                })
            });
        });

        it("should return 404 when task not found", async () => {
            await request(app)
                .get(getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASK"]).replace(":taskId", cuid()))
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when task is not assigned to contributor", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: { ...otherUser, contributionSummary: { create: {} } }
            });

            await request(app)
                .get(getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASK"]).replace(":taskId", testTask.id))
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return task with all required fields", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "CONTRIBUTOR", "GET_TASK"]).replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                id: expect.any(String),
                issue: expect.any(Object),
                bounty: expect.any(Number),
                timeline: expect.any(Number),
                timelineType: expect.any(String),
                status: expect.any(String),
                settled: expect.any(Boolean),
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            });
        });
    });
});
