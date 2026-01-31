import request from "supertest";
import express from "express";
import cuid from "cuid";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { taskRoutes } from "../../../../api/routes/task.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { generateRandomString, getEndpointWithPrefix } from "../../../helpers/test-utils";


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
        transferAsset: jest.fn()
    }
}));

// Mock Contract service
jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        increaseBounty: jest.fn(),
        decreaseBounty: jest.fn(),
        assignContributor: jest.fn(),
        approveCompletion: jest.fn()
    }
}));

// Mock Firebase service for task messaging
jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        createMessage: jest.fn(),
        createTask: jest.fn(),
        updateTaskStatus: jest.fn(),
        updateActivity: jest.fn()
    }
}));

// Mock Octokit service for GitHub operations
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        updateIssueComment: jest.fn(),
        customBountyMessage: jest.fn(),
        getOwnerAndRepo: jest.fn(),
        addBountyLabelAndCreateBountyComment: jest.fn(),
        addBountyPaidLabel: jest.fn(),
        getUserTopLanguages: jest.fn()
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        encryptWallet: jest.fn().mockResolvedValue({
            encryptedDEK: "mockEncryptedDEK",
            encryptedSecret: "mockEncryptedSecret",
            iv: "mockIV",
            authTag: "mockAuthTag"
        }),
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
    }
}));

