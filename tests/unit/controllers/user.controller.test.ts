import { Request, Response, NextFunction } from "express";
import { getUser, createUser, updateUsername, updateAddressBook } from "../../../api/controllers/user.controller";
import { prisma } from "../../../api/config/database.config";
import { stellarService } from "../../../api/services/stellar.service";
import { encrypt } from "../../../api/helper";
import { ErrorClass, NotFoundErrorClass } from "../../../api/models/general.model";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { createMockRequest, createMockResponse, createMockNext } from "../../helpers/test-utils";

// Mock dependencies
jest.mock("../../../api/config/database.config", () => ({
    prisma: {
        user: {
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn()
        }
    }
}));

jest.mock("../../../api/services/stellar.service", () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

jest.mock("../../../api/helper", () => ({
    encrypt: jest.fn()
}));

// Mock environment variables
process.env.STELLAR_MASTER_SECRET_KEY = "MOCK_MASTER_SECRET";

describe("UserController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockPrisma = prisma as any;
    const mockStellarService = stellarService as jest.Mocked<typeof stellarService>;
    const mockEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
        TestDataFactory.resetCounters();
    });

    describe("getUser", () => {
        const testUser = TestDataFactory.user({
            userId: "test-user-123",
            username: "testuser",
            walletAddress: "GTEST123"
        });

        beforeEach(() => {
            mockRequest.body = { userId: testUser.userId };
            mockRequest.query = {};
        });

        it("should return user with basic view by default", async () => {
            const mockUserData = {
                ...testUser,
                _count: { installations: 2 },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUserData);

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testUser.userId },
                select: {
                    userId: true,
                    username: true,
                    walletAddress: true,
                    addressBook: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            installations: true
                        }
                    }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUserData);
        });

        it("should return user with full view when requested", async () => {
            mockRequest.query = { view: "full" };

            const mockUserData = {
                ...testUser,
                _count: { installations: 2 },
                contributionSummary: {
                    tasksCompleted: 5,
                    activeTasks: 2,
                    totalEarnings: 500.0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUserData);

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testUser.userId },
                select: {
                    userId: true,
                    username: true,
                    walletAddress: true,
                    addressBook: true,
                    createdAt: true,
                    updatedAt: true,
                    _count: {
                        select: {
                            installations: true
                        }
                    },
                    contributionSummary: {
                        select: {
                            tasksCompleted: true,
                            activeTasks: true,
                            totalEarnings: true
                        }
                    }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUserData);
        });

        it("should create wallet when setWallet=true and user has no wallet", async () => {
            mockRequest.query = { setWallet: "true" };

            const userWithoutWallet = {
                ...testUser,
                walletAddress: "",
                _count: { installations: 1 },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockWallet = {
                publicKey: "GNEW_WALLET_KEY",
                secretKey: "SNEW_WALLET_SECRET",
                txHash: "tx-hash"
            };

            const updatedUser = {
                ...userWithoutWallet,
                walletAddress: mockWallet.publicKey,
                walletSecret: "encrypted_secret"
            };

            mockPrisma.user.findUnique.mockResolvedValue(userWithoutWallet);
            mockStellarService.createWallet.mockResolvedValue(mockWallet);
            mockEncrypt.mockReturnValue("encrypted_secret");
            mockPrisma.user.update.mockResolvedValue(updatedUser);
            mockStellarService.addTrustLineViaSponsor.mockResolvedValue({ txHash: "tx-hash" });

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.createWallet).toHaveBeenCalled();
            expect(mockEncrypt).toHaveBeenCalledWith(mockWallet.secretKey);
            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { userId: testUser.userId },
                data: {
                    walletAddress: mockWallet.publicKey,
                    walletSecret: "encrypted_secret"
                },
                select: expect.any(Object)
            });
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledWith(
                process.env.STELLAR_MASTER_SECRET_KEY,
                mockWallet.secretKey
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: updatedUser,
                walletStatus: { wallet: true, usdcTrustline: true }
            });
        });

        it("should handle wallet creation failure gracefully", async () => {
            mockRequest.query = { setWallet: "true" };

            const userWithoutWallet = {
                ...testUser,
                walletAddress: "",
                _count: { installations: 1 },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(userWithoutWallet);
            mockStellarService.createWallet.mockRejectedValue(new Error("Wallet creation failed"));

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: userWithoutWallet,
                error: expect.any(Error),
                walletStatus: { wallet: false, usdcTrustline: false },
                message: "Failed to create wallet"
            });
        });

        it("should handle trustline creation failure gracefully", async () => {
            mockRequest.query = { setWallet: "true" };

            const userWithoutWallet = {
                ...testUser,
                walletAddress: "",
                _count: { installations: 1 },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const mockWallet = {
                publicKey: "GNEW_WALLET_KEY",
                secretKey: "SNEW_WALLET_SECRET",
                txHash: "tx-hash"
            };

            const updatedUser = {
                ...userWithoutWallet,
                walletAddress: mockWallet.publicKey,
                walletSecret: "encrypted_secret"
            };

            mockPrisma.user.findUnique.mockResolvedValue(userWithoutWallet);
            mockStellarService.createWallet.mockResolvedValue(mockWallet);
            mockEncrypt.mockReturnValue("encrypted_secret");
            mockPrisma.user.update.mockResolvedValue(updatedUser);
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(new Error("Trustline failed"));

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                user: updatedUser,
                error: expect.any(Error),
                walletStatus: { wallet: true, usdcTrustline: false },
                message: "Created wallet but failed to add USDC trustline for wallet"
            });
        });

        it("should throw NotFoundError when user does not exist", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should handle database errors", async () => {
            const dbError = new Error("Database connection failed");
            mockPrisma.user.findUnique.mockRejectedValue(dbError);

            await getUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(dbError);
        });
    });

    describe("createUser", () => {
        const testUserData = {
            userId: "new-user-123",
            gitHubUsername: "newuser"
        };

        beforeEach(() => {
            mockRequest.body = testUserData;
            mockRequest.query = {};
        });

        it("should create user with wallet by default", async () => {
            const mockWallet = {
                publicKey: "GNEW_USER_WALLET",
                secretKey: "SNEW_USER_SECRET",
                txHash: "tx-hash"
            };

            const createdUser = {
                userId: testUserData.userId,
                username: testUserData.gitHubUsername,
                walletAddress: mockWallet.publicKey,
                contributionSummary: {
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockStellarService.createWallet.mockResolvedValue(mockWallet);
            mockEncrypt.mockReturnValue("encrypted_secret");
            mockPrisma.user.create.mockResolvedValue(createdUser);
            mockStellarService.addTrustLineViaSponsor.mockResolvedValue({ txHash: "tx-hash" });

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testUserData.userId }
            });

            expect(mockStellarService.createWallet).toHaveBeenCalled();
            expect(mockEncrypt).toHaveBeenCalledWith(mockWallet.secretKey);

            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    userId: testUserData.userId,
                    username: testUserData.gitHubUsername,
                    walletAddress: mockWallet.publicKey,
                    walletSecret: "encrypted_secret",
                    contributionSummary: {
                        create: {}
                    }
                },
                select: {
                    userId: true,
                    username: true,
                    walletAddress: true,
                    contributionSummary: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledWith(
                process.env.STELLAR_MASTER_SECRET_KEY,
                mockWallet.secretKey
            );

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(createdUser);
        });

        it("should create user without wallet when skipWallet=true", async () => {
            mockRequest.query = { skipWallet: "true" };

            const createdUser = {
                userId: testUserData.userId,
                username: testUserData.gitHubUsername,
                walletAddress: "",
                contributionSummary: {
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockResolvedValue(createdUser);

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.createWallet).not.toHaveBeenCalled();
            expect(mockPrisma.user.create).toHaveBeenCalledWith({
                data: {
                    userId: testUserData.userId,
                    username: testUserData.gitHubUsername,
                    walletAddress: "",
                    walletSecret: "",
                    contributionSummary: {
                        create: {}
                    }
                },
                select: {
                    userId: true,
                    username: true,
                    walletAddress: true,
                    contributionSummary: true,
                    createdAt: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(createdUser);
        });

        it("should handle trustline creation failure gracefully", async () => {
            const mockWallet = {
                publicKey: "GNEW_USER_WALLET",
                secretKey: "SNEW_USER_SECRET",
                txHash: "tx-hash"
            };

            const createdUser = {
                userId: testUserData.userId,
                username: testUserData.gitHubUsername,
                walletAddress: mockWallet.publicKey,
                contributionSummary: {
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const trustlineError = new Error("Failed to add trustline");

            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockStellarService.createWallet.mockResolvedValue(mockWallet);
            mockEncrypt.mockReturnValue("encrypted_secret");
            mockPrisma.user.create.mockResolvedValue(createdUser);
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(trustlineError);

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: trustlineError,
                user: createdUser,
                message: "Failed to add USDC trustline for wallet."
            });
        });

        it("should throw error when user already exists", async () => {
            const existingUser = TestDataFactory.user({ userId: testUserData.userId });
            mockPrisma.user.findUnique.mockResolvedValue(existingUser);

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "UserError",
                    message: "User already exists"
                })
            );
        });

        it("should handle wallet creation errors", async () => {
            const walletError = new Error("Stellar service unavailable");

            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockStellarService.createWallet.mockRejectedValue(walletError);

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(walletError);
        });

        it("should handle database errors during user creation", async () => {
            const dbError = new Error("Database constraint violation");

            mockPrisma.user.findUnique.mockResolvedValue(null);
            mockPrisma.user.create.mockRejectedValue(dbError);

            await createUser(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(dbError);
        });
    });

    describe("updateUsername", () => {
        const testUserData = {
            userId: "test-user-123",
            githubUsername: "updatedusername"
        };

        beforeEach(() => {
            mockRequest.body = testUserData;
        });

        it("should update username successfully", async () => {
            const existingUser = TestDataFactory.user({ userId: testUserData.userId });
            const updatedUser = {
                userId: testUserData.userId,
                username: testUserData.githubUsername,
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);
            mockPrisma.user.update.mockResolvedValue(updatedUser);

            await updateUsername(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testUserData.userId }
            });

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { userId: testUserData.userId },
                data: { username: testUserData.githubUsername },
                select: {
                    userId: true,
                    username: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(updatedUser);
        });

        it("should throw NotFoundError when user does not exist", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await updateUsername(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should handle database errors during update", async () => {
            const existingUser = TestDataFactory.user({ userId: testUserData.userId });
            const dbError = new Error("Database update failed");

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);
            mockPrisma.user.update.mockRejectedValue(dbError);

            await updateUsername(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(dbError);
        });
    });

    describe("updateAddressBook", () => {
        const testData = {
            userId: "test-user-123",
            address: "GNEW_ADDRESS_123",
            name: "Test Address"
        };

        beforeEach(() => {
            mockRequest.body = testData;
        });

        it("should add new address to address book successfully", async () => {
            const existingUser = {
                addressBook: [
                    { address: "GEXISTING_ADDRESS", name: "Existing Address" }
                ]
            };

            const updatedUser = {
                userId: testData.userId,
                addressBook: [
                    { address: "GEXISTING_ADDRESS", name: "Existing Address" },
                    { address: testData.address, name: testData.name }
                ],
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);
            mockPrisma.user.update.mockResolvedValue(updatedUser);

            await updateAddressBook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
                where: { userId: testData.userId },
                select: {
                    addressBook: true
                }
            });

            expect(mockPrisma.user.update).toHaveBeenCalledWith({
                where: { userId: testData.userId },
                data: {
                    addressBook: [
                        { address: "GEXISTING_ADDRESS", name: "Existing Address" },
                        { address: testData.address, name: testData.name }
                    ]
                },
                select: {
                    userId: true,
                    addressBook: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(updatedUser);
        });

        it("should throw error when address already exists", async () => {
            const existingUser = {
                addressBook: [
                    { address: testData.address, name: "Existing Name" }
                ]
            };

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);

            await updateAddressBook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ValidationError",
                    message: "Address already exists in address book"
                })
            );
        });

        it("should throw error when address book limit is reached", async () => {
            const addressBook = Array.from({ length: 20 }, (_, i) => ({
                address: `GADDRESS_${i}`,
                name: `Address ${i}`
            }));

            const existingUser = { addressBook };

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);

            await updateAddressBook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "ValidationError",
                    message: "Address book limit reached (max 20)"
                })
            );
        });

        it("should throw NotFoundError when user does not exist", async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await updateAddressBook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "User not found"
                })
            );
        });

        it("should handle database errors during address book update", async () => {
            const existingUser = {
                addressBook: []
            };
            const dbError = new Error("Database update failed");

            mockPrisma.user.findUnique.mockResolvedValue(existingUser);
            mockPrisma.user.update.mockRejectedValue(dbError);

            await updateAddressBook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(dbError);
        });
    });
});
