import { Request, Response, NextFunction } from "express";
import {
    withdrawAsset,
    swapAsset,
    getWalletInfo,
    getTransactions,
    recordWalletTopups
} from "../../../api/controllers/wallet.controller";
import { prisma } from "../../../api/config/database.config";
import { stellarService } from "../../../api/services/stellar.service";
import { decrypt } from "../../../api/helper";
import { ErrorClass, NotFoundErrorClass } from "../../../api/models/general.model";
import { TransactionCategory } from "../../../api/generated/client";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { createMockRequest, createMockResponse, createMockNext } from "../../helpers/test-utils";

// Mock dependencies
jest.mock("../../../api/config/database.config", () => ({
    prisma: {
        installation: {
            findFirst: jest.fn()
        },
        user: {
            findUnique: jest.fn()
        },
        transaction: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn()
        },
        $transaction: jest.fn()
    }
}));

jest.mock("../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: jest.fn(),
        transferAsset: jest.fn(),
        swapAsset: jest.fn(),
        getTopUpTransactions: jest.fn()
    }
}));

jest.mock("../../../api/helper", () => ({
    decrypt: jest.fn()
}));

describe("WalletController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockPrisma = prisma as any;
    const mockStellarService = stellarService as jest.Mocked<typeof stellarService>;
    const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
        TestDataFactory.resetCounters();
    });

    describe("withdrawAsset", () => {
        const testBody = {
            userId: "test-user-123",
            walletAddress: "GDESTINATION123",
            assetType: "USDC",
            amount: "100.0"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
        });

        it("should withdraw USDC from user wallet successfully", async () => {
            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "500.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            const mockTransaction = {
                id: "transaction-123",
                txHash: "withdrawal-tx-hash",
                category: TransactionCategory.WITHDRAWAL,
                amount: 100.0,
                asset: "USDC",
                destinationAddress: testBody.walletAddress
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "withdrawal-tx-hash" });
            mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testBody.userId },
                select: { walletSecret: true, walletAddress: true }
            });

            expect(mockDecrypt).toHaveBeenCalledWith(mockUser.walletSecret);
            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(mockUser.walletAddress);
            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                "decrypted_user_secret",
                testBody.walletAddress,
                expect.any(Object),
                expect.any(Object),
                testBody.amount
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
        });

        it("should withdraw XLM from user wallet successfully", async () => {
            mockRequest.body = { ...testBody, assetType: "XLM" };

            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_type: "native",
                        balance: "150.0"
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "xlm-withdrawal-tx" });
            mockPrisma.transaction.create.mockResolvedValue({});

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                "decrypted_user_secret",
                testBody.walletAddress,
                expect.any(Object),
                expect.any(Object),
                testBody.amount
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should withdraw from installation wallet when installationId provided", async () => {
            mockRequest.body = { ...testBody, installationId: "test-installation-123" };

            const mockInstallation = {
                walletAddress: "GINSTALL123",
                walletSecret: "encrypted_installation_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "500.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockDecrypt.mockReturnValue("decrypted_installation_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "installation-withdrawal-tx" });
            mockPrisma.transaction.create.mockResolvedValue({});

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "test-installation-123",
                    users: {
                        some: {
                            userId: testBody.userId
                        }
                    }
                },
                select: { walletSecret: true, walletAddress: true }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should throw error for invalid amount", async () => {
            mockRequest.body = { ...testBody, amount: "invalid" };

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ValidationError",
                    message: "Invalid amount specified"
                })
            );
        });

        it("should throw error for insufficient USDC balance", async () => {
            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "50.0", // Less than withdrawal amount
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "InsufficientFundsError",
                    message: "Insufficient USDC balance"
                })
            );
        });

        it("should throw error for insufficient XLM balance (considering reserve)", async () => {
            mockRequest.body = { ...testBody, assetType: "XLM", amount: "50.0" };

            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_type: "native",
                        balance: "50.5" // Only 49.5 available after 1 XLM reserve
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "InsufficientFundsError",
                    message: "Insufficient XLM balance (1 XLM reserve required)"
                })
            );
        });

        it("should throw error when user not found", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should throw error when installation not found or user not authorized", async () => {
            mockRequest.body = { ...testBody, installationId: "test-installation-123" };

            mockPrisma.installation.findFirst.mockResolvedValue(null);

            await withdrawAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TransactionError",
                    message: "Installation does not exist or user is not part of this installation."
                })
            );
        });
    });
    describe("swapAsset", () => {
        const testBody = {
            userId: "test-user-123",
            toAssetType: "USDC",
            amount: "50.0",
            equivalentAmount: "49.5"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
        });

        it("should swap XLM to USDC successfully", async () => {
            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_type: "native",
                        balance: "100.0"
                    }
                ]
            };

            const mockTransaction = {
                id: "swap-transaction-123",
                txHash: "swap-tx-hash",
                category: TransactionCategory.SWAP_XLM,
                amount: 50.0,
                fromAmount: 50.0,
                toAmount: 49.5,
                assetFrom: "XLM",
                assetTo: "USDC"
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.swapAsset.mockResolvedValue({ txHash: "swap-tx-hash" });
            mockPrisma.transaction.create.mockResolvedValue(mockTransaction);

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.swapAsset).toHaveBeenCalledWith(
                "decrypted_user_secret",
                testBody.amount
            );

            expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    txHash: "swap-tx-hash",
                    category: TransactionCategory.SWAP_XLM,
                    amount: 50.0,
                    fromAmount: 50.0,
                    toAmount: 49.5,
                    assetFrom: "XLM",
                    assetTo: "USDC",
                    user: { connect: { userId: testBody.userId } }
                })
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockTransaction);
        });

        it("should swap USDC to XLM successfully", async () => {
            mockRequest.body = { ...testBody, toAssetType: "XLM" };

            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "100.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.swapAsset.mockResolvedValue({ txHash: "usdc-swap-tx" });
            mockPrisma.transaction.create.mockResolvedValue({});

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.swapAsset).toHaveBeenCalledWith(
                "decrypted_user_secret",
                testBody.amount,
                expect.any(Object),
                expect.any(Object)
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should handle installation wallet swap", async () => {
            mockRequest.body = { ...testBody, installationId: "test-installation-123" };

            const mockInstallation = {
                walletAddress: "GINSTALL123",
                walletSecret: "encrypted_installation_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_type: "native",
                        balance: "100.0"
                    }
                ]
            };

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockDecrypt.mockReturnValue("decrypted_installation_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);
            mockStellarService.swapAsset.mockResolvedValue({ txHash: "installation-swap-tx" });
            mockPrisma.transaction.create.mockResolvedValue({});

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.transaction.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    installation: { connect: { id: "test-installation-123" } }
                })
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should throw error for insufficient XLM balance for swap", async () => {
            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_type: "native",
                        balance: "40.0" // Only 39 available after 1 XLM reserve
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "InsufficientFundsError",
                    message: "Insufficient XLM balance for swap (1 XLM reserve required)"
                })
            );
        });

        it("should throw error for insufficient USDC balance for swap", async () => {
            mockRequest.body = { ...testBody, toAssetType: "XLM" };

            const mockUser = {
                walletAddress: "GUSER123",
                walletSecret: "encrypted_user_secret"
            };

            const mockAccountInfo: any = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "30.0", // Less than swap amount
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockDecrypt.mockReturnValue("decrypted_user_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "InsufficientFundsError",
                    message: "Insufficient USDC balance for swap"
                })
            );
        });

        it("should throw error for invalid amount", async () => {
            mockRequest.body = { ...testBody, amount: "invalid" };

            await swapAsset(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ValidationError",
                    message: "Invalid amount specified"
                })
            );
        });
    });

    describe("getWalletInfo", () => {
        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should return user wallet info successfully", async () => {
            const mockUser = {
                walletAddress: "GUSER123"
            };

            const mockAccountInfo: any = {
                account_id: "GUSER123",
                balances: [
                    {
                        asset_type: "native",
                        balance: "100.0"
                    },
                    {
                        asset_code: "USDC",
                        balance: "250.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await getWalletInfo(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testBody.userId },
                select: { walletAddress: true }
            });

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(mockUser.walletAddress);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockAccountInfo);
        });

        it("should return installation wallet info when installationId provided", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            const mockInstallation = {
                walletAddress: "GINSTALL123"
            };

            const mockAccountInfo: any = {
                account_id: "GINSTALL123",
                balances: []
            };

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo);

            await getWalletInfo(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "test-installation-123",
                    users: {
                        some: {
                            userId: testBody.userId
                        }
                    }
                },
                select: { walletAddress: true }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockAccountInfo);
        });

        it("should throw error when user not found", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await getWalletInfo(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should throw error when installation not found or user not authorized", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            mockPrisma.installation.findFirst.mockResolvedValue(null);

            await getWalletInfo(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TransactionError",
                    message: "Installation does not exist or user is not part of this installation."
                })
            );
        });
    });

    describe("getTransactions", () => {
        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should return user transactions with default parameters", async () => {
            const mockUser = {
                username: "testuser"
            };

            const mockTransactions = [
                TestDataFactory.transaction({ userId: testBody.userId }),
                TestDataFactory.transaction({ userId: testBody.userId, category: TransactionCategory.TOP_UP })
            ];

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testBody.userId },
                select: { username: true }
            });

            expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
                where: { userId: testBody.userId },
                orderBy: { doneAt: "desc" },
                skip: 0,
                take: 20,
                include: {
                    task: {
                        select: {
                            id: true,
                            issue: true,
                            bounty: true,
                            contributor: { select: { userId: true, username: true } }
                        }
                    }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                transactions: mockTransactions,
                hasMore: false
            });
        });

        it("should filter transactions by categories", async () => {
            mockRequest.query = { categories: "BOUNTY,TOP_UP" };

            const mockUser = { username: "testuser" };
            const mockTransactions = [TestDataFactory.transaction()];

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
                where: {
                    userId: testBody.userId,
                    category: { in: ["BOUNTY", "TOP_UP"] }
                },
                orderBy: { doneAt: "desc" },
                skip: 0,
                take: 20,
                include: expect.any(Object)
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should handle pagination and sorting", async () => {
            mockRequest.query = { page: "2", limit: "10", sort: "asc" };

            const mockUser = { username: "testuser" };
            const mockTransactions = Array.from({ length: 10 }, () => TestDataFactory.transaction());

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
                where: { userId: testBody.userId },
                orderBy: { doneAt: "asc" },
                skip: 10, // (page 2 - 1) * limit 10
                take: 10,
                include: expect.any(Object)
            });

            expect(mockResponse.json).toHaveBeenCalledWith({
                transactions: mockTransactions,
                hasMore: true // 10 transactions returned = limit, so hasMore is true
            });
        });

        it("should return installation transactions when installationId provided", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            const mockInstallation = {
                id: "test-installation-123"
            };

            const mockTransactions = [
                TestDataFactory.transaction({ installationId: "test-installation-123" })
            ];

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.transaction.findMany.mockResolvedValue(mockTransactions);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findFirst).toHaveBeenCalledWith({
                where: {
                    id: "test-installation-123",
                    users: {
                        some: {
                            userId: testBody.userId
                        }
                    }
                },
                select: { id: true }
            });

            expect(mockPrisma.transaction.findMany).toHaveBeenCalledWith({
                where: { installationId: "test-installation-123" },
                orderBy: { doneAt: "desc" },
                skip: 0,
                take: 20,
                include: expect.any(Object)
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should throw error when user not found", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should throw error when installation not found or user not authorized", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            mockPrisma.installation.findFirst.mockResolvedValue(null);

            await getTransactions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TransactionError",
                    message: "User is not part of this installation."
                })
            );
        });
    });

    describe("recordWalletTopups", () => {
        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should record new topup transactions for user wallet", async () => {
            const mockUser = {
                username: "testuser",
                walletAddress: "GUSER123"
            };

            const mockStellarTopups: any[] = [
                {
                    transaction_hash: "new-topup-tx-1",
                    amount: "100.0",
                    asset_type: "native",
                    from: "GSENDER123",
                    created_at: "2023-01-01T00:00:00Z"
                },
                {
                    transaction_hash: "new-topup-tx-2",
                    amount: "50.0",
                    asset_code: "USDC",
                    asset_type: "credit_alphanum12",
                    from: "GSENDER456",
                    created_at: "2023-01-02T00:00:00Z"
                }
            ];

            // const mockCreatedTransactions = [
            //     { txHash: "new-topup-tx-1", amount: 100.0, asset: "XLM" },
            //     { txHash: "new-topup-tx-2", amount: 50.0, asset: "USDC" }
            // ];

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockStellarService.getTopUpTransactions.mockResolvedValue(mockStellarTopups);
            mockPrisma.transaction.findFirst.mockResolvedValue(null); // No previous topups
            mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.getTopUpTransactions).toHaveBeenCalledWith(mockUser.walletAddress);

            expect(mockPrisma.$transaction).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.objectContaining({
                            txHash: "new-topup-tx-1",
                            category: TransactionCategory.TOP_UP,
                            amount: 100.0,
                            asset: "XLM",
                            sourceAddress: "GSENDER123",
                            doneAt: new Date("2023-01-01T00:00:00Z"),
                            user: { connect: { userId: testBody.userId } }
                        })
                    }),
                    expect.objectContaining({
                        data: expect.objectContaining({
                            txHash: "new-topup-tx-2",
                            category: TransactionCategory.TOP_UP,
                            amount: 50.0,
                            asset: "USDC",
                            sourceAddress: "GSENDER456",
                            doneAt: new Date("2023-01-02T00:00:00Z"),
                            user: { connect: { userId: testBody.userId } }
                        })
                    })
                ])
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Successfully processed 2 topup transactions",
                processed: 2,
                transactions: expect.arrayContaining([
                    expect.objectContaining({
                        txHash: "new-topup-tx-1",
                        amount: 100.0,
                        asset: "XLM",
                        sourceAddress: "GSENDER123",
                        doneAt: new Date("2023-01-01T00:00:00Z")
                    }),
                    expect.objectContaining({
                        txHash: "new-topup-tx-2",
                        amount: 50.0,
                        asset: "USDC",
                        sourceAddress: "GSENDER456",
                        doneAt: new Date("2023-01-02T00:00:00Z")
                    })
                ])
            });
        });

        it("should handle installation wallet topups with escrow refunds", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            const mockInstallation = {
                id: "test-installation-123",
                walletAddress: "GINSTALL123",
                escrowAddress: "GESCROW123"
            };

            const mockStellarTopups: any[] = [
                {
                    transaction_hash: "escrow-refund-tx",
                    amount: "200.0",
                    asset_code: "USDC",
                    asset_type: "credit_alphanum12",
                    from: "GESCROW123", // From escrow address
                    created_at: "2023-01-01T00:00:00Z"
                }
            ];

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockStellarService.getTopUpTransactions.mockResolvedValue(mockStellarTopups);
            mockPrisma.transaction.findFirst.mockResolvedValue(null);
            mockPrisma.$transaction.mockImplementation((operations: any) => Promise.resolve(operations));

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.$transaction).toHaveBeenCalledWith(
                expect.arrayContaining([
                    expect.objectContaining({
                        data: expect.objectContaining({
                            txHash: "escrow-refund-tx",
                            category: TransactionCategory.TOP_UP,
                            amount: 200.0,
                            asset: "USDC",
                            sourceAddress: "Escrow Refunds", // Special label for escrow refunds
                            doneAt: new Date("2023-01-01T00:00:00Z"),
                            installation: { connect: { id: "test-installation-123" } }
                        })
                    })
                ])
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should return no new transactions when all topups already recorded", async () => {
            const mockUser = {
                username: "testuser",
                walletAddress: "GUSER123"
            };

            const mockStellarTopups: any[] = [
                {
                    transaction_hash: "existing-topup-tx",
                    amount: "100.0",
                    asset_type: "native",
                    from: "GSENDER123",
                    created_at: "2023-01-01T00:00:00Z"
                }
            ];

            const mockLastRecordedTopup = {
                txHash: "existing-topup-tx"
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockStellarService.getTopUpTransactions.mockResolvedValue(mockStellarTopups);
            mockPrisma.transaction.findFirst.mockResolvedValue(mockLastRecordedTopup);

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "No new topup transactions found",
                processed: 0
            });
        });

        it("should return no transactions when no stellar topups found", async () => {
            const mockUser = {
                username: "testuser",
                walletAddress: "GUSER123"
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockStellarService.getTopUpTransactions.mockResolvedValue([]);

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "No new topup transactions found",
                processed: 0
            });
        });

        it("should throw error when user not found", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should throw error when installation not found or user not authorized", async () => {
            mockRequest.query = { installationId: "test-installation-123" };

            mockPrisma.installation.findFirst.mockResolvedValue(null);

            await recordWalletTopups(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TransactionError",
                    message: "User is not part of this installation."
                })
            );
        });
    });
});
