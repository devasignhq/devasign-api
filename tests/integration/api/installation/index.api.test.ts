import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { installationRoutes } from "../../../../api/routes/installation.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { validateUser } from "../../../../api/middlewares/auth.middleware";
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
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

// Mock Octokit service for GitHub operations
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        getInstallationDetails: jest.fn()
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
        decryptWallet: jest.fn().mockResolvedValue("SD2H7VGPX5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5X5")
    }
}));

jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        refund: jest.fn().mockResolvedValue("mockTxHash")
    }
}));

describe("Installation API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;
    let mockOctokitService: any;

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

        const { stellarService } = await import("../../../../api/services/stellar.service");
        mockStellarService = stellarService;

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

        mockStellarService.createWallet.mockImplementation(async () => ({
            publicKey: `GTEST${Array(51).fill(0).map(() => (Math.random() * 36 | 0).toString(36)).join("").toUpperCase()}`,
            secretKey: "STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12"
        }));

        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);

        mockOctokitService.getInstallationDetails.mockResolvedValue({
            id: "12345678",
            html_url: "https://github.com/settings/installations/12345678",
            target_id: 123456,
            target_type: "Organization",
            account: {
                login: "test-org",
                node_id: "MDEyOk9yZ2FuaXphdGlvbjEyMzQ1Ng==",
                avatar_url: "https://avatars.githubusercontent.com/u/123456",
                html_url: "https://github.com/test-org"
            }
        });

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`POST ${getEndpointWithPrefix(["INSTALLATION", "CREATE"])} - Create Installation`, () => {
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
                installationId: "12345678"
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "CREATE"]))
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(STATUS_CODES.CREATED);

            expect(response.body.data.id).toBe("12345678");

            // Verify installation was created in database
            const createdInstallation = await prisma.installation.findUnique({
                where: { id: "12345678" },
                include: { wallet: true }
            });
            expect(createdInstallation).toBeTruthy();
            expect(createdInstallation?.wallet).toBeTruthy();
            expect(createdInstallation?.wallet?.address).toBeTruthy();

            // Verify Stellar service was called
            expect(mockStellarService.createWallet).toHaveBeenCalledTimes(1);
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledTimes(1);
        });

        it("should return error when user not found", async () => {
            const installationData = {
                installationId: "12345678"
            };

            await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "CREATE"]))
                .set("x-test-user-id", "non-existent-user")
                .send(installationData)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when installation already exists", async () => {
            const existingInstallation = TestDataFactory.installation({ id: "12345678" });

            await prisma.installation.create({
                data: {
                    ...existingInstallation,
                    wallet: TestDataFactory.createWalletRelation("GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
                }
            });

            const installationData = {
                installationId: "12345678"
            };

            await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "CREATE"]))
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle partial success when trustline creation fails", async () => {
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(
                new Error("Trustline creation failed")
            );

            const installationData = {
                installationId: "12345678"
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "CREATE"]))
                .set("x-test-user-id", "installation-creator")
                .send(installationData)
                .expect(STATUS_CODES.PARTIAL_SUCCESS);

            expect(response.body).toMatchObject({
                data: expect.objectContaining({
                    id: "12345678"
                }),
                message: expect.stringContaining("Installation created successfully"),
                warning: "Failed to add USDC trustline to wallet"
            });

            // Verify installation was still created
            const createdInstallation = await prisma.installation.findUnique({
                where: { id: "12345678" }
            });
            expect(createdInstallation).toBeTruthy();
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GET_ALL"])} - Get Installations`, () => {
        beforeEach(async () => {
            // Create test user
            const user1 = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user1, contributionSummary: { create: {} } }
            });

            // Create subscription package
            const subscriptionPackage = await prisma.subscriptionPackage.create({
                data: {
                    name: "Test Plan",
                    description: "Test subscription",
                    maxTasks: 10,
                    maxUsers: 5,
                    paid: false,
                    price: 0,
                    active: true
                }
            });

            // Create multiple test installations
            const installations = [
                TestDataFactory.installation({ id: "11111111" }),
                TestDataFactory.installation({ id: "22222222" }),
                TestDataFactory.installation({ id: "33333333" })
            ];

            for (const installation of installations) {
                await prisma.installation.create({
                    data: {
                        ...installation,
                        subscriptionPackage: {
                            connect: { id: subscriptionPackage.id }
                        },
                        users: {
                            connect: { userId: "user-1" }
                        },
                        wallet: TestDataFactory.createWalletRelation()
                    }
                });
            }
        });

        it("should get all installations with pagination", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GET_ALL"])}?page=1&limit=10`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                data: expect.arrayContaining([
                    expect.any(Object)
                ]),
                pagination: {
                    hasMore: false
                }
            });

            expect(response.body.data.length).toBe(3);
        });

        it("should sort installations by creation date", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GET_ALL"])}?sort=asc`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            const dates = response.body.data.map((inst: any) => new Date(inst.createdAt).getTime());
            const sortedDates = [...dates].sort((a, b) => a - b);
            expect(dates).toEqual(sortedDates);
        });

        it("should return empty array when user has no installations", async () => {
            const user2 = TestDataFactory.user({ userId: "user-2" });
            await prisma.user.create({
                data: { ...user2, contributionSummary: { create: {} } }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "GET_ALL"]))
                .set("x-test-user-id", "user-2")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toEqual([]);
            expect(response.body.pagination.hasMore).toBe(false);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GET_BY_ID"])} - Get Installation`, () => {
        let testInstallation: any;
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...testUser, contributionSummary: { create: {} } }
            });

            const subscriptionPackage = await prisma.subscriptionPackage.create({
                data: {
                    name: "Test Plan",
                    description: "Test subscription",
                    maxTasks: 10,
                    maxUsers: 5,
                    paid: false,
                    price: 0,
                    active: true
                }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    subscriptionPackage: {
                        connect: { id: subscriptionPackage.id }
                    },
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create some tasks for the installation
            const task1 = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "OPEN",
                bounty: 100
            });
            const task2 = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "COMPLETED",
                bounty: 200
            });
            await prisma.task.create({ data: task1 });
            await prisma.task.create({ data: task2 });
        });

        it("should get installation by ID successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "GET_BY_ID"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                id: "12345678",
                wallet: expect.objectContaining({
                    address: expect.any(String)
                }),
                tasks: expect.arrayContaining([
                    expect.objectContaining({
                        status: expect.any(String),
                        bounty: expect.any(Number)
                    })
                ]),
                users: expect.arrayContaining([
                    expect.objectContaining({
                        userId: "user-1"
                    })
                ]),
                stats: expect.objectContaining({
                    totalBounty: 300,
                    openTasks: 1,
                    completedTasks: 1,
                    totalTasks: 2,
                    totalMembers: 1
                })
            });
        });

        it("should return 404 when installation not found", async () => {
            await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "GET_BY_ID"])
                    .replace(":installationId", "99999999"))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when user is not a member", async () => {
            const user2 = TestDataFactory.user({ userId: "user-2" });
            await prisma.user.create({
                data: { ...user2, contributionSummary: { create: {} } }
            });

            await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "GET_BY_ID"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-2")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`PATCH ${getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])} - Archive Installation`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({
                id: "12345678"
            });

            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should archive installation successfully", async () => {
            const response = await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation archived successfully",
                data: {
                    refunded: expect.stringContaining("USDC")
                }
            });

            // Verify installation was archived (not deleted)
            const archivedInstallation = await prisma.installation.findUnique({
                where: { id: "12345678" }
            });
            expect(archivedInstallation).toBeTruthy();
            expect(archivedInstallation?.status).toBe("ARCHIVED");
        });

        it("should return error when installation is already archived", async () => {
            // Archive the installation first
            await prisma.installation.update({
                where: { id: "12345678" },
                data: { status: "ARCHIVED" }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when installation has tasks in progress", async () => {
            const task = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "IN_PROGRESS"
            });
            await prisma.task.create({ data: task });

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when installation has tasks marked as completed", async () => {
            const task = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "MARKED_AS_COMPLETED"
            });
            await prisma.task.create({ data: task });

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should successfully archive installation with open tasks and refund bounties", async () => {
            const task1 = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "OPEN",
                bounty: 100
            });
            const task2 = TestDataFactory.task({
                creatorId: "user-1",
                installationId: "12345678",
                status: "OPEN",
                bounty: 200
            });
            await prisma.task.create({ data: task1 });
            await prisma.task.create({ data: task2 });

            const response = await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation archived successfully",
                data: {
                    refunded: expect.stringContaining("USDC")
                }
            });

            // Verify installation was archived
            const archivedInstallation = await prisma.installation.findUnique({
                where: { id: "12345678" }
            });
            expect(archivedInstallation?.status).toBe("ARCHIVED");
        });

        it("should return 404 when installation not found", async () => {
            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "99999999"))
                .set("x-test-user-id", "user-1")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when user is not a member of installation", async () => {
            const user2 = TestDataFactory.user({ userId: "user-2" });
            await prisma.user.create({
                data: { ...user2, contributionSummary: { create: {} } }
            });

            await request(app)
                .patch(getEndpointWithPrefix(["INSTALLATION", "ARCHIVE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-2")
                .send({ walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII" })
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(
                ENDPOINTS.INSTALLATION.PREFIX,
                validateUser as RequestHandler,
                installationRoutes
            );
            appWithoutAuth.use(errorHandler);

            await request(appWithoutAuth)
                .get(getEndpointWithPrefix(["INSTALLATION", "GET_ALL"]))
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get("/installations/12345678")
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .post(getEndpointWithPrefix(["INSTALLATION", "CREATE"]))
                .send({ installationId: "12345678" })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .patch("/installations/12345678")
                .send({ walletAddress: "GTEST" })
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });
});
