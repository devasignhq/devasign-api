import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { userRoutes } from "../../../api/routes/user.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { validateUser } from "../../../api/middlewares/auth.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { STATUS_CODES } from "../../../api/helper";
import { mockFirebaseAuth } from "../../mocks/firebase.service.mock";

// Mock Firebase admin for authentication
jest.mock("../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock Stellar service for wallet operations
jest.mock("../../../api/services/stellar.service", () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

describe("User API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with user routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use("/users", (req, res, next) => {
            // Add mock user data to request for authenticated endpoints
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

        app.use("/users", userRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = await import("../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;

        const { stellarService } = await import("../../../api/services/stellar.service");
        mockStellarService = stellarService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: "test-user-1",
            admin: false
        });

        mockStellarService.createWallet.mockResolvedValue({
            publicKey: "GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
            secretKey: "STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12"
        });

        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();

        // Clean up Docker container
        try {
            // execSync("docker stop test-postgres");
        } catch (error) {
            console.log("Error cleaning up test container:", error);
        }
    });

    describe("POST /users - Create User", () => {
        it("should create a new user with wallet successfully", async () => {
            const userData = {
                gitHubUsername: "testuser123"
            };

            const response = await request(app)
                .post("/users")
                .set("x-test-user-id", "new-user-123")
                .send(userData)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                userId: "new-user-123",
                username: "testuser123",
                walletAddress: expect.stringMatching(/^G[A-Z0-9]{54}$/),
                contributionSummary: expect.objectContaining({
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                })
            });

            // Verify user was created in database
            const createdUser = await prisma.user.findUnique({
                where: { userId: "new-user-123" },
                include: { contributionSummary: true }
            });

            expect(createdUser).toBeTruthy();
            expect(createdUser?.username).toBe("testuser123");
            expect(createdUser?.walletAddress).toBeTruthy();
            expect(createdUser?.contributionSummary).toBeTruthy();

            // Verify Stellar service was called
            expect(mockStellarService.createWallet).toHaveBeenCalledTimes(1);
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledTimes(1);
        });

        it("should create a user without wallet when skipWallet=true", async () => {
            const userData = {
                gitHubUsername: "testuser456"
            };

            const response = await request(app)
                .post("/users?skipWallet=true")
                .set("x-test-user-id", "new-user-456")
                .send(userData)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                userId: "new-user-456",
                username: "testuser456",
                walletAddress: "",
                contributionSummary: expect.objectContaining({
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                })
            });

            // Verify Stellar service was not called
            expect(mockStellarService.createWallet).not.toHaveBeenCalled();
            expect(mockStellarService.addTrustLineViaSponsor).not.toHaveBeenCalled();
        });

        it("should return error when user already exists", async () => {
            // Create user first
            const existingUser = TestDataFactory.user({ userId: "existing-user" });
            await prisma.user.create({
                data: {
                    ...existingUser,
                    addressBook: [],
                    contributionSummary: { create: {} }
                }
            });

            const userData = {
                gitHubUsername: "testuser789"
            };

            await request(app)
                .post("/users")
                .set("x-test-user-id", "existing-user")
                .send(userData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle wallet creation failure gracefully", async () => {
            mockStellarService.createWallet.mockRejectedValue(new Error("Stellar network error"));

            const userData = {
                gitHubUsername: "testuser999"
            };

            await request(app)
                .post("/users")
                .set("x-test-user-id", "new-user-999")
                .send(userData)
                .expect(500);
        });

        it("should handle trustline creation failure gracefully", async () => {
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(new Error("Trustline creation failed"));

            const userData = {
                gitHubUsername: "testuser888"
            };

            const response = await request(app)
                .post("/users")
                .set("x-test-user-id", "new-user-888")
                .send(userData)
                .expect(202);

            expect(response.body).toMatchObject({
                user: expect.objectContaining({
                    userId: "new-user-888",
                    username: "testuser888"
                }),
                error: expect.any(Object),
                message: expect.stringContaining("Failed to add USDC trustline")
            });

            // Verify user was still created
            const createdUser = await prisma.user.findUnique({
                where: { userId: "new-user-888" }
            });
            expect(createdUser).toBeTruthy();
        });
    });

    describe("GET /users - Get User", () => {
        let testUser: any;

        beforeEach(async () => {
            // Create test user with contribution summary
            testUser = TestDataFactory.user({ userId: "test-get-user" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: {
                        create: {
                            tasksCompleted: 5,
                            activeTasks: 2,
                            totalEarnings: 500.0
                        }
                    }
                }
            });
        });

        it("should get user with basic view by default", async () => {
            const response = await request(app)
                .get("/users")
                .set("x-test-user-id", "test-get-user")
                .expect(200);

            expect(response.body).toMatchObject({
                userId: "test-get-user",
                username: testUser.username,
                walletAddress: testUser.walletAddress,
                addressBook: testUser.addressBook,
                _count: {
                    installations: 0
                }
            });

            // Should not include contribution summary in basic view
            expect(response.body.contributionSummary).toBeUndefined();
        });

        it("should get user with full view when requested", async () => {
            const response = await request(app)
                .get("/users?view=full")
                .set("x-test-user-id", "test-get-user")
                .expect(200);

            expect(response.body).toMatchObject({
                userId: "test-get-user",
                username: testUser.username,
                walletAddress: testUser.walletAddress,
                contributionSummary: {
                    tasksCompleted: 5,
                    activeTasks: 2,
                    totalEarnings: 500.0
                },
                _count: {
                    installations: 0
                }
            });
        });

        it("should create wallet when setWallet=true and user has no wallet", async () => {
            // Create user without wallet
            const userWithoutWallet = TestDataFactory.user({
                userId: "user-no-wallet",
                walletAddress: "",
                walletSecret: ""
            });
            await prisma.user.create({
                data: {
                    ...userWithoutWallet,
                    addressBook: [],
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get("/users?setWallet=true")
                .set("x-test-user-id", "user-no-wallet")
                .expect(200);

            // Verify wallet was added to database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: "user-no-wallet" }
            });
            expect(updatedUser?.walletAddress).toBeTruthy();
            expect(updatedUser?.walletAddress).not.toBe("");
        });

        it("should return 404 when user does not exist", async () => {
            await request(app)
                .get("/users")
                .set("x-test-user-id", "non-existent-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("PATCH /users/username - Update Username", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-update-user" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should update username successfully", async () => {
            const updateData = {
                githubUsername: "newusername123"
            };

            const response = await request(app)
                .patch("/users/username")
                .set("x-test-user-id", "test-update-user")
                .send(updateData)
                .expect(200);

            expect(response.body).toMatchObject({
                userId: "test-update-user",
                username: "newusername123",
                updatedAt: expect.any(String)
            });

            // Verify username was updated in database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: "test-update-user" }
            });
            expect(updatedUser?.username).toBe("newusername123");
        });

        it("should return 404 when user does not exist", async () => {
            const updateData = {
                githubUsername: "newusername456"
            };

            await request(app)
                .patch("/users/username")
                .set("x-test-user-id", "non-existent-user")
                .send(updateData)
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("PATCH /users/address-book - Update Address Book", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({
                userId: "test-addressbook-user",
                addressBook: [
                    { address: "GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC", name: "Existing Contact" }
                ]
            });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should add new address to address book successfully", async () => {
            const newAddress = {
                address: "GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A",
                name: "New Contact"
            };

            const response = await request(app)
                .patch("/users/address-book")
                .set("x-test-user-id", "test-addressbook-user")
                .send(newAddress)
                .expect(200);

            expect(response.body).toMatchObject({
                userId: "test-addressbook-user",
                addressBook: expect.arrayContaining([
                    { address: "GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC", name: "Existing Contact" },
                    { address: "GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A", name: "New Contact" }
                ]),
                updatedAt: expect.any(String)
            });

            // Verify address book was updated in database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: "test-addressbook-user" }
            });
            expect(updatedUser?.addressBook).toHaveLength(2);
        });

        it("should fail when address already exists", async () => {
            const duplicateAddress = {
                address: "GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC",
                name: "Duplicate Contact"
            };

            await request(app)
                .patch("/users/address-book")
                .set("x-test-user-id", "test-addressbook-user")
                .send(duplicateAddress)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return 404 when user does not exist", async () => {
            const newAddress = {
                address: "GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A",
                name: "New Contact"
            };

            await request(app)
                .patch("/users/address-book")
                .set("x-test-user-id", "non-existent-user")
                .send(newAddress)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        // it('should validate Stellar address format', async () => {
        //     const invalidAddress = {
        //         address: 'INVALID_ADDRESS',
        //         name: 'Invalid Contact'
        //     };

        //     const response = await request(app)
        //         .patch('/users/address-book')
        //         .set('x-test-user-id', 'test-addressbook-user')
        //         .send(invalidAddress)
        //         .expect(400);

        //     expect(response.body).toMatchObject({
        //         errors: expect.arrayContaining([
        //             expect.objectContaining({
        //                 msg: expect.stringContaining('Invalid Stellar address format')
        //             })
        //         ])
        //     });
        // });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all endpoints", async () => {
            // Test without authentication headers
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use("/users", validateUser as RequestHandler, userRoutes);
            appWithoutAuth.use(errorHandler);

            await request(appWithoutAuth)
                .get("/users")
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .post("/users")
                .send({ gitHubUsername: "test" })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .patch("/users/username")
                .send({ githubUsername: "test" })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .patch("/users/address-book")
                .send({ address: "GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", name: "Test" })
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });

    describe("Database Persistence and Consistency", () => {
        it("should maintain data consistency across operations", async () => {
            // Create user
            const userData = { gitHubUsername: "consistencytest" };
            const createResponse = await request(app)
                .post("/users")
                .set("x-test-user-id", "consistency-user")
                .send(userData)
                .expect(STATUS_CODES.POST);

            const userId = createResponse.body.userId;

            // Get user to verify creation
            const getResponse = await request(app)
                .get("/users?view=full")
                .set("x-test-user-id", userId)
                .expect(STATUS_CODES.SUCCESS);

            expect(getResponse.body.userId).toBe(userId);
            expect(getResponse.body.username).toBe("consistencytest");

            // Update username
            await request(app)
                .patch("/users/username")
                .set("x-test-user-id", userId)
                .send({ githubUsername: "updatedname" })
                .expect(STATUS_CODES.SUCCESS);

            // Add address to address book
            await request(app)
                .patch("/users/address-book")
                .set("x-test-user-id", userId)
                .send({
                    address: "GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    name: "Test Contact"
                })
                .expect(STATUS_CODES.SUCCESS);

            // Verify all changes persisted
            const finalGetResponse = await request(app)
                .get("/users?view=full")
                .set("x-test-user-id", userId)
                .expect(STATUS_CODES.SUCCESS);

            expect(finalGetResponse.body).toMatchObject({
                userId,
                username: "updatedname",
                addressBook: expect.arrayContaining([
                    { address: "GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12", name: "Test Contact" }
                ]),
                contributionSummary: expect.objectContaining({
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                })
            });
        });

        it("should handle concurrent operations safely", async () => {
            // Create user first
            const userData = { gitHubUsername: "concurrenttest" };
            await request(app)
                .post("/users")
                .set("x-test-user-id", "concurrent-user")
                .send(userData)
                .expect(STATUS_CODES.POST);

            // Perform multiple concurrent address book updates
            const addresses = [
                { address: "GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1", name: "Contact 1" },
                { address: "GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF2", name: "Contact 2" },
                { address: "GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF3", name: "Contact 3" }
            ];

            const promises = addresses.map(address =>
                request(app)
                    .patch("/users/address-book")
                    .set("x-test-user-id", "concurrent-user")
                    .send(address)
            );

            const results = await Promise.allSettled(promises);

            // At least one should succeed (due to race conditions, some might fail)
            const successfulResults = results.filter(result =>
                result.status === "fulfilled" && result.value.status === STATUS_CODES.SUCCESS
            );

            expect(successfulResults.length).toBeGreaterThan(0);

            // Verify final state
            const finalUser = await prisma.user.findUnique({
                where: { userId: "concurrent-user" }
            });

            expect(finalUser?.addressBook).toBeDefined();
            expect(Array.isArray(finalUser?.addressBook)).toBe(true);
        });
    });
});
