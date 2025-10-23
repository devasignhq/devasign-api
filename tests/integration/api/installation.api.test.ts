import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { installationRoutes } from "../../../api/routes/installation.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { STATUS_CODES, encrypt } from "../../../api/utilities/helper";

// Mock Firebase admin for authentication
jest.mock("../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock Stellar service for wallet operations
jest.mock("../../../api/services/stellar.service", () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn(),
        transferAssetViaSponsor: jest.fn()
    }
}));

// Mock Octokit service for GitHub operations
jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getInstallationDetails: jest.fn()
    }
}));

describe("Installation API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockStellarService: any;
    let mockOctokitService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with installation routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use("/installations", (req, res, next) => {
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

        app.use("/installations", installationRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { stellarService } = await import("../../../api/services/stellar.service");
        mockStellarService = stellarService;

        const { OctokitService } = await import("../../../api/services/octokit.service");
        mockOctokitService = OctokitService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockStellarService.createWallet.mockResolvedValue({
            publicKey: "GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
            secretKey: "STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12"
        });

        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);
        mockStellarService.transferAssetViaSponsor.mockResolvedValue({
            txHash: "mock_tx_hash_123"
        });

        mockOctokitService.getInstallationDetails.mockResolvedValue({
            id: 12345,
            html_url: "https://github.com/test/repo",
            target_id: 67890,
            target_type: "Organization",
            account: {
                login: "testorg",
                node_id: "MDEwOlJlcG9zaXRvcnkxMjM0NTY=",
                avatar_url: "https://github.com/testorg.png",
                html_url: "https://github.com/testorg"
            }
        });

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("POST /installations - Create Installation", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "installation-creator" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should create a new installation successfully", async () => {
            const installationData = {
                installationId: "12345"
            };

            const response = await request(app)
                .post("/installations")
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                id: "12345",
                htmlUrl: "https://github.com/test/repo",
                targetId: 67890,
                targetType: "Organization",
                account: expect.objectContaining({
                    login: "testorg"
                }),
                walletAddress: expect.stringMatching(/^G[A-Z0-9]{54}$/),
                subscriptionPackage: expect.objectContaining({
                    id: process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID || "test-package-id"
                })
            });

            // Verify installation was created in database
            const createdInstallation = await prisma.installation.findUnique({
                where: { id: "12345" }
            });
            expect(createdInstallation).toBeTruthy();

            // Verify wallets were created
            expect(mockStellarService.createWallet).toHaveBeenCalledTimes(2);
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledTimes(2);
        });

        it("should return error when installation already exists", async () => {
            // Create installation first
            const installation = TestDataFactory.installation({ id: "12345" });
            await prisma.installation.create({ data: installation });

            const installationData = {
                installationId: "12345"
            };

            await request(app)
                .post("/installations")
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when user not found", async () => {
            const installationData = {
                installationId: "12345"
            };

            await request(app)
                .post("/installations")
                .set("x-test-user-id", "non-existent-user")
                .send(installationData)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should handle trustline creation failure gracefully", async () => {
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(
                new Error("Trustline creation failed")
            );

            const installationData = {
                installationId: "12345"
            };

            const response = await request(app)
                .post("/installations")
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(202);

            expect(response.body).toMatchObject({
                installation: expect.objectContaining({
                    id: "12345"
                }),
                message: "Failed to add USDC trustlines."
            });
        });
    });

    describe("GET /installations - Get Installations", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            // Create installations
            const installations = TestDataFactory.installations(3);
            for (const installation of installations) {
                await prisma.installation.create({
                    data: {
                        ...installation,
                        users: {
                            connect: { userId: "test-user-1" }
                        }
                    }
                });
            }
        });

        it("should get all installations for user with pagination", async () => {
            const response = await request(app)
                .get("/installations?page=1&limit=10")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination).toMatchObject({
                currentPage: 1,
                totalPages: 1,
                totalItems: 3,
                itemsPerPage: 10,
                hasMore: false
            });
        });

        it("should return empty array when user has no installations", async () => {
            const newUser = TestDataFactory.user({ userId: "new-user" });
            await prisma.user.create({
                data: {
                    ...newUser,
                    contributionSummary: { create: {} }
                }
            });

            const response = await request(app)
                .get("/installations")
                .set("x-test-user-id", "new-user")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(0);
        });
    });

    describe("GET /installations/:installationId - Get Installation", () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });
        });

        it("should get installation details with stats", async () => {
            const response = await request(app)
                .get("/installations/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                id: "test-installation-1",
                account: expect.any(Object),
                stats: expect.objectContaining({
                    totalBounty: expect.any(Number),
                    openTasks: expect.any(Number),
                    completedTasks: expect.any(Number),
                    totalTasks: expect.any(Number),
                    totalMembers: expect.any(Number)
                })
            });
        });

        it("should return 404 when installation not found", async () => {
            await request(app)
                .get("/installations/non-existent")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when user not authorized", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: {
                    ...otherUser,
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get("/installations/test-installation-1")
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("PATCH /installations/:installationId - Update Installation", () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });
        });

        it("should update installation successfully", async () => {
            const updateData = {
                htmlUrl: "https://github.com/updated/repo",
                targetId: 99999
            };

            const response = await request(app)
                .patch("/installations/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(updateData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                htmlUrl: "https://github.com/updated/repo",
                targetId: 99999
            });
        });

        it("should return 404 when installation not found", async () => {
            const updateData = {
                htmlUrl: "https://github.com/updated/repo",
                targetId: 99999
            };

            await request(app)
                .patch("/installations/non-existent")
                .set("x-test-user-id", "test-user-1")
                .send(updateData)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when user not authorized", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user" });
            await prisma.user.create({
                data: {
                    ...otherUser,
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .patch("/installations/test-installation-1")
                .set("x-test-user-id", "other-user")
                .send({ htmlUrl: "https://github.com/updated/repo" })
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe("DELETE /installations/:installationId - Delete Installation", () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({
                id: "test-installation-1",
                walletSecret: encrypt("SINSTALLTEST000000000000000000000000000000000"),
                escrowSecret: encrypt("SESCROWTEST0000000000000000000000000000000000")
            });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });
        });

        it("should delete installation successfully", async () => {
            const response = await request(app)
                .delete("/installations/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send({ walletAddress: testUser.walletAddress })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation deleted successfully"
            });

            // Verify installation was deleted
            const deletedInstallation = await prisma.installation.findUnique({
                where: { id: "test-installation-1" }
            });
            expect(deletedInstallation).toBeNull();
        });

        it("should return error when installation has active tasks", async () => {
            // Create an active task
            const task = TestDataFactory.task({
                installationId: "test-installation-1",
                creatorId: "test-user-1",
                status: "OPEN"
            });
            await prisma.task.create({ data: task });

            await request(app)
                .delete("/installations/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send({ walletAddress: testUser.walletAddress })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return 404 when installation not found", async () => {
            await request(app)
                .delete("/installations/non-existent")
                .set("x-test-user-id", "test-user-1")
                .send({ walletAddress: testUser.walletAddress })
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("POST /installations/:installationId/team - Add Team Member", () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });
        });

        it("should add existing user to installation", async () => {
            const newMember = TestDataFactory.user({ userId: "new-member", username: "newmember" });
            await prisma.user.create({
                data: {
                    ...newMember,
                    contributionSummary: { create: {} }
                }
            });

            const response = await request(app)
                .post("/installations/test-installation-1/team")
                .set("x-test-user-id", "test-user-1")
                .send({
                    username: "newmember",
                    permissionCodes: ["VIEW_TASKS", "APPLY_TASKS"]
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                username: "newmember",
                status: "added"
            });

            // Verify user was added to installation
            const installation = await prisma.installation.findUnique({
                where: { id: "test-installation-1" },
                include: { users: true }
            });
            expect(installation?.users).toHaveLength(2);
        });

        it("should return already_member when user is already in installation", async () => {
            const response = await request(app)
                .post("/installations/test-installation-1/team")
                .set("x-test-user-id", "test-user-1")
                .send({
                    username: testUser.username,
                    permissionCodes: ["VIEW_TASKS"]
                })
                .expect(400);

            expect(response.body).toMatchObject({
                status: "already_member"
            });
        });

        it("should return not_found when user does not exist", async () => {
            const response = await request(app)
                .post("/installations/test-installation-1/team")
                .set("x-test-user-id", "test-user-1")
                .send({
                    username: "nonexistentuser",
                    permissionCodes: ["VIEW_TASKS"]
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                status: "not_found"
            });
        });
    });

    describe("PATCH /installations/:installationId/team/:userId - Update Team Member Permissions", () => {
        let testUser: any;
        let teamMember: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            teamMember = TestDataFactory.user({ userId: "team-member" });

            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
            await prisma.user.create({
                data: {
                    ...teamMember,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: [{ userId: "test-user-1" }, { userId: "team-member" }]
                    }
                }
            });

            // Create initial permissions
            await prisma.userInstallationPermission.create({
                data: {
                    userId: "team-member",
                    installationId: "test-installation-1",
                    permissionCodes: ["VIEW_TASKS"],
                    assignedBy: "test-user-1"
                }
            });
        });

        it("should update team member permissions successfully", async () => {
            const response = await request(app)
                .patch("/installations/test-installation-1/team/team-member")
                .set("x-test-user-id", "test-user-1")
                .send({
                    permissionCodes: ["VIEW_TASKS", "MANAGE_TASKS"]
                })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Permissions updated successfully"
            });

            // Verify permissions were updated
            const permissions = await prisma.userInstallationPermission.findUnique({
                where: {
                    userId_installationId: {
                        userId: "team-member",
                        installationId: "test-installation-1"
                    }
                }
            });
            expect(permissions?.permissionCodes).toEqual(["VIEW_TASKS", "MANAGE_TASKS"]);
        });
    });

    describe("DELETE /installations/:installationId/team/:userId - Remove Team Member", () => {
        let testUser: any;
        let teamMember: any;
        let testInstallation: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            teamMember = TestDataFactory.user({ userId: "team-member" });

            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
            await prisma.user.create({
                data: {
                    ...teamMember,
                    contributionSummary: { create: {} }
                }
            });

            testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: [{ userId: "test-user-1" }, { userId: "team-member" }]
                    }
                }
            });

            await prisma.userInstallationPermission.create({
                data: {
                    userId: "team-member",
                    installationId: "test-installation-1",
                    permissionCodes: ["VIEW_TASKS"],
                    assignedBy: "test-user-1"
                }
            });
        });

        it("should remove team member successfully", async () => {
            const response = await request(app)
                .delete("/installations/test-installation-1/team/team-member")
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Team member removed successfully"
            });

            // Verify user was removed
            const installation = await prisma.installation.findUnique({
                where: { id: "test-installation-1" },
                include: { users: true }
            });
            expect(installation?.users).toHaveLength(1);
        });
    });
});
