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
        getAccountInfo: jest.fn(),
        transferAsset: jest.fn(),
        swapAsset: jest.fn()
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

        mockStellarService.getAccountInfo.mockResolvedValue({
            subentry_count: 0,
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
            txHash: "mock_swap_tx_hash_123",
            receivedAmount: "45"
        });

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"])} - Get Wallet Info`, () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: "test-user-1" });
            // Remove wallet fields from test data factory result if they exist
            await prisma.user.create({
                data: {
                    ...testUser,
                    wallet: TestDataFactory.createWalletRelation("GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII"),
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should get user wallet info", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"]))
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
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

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith("GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII");
        });

        it("should get installation wallet info", async () => {
            const installation = TestDataFactory.installation({ id: "12345678" });
            // Remove wallet fields
            await prisma.installation.create({
                data: {
                    ...installation,
                    wallet: TestDataFactory.createWalletRelation("GINSTALLWALLET1234567890ABCDEF1234567890ABCDEF1234567890"),
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            const response = await request(app)
                .get(`${getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"])}?installationId=12345678`)
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                balances: expect.any(Array)
            });

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith("GINSTALLWALLET1234567890ABCDEF1234567890ABCDEF1234567890");
        });

        it("should return error when user not found", async () => {
            await request(app)
                .get(getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"]))
                .set("x-test-user-id", "non-existent-user")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when user not part of installation", async () => {
            const installation = TestDataFactory.installation({ id: "12345678" });
            // Remove wallet fields
            await prisma.installation.create({
                data: {
                    ...installation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            await request(app)
                .get(`${getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"])}?installationId=12345678`)
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WALLET", "WITHDRAW"])} - Withdraw Asset`, () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({
                userId: "test-user-1"
            });
            // Remove wallet fields
            await prisma.user.create({
                data: {
                    ...testUser,
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });
        });

        it("should withdraw XLM successfully", async () => {
            const withdrawData = {
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "XLM",
                amount: "50"
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
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
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "USDC",
                amount: "100"
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                txHash: "mock_tx_hash_123",
                category: TransactionCategory.WITHDRAWAL,
                amount: 100,
                asset: "USDC"
            });
        });

        it("should return error when insufficient XLM balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                subentry_count: 0,
                balances: [
                    {
                        asset_type: "native",
                        balance: "2.0000000" // Only 1 XLM available after reserve
                    }
                ]
            });

            const withdrawData = {
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "XLM",
                amount: "50"
            };

            await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when insufficient USDC balance", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                subentry_count: 0,
                balances: [
                    {
                        asset_type: "credit_alphanum12",
                        asset_code: "USDC",
                        balance: "50.0000000"
                    }
                ]
            });

            const withdrawData = {
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "USDC",
                amount: "100"
            };

            await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error for invalid amount", async () => {
            const withdrawData = {
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "XLM",
                amount: "-10"
            };

            await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should withdraw from installation wallet", async () => {
            const installation = TestDataFactory.installation({
                id: "12345678"
            });
            // Remove wallet fields
            await prisma.installation.create({
                data: {
                    ...installation,
                    wallet: TestDataFactory.createWalletRelation(),
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            const withdrawData = {
                installationId: "12345678",
                walletAddress: "GBPOJZGQPO23FSADGDD3PQFRGLWTETJRK2IY4D5HEQXLDCDEHYFSAAII",
                assetType: "USDC",
                amount: "100"
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["WALLET", "WITHDRAW"]))
                .set("x-test-user-id", "test-user-1")
                .send(withdrawData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                txHash: "mock_tx_hash_123",
                category: TransactionCategory.WITHDRAWAL
            });

            // Verify transaction was recorded for installation
            const transaction = await prisma.transaction.findFirst({
                where: { installationId: "12345678", category: TransactionCategory.WITHDRAWAL }
            });
            expect(transaction).toBeTruthy();
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WALLET", "SWAP"])} - Swap Asset`, () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({
                userId: "test-user-1"
            });
            // Remove wallet fields
            await prisma.user.create({
                data: {
                    ...testUser,
                    wallet: TestDataFactory.createWalletRelation(),
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
                .post(getEndpointWithPrefix(["WALLET", "SWAP"]))
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
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
                .post(getEndpointWithPrefix(["WALLET", "SWAP"]))
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                txHash: "mock_swap_tx_hash_123",
                category: TransactionCategory.SWAP_USDC,
                assetFrom: "USDC",
                assetTo: "XLM"
            });
        });

        it("should return error when insufficient balance for swap", async () => {
            mockStellarService.getAccountInfo.mockResolvedValue({
                subentry_count: 0,
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
                .post(getEndpointWithPrefix(["WALLET", "SWAP"]))
                .set("x-test-user-id", "test-user-1")
                .send(swapData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe("Error Handling", () => {
        it("should handle Stellar service errors gracefully", async () => {
            mockStellarService.getAccountInfo.mockRejectedValue(
                new Error("Stellar network error")
            );

            const testUser = TestDataFactory.user({ userId: "test-user-1" });
            // Remove wallet fields
            await prisma.user.create({
                data: {
                    ...testUser,
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get(getEndpointWithPrefix(["WALLET", "GET_ACCOUNT"]))
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNKNOWN);
        });
    });
});
