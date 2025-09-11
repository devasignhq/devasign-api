import { Request, Response, NextFunction } from 'express';

// Mock Firebase Admin
jest.mock('../../../api/config/firebase.config', () => ({
    firebaseAdmin: {
        auth: jest.fn(() => ({
            verifyIdToken: jest.fn()
        }))
    }
}));

// Mock Prisma
jest.mock('../../../api/config/database.config', () => ({
    prisma: {
        installation: {
            findUnique: jest.fn()
        }
    }
}));

import { validateUser, validateUserInstallation } from '../../../api/middlewares/auth.middleware';
import { firebaseAdmin } from '../../../api/config/firebase.config';
import { prisma } from '../../../api/config/database.config';

const mockAuth = firebaseAdmin.auth as jest.MockedFunction<typeof firebaseAdmin.auth>;
const mockVerifyIdToken = jest.fn();
const mockPrismaInstallation = prisma.installation as jest.Mocked<typeof prisma.installation>;

describe('Authentication Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            body: {}
        };
        
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        
        mockNext = jest.fn();
        
        // Setup Firebase mock
        mockVerifyIdToken.mockReset();
        mockAuth.mockReturnValue({
            verifyIdToken: mockVerifyIdToken
        } as any);
        
        jest.clearAllMocks();
    });

    describe('validateUser', () => {
        describe('JWT Token Validation', () => {
            it('should validate valid JWT token and extract user information', async () => {
                const mockDecodedToken = {
                    uid: 'test-user-id',
                    email: 'test@example.com',
                    name: 'Test User'
                };

                mockRequest.headers = {
                    authorization: 'Bearer valid-jwt-token'
                };

                mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-jwt-token');
                expect(mockRequest.body).toEqual({
                    currentUser: mockDecodedToken,
                    userId: 'test-user-id'
                });
                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it('should handle malformed JWT token', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer invalid-jwt-token'
                };

                const mockError = new Error('Token verification failed');
                mockVerifyIdToken.mockRejectedValue(mockError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockVerifyIdToken).toHaveBeenCalledWith('invalid-jwt-token');
                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Token verification failed"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('should preserve existing request body when adding user info', async () => {
                const existingBody = { someData: 'test-data' };
                const mockDecodedToken = {
                    uid: 'test-user-id',
                    email: 'test@example.com'
                };

                mockRequest.headers = {
                    authorization: 'Bearer valid-jwt-token'
                };
                mockRequest.body = existingBody;

                mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockRequest.body).toEqual({
                    ...existingBody,
                    currentUser: mockDecodedToken,
                    userId: 'test-user-id'
                });
                expect(mockNext).toHaveBeenCalled();
            });
        });

        describe('Unauthorized Access Handling', () => {
            it('should reject request with no authorization header', async () => {
                mockRequest.headers = {};

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
                expect(mockVerifyIdToken).not.toHaveBeenCalled();
            });

            it('should reject request with malformed authorization header', async () => {
                mockRequest.headers = {
                    authorization: 'InvalidFormat token'
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
                expect(mockVerifyIdToken).not.toHaveBeenCalled();
            });

            it('should reject request with Bearer but no token', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer '
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockVerifyIdToken).toHaveBeenCalledWith('');
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('should reject request with empty authorization header', async () => {
                mockRequest.headers = {
                    authorization: ''
                };

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "No authorization token sent"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe('Token Expiration and Error Scenarios', () => {
            it('should handle expired token error', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer expired-token'
                };

                const expiredTokenError = new Error('Firebase ID token has expired');
                mockVerifyIdToken.mockRejectedValue(expiredTokenError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Firebase ID token has expired"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('should handle revoked token error', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer revoked-token'
                };

                const revokedTokenError = new Error('Firebase ID token has been revoked');
                mockVerifyIdToken.mockRejectedValue(revokedTokenError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Firebase ID token has been revoked"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('should handle invalid signature error', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer invalid-signature-token'
                };

                const invalidSignatureError = new Error('Firebase ID token has invalid signature');
                mockVerifyIdToken.mockRejectedValue(invalidSignatureError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Firebase ID token has invalid signature"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it('should handle network errors during token verification', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer network-error-token'
                };

                const networkError = new Error('Network error occurred');
                mockVerifyIdToken.mockRejectedValue(networkError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Network error occurred"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe('Firebase Authentication Integration', () => {
            it('should call Firebase auth verifyIdToken with correct token', async () => {
                const testToken = 'test-firebase-token';
                mockRequest.headers = {
                    authorization: `Bearer ${testToken}`
                };

                const mockDecodedToken = { uid: 'test-uid' };
                mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockAuth).toHaveBeenCalled();
                expect(mockVerifyIdToken).toHaveBeenCalledWith(testToken);
            });

            it('should handle Firebase service unavailable', async () => {
                mockRequest.headers = {
                    authorization: 'Bearer test-token'
                };

                const serviceError = new Error('Firebase service temporarily unavailable');
                mockVerifyIdToken.mockRejectedValue(serviceError);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(401);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Authentication failed",
                    details: "Firebase service temporarily unavailable"
                });
            });

            it('should extract all user claims from Firebase token', async () => {
                const mockDecodedToken = {
                    uid: 'test-user-id',
                    email: 'test@example.com',
                    name: 'Test User',
                    email_verified: true,
                    custom_claims: {
                        role: 'admin'
                    }
                };

                mockRequest.headers = {
                    authorization: 'Bearer comprehensive-token'
                };

                mockVerifyIdToken.mockResolvedValue(mockDecodedToken);

                await validateUser(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockRequest.body.currentUser).toEqual(mockDecodedToken);
                expect(mockRequest.body.userId).toBe('test-user-id');
                expect(mockNext).toHaveBeenCalled();
            });
        });
    });

    describe('validateUserInstallation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
        });

        describe('Installation Access Validation', () => {
            it('should allow access when user is member of installation', async () => {
                const installationId = 'test-installation-id';
                const userId = 'test-user-id';

                mockPrismaInstallation.findUnique.mockResolvedValue({
                    id: installationId
                });

                await expect(validateUserInstallation(installationId, userId))
                    .resolves.not.toThrow();

                expect(mockPrismaInstallation.findUnique).toHaveBeenCalledWith({
                    where: {
                        id: installationId,
                        users: { some: { userId } }
                    },
                    select: { id: true }
                });
            });

            it('should throw error when user is not member of installation', async () => {
                const installationId = 'test-installation-id';
                const userId = 'unauthorized-user-id';

                mockPrismaInstallation.findUnique.mockResolvedValue(null);

                try {
                    await validateUserInstallation(installationId, userId);
                    fail('Expected function to throw');
                } catch (error: any) {
                    expect(error.name).toBe("AuthenticationError");
                    expect(error.message).toBe("Only members of this installation are allowed access");
                }

                expect(mockPrismaInstallation.findUnique).toHaveBeenCalledWith({
                    where: {
                        id: installationId,
                        users: { some: { userId } }
                    },
                    select: { id: true }
                });
            });

            it('should throw error when installation does not exist', async () => {
                const installationId = 'non-existent-installation';
                const userId = 'test-user-id';

                mockPrismaInstallation.findUnique.mockResolvedValue(null);

                try {
                    await validateUserInstallation(installationId, userId);
                    fail('Expected function to throw');
                } catch (error: any) {
                    expect(error.name).toBe("AuthenticationError");
                    expect(error.message).toBe("Only members of this installation are allowed access");
                }

                expect(mockPrismaInstallation.findUnique).toHaveBeenCalledWith({
                    where: {
                        id: installationId,
                        users: { some: { userId } }
                    },
                    select: { id: true }
                });
            });

            it('should handle database errors gracefully', async () => {
                const installationId = 'test-installation-id';
                const userId = 'test-user-id';

                const dbError = new Error('Database connection failed');
                mockPrismaInstallation.findUnique.mockRejectedValue(dbError);

                await expect(validateUserInstallation(installationId, userId))
                    .rejects.toThrow('Database connection failed');
            });

            it('should validate with correct query parameters', async () => {
                const installationId = 'specific-installation';
                const userId = 'specific-user';

                mockPrismaInstallation.findUnique.mockResolvedValue({
                    id: installationId
                });

                await validateUserInstallation(installationId, userId);

                expect(mockPrismaInstallation.findUnique).toHaveBeenCalledWith({
                    where: {
                        id: installationId,
                        users: { some: { userId } }
                    },
                    select: { id: true }
                });
            });
        });

        describe('Error Handling', () => {
            it('should throw ErrorClass with correct error type', async () => {
                const installationId = 'test-installation-id';
                const userId = 'unauthorized-user-id';

                mockPrismaInstallation.findUnique.mockResolvedValue(null);

                try {
                    await validateUserInstallation(installationId, userId);
                    fail('Expected function to throw');
                } catch (error: any) {
                    expect(error.name).toBe("AuthenticationError");
                    expect(error.message).toBe("Only members of this installation are allowed access");
                }
            });

            it('should handle empty installation ID', async () => {
                const installationId = '';
                const userId = 'test-user-id';

                mockPrismaInstallation.findUnique.mockResolvedValue(null);

                try {
                    await validateUserInstallation(installationId, userId);
                    fail('Expected function to throw');
                } catch (error: any) {
                    expect(error.name).toBe("AuthenticationError");
                    expect(error.message).toBe("Only members of this installation are allowed access");
                }
            });

            it('should handle empty user ID', async () => {
                const installationId = 'test-installation-id';
                const userId = '';

                mockPrismaInstallation.findUnique.mockResolvedValue(null);

                try {
                    await validateUserInstallation(installationId, userId);
                    fail('Expected function to throw');
                } catch (error: any) {
                    expect(error.name).toBe("AuthenticationError");
                    expect(error.message).toBe("Only members of this installation are allowed access");
                }
            });
        });
    });
});