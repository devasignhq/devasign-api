import { Request, Response, NextFunction } from 'express';
import {
    getInstallations,
    getInstallation,
    createInstallation,
    updateInstallation,
    deleteInstallation,
    addTeamMember,
    updateTeamMemberPermissions,
    removeTeamMember
} from '../../../api/controllers/installation.controller';
import { prisma } from '../../../api/config/database.config';
import { stellarService } from '../../../api/services/stellar.service';
import { OctokitService } from '../../../api/services/octokit.service';
import { encrypt, decrypt } from '../../../api/helper';
import { ErrorClass, NotFoundErrorClass } from '../../../api/models/general.model';
import { TestDataFactory } from '../../helpers/test-data-factory';
import { createMockRequest, createMockResponse, createMockNext } from '../../helpers/test-utils';

// Mock dependencies
jest.mock('../../../api/config/database.config', () => ({
    prisma: {
        installation: {
            count: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        user: {
            findUnique: jest.fn(),
            findFirst: jest.fn(),
        },
        userInstallationPermission: {
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    },
}));

jest.mock('../../../api/services/stellar.service', () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn(),
        transferAssetViaSponsor: jest.fn(),
    },
}));

jest.mock('../../../api/services/octokit.service', () => ({
    OctokitService: {
        getInstallationDetails: jest.fn(),
    },
}));

jest.mock('../../../api/helper', () => ({
    encrypt: jest.fn(),
    decrypt: jest.fn(),
}));

// Mock environment variables
process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID = 'default-package-id';
process.env.STELLAR_MASTER_SECRET_KEY = 'MOCK_MASTER_SECRET';

