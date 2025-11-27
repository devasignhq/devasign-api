import { Request, Response, NextFunction } from "express";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { mockFirebaseAuth, FirebaseTestHelpers } from "../../mocks/firebase.service.mock";
import { validateUser, validateUserInstallation, validateAdmin } from "../../../api/middlewares/auth.middleware";
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
            json: jest.fn().mockReturnThis()
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
                    name: "Test User"
                };

                mockRequest.headers = {
                    authorization: "Bearer valid-jwt-token"
                };

                mockFirebaseAuth.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockFirebaseAuth).toHaveBeenCalledWith("valid-jwt-token");
                expect(mockRequest.body).toEqual({
                    currentUser: mockDecodedToken,
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

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Invalid or expired token"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should preserve existing request body when adding user info", async () => {
                const existingBody = { someData: "test-data" };
                const mockDecodedToken = {
                    uid: "test-user-id",
                    email: "test@example.com"
                };

                mockRequest.headers = {
                    authorization: "Bearer valid-jwt-token"
                };
                mockRequest.body = existingBody;

                mockFirebaseAuth.mockResolvedValueOnce(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body).toEqual({
                    ...existingBody,
                    currentUser: mockDecodedToken,
                    userId: "test-user-id"
                });
            });
        });

        describe("Unauthorized Access Handling", () => {
            it("should reject request with no authorization header", async () => {
                mockRequest.headers = {};

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
                expect(mockFirebaseAuth).not.toHaveBeenCalled();
            });

            it("should reject request with malformed authorization header", async () => {
                mockRequest.headers = {
                    authorization: "InvalidFormat token"
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
                expect(mockFirebaseAuth).not.toHaveBeenCalled();
            });

            it("should reject request with Bearer but no token", async () => {
                mockRequest.headers = {
                    authorization: "Bearer "
                };

                mockFirebaseAuth.mockRejectedValueOnce(new Error("Invalid or expired token"));

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockFirebaseAuth).toHaveBeenCalled();
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject request with empty authorization header", async () => {
                mockRequest.headers = {
                    authorization: ""
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Token Expiration and Error Scenarios", () => {
            it("should handle expired token error", async () => {
                mockRequest.headers = {
                    authorization: "Bearer expired_token"
                };

                mockFirebaseAuth.mockRejectedValueOnce(new Error("Invalid or expired token"));

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Invalid or expired token"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should handle invalid signature error", async () => {
                mockRequest.headers = {
                    authorization: "Bearer invalid-signature-token"
                };

                const invalidSignatureError = new Error("Firebase ID token has invalid signature");
                mockFirebaseAuth.mockRejectedValueOnce(invalidSignatureError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHENTICATED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Firebase ID token has invalid signature"
                });
                expect(mockNext).not.toHaveBeenCalled();
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
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
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
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });

            mockRequest.params = { installationId: "12345678" };
            mockRequest.body = { userId: "unauthorized-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Only members of this installation are allowed access"
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should throw error when installation does not exist", async () => {
            mockRequest.params = { installationId: "non-existent-installation" };
            mockRequest.body = { userId: "test-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Only members of this installation are allowed access"
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should handle database errors gracefully", async () => {
            // Create a scenario that would cause a database error
            await prisma.$disconnect();

            mockRequest.params = { installationId: "12345678" };
            mockRequest.body = { userId: "test-user-id" };

            await validateUserInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalled();
            expect(mockNext).not.toHaveBeenCalled();

            // Reconnect for other tests
            await prisma.$connect();
        });
    });

    describe("validateAdmin", () => {
        describe("Admin Privilege Validation", () => {
            it("should allow access when user has admin property set to true", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "admin-user-id",
                        email: "admin@example.com",
                        admin: true
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow access when user has admin in custom_claims", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "admin-user-id",
                        email: "admin@example.com",
                        custom_claims: {
                            admin: true
                        }
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow access when user has both admin property and custom_claims", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "admin-user-id",
                        email: "admin@example.com",
                        admin: true,
                        custom_claims: {
                            admin: true,
                            role: "super-admin"
                        }
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });
        });

        describe("Non-Admin Access Denial", () => {
            it("should deny access when user has no admin privileges", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "regular-user-id",
                        email: "user@example.com"
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny access when admin property is false", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "user-id",
                        email: "user@example.com",
                        admin: false
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny access when custom_claims.admin is false", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "user-id",
                        email: "user@example.com",
                        custom_claims: {
                            admin: false,
                            role: "user"
                        }
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny access when currentUser is missing", async () => {
                mockRequest.body = {};

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny access when currentUser is null", async () => {
                mockRequest.body = {
                    currentUser: null
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny access when currentUser is undefined", async () => {
                mockRequest.body = {
                    currentUser: undefined
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Edge Cases", () => {
            it("should deny access when custom_claims exists but admin is missing", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "user-id",
                        email: "user@example.com",
                        custom_claims: {
                            role: "moderator",
                            permissions: ["read", "write"]
                        }
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should allow access when admin is truthy value", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "admin-user-id",
                        email: "admin@example.com",
                        admin: 1 // truthy value
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should deny access when admin is 0 (falsy)", async () => {
                mockRequest.body = {
                    currentUser: {
                        uid: "user-id",
                        email: "user@example.com",
                        admin: 0
                    }
                };

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. Admin privileges required."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should preserve other request body properties", async () => {
                const existingBody = {
                    userId: "test-user-id",
                    someData: "test-data",
                    currentUser: {
                        uid: "admin-user-id",
                        email: "admin@example.com",
                        admin: true
                    }
                };

                mockRequest.body = existingBody;

                await validateAdmin(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body).toEqual(existingBody);
            });
        });
    });
});
