import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { walletRoutes } from "../../../api/routes/wallet.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { STATUS_CODES, encrypt } from "../../../api/helper";
import { TransactionCategory } from "../../../prisma_client";

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
        getAccountInfo: jest.fn(),
        transferAsset: jest.fn(),
        swapAsset: jest.fn(),
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
        app.use("/wallet", (req, res, next) => {
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

        app.use("/wallet", walletRoutes);
        app.use(errorHandler);

        // Setup mocks
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
        mockStellarService.getAccountInfo.mockResolvedValue({
            balances: [
                {
                    asset_type: "native",
                    balance: "100.0000000"
                },
                {
                    asset_type: "credit_alphanum12",
                    asset_code: "USDC",
                    balance: "500.0000000"
                }
            ]
        });

        mockStellarService.transferAsset.mockResolvedValue({
            txHash: "mock_tx_hash_123"
        });

        mockStellarService.swapAsset.mockResolvedValue({
            txHash: "mock_swap_tx_hash_123"
        });

        mockStellarService.getTopUpTransactions.mockResolvedValue([]);

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("GET /wallet/account - Get Wallet Info", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should get user wallet info", async () => {
            const response = await request(app)
                .get("/wallet/account")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                balances: expect.arrayContaining([
                    expect.objectContaining({
                        asset_type: "native",
                        balance: "100.0000000"
                    }),
                    expect.objectContaining({
                        asset_type: "credit_alphanum12",
                        asset_code: "USDC",
                        balance: "500.0000000"
                    })
                ])
            });

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(testUser.walletAddress);
        });

        it("should get installation wallet info", async () => {
            const installation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...installation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            const response = await request(app)
                .get("/wallet/account?installationId=test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                balances: expect.any(Array)
            });

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(installation.walletAddress);
        });

        it("should return error when user not found", async () => {
            await request(app)
                .get("/wallet/account")
                .set("x-test-user-id", "non-existent-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when user not part of installation", async () => {
            const installation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({ data: installation });

            await request(app)
                .get("/wallet/account?installationId=test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("POST /wallet/withdraw - Withdraw Asset", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({
                userId: "test-user-1",
                walletSecret: encrypt("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
            });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should withdraw XLM successfully", async () => {
            const withdrawData = {
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "XLM",
                amount: "50"
            };

            const response = await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                txHash: "mock_tx_hash_123",
                category: TransactionCategory.WITHDRAWAL,
                amount: 50,
                asset: "XLM",
                destinationAddress: withdrawData.walletAddress
            });

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: { userId: "test-user-1", category: TransactionCategory.WITHDRAWAL }
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.amount).toBe(50);
        });

        it("should withdraw USDC successfully", async () => {
            const withdrawData = {
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "USDC",
                amount: "100"
            };

            const response = await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                txHash: "mock_tx_hash_123",
                category: TransactionCategory.WITHDRAWAL,
                amount: 100,
                asset: "XLM"
            });
        });

        it("should return error when insufficient XLM balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_type: "native",
                        balance: "2.0000000" // Only 1 XLM available after reserve
                    }
                ]
            });

            const withdrawData = {
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "XLM",
                amount: "50"
            };

            await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when insufficient USDC balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_type: "credit_alphanum12",
                        asset_code: "USDC",
                        balance: "50.0000000"
                    }
                ]
            });

            const withdrawData = {
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "USDC",
                amount: "100"
            };

            await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error for invalid amount", async () => {
            const withdrawData = {
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "XLM",
                amount: "-10"
            };

            await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should withdraw from installation wallet", async () => {
            const installation = TestDataFactory.installation({
                id: "test-installation-1",
                walletSecret: encrypt("SINSTALL000000000000000000000000000000000000000")
            });
            await prisma.installation.create({
                data: {
                    ...installation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            const withdrawData = {
                installationId: "test-installation-1",
                walletAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                assetType: "USDC",
                amount: "100"
            };

            const response = await request(app)
                .post("/wallet/withdraw")
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                txHash: "mock_tx_hash_123",
                category: TransactionCategory.WITHDRAWAL
            });

            // Verify transaction was recorded for installation
            const transaction = await prisma.transaction.findFirst({
                where: { installationId: "test-installation-1", category: TransactionCategory.WITHDRAWAL }
            });
            expect(transaction).toBeTruthy();
        });
    });

    describe("POST /wallet/swap - Swap Asset", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({
                userId: "test-user-1",
                walletSecret: encrypt("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
            });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should swap XLM to USDC successfully", async () => {
            const swapData = {
                toAssetType: "USDC",
                amount: "50",
                equivalentAmount: "45"
            };

            const response = await request(app)
                .post("/wallet/swap")
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                txHash: "mock_swap_tx_hash_123",
                category: TransactionCategory.SWAP_XLM,
                amount: 50,
                fromAmount: 50,
                toAmount: 45,
                assetFrom: "XLM",
                assetTo: "USDC"
            });

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: { userId: "test-user-1", category: TransactionCategory.SWAP_XLM }
            });
            expect(transaction).toBeTruthy();
        });

        it("should swap USDC to XLM successfully", async () => {
            const swapData = {
                toAssetType: "XLM",
                amount: "100",
                equivalentAmount: "110"
            };

            const response = await request(app)
                .post("/wallet/swap")
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                txHash: "mock_swap_tx_hash_123",
                category: TransactionCategory.SWAP_USDC,
                assetFrom: "USDC",
                assetTo: "XLM"
            });
        });

        it("should return error when insufficient balance for swap", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_type: "native",
                        balance: "2.0000000"
                    }
                ]
            });

            const swapData = {
                toAssetType: "USDC",
                amount: "50",
                equivalentAmount: "45"
            };

            await request(app)
                .post("/wallet/swap")
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe("GET /wallet/transactions - Get Transactions", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            // Create test transactions
            const transactions = [
                {
                    txHash: `test-tx-hash-${Date.now()}`,
                    category: TransactionCategory.TOP_UP,
                    amount: 20,
                    asset: "XLM",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    user: { connect: { userId: "test-user-1" } }
                },
                {
                    txHash: `test-tx-hash-${Date.now()}`,
                    category: TransactionCategory.TOP_UP,
                    amount: 45,
                    asset: "USDC",
                    sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                    doneAt: new Date(),
                    user: { connect: { userId: "test-user-1" } }
                },
                {
                    txHash: `test-tx-hash-${Date.now()}`,
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
                .get("/wallet/transactions")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.transactions).toHaveLength(3);
            expect(response.body.hasMore).toBe(false);
        });

        it("should filter transactions by category", async () => {
            const response = await request(app)
                .get("/wallet/transactions?categories=TOP_UP")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.transactions).toHaveLength(2);
            expect(response.body.transactions.every((tx: any) =>
                tx.category === TransactionCategory.TOP_UP
            )).toBe(true);
        });

        it("should paginate transactions", async () => {
            const response = await request(app)
                .get("/wallet/transactions?page=1&limit=2")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.transactions).toHaveLength(2);
            expect(response.body.hasMore).toBe(true);
        });

        it("should sort transactions", async () => {
            const response = await request(app)
                .get("/wallet/transactions?sort=asc")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            const transactions = response.body.transactions;
            expect(transactions).toHaveLength(3);
        });

        it("should get transactions for installation", async () => {
            const installation = TestDataFactory.installation({ id: "test-installation-1" });
            await prisma.installation.create({
                data: {
                    ...installation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            const installationTx = {
                txHash: `test-tx-hash-${Date.now()}`,
                category: TransactionCategory.TOP_UP,
                amount: 20,
                asset: "XLM",
                sourceAddress: "GDEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12",
                doneAt: new Date(),
                installation: { connect: { id: "test-installation-1" } }
            };
            await prisma.transaction.create({ data: installationTx });

            const response = await request(app)
                .get("/wallet/transactions?installationId=test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.transactions).toHaveLength(1);
            expect(response.body.transactions[0].category).toBe(TransactionCategory.TOP_UP);
        });
    });

    describe("POST /wallet/transactions/record-topups - Record Wallet Topups", () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
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
                    from: "GSOURCE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
                    created_at: new Date().toISOString()
                },
                {
                    transaction_hash: "tx_hash_2",
                    amount: "50.0000000",
                    asset_type: "native",
                    from: "GSOURCE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
                    created_at: new Date().toISOString()
                }
            ]);

            const response = await request(app)
                .post("/wallet/transactions/record-topups")
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Successfully processed 2 topup transactions",
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
                    sourceAddress: "GSOURCE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
                    userId: "test-user-1"
                }
            });

            mockStellarService.getTopUpTransactions.mockResolvedValue([
                {
                    transaction_hash: "tx_hash_1",
                    amount: "100.0000000",
                    asset_type: "credit_alphanum12",
                    asset_code: "USDC",
                    from: "GSOURCE1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
                    created_at: new Date().toISOString()
                }
            ]);

            const response = await request(app)
                .post("/wallet/transactions/record-topups")
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No new topup transactions found",
                processed: 0
            });
        });

        it("should return message when no topup transactions found", async () => {
            mockStellarService.getTopUpTransactions.mockResolvedValue([]);

            const response = await request(app)
                .post("/wallet/transactions/record-topups")
                .set("x-test-user-id", "test-user-1")
                .send({})
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No new topup transactions found",
                processed: 0
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle Stellar service errors gracefully", async () => {
            mockStellarService.getAccountInfo.mockRejectedValue(
                new Error("Stellar network error")
            );

            const testUser = TestDataFactory.user({ userId: "test-user-1" });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get("/wallet/account")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNKNOWN);
        });
    });
});