describe('InstallationController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockPrisma = prisma as any;
    const mockStellarService = stellarService as jest.Mocked<typeof stellarService>;
    const mockOctokitService = OctokitService as jest.Mocked<typeof OctokitService>;
    const mockEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;
    const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
        TestDataFactory.resetCounters();
    });

    describe('getInstallations', () => {
        const testUserId = 'test-user-123';

        beforeEach(() => {
            mockRequest.body = { userId: testUserId };
            mockRequest.query = {};
        });

        it('should return paginated installations for user', async () => {
            const mockInstallations = TestDataFactory.installations(3);
            const totalCount = 10;

            mockPrisma.installation.count.mockResolvedValue(totalCount);
            mockPrisma.installation.findMany.mockResolvedValue(mockInstallations);

            await getInstallations(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.count).toHaveBeenCalledWith({
                where: {
                    users: {
                        some: { userId: testUserId }
                    }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockInstallations,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: totalCount,
                    itemsPerPage: 10,
                    hasMore: false
                }
            });
        });

        it('should handle pagination parameters correctly', async () => {
            mockRequest.query = { page: '2', limit: '5' };

            const mockInstallations = TestDataFactory.installations(5);
            mockPrisma.installation.count.mockResolvedValue(12);
            mockPrisma.installation.findMany.mockResolvedValue(mockInstallations);

            await getInstallations(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 5, // (page 2 - 1) * limit 5
                    take: 5
                })
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockInstallations,
                pagination: {
                    currentPage: 2,
                    totalPages: 3,
                    totalItems: 12,
                    itemsPerPage: 5,
                    hasMore: true
                }
            });
        });

        it('should throw validation error for invalid limit', async () => {
            mockRequest.query = { limit: '150' };

            await getInstallations(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'ValidationError',
                    message: 'Maximum limit is 100'
                })
            );
        });

        it('should throw validation error for invalid page', async () => {
            mockRequest.query = { page: '0' };

            await getInstallations(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'ValidationError',
                    message: 'Page must be greater than 0'
                })
            );
        });
    });   
 describe('getInstallation', () => {
        const testParams = {
            id: 'test-installation-123'
        };

        const testBody = {
            userId: 'test-user-123'
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should return installation with stats for authorized user', async () => {
            const mockInstallation = {
                id: testParams.id,
                htmlUrl: 'https://github.com/test/repo',
                targetId: 123,
                targetType: 'Repository',
                account: TestDataFactory.installation().account,
                walletAddress: 'GWALLET123',
                tasks: [
                    { id: 'task-1', bounty: 100, status: 'OPEN', issue: {}, creator: {}, contributor: {}, createdAt: new Date() },
                    { id: 'task-2', bounty: 200, status: 'COMPLETED', issue: {}, creator: {}, contributor: {}, createdAt: new Date() }
                ],
                users: [
                    { userId: testBody.userId, username: 'testuser', contributionSummary: { tasksCompleted: 5, totalEarnings: 500 } }
                ],
                subscriptionPackage: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await getInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                ...mockInstallation,
                stats: {
                    totalBounty: 300,
                    openTasks: 1,
                    completedTasks: 1,
                    totalTasks: 2,
                    totalMembers: 1
                }
            });
        });

        it('should throw NotFoundError when installation does not exist', async () => {
            mockPrisma.installation.findUnique.mockResolvedValue(null);

            await getInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Installation not found'
                })
            );
        });

        it('should throw authorization error when user is not team member', async () => {
            const mockInstallation = {
                users: [
                    { userId: 'other-user', username: 'otheruser' }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await getInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'AuthorizationError',
                    message: 'Not authorized to view this installation'
                })
            );
        });
    });

    describe('createInstallation', () => {
        const testBody = {
            userId: 'test-user-123',
            installationId: 'new-installation-456'
        };

        beforeEach(() => {
            mockRequest.body = testBody;
        });

        it('should create installation with wallets successfully', async () => {
            const mockUser = TestDataFactory.user({ userId: testBody.userId });
            const mockGithubInstallation: any = {
                html_url: 'https://github.com/test/repo',
                target_id: 123,
                target_type: 'Repository',
                account: {
                    login: 'testorg',
                    node_id: 'MDEwOlJlcG9zaXRvcnk',
                    avatar_url: 'https://github.com/testorg.png',
                    html_url: 'https://github.com/testorg'
                }
            };

            const mockInstallationWallet = {
                publicKey: 'GINSTALL123',
                secretKey: 'SINSTALL123',
                txHash: 'tx-hash-1'
            };

            const mockEscrowWallet = {
                publicKey: 'GESCROW123',
                secretKey: 'SESCROW123',
                txHash: 'tx-hash-2'
            };

            const mockCreatedInstallation = {
                id: testBody.installationId,
                htmlUrl: mockGithubInstallation.html_url,
                targetId: mockGithubInstallation.target_id,
                targetType: mockGithubInstallation.target_type,
                account: mockGithubInstallation.account,
                walletAddress: mockInstallationWallet.publicKey,
                subscriptionPackage: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.installation.findUnique.mockResolvedValue(null);
            mockOctokitService.getInstallationDetails.mockResolvedValue(mockGithubInstallation);
            mockStellarService.createWallet
                .mockResolvedValueOnce(mockInstallationWallet)
                .mockResolvedValueOnce(mockEscrowWallet);
            mockEncrypt
                .mockReturnValueOnce('encrypted_installation_secret')
                .mockReturnValueOnce('encrypted_escrow_secret');
            mockPrisma.installation.create.mockResolvedValue(mockCreatedInstallation);
            mockStellarService.addTrustLineViaSponsor.mockResolvedValue({ txHash: 'trustline-tx' });

            await createInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.createWallet).toHaveBeenCalledTimes(2);
            expect(mockEncrypt).toHaveBeenCalledTimes(2);
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledTimes(2);

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockCreatedInstallation);
        });

        it('should handle trustline creation failure gracefully', async () => {
            const mockUser = TestDataFactory.user({ userId: testBody.userId });
            const mockGithubInstallation: any = {
                html_url: 'https://github.com/test/repo',
                target_id: 123,
                target_type: 'Repository',
                account: { login: 'testorg', node_id: 'node', avatar_url: 'avatar', html_url: 'html' }
            };

            const mockCreatedInstallation = TestDataFactory.installation();

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.installation.findUnique.mockResolvedValue(null);
            mockOctokitService.getInstallationDetails.mockResolvedValue(mockGithubInstallation);
            mockStellarService.createWallet.mockResolvedValue({ publicKey: 'GWALLET', secretKey: 'SWALLET', txHash: 'tx' });
            mockEncrypt.mockReturnValue('encrypted_secret');
            mockPrisma.installation.create.mockResolvedValue(mockCreatedInstallation);
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(new Error('Trustline failed'));

            await createInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: expect.any(Error),
                installation: mockCreatedInstallation,
                message: 'Failed to add USDC trustlines.'
            });
        });

        it('should throw error when user not found', async () => {
            mockPrisma.user.findUnique.mockResolvedValue(null);

            await createInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'User not found'
                })
            );
        });

        it('should throw error when installation already exists', async () => {
            const mockUser = TestDataFactory.user();
            const existingInstallation = TestDataFactory.installation();

            mockPrisma.user.findUnique.mockResolvedValue(mockUser);
            mockPrisma.installation.findUnique.mockResolvedValue(existingInstallation);

            await createInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'ValidationError',
                    message: 'Installation already exists'
                })
            );
        });
    });

    describe('updateInstallation', () => {
        const testParams = {
            id: 'test-installation-123'
        };

        const testBody = {
            userId: 'test-user-123',
            htmlUrl: 'https://github.com/updated/repo',
            targetId: 456,
            account: { login: 'updatedorg' }
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should update installation successfully', async () => {
            const mockInstallation = {
                users: [{ userId: testBody.userId }]
            };

            const mockUpdatedInstallation = {
                htmlUrl: testBody.htmlUrl,
                targetId: testBody.targetId,
                account: testBody.account,
                updatedAt: new Date()
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.installation.update.mockResolvedValue(mockUpdatedInstallation);

            await updateInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedInstallation);
        });

        it('should throw NotFoundError when installation does not exist', async () => {
            mockPrisma.installation.findUnique.mockResolvedValue(null);

            await updateInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Installation not found'
                })
            );
        });

        it('should throw authorization error when user is not team member', async () => {
            const mockInstallation = {
                users: [{ userId: 'other-user' }]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await updateInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'AuthorizationError',
                    message: 'Not authorized to update this installation'
                })
            );
        });
    });

    describe('deleteInstallation', () => {
        const testParams = {
            id: 'test-installation-123'
        };

        const testBody = {
            userId: 'test-user-123',
            walletAddress: 'GUSER123'
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should delete installation and refund escrow funds', async () => {
            const mockInstallation = {
                walletSecret: 'encrypted_wallet_secret',
                escrowSecret: 'encrypted_escrow_secret',
                tasks: [
                    { status: 'COMPLETED', bounty: 100 },
                    { status: 'COMPLETED', bounty: 200 }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockDecrypt
                .mockReturnValueOnce('decrypted_wallet_secret')
                .mockReturnValueOnce('decrypted_escrow_secret');
            mockStellarService.transferAssetViaSponsor.mockResolvedValue({ 
                txHash: 'refund-tx',
                sponsorTxHash: 'sponsor-tx'
            });
            mockPrisma.installation.delete.mockResolvedValue({});

            await deleteInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockDecrypt).toHaveBeenCalledTimes(2);
            expect(mockStellarService.transferAssetViaSponsor).toHaveBeenCalledTimes(2);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Installation deleted successfully',
                refunded: '300 USDC'
            });
        });

        it('should throw error when installation has active tasks', async () => {
            const mockInstallation = {
                walletSecret: 'encrypted_secret',
                escrowSecret: 'encrypted_secret',
                tasks: [
                    { status: 'OPEN', bounty: 100 }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await deleteInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'InstallationError',
                    message: 'Cannot delete installation with active or completed tasks'
                })
            );
        });

        it('should throw NotFoundError when installation does not exist', async () => {
            mockPrisma.installation.findUnique.mockResolvedValue(null);

            await deleteInstallation(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Installation not found'
                })
            );
        });
    });

    describe('addTeamMember', () => {
        const testParams = {
            id: 'test-installation-123'
        };

        const testBody = {
            userId: 'test-admin-123',
            username: 'newmember',
            email: 'newmember@example.com',
            permissionCodes: ['VIEW_TASKS', 'APPLY_TASKS']
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should add existing user to installation', async () => {
            const mockInstallation = {
                id: testParams.id,
                users: [
                    { userId: 'existing-user', username: 'existinguser' }
                ]
            };

            const mockExistingUser = {
                userId: 'new-user-456'
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.user.findFirst.mockResolvedValue(mockExistingUser);
            mockPrisma.installation.update.mockResolvedValue({});
            mockPrisma.userInstallationPermission.create.mockResolvedValue({});

            await addTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                username: testBody.username,
                status: 'added'
            });
        });

        it('should return already_member status when user is already a member', async () => {
            const mockInstallation = {
                id: testParams.id,
                users: [
                    { userId: 'existing-user', username: testBody.username }
                ]
            };

            const mockExistingUser = {
                userId: 'existing-user'
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.user.findFirst.mockResolvedValue(mockExistingUser);

            await addTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'User is already a member of this installation',
                username: testBody.username,
                status: 'already_member'
            });
        });

        it('should return not_found status when user does not exist', async () => {
            const mockInstallation = {
                id: testParams.id,
                users: []
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.user.findFirst.mockResolvedValue(null);

            await addTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                username: testBody.username,
                status: 'not_found'
            });
        });

        it('should throw NotFoundError when installation does not exist', async () => {
            mockPrisma.installation.findUnique.mockResolvedValue(null);

            await addTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Installation not found'
                })
            );
        });
    });

    describe('updateTeamMemberPermissions', () => {
        const testParams = {
            id: 'test-installation-123',
            userId: 'member-user-456'
        };

        const testBody = {
            userId: 'admin-user-123',
            permissionCodes: ['VIEW_TASKS', 'CREATE_TASKS', 'MANAGE_TEAM']
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should update team member permissions successfully', async () => {
            const mockInstallation = {
                users: [
                    { userId: testBody.userId },
                    { userId: testParams.userId }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.userInstallationPermission.update.mockResolvedValue({});

            await updateTeamMemberPermissions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Permissions updated successfully'
            });
        });

        it('should throw authorization error when user is not team member', async () => {
            const mockInstallation = {
                users: [{ userId: 'other-user' }]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await updateTeamMemberPermissions(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'AuthorizationError',
                    message: 'Not authorized to update permissions for this installation'
                })
            );
        });
    });

    describe('removeTeamMember', () => {
        const testParams = {
            id: 'test-installation-123',
            userId: 'member-to-remove-456'
        };

        const testBody = {
            userId: 'admin-user-123'
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it('should remove team member successfully', async () => {
            const mockInstallation = {
                users: [
                    { userId: testBody.userId },
                    { userId: testParams.userId }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockPrisma.installation.update.mockResolvedValue({});
            mockPrisma.userInstallationPermission.delete.mockResolvedValue({});

            await removeTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: 'Team member removed successfully'
            });
        });

        it('should throw authorization error when user is not team member', async () => {
            const mockInstallation = {
                users: [{ userId: 'other-user' }]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);

            await removeTeamMember(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'AuthorizationError',
                    message: 'Not authorized to remove members from this installation'
                })
            );
        });
    });
});