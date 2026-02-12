import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { installationRoutes } from "../../../../api/routes/installation.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { validateUser } from "../../../../api/middlewares/auth.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { generateRandomString, getEndpointWithPrefix } from "../../../helpers/test-utils";
import { createId } from "@paralleldrive/cuid2";import { apiLimiter } from "../../../../api/middlewares/rate-limit.middleware";
;

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
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
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

jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        getInstallationDetails: jest.fn().mockResolvedValue({
            id: "12345678",
            account: { login: "test-org" }
        })
    }
}));

describe("Installation Team API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with installation routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.INSTALLATION.PREFIX, (req, res, next) => {
            res.locals.user = {
                uid: req.headers["x-test-user-id"] || "test-user-1",
                admin: req.headers["x-test-admin"] === "true"
            };
            res.locals.userId = req.headers["x-test-user-id"] || "test-user-1";
            next();
        });

        app.use(ENDPOINTS.INSTALLATION.PREFIX, installationRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = await import("../../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;
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

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`POST ${getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])} - Add Team Member`, () => {
        let testInstallation: any;
        let testUser: any;
        const manageTasksCode = createId();
        const manageTeamCode = createId();
        const viewAnalyticsCode = createId();

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "team-owner" });
            await prisma.user.create({
                data: { ...testUser, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "team-owner" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create permissions
            await prisma.permission.createMany({
                data: [
                    { code: manageTasksCode, name: "Manage Tasks", isDefault: true },
                    { code: manageTeamCode, name: "Manage Team", isDefault: false },
                    { code: viewAnalyticsCode, name: "View Analytics", isDefault: true }
                ]
            });
        });

        it("should add existing user to installation team successfully", async () => {
            const newMember = TestDataFactory.user({ userId: "new-member", username: "newmember" });
            await prisma.user.create({
                data: { ...newMember, contributionSummary: { create: {} } }
            });

            const memberData = {
                username: "newmember",
                permissionCodes: [manageTasksCode, viewAnalyticsCode]
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "team-owner")
                .send(memberData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                username: "newmember",
                status: "added"
            });

            // Verify user was added to installation
            const installation = await prisma.installation.findUnique({
                where: { id: "12345678" },
                include: { users: true }
            });
            expect(installation?.users.some((u: any) => u.userId === "new-member")).toBe(true);

            // Verify permissions were assigned
            const permissions = await prisma.userInstallationPermission.findUnique({
                where: {
                    userId_installationId: {
                        userId: "new-member",
                        installationId: "12345678"
                    }
                }
            });
            expect(permissions).toBeTruthy();
            expect(permissions?.permissionCodes).toEqual([manageTasksCode, viewAnalyticsCode]);
        });

        it("should return error when user is already a member", async () => {
            const existingMember = TestDataFactory.user({ userId: "existing-member", username: "existingmember" });
            await prisma.user.create({
                data: { ...existingMember, contributionSummary: { create: {} } }
            });

            await prisma.installation.update({
                where: { id: "12345678" },
                data: {
                    users: {
                        connect: { userId: "existing-member" }
                    }
                }
            });

            const memberData = {
                username: "existingmember",
                permissionCodes: [manageTasksCode]
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "team-owner")
                .send(memberData)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.data).toMatchObject({
                username: "existingmember",
                status: "already_member"
            });
        });

        it("should return not_found status when user does not exist", async () => {
            const memberData = {
                username: "nonexistentuser",
                permissionCodes: [manageTasksCode]
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "team-owner")
                .send(memberData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                status: "not_found"
            });
        });

        it("should return 404 when installation not found", async () => {
            const memberData = {
                username: "newmember",
                permissionCodes: [manageTasksCode]
            };

            await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])
                    .replace(":installationId", "99999999"))
                .set("x-test-user-id", "team-owner")
                .send(memberData)
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe(`PATCH ${getEndpointWithPrefix(["INSTALLATION", "TEAM", "UPDATE_MEMBER"])} - Update Team Member`, () => {
        let testInstallation: any;
        const teamMemberId = generateRandomString(28);
        const manageTasksCode = createId();
        const manageTeamCode = createId();
        const viewAnalyticsCode = createId();

        beforeEach(async () => {
            const owner = TestDataFactory.user({ userId: "team-owner" });
            await prisma.user.create({
                data: { ...owner, contributionSummary: { create: {} } }
            });

            const member = TestDataFactory.user({ userId: teamMemberId });
            await prisma.user.create({
                data: { ...member, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: [{ userId: "team-owner" }, { userId: teamMemberId }]
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create permissions
            await prisma.permission.createMany({
                data: [
                    { code: manageTasksCode, name: "Manage Tasks", isDefault: true },
                    { code: manageTeamCode, name: "Manage Team", isDefault: false },
                    { code: viewAnalyticsCode, name: "View Analytics", isDefault: true }
                ]
            });

            // Create initial permissions for member
            await prisma.userInstallationPermission.create({
                data: {
                    userId: teamMemberId,
                    installationId: "12345678",
                    permissionCodes: [manageTasksCode],
                    assignedBy: "team-owner",
                    permissions: {
                        connect: [{ code: manageTasksCode }]
                    }
                }
            });
        });

        it("should update team member permissions successfully", async () => {
            const updateData = {
                permissionCodes: [manageTasksCode, viewAnalyticsCode, manageTeamCode]
            };

            const response = await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "TEAM", "UPDATE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "team-owner")
                .send(updateData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Permissions updated successfully"
            });

            // Verify permissions were updated
            const permissions = await prisma.userInstallationPermission.findUnique({
                where: {
                    userId_installationId: {
                        userId: teamMemberId,
                        installationId: "12345678"
                    }
                }
            });
            expect(permissions?.permissionCodes).toEqual([manageTasksCode, viewAnalyticsCode, manageTeamCode]);
        });

        it("should return 404 when installation not found", async () => {
            const updateData = {
                permissionCodes: [manageTasksCode]
            };

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "TEAM", "UPDATE_MEMBER"])
                    .replace(":installationId", "99999999")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "team-owner")
                .send(updateData)
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when user is not a team member", async () => {
            const outsider = TestDataFactory.user({ userId: "outsider" });
            await prisma.user.create({
                data: { ...outsider, contributionSummary: { create: {} } }
            });

            const updateData = {
                permissionCodes: [manageTasksCode]
            };

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "TEAM", "UPDATE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "outsider")
                .send(updateData)
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe(`DELETE ${getEndpointWithPrefix(["INSTALLATION", "TEAM", "REMOVE_MEMBER"])} - Remove Team Member`, () => {
        let testInstallation: any;
        const teamMemberId = generateRandomString(28);
        const manageTasksCode = createId();

        beforeEach(async () => {
            const owner = TestDataFactory.user({ userId: "team-owner" });
            await prisma.user.create({
                data: { ...owner, contributionSummary: { create: {} } }
            });

            const member = TestDataFactory.user({ userId: teamMemberId });
            await prisma.user.create({
                data: { ...member, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: [{ userId: "team-owner" }, { userId: teamMemberId }]
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create permissions
            await prisma.permission.create({
                data: { code: manageTasksCode, name: "Manage Tasks", isDefault: true }
            });

            // Create permissions for member
            await prisma.userInstallationPermission.create({
                data: {
                    userId: teamMemberId,
                    installationId: "12345678",
                    permissionCodes: [manageTasksCode],
                    assignedBy: "team-owner",
                    permissions: {
                        connect: [{ code: manageTasksCode }]
                    }
                }
            });
        });

        it("should remove team member successfully", async () => {
            const response = await request(app)
                .delete(getEndpointWithPrefix(["INSTALLATION", "TEAM", "REMOVE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "team-owner")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Team member removed successfully"
            });

            // Verify user was removed from installation
            const installation = await prisma.installation.findUnique({
                where: { id: "12345678" },
                include: { users: true }
            });
            expect(installation?.users.some((u: any) => u.userId === teamMemberId)).toBe(false);

            // Verify permissions were deleted
            const permissions = await prisma.userInstallationPermission.findUnique({
                where: {
                    userId_installationId: {
                        userId: teamMemberId,
                        installationId: "12345678"
                    }
                }
            });
            expect(permissions).toBeNull();
        });

        it("should return 404 when installation not found", async () => {
            await request(app)
                .delete(getEndpointWithPrefix(["INSTALLATION", "TEAM", "REMOVE_MEMBER"])
                    .replace(":installationId", "99999999")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "team-owner")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should return error when user is not a team member", async () => {
            const outsider = TestDataFactory.user({ userId: "outsider" });
            await prisma.user.create({
                data: { ...outsider, contributionSummary: { create: {} } }
            });

            await request(app)
                .delete(getEndpointWithPrefix(["INSTALLATION", "TEAM", "REMOVE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", teamMemberId))
                .set("x-test-user-id", "outsider")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all team endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(
                ENDPOINTS.INSTALLATION.PREFIX,
                validateUser as RequestHandler,
                installationRoutes
            );
            appWithoutAuth.use(apiLimiter);
            appWithoutAuth.use(errorHandler);
            const manageTasksCode = createId();

            await request(appWithoutAuth)
                .post(getEndpointWithPrefix(["INSTALLATION", "TEAM", "ADD_MEMBER"])
                    .replace(":installationId", "12345678"))
                .send({ username: "test", permissionCodes: [manageTasksCode] })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .patch(getEndpointWithPrefix(["INSTALLATION", "TEAM", "UPDATE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", createId()))
                .send({ permissionCodes: [manageTasksCode] })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .delete(getEndpointWithPrefix(["INSTALLATION", "TEAM", "REMOVE_MEMBER"])
                    .replace(":installationId", "12345678")
                    .replace(":userId", createId()))
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });
});
