import { Request, Response, NextFunction } from "express";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { mockFirebaseAuth, FirebaseTestHelpers } from "../../mocks/firebase.service.mock";
import { validateUser, validateUserInstallation } from "../../../api/middlewares/auth.middleware";
import { STATUS_CODES } from "../../../api/utilities/data";

// Mock Firebase admin for authentication
jest.mock("../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

describe("Authentication Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockFirebaseAuth: jest.Mock;
    let mockNext: NextFunction;
    let prisma: any;

    beforeAll(async () => {
        // Setup test database
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup mocks
        const { firebaseAdmin } = await import("../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        mockRequest = {
            headers: {},
            body: {},
            params: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            locals: {}
        };

        mockNext = jest.fn();

        TestDataFactory.resetCounters();
        FirebaseTestHelpers.resetFirebaseMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("validateUser", () => {
        describe("JWT Token Validation", () => {
            it("should validate valid JWT token and extract user information", async () => {
                const mockDecodedToken = {
                    uid: "test-user-id",
                    email: "test@example.com",
                    name: "Test User",
                    firebase: {
                        sign_in_provider: "github.com"
                    }
                };

                mockRequest.headers = {
                    authorization: "Bearer valid-jwt-token"
                };

                mockFirebaseAuth.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockFirebaseAuth).toHaveBeenCalledWith("valid-jwt-token");
                expect(mockResponse.locals).toEqual({
                    user: mockDecodedToken,
                    userId: "test-user-id"
                });
                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should handle malformed JWT token", async () => {
                mockRequest.headers = {
                    authorization: "Bearer invalid_token"
                };

                mockFirebaseAuth.mockRejectedValueOnce(new Error("Invalid or expired token"));

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "Invalid or expired token"
                    })
                );
            });


        });

        describe("Unauthorized Access Handling", () => {
            it("should reject request with no authorization header", async () => {
                mockRequest.headers = {};

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "No authorization token sent"
                    })
                );
                expect(mockFirebaseAuth).not.toHaveBeenCalled();
            });

            it("should reject request with malformed authorization header", async () => {
                mockRequest.headers = {
                    authorization: "InvalidFormat token"
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "No authorization token sent"
                    })
                );
                expect(mockFirebaseAuth).not.toHaveBeenCalled();
            });

            it("should reject request with Bearer but no token", async () => {
                mockRequest.headers = {
                    authorization: "Bearer "
                };

                mockFirebaseAuth.mockRejectedValueOnce(new Error("Invalid or expired token"));

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockFirebaseAuth).toHaveBeenCalled();
                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "Invalid or expired token"
                    })
                );
            });

            it("should reject request with empty authorization header", async () => {
                mockRequest.headers = {
                    authorization: ""
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "No authorization token sent"
                    })
                );
            });
        });

        describe("Token Expiration and Error Scenarios", () => {
            it("should handle expired token error", async () => {
                mockRequest.headers = {
                    authorization: "Bearer expired_token"
                };

                mockFirebaseAuth.mockRejectedValueOnce(new Error("Invalid or expired token"));

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "Invalid or expired token"
                    })
                );
            });

            it("should handle invalid signature error", async () => {
                mockRequest.headers = {
                    authorization: "Bearer invalid-signature-token"
                };

                const invalidSignatureError = new Error("Firebase ID token has invalid signature");
                mockFirebaseAuth.mockRejectedValueOnce(invalidSignatureError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(
                    expect.objectContaining({
                        code: "AUTHENTICATION_FAILED",
                        status: STATUS_CODES.UNAUTHENTICATED,
                        message: "Firebase ID token has invalid signature"
                    })
                );
            });

            it("should call Firebase auth with correct token", async () => {
                const testToken = "test-firebase-token";
                mockRequest.headers = {
                    authorization: `Bearer ${testToken}`
                };

                const mockDecodedToken = { uid: "test-uid" };
                mockFirebaseAuth.mockResolvedValueOnce(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockFirebaseAuth).toHaveBeenCalledWith(testToken);
            });
        });
    });

    describe("validateUserInstallation", () => {
        it("should allow access when user is member of installation", async () => {
            // Create test user
            const user = TestDataFactory.user({ userId: "test-user-id" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            // Create test installation
            const installation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...installation,
                    users: {
                        connect: { userId: user.userId }
                    },
                    subscriptionPackage: {
                        connect: { id: "test-package-id" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            mockRequest.params = { installationId: "12345678" };
            mockRequest.body = { userId: "test-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it("should reject access when user is not member of installation", async () => {
            // Create test installation without adding user
            const installation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...installation,
                    subscriptionPackage: {
                        connect: { id: "test-package-id" }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            mockRequest.params = { installationId: "12345678" };
            mockResponse.locals = { userId: "unauthorized-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Only members of this installation are allowed access"
                })
            );
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it("should throw error when installation does not exist", async () => {
            mockRequest.params = { installationId: "non-existent-installation" };
            mockResponse.locals = { userId: "test-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Only members of this installation are allowed access"
                })
            );
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it("should throw error when installation is archived", async () => {
            // Create test user
            const user = TestDataFactory.user({ userId: "test-user-id" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            // Create archived installation
            const installation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...installation,
                    status: "ARCHIVED",
                    users: {
                        connect: { userId: user.userId }
                    },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            mockRequest.params = { installationId: "12345678" };
            mockResponse.locals = { userId: "test-user-id" };

            // We expect validateUserInstallation to call next with ValidationError
            // The validationError usually has code 400
            const nextSpy = jest.fn();
            await validateUserInstallation(mockRequest as Request, mockResponse as Response, nextSpy);

            expect(nextSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "This installation has been archived"
                })
            );
        });

        it("should handle database errors gracefully", async () => {
            // Create a scenario that would cause a database error
            await prisma.$disconnect();

            mockRequest.params = { installationId: "12345678" };
            mockRequest.body = { userId: "test-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();

            // Reconnect for other tests
            await prisma.$connect();
        });
    });
});
