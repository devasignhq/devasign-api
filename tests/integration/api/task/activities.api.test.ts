import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { taskRoutes } from "../../../../api/routes/task.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { createId } from "@paralleldrive/cuid2";;

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

// Mock Firebase service for task messaging
jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        createTask: jest.fn(),
        updateTaskStatus: jest.fn()
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
    }
}));

describe("Task Activities API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;

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

    describe(`GET ${getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])} - Get Task Activities`, () => {
        let testTask: any;
        let testInstallation: any;
        let testUser: any;

        beforeEach(async () => {
            // Create test user
            testUser = TestDataFactory.user({ userId: "installation-user" });
            await prisma.user.create({
                data: { ...testUser, contributionSummary: { create: {} } }
            });

            // Create applicants
            const applicant1 = TestDataFactory.user({ userId: "applicant-1" });
            await prisma.user.create({
                data: { ...applicant1, contributionSummary: { create: {} } }
            });

            const applicant2 = TestDataFactory.user({ userId: "applicant-2" });
            await prisma.user.create({
                data: { ...applicant2, contributionSummary: { create: {} } }
            });

            // Create test installation
            testInstallation = TestDataFactory.installation({ id: "12345678" });
            testInstallation = await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Link user to installation
            await prisma.installation.update({
                where: { id: testInstallation.id },
                data: {
                    users: {
                        connect: { userId: "installation-user" }
                    }
                }
            });

            // Create test task
            testTask = TestDataFactory.task({
                creatorId: "installation-user",
                installationId: testInstallation.id,
                status: "OPEN"
            });
            testTask = await prisma.task.create({ data: testTask });

            // Create task activities (applications)
            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant-1",
                    viewed: false
                }
            });

            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant-2",
                    viewed: true
                }
            });
        });

        it("should get all activities for task with pagination", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])
                    .replace(":taskId", testTask.id)}?page=1&limit=10`)
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                data: expect.any(Array),
                pagination: {
                    hasMore: false
                }
            });

            expect(response.body.data.length).toBe(2);
        });

        it("should return activities with user information", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data[0]).toMatchObject({
                id: expect.any(String),
                taskId: testTask.id,
                userId: expect.any(String),
                viewed: expect.any(Boolean),
                user: expect.objectContaining({
                    userId: expect.any(String),
                    username: expect.any(String),
                    contributionSummary: expect.any(Object)
                }),
                createdAt: expect.any(String),
                updatedAt: expect.any(String)
            });
        });

        it("should sort activities by creation date", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])
                    .replace(":taskId", testTask.id)}?sort=asc`)
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            const dates = response.body.data.map((activity: any) => new Date(activity.createdAt).getTime());
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
        });

        it("should return empty array when user has no access to installation", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: { ...otherUser, contributionSummary: { create: {} } }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(0);
        });

        it("should include task submission information when available", async () => {
            // Create a task submission
            const submission = await prisma.taskSubmission.create({
                data: {
                    userId: "applicant-1",
                    taskId: testTask.id,
                    installationId: testInstallation.id,
                    pullRequest: "https://github.com/owner/repo/pull/123"
                }
            });

            // Create activity with submission
            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant-1",
                    taskSubmissionId: submission.id
                }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["TASK", "ACTIVITIES", "GET_ALL"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            const submissionActivity = response.body.data.find(
                (activity: any) => activity.taskSubmissionId === submission.id
            );

            expect(submissionActivity).toBeTruthy();
            expect(submissionActivity.taskSubmission).toMatchObject({
                pullRequest: "https://github.com/owner/repo/pull/123"
            });
        });
    });

    describe(`PATCH ${getEndpointWithPrefix(["TASK", "ACTIVITIES", "MARK_VIEWED"])} - Mark Activity as Viewed`, () => {
        let testTask: any;
        let testActivity: any;
        let testInstallation: any;
        let testUser: any;

        beforeEach(async () => {
            // Create test user
            testUser = TestDataFactory.user({ userId: "installation-user" });
            await prisma.user.create({
                data: { ...testUser, contributionSummary: { create: {} } }
            });

            // Create applicant
            const applicant = TestDataFactory.user({ userId: "applicant" });
            await prisma.user.create({
                data: { ...applicant, contributionSummary: { create: {} } }
            });

            // Create test installation
            testInstallation = TestDataFactory.installation({ id: "12345678" });
            testInstallation = await prisma.installation.create({
                data: {
                    ...testInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Link user to installation
            await prisma.installation.update({
                where: { id: testInstallation.id },
                data: {
                    users: {
                        connect: { userId: "installation-user" }
                    }
                }
            });

            // Create test task
            testTask = TestDataFactory.task({
                creatorId: "installation-user",
                installationId: testInstallation.id,
                status: "OPEN"
            });
            testTask = await prisma.task.create({ data: testTask });

            // Create task activity
            testActivity = await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant",
                    viewed: false
                }
            });
        });

        it("should mark activity as viewed successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "ACTIVITIES", "MARK_VIEWED"])
                    .replace(":taskActivityId", testActivity.id))
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                id: testActivity.id,
                viewed: true,
                updatedAt: expect.any(String)
            });
            expect(response.body.message).toBe("Activity marked as viewed");

            // Verify activity was updated in database
            const updatedActivity = await prisma.taskActivity.findUnique({
                where: { id: testActivity.id }
            });
            expect(updatedActivity?.viewed).toBe(true);
        });

        it("should return 404 when activity not found", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "ACTIVITIES", "MARK_VIEWED"])
                    .replace(":taskActivityId", createId()))
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when user has no access to installation", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: { ...otherUser, contributionSummary: { create: {} } }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "ACTIVITIES", "MARK_VIEWED"])
                    .replace(":taskActivityId", testActivity.id))
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should handle already viewed activity", async () => {
            // Mark as viewed first
            await prisma.taskActivity.update({
                where: { id: testActivity.id },
                data: { viewed: true }
            });

            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "ACTIVITIES", "MARK_VIEWED"])
                    .replace(":taskActivityId", testActivity.id))
                .set("x-test-user-id", "installation-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.viewed).toBe(true);
        });
    });
});
