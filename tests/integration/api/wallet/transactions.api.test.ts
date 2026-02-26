import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { walletRoutes } from "../../../../api/routes/wallet.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { TransactionCategory } from "../../../../prisma_client";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock Stellar service for wallet operations
jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        getTopUpTransactions: jest.fn()
    }
}));

describe("Wallet API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockStellarService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with wallet routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.WALLET.PREFIX, (req, res, next) => {
            res.locals.user = {
                uid: req.headers["x-test-user-id"] || "test-user-1",
                admin: req.headers["x-test-admin"] === "true"
            };
            res.locals.userId = req.headers["x-test-user-id"] || "test-user-1";
            next();
        });

        app.use(ENDPOINTS.WALLET.PREFIX, walletRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { stellarService } = await import("../../../../api/services/stellar.service");
        mockStellarService = stellarService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        mockStellarService.getTopUpTransactions.mockResolvedValue([]);

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_USER"])} - Get User Transactions`, () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            // Create test transactions for the user
            const now = Date.now();
            const transactions = [
                {
                    txHash: `test-tx-hash-${now}-1`,
                    category: TransactionCategory.TOP_UP,
                    amount: 20,
                    asset: "XLM",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    user: { connect: { userId: "test-user-1" } }
                },
                {
                    txHash: `test-tx-hash-${now}-2`,
                    category: TransactionCategory.TOP_UP,
                    amount: 45,
                    asset: "USDC",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    user: { connect: { userId: "test-user-1" } }
                },
                {
                    txHash: `test-tx-hash-${now}-3`,
                    category: TransactionCategory.WITHDRAWAL,
                    amount: 67,
                    asset: "XLM",
                    destinationAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    user: { connect: { userId: "test-user-1" } }
                }
            ];

            for (const transaction of transactions) {
                await prisma.transaction.create({ data: transaction });
            }
        });

        it("should get all transactions for user", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_USER"]))
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination.hasMore).toBe(false);
        });

        it("should paginate user transactions", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_USER"])}?page=1&limit=2`)
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.hasMore).toBe(true);
        });

        it("should sort user transactions", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_USER"])}?sort=asc`)
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(3);
        });

        it("should return error when user not found", async () => {
            await request(app)
                .get(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_USER"]))
                .set("x-test-user-id", "nonexistent-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"])} - Get Installation Transactions`, () => {
        let testUser: any;
        const installationId = "12345678";

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            const installation = TestDataFactory.installation({ id: installationId });
            await prisma.installation.create({
                data: {
                    ...installation,
                    users: { connect: { userId: "test-user-1" } },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create test transactions for the installation
            const now = Date.now();
            const transactions = [
                {
                    txHash: `test-tx-hash-${now}-1`,
                    category: TransactionCategory.TOP_UP,
                    amount: 20,
                    asset: "XLM",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    installation: { connect: { id: installationId } }
                },
                {
                    txHash: `test-tx-hash-${now}-2`,
                    category: TransactionCategory.TOP_UP,
                    amount: 45,
                    asset: "USDC",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    installation: { connect: { id: installationId } }
                },
                {
                    txHash: `test-tx-hash-${now}-3`,
                    category: TransactionCategory.WITHDRAWAL,
                    amount: 67,
                    asset: "USDC",
                    destinationAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    installation: { connect: { id: installationId } }
                }
            ];

            for (const transaction of transactions) {
                await prisma.transaction.create({ data: transaction });
            }
        });

        it("should get all transactions for installation", async () => {
            const response = await request(app)
                .get(
                    getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"])
                        .replace(":installationId", installationId)
                )
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(3);
            expect(response.body.pagination.hasMore).toBe(false);
        });

        it("should filter transactions by category", async () => {
            const response = await request(app)
                .get(
                    `${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"]).replace(":installationId", installationId)}?categories=TOP_UP`
                )
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.every((tx: any) =>
                tx.category === TransactionCategory.TOP_UP
            )).toBe(true);
        });

        it("should paginate installation transactions", async () => {
            const response = await request(app)
                .get(
                    `${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"]).replace(":installationId", installationId)}?page=1&limit=2`
                )
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination.hasMore).toBe(true);
        });

        it("should sort installation transactions", async () => {
            const response = await request(app)
                .get(
                    `${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"]).replace(":installationId", installationId)}?sort=asc`
                )
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toHaveLength(3);
        });

        it("should return error when user is not part of installation", async () => {
            const otherInstallation = TestDataFactory.installation({ id: "11111111" });
            await prisma.installation.create({
                data: {
                    ...otherInstallation,
                    wallet: TestDataFactory.createWalletRelation()
                    // no users connected
                }
            });

            await request(app)
                .get(
                    getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "GET_ALL_INSTALLATION"])
                        .replace(":installationId", "11111111")
                )
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "RECORD_TOPUPS"])} - Record Wallet Topups`, () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should record new topup transactions", async () => {
            mockStellarService.getTopUpTransactions.mockResolvedValue([
                {
                    transaction_hash: "tx_hash_1",
                    amount: "100.0000000",
                    asset_type: "credit_alphanum12",
                    asset_code: "USDC",
                    from: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                    created_at: new Date().toISOString()
                },
                {
                    transaction_hash: "tx_hash_2",
                    amount: "50.0000000",
                    asset_type: "native",
                    from: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                    created_at: new Date().toISOString()
                }
            ]);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "RECORD_TOPUPS"]))
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Successfully processed 2 topup transactions",
                data: {
                    processed: 2,
                    transactions: expect.arrayContaining([
                        expect.objectContaining({
                            txHash: "tx_hash_1",
                            amount: 100,
                            asset: "USDC"
                        }),
                        expect.objectContaining({
                            txHash: "tx_hash_2",
                            amount: 50,
                            asset: "XLM"
                        })
                    ])
                }
            });

            // Verify transactions were recorded
            const transactions = await prisma.transaction.findMany({
                where: { userId: "test-user-1", category: TransactionCategory.TOP_UP }
            });
            expect(transactions).toHaveLength(2);
        });

        it("should not record duplicate topup transactions", async () => {
            // Create existing transaction
            await prisma.transaction.create({
                data: {
                    txHash: "tx_hash_1",
                    category: TransactionCategory.TOP_UP,
                    amount: 100,
                    asset: "USDC",
                    sourceAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                    userId: "test-user-1"
                }
            });

            mockStellarService.getTopUpTransactions.mockResolvedValue([
                {
                    transaction_hash: "tx_hash_1",
                    amount: "100.0000000",
                    asset_type: "credit_alphanum12",
                    asset_code: "USDC",
                    from: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                    created_at: new Date().toISOString()
                }
            ]);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "RECORD_TOPUPS"]))
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No new topup transactions found",
                data: { processed: 0 }
            });
        });

        it("should return message when no topup transactions found", async () => {
            mockStellarService.getTopUpTransactions.mockResolvedValue([]);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "RECORD_TOPUPS"]))
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No new topup transactions found",
                data: { processed: 0 }
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle Stellar service errors gracefully", async () => {
            mockStellarService.getTopUpTransactions.mockRejectedValue(
                new Error("Stellar network error")
            );

            const testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            await request(app)
                .post(getEndpointWithPrefix(["WALLET", "TRANSACTIONS", "RECORD_TOPUPS"]))
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.UNKNOWN);
        });
    });
});