describe("Task {taskId} API Integration Tests", () => {
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

        mockFirebaseService.createMessage.mockResolvedValue({
            id: "firebase_message_123",
            userId: "test-user-1",
            taskId: "test-task-id",
            body: "Test message"
        });

        mockFirebaseService.createTask.mockResolvedValue({
            id: "firebase_task_123",
            creatorId: "test-user-1",
            contributorId: null
        });

        mockFirebaseService.updateTaskStatus.mockResolvedValue(true);
        mockFirebaseService.updateActivity.mockResolvedValue(true);

        mockOctokitService.updateIssueComment.mockResolvedValue(true);
        mockOctokitService.customBountyMessage.mockReturnValue("Updated bounty message");
        mockOctokitService.getOwnerAndRepo.mockReturnValue(["test-owner", "test-repo"]);
        mockOctokitService.addBountyLabelAndCreateBountyComment.mockResolvedValue({ id: "bounty-comment-id" });
        mockOctokitService.addBountyPaidLabel.mockResolvedValue(true);

        mockContractService.increaseBounty.mockResolvedValue({
            success: true,
            txHash: "test-increase-bounty-tx-hash",
            approvalTxHash: "test-approval-tx-hash",
            result: { createdAt: 1234567890 }
        });

        mockContractService.decreaseBounty.mockResolvedValue({
            success: true,
            txHash: "test-decrease-bounty-tx-hash",
            approvalTxHash: "test-approval-tx-hash",
            result: { createdAt: 1234567890 }
        });

        mockContractService.assignContributor.mockResolvedValue({
            success: true,
            txHash: "test-assign-contributor-tx-hash",
            result: { createdAt: 1234567890 }
        });

        mockContractService.approveCompletion.mockResolvedValue({
            success: true,
            txHash: "test-approve-completion-tx-hash",
            result: { createdAt: 1234567890 }
        });

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`PATCH ${getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])} - Add Bounty Comment ID`, () => {
        let testTask: any;
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...testUser, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                creatorId: "task-creator",
                installationId: "12345678",
                status: "OPEN"
            });
            testTask = await prisma.task.create({ data: testTask });
        });

        it("should add bounty comment ID to task successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({
                    installationId: "12345678",
                    issueId: "issue-123",
                    bountyLabelId: "label-123"
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                id: testTask.id
            });

            // Verify bounty comment ID was added
            const updatedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect((updatedTask.issue as any).bountyCommentId).toBe("bounty-comment-id");
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({
                    installationId: "12345678",
                    issueId: "issue-123",
                    bountyLabelId: "label-123"
                })
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task is not open", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "COMPLETED" }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({
                    installationId: "12345678",
                    issueId: "issue-123",
                    bountyLabelId: "label-123"
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return 404 when task not found", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])
                    .replace(":taskId", cuid()))
                .set("x-test-user-id", "task-creator")
                .send({
                    installationId: "12345678",
                    issueId: "issue-123",
                    bountyLabelId: "label-123"
                })
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when installation is archived", async () => {
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "ADD_BOUNTY_COMMENT"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({
                    installationId: "12345678",
                    issueId: "issue-123",
                    bountyLabelId: "label-123"
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`PATCH ${getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])} - Update Task Bounty`, () => {
        let testTask: any;
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "OPEN",
                bounty: 100,
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    }
                }
            });
        });

        it("should increase task bounty successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "150" })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                bounty: 150,
                updatedAt: expect.any(String)
            });

            // Verify Contract service was called for additional funds
            expect(mockContractService.increaseBounty).toHaveBeenCalledTimes(1);
        });

        it("should decrease task bounty successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "50" })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                bounty: 50,
                updatedAt: expect.any(String)
            });

            // Verify Contract service was called for refund
            expect(mockContractService.decreaseBounty).toHaveBeenCalledTimes(1);
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({ newBounty: "150" })
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task has applications", async () => {
            const applicant = TestDataFactory.user({ userId: "applicant" });
            await prisma.user.create({
                data: { ...applicant, contributionSummary: { create: {} } }
            });

            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant"
                }
            });

            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "150" })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toContain("Cannot update the bounty");
        });

        it("should return error when new bounty is same as current", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "100" })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("New bounty is the same as current bounty");
        });

        it("should return error when insufficient balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "10.0000000"
                    }
                ]
            });

            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "200" })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toContain("Insufficient USDC balance");
        });

        it("should handle partial success when GitHub update fails", async () => {
            mockOctokitService.updateIssueComment.mockRejectedValue(
                new Error("GitHub API error")
            );

            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "150" })
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body.data).toMatchObject({
                bountyCommentPosted: false,
                task: expect.objectContaining({
                    bounty: 150,
                    updatedAt: expect.any(String)
                })
            });
            expect(response.body.warning).toContain("Failed to update bounty amount on GitHub");
        });

        it("should return error when installation is archived", async () => {
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_BOUNTY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newBounty: "150" })
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`PATCH ${getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_TIMELINE"])} - Update Task Timeline`, () => {
        let testTask: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "OPEN",
                timeline: 1,
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    }
                }
            });
        });

        it("should update task timeline successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_TIMELINE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newTimeline: 2 })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                timeline: 2,
                updatedAt: expect.any(String)
            });
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_TIMELINE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({ newTimeline: 2 })
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task has applications", async () => {
            const applicant = TestDataFactory.user({ userId: "applicant" });
            await prisma.user.create({
                data: { ...applicant, contributionSummary: { create: {} } }
            });

            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant"
                }
            });

            const response = await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_TIMELINE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newTimeline: 2 })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toContain("Cannot update the timeline");
        });

        it("should return error when installation is archived", async () => {
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["TASK", "{TASKID}", "UPDATE_TIMELINE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({ newTimeline: 2 })
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])} - Submit Task Application`, () => {
        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const applicant = TestDataFactory.user({ userId: "applicant" });
            await prisma.user.create({
                data: { ...applicant, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "OPEN",
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    }
                }
            });
        });

        it("should submit task application successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Task application submitted"
            });

            // Verify application was created
            const application = await prisma.taskActivity.findFirst({
                where: {
                    taskId: testTask.id,
                    userId: "applicant"
                }
            });
            expect(application).toBeTruthy();
        });

        it("should return error when user already applied", async () => {
            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: "applicant"
                }
            });

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toContain("You have already applied");
        });

        it("should return error when task is not open", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "COMPLETED" }
            });

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Task is not open");
        });

        it("should return 404 when task not found", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", cuid()))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when installation is archived", async () => {
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should fetch user tech stack when user has empty tech stack", async () => {
            // Mock getUserTopLanguages to return tech stack
            mockOctokitService.getUserTopLanguages.mockResolvedValue(["JavaScript", "TypeScript", "Python"]);

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "applicant")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Task application submitted"
            });

            // Verify getUserTopLanguages was called
            expect(mockOctokitService.getUserTopLanguages).toHaveBeenCalledTimes(1);
            expect(mockOctokitService.getUserTopLanguages).toHaveBeenCalledWith(expect.any(String));
        });

        it("should not fetch tech stack when user already has tech stack", async () => {
            // Create user with existing tech stack
            const userWithTechStack = TestDataFactory.user({
                userId: "user-with-tech",
                techStack: ["JavaScript", "TypeScript"]
            });
            await prisma.user.create({
                data: { ...userWithTechStack, contributionSummary: { create: {} } }
            });

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "APPLY"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "user-with-tech")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Task application submitted"
            });

            // Verify getUserTopLanguages was not called
            expect(mockOctokitService.getUserTopLanguages).not.toHaveBeenCalled();
        });
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])} - Accept Task Application`, () => {
        let testTask: any;
        const contributorId = generateRandomString(28);

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const contributor = TestDataFactory.user({ userId: contributorId });
            await prisma.user.create({
                data: {
                    ...contributor,
                    contributionSummary: { create: {} },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "OPEN",
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    }
                }
            });

            // Create application
            await prisma.taskActivity.create({
                data: {
                    taskId: testTask.id,
                    userId: contributorId
                }
            });
        });

        it("should accept task application successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", contributorId))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                id: testTask.id,
                status: "IN_PROGRESS",
                contributor: {
                    userId: contributorId
                },
                acceptedAt: expect.any(String)
            });

            // Verify Firebase service was called
            expect(mockFirebaseService.createTask).toHaveBeenCalledWith(
                testTask.id,
                "task-creator",
                contributorId
            );
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", contributorId))
                .set("x-test-user-id", "different-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when contributor did not apply", async () => {
            const nonApplicantId = cuid();
            const nonApplicant = TestDataFactory.user({ userId: nonApplicantId });
            await prisma.user.create({
                data: { ...nonApplicant, contributionSummary: { create: {} } }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", nonApplicantId))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when task already has contributor", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: {
                    contributorId,
                    status: "IN_PROGRESS"
                }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", contributorId))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle partial success when Firebase fails", async () => {
            mockFirebaseService.createTask.mockRejectedValue(
                new Error("Firebase error")
            );

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", contributorId))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body.data).toMatchObject({
                id: testTask.id,
                status: "IN_PROGRESS"
            });
            expect(response.body.warning).toContain("Failed to enable chat functionality");
        });

        it("should return error when installation is archived", async () => {
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "ACCEPT_APPLICATION"])
                    .replace(":taskId", testTask.id)
                    .replace(":contributorId", contributorId))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "REQUEST_TIMELINE_EXTENSION"])} - Request Timeline Extension`, () => {
        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const contributor = TestDataFactory.user({ userId: "contributor" });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "IN_PROGRESS",
                timeline: 1,
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    },
                    contributor: {
                        connect: { userId: "contributor" }
                    }
                }
            });
        });

        it("should request timeline extension successfully", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REQUEST_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor")
                .send({
                    githubUsername: "contributor",
                    requestedTimeline: 1,
                    reason: "Need more time to complete",
                    attachments: []
                })
                .expect(STATUS_CODES.SUCCESS);

            // Verify Firebase service was called
            expect(mockFirebaseService.createMessage).toHaveBeenCalledTimes(1);
        });

        it("should return error when user is not the contributor", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REQUEST_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({
                    githubUsername: "different-user",
                    requestedTimeline: 1,
                    reason: "Need more time"
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when task is not in progress", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "OPEN" }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REQUEST_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor")
                .send({
                    githubUsername: "contributor",
                    requestedTimeline: 1,
                    reason: "Need more time"
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "REPLY_TIMELINE_EXTENSION"])} - Reply Timeline Extension`, () => {
        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const contributor = TestDataFactory.user({ userId: "contributor" });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "IN_PROGRESS",
                timeline: 1,
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    },
                    contributor: {
                        connect: { userId: "contributor" }
                    }
                }
            });
        });

        it("should accept timeline extension successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REPLY_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({
                    accept: true,
                    requestedTimeline: 1
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                message: expect.any(Object),
                task: expect.objectContaining({
                    timeline: 2,
                    status: "IN_PROGRESS"
                })
            });
        });

        it("should reject timeline extension successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REPLY_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .send({
                    accept: false,
                    requestedTimeline: 1
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                message: expect.any(Object)
            });

            // Verify task timeline was not changed
            const task = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(task?.timeline).toBe(1);
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "REPLY_TIMELINE_EXTENSION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({
                    accept: true,
                    requestedTimeline: 1
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });


    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "MARK_COMPLETE"])} - Mark Task as Complete`, () => {
        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const contributor = TestDataFactory.user({ userId: "contributor" });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "IN_PROGRESS",
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    },
                    contributor: {
                        connect: { userId: "contributor" }
                    }
                }
            });
        });

        it("should mark task as complete successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "MARK_COMPLETE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor")
                .send({
                    pullRequest: "https://github.com/owner/repo/pull/123",
                    attachmentUrl: "https://example.com/attachment.pdf"
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                status: "MARKED_AS_COMPLETED",
                updatedAt: expect.any(String),
                taskSubmissions: expect.arrayContaining([
                    expect.objectContaining({
                        pullRequest: "https://github.com/owner/repo/pull/123"
                    })
                ])
            });

            // Verify submission was created
            const submission = await prisma.taskSubmission.findFirst({
                where: {
                    taskId: testTask.id,
                    userId: "contributor"
                }
            });
            expect(submission).toBeTruthy();
        });

        it("should return error when user is not the contributor", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "MARK_COMPLETE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .send({
                    pullRequest: "https://github.com/owner/repo/pull/123"
                })
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task is not in progress", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "OPEN" }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "MARK_COMPLETE"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "contributor")
                .send({
                    pullRequest: "https://github.com/owner/repo/pull/123"
                })
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])} - Validate Task Completion`, () => {
        let testTask: any;
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            const contributor = TestDataFactory.user({ userId: "contributor" });
            await prisma.user.create({
                data: {
                    ...contributor,
                    contributionSummary: { create: {} },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            const testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "task-creator" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            testTask = TestDataFactory.task({
                status: "MARKED_AS_COMPLETED",
                creatorId: undefined,
                contributorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    installation: {
                        connect: { id: "12345678" }
                    },
                    creator: {
                        connect: { userId: "task-creator" }
                    },
                    contributor: {
                        connect: { userId: "contributor" }
                    }
                }
            });
        });

        it("should validate task completion successfully", async () => {
            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                status: "COMPLETED",
                completedAt: expect.any(String),
                settled: true,
                updatedAt: expect.any(String)
            });

            // Verify bounty was transferred
            expect(mockContractService.approveCompletion).toHaveBeenCalledTimes(1);

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: {
                    taskId: testTask.id,
                    category: "BOUNTY"
                }
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(100);
        });

        it("should return error when user is not the creator", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "different-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when task is not marked as completed", async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: "IN_PROGRESS" }
            });

            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when contributor is not found", async () => {
            await prisma.user.delete({
                where: { userId: "contributor" }
            });

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toContain("Contributor not found");
        });

        it("should handle partial success when firebase task status update fails", async () => {
            mockFirebaseService.updateTaskStatus.mockRejectedValue(new Error("Failed to update task status"));

            const response = await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", testTask.id))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body.data).toMatchObject({
                validated: true,
                task: expect.any(Object)
            });
            expect(response.body.warning).toContain("Failed to disable chat for the task.");
        });

        it("should return 404 when task not found", async () => {
            await request(app)
                .post(getEndpointWithPrefix(["TASK", "{TASKID}", "VALIDATE_COMPLETION"])
                    .replace(":taskId", cuid()))
                .set("x-test-user-id", "task-creator")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });
});
