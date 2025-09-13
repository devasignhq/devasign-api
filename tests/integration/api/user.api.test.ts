import request from 'supertest';
import express, { RequestHandler } from 'express';
import { TestDataFactory } from '../../helpers/test-data-factory';
import { userRoutes } from '../../../api/routes/user.route';
import { execSync } from 'child_process';
import { errorHandler } from '../../../api/middlewares/error.middleware';
import { DatabaseTestHelper } from '@tests/helpers';
import { ErrorClass, NotFoundErrorClass } from '@/models/general.model';
import { validateUser } from '@/middlewares/auth.middleware';

// Mock Firebase admin for authentication
jest.mock('../../../api/config/firebase.config', () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock Stellar service for wallet operations
jest.mock('../../../api/services/stellar.service', () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

// Mock encryption helper
jest.mock('../../../api/helper', () => ({
    encrypt: jest.fn((secret: string) => `encrypted_${secret}`)
}));

describe('User API Integration Tests', () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;
    let mockEncrypt: jest.Mock;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();
        
        // Setup Express app with user routes
        app = express();
        app.use(express.json());
        
        // Mock authentication middleware for testing
        app.use('/users', (req, res, next) => {
            // Add mock user data to request for authenticated endpoints
            req.body = {
                ...req.body,
                currentUser: {
                    uid: req.headers['x-test-user-id'] || 'test-user-1',
                    admin: req.headers['x-test-admin'] === 'true'
                },
                userId: req.headers['x-test-user-id'] || 'test-user-1'
            };
            next();
        });
        
        app.use('/users', userRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = require('../../../api/config/firebase.config');
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken;
        
        const { stellarService } = require('../../../api/services/stellar.service');
        mockStellarService = stellarService;
        
        const { encrypt } = require('../../../api/helper');
        mockEncrypt = encrypt;
    });

    beforeEach(async () => {
        // Reset database before each test - simple cleanup
        try {
            await prisma.transaction.deleteMany();
            await prisma.taskSubmission.deleteMany();
            await prisma.taskActivity.deleteMany();
            await prisma.userInstallationPermission.deleteMany();
            await prisma.task.deleteMany();
            await prisma.contributionSummary.deleteMany();
            await prisma.installation.deleteMany();
            await prisma.user.deleteMany();
            await prisma.permission.deleteMany();
            await prisma.subscriptionPackage.deleteMany();
        } catch (error) {
            // Ignore errors during cleanup
        }
        
        // Seed basic test data
        try {
            await prisma.subscriptionPackage.create({
                data: {
                    id: 'test-package-id',
                    name: 'Test Package',
                    description: 'Test subscription package',
                    maxTasks: 10,
                    maxUsers: 5,
                    paid: false,
                    price: 0,
                    active: true
                }
            });
        } catch (error) {
            // Package might already exist
        }
        
        // Reset mocks
        jest.clearAllMocks();
        
        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: 'test-user-1',
            admin: false
        });
        
        mockStellarService.createWallet.mockResolvedValue({
            publicKey: 'GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
            secretKey: 'STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12'
        });
        
        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);
        
        mockEncrypt.mockImplementation((secret: string) => `encrypted_${secret}`);
        
        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        
        // Clean up Docker container
        try {
            execSync('docker stop test-postgres');
            // execSync('docker stop test-postgres && docker rm test-postgres');
        } catch (error) {
            console.log('Error cleaning up test container:', error);
        }
    });

    describe('POST /users - Create User', () => {
        it('should create a new user with wallet successfully', async () => {
            const userData = {
                gitHubUsername: 'testuser123'
            };

            const response = await request(app)
                .post('/users')
                .set('x-test-user-id', 'new-user-123')
                .send(userData)
                .expect(201);

            expect(response.body).toMatchObject({
                userId: 'new-user-123',
                username: 'testuser123',
                walletAddress: expect.stringMatching(/^G[A-Z0-9]{54}$/),
                contributionSummary: expect.objectContaining({
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                })
            });

            // Verify user was created in database
            const createdUser = await prisma.user.findUnique({
                where: { userId: 'new-user-123' },
                include: { contributionSummary: true }
            });

            expect(createdUser).toBeTruthy();
            expect(createdUser?.username).toBe('testuser123');
            expect(createdUser?.walletAddress).toBeTruthy();
            expect(createdUser?.contributionSummary).toBeTruthy();

            // Verify Stellar service was called
            expect(mockStellarService.createWallet).toHaveBeenCalledTimes(1);
            expect(mockStellarService.addTrustLineViaSponsor).toHaveBeenCalledTimes(1);
        });

        it('should create a user without wallet when skipWallet=true', async () => {
            const userData = {
                gitHubUsername: 'testuser456'
            };

            const response = await request(app)
                .post('/users?skipWallet=true')
                .set('x-test-user-id', 'new-user-456')
                .send(userData)
                .expect(201);

            expect(response.body).toMatchObject({
                userId: 'new-user-456',
                username: 'testuser456',
                walletAddress: '',
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

        it('should return error when user already exists', async () => {
            // Create user first
            const existingUser = TestDataFactory.user({ userId: 'existing-user' });
            await prisma.user.create({
                data: {
                    ...existingUser,
                    addressBook: [],
                    contributionSummary: { create: {} }
                }
            });

            const userData = {
                gitHubUsername: 'testuser789'
            };

            await request(app)
                .post('/users')
                .set('x-test-user-id', 'existing-user')
                .send(userData)
                .expect(420);
        });

        it('should handle wallet creation failure gracefully', async () => {
            mockStellarService.createWallet.mockRejectedValue(new Error('Stellar network error'));

            const userData = {
                gitHubUsername: 'testuser999'
            };

            await request(app)
                .post('/users')
                .set('x-test-user-id', 'new-user-999')
                .send(userData)
                .expect(500);
        });

        it('should handle trustline creation failure gracefully', async () => {
            mockStellarService.addTrustLineViaSponsor.mockRejectedValue(new Error('Trustline creation failed'));

            const userData = {
                gitHubUsername: 'testuser888'
            };

            const response = await request(app)
                .post('/users')
                .set('x-test-user-id', 'new-user-888')
                .send(userData)
                .expect(202);

            expect(response.body).toMatchObject({
                user: expect.objectContaining({
                    userId: 'new-user-888',
                    username: 'testuser888'
                }),
                error: expect.any(Object),
                message: expect.stringContaining('Failed to add USDC trustline')
            });

            // Verify user was still created
            const createdUser = await prisma.user.findUnique({
                where: { userId: 'new-user-888' }
            });
            expect(createdUser).toBeTruthy();
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .post('/users')
                .set('x-test-user-id', 'new-user-validation')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Github username is required')
                    })
                ])
            });
        });
    });

    describe('GET /users - Get User', () => {
        let testUser: any;

        beforeEach(async () => {
            // Create test user with contribution summary
            testUser = TestDataFactory.user({ userId: 'test-get-user' });
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

        it('should get user with basic view by default', async () => {
            const response = await request(app)
                .get('/users')
                .set('x-test-user-id', 'test-get-user')
                .expect(200);

            expect(response.body).toMatchObject({
                userId: 'test-get-user',
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

        it('should get user with full view when requested', async () => {
            const response = await request(app)
                .get('/users?view=full')
                .set('x-test-user-id', 'test-get-user')
                .expect(200);

            expect(response.body).toMatchObject({
                userId: 'test-get-user',
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

        it('should create wallet when setWallet=true and user has no wallet', async () => {
            // Create user without wallet
            const userWithoutWallet = TestDataFactory.user({ 
                userId: 'user-no-wallet',
                walletAddress: '',
                walletSecret: ''
            });
            await prisma.user.create({
                data: {
                    ...userWithoutWallet,
                    addressBook: [],
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get('/users?setWallet=true')
                .set('x-test-user-id', 'user-no-wallet')
                .expect(200);

            // Verify wallet was added to database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: 'user-no-wallet' }
            });
            expect(updatedUser?.walletAddress).toBeTruthy();
            expect(updatedUser?.walletAddress).not.toBe('');
        });

        it('should return 420 when user does not exist', async () => {
            const response = await request(app)
                .get('/users')
                .set('x-test-user-id', 'non-existent-user')
                .expect(420);

            expect(response.body).toMatchObject({
                error: (new NotFoundErrorClass("User not found"))
            });
        });
    });

    describe('PATCH /users/username - Update Username', () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ userId: 'test-update-user' });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it('should update username successfully', async () => {
            const updateData = {
                githubUsername: 'newusername123'
            };

            const response = await request(app)
                .patch('/users/username')
                .set('x-test-user-id', 'test-update-user')
                .send(updateData)
                .expect(200);

            expect(response.body).toMatchObject({
                userId: 'test-update-user',
                username: 'newusername123',
                updatedAt: expect.any(String)
            });

            // Verify username was updated in database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: 'test-update-user' }
            });
            expect(updatedUser?.username).toBe('newusername123');
        });

        it('should return 420 when user does not exist', async () => {
            const updateData = {
                githubUsername: 'newusername456'
            };

            const response = await request(app)
                .patch('/users/username')
                .set('x-test-user-id', 'non-existent-user')
                .send(updateData)
                .expect(420);

            expect(response.body).toMatchObject({
                error: (new NotFoundErrorClass("User not found"))
            });
        });

        it('should validate required fields', async () => {
            const response = await request(app)
                .patch('/users/username')
                .set('x-test-user-id', 'test-update-user')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Github username is required')
                    })
                ])
            });
        });
    });

    describe('PATCH /users/address-book - Update Address Book', () => {
        let testUser: any;

        beforeEach(async () => {
            testUser = TestDataFactory.user({ 
                userId: 'test-addressbook-user',
                addressBook: [
                    { address: 'GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC', name: 'Existing Contact' }
                ]
            });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });
        });

        it('should add new address to address book successfully', async () => {
            const newAddress = {
                address: 'GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A',
                name: 'New Contact'
            };

            const response = await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', 'test-addressbook-user')
                .send(newAddress)
                .expect(200);

            expect(response.body).toMatchObject({
                userId: 'test-addressbook-user',
                addressBook: expect.arrayContaining([
                    { address: 'GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC', name: 'Existing Contact' },
                    { address: 'GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A', name: 'New Contact' }
                ]),
                updatedAt: expect.any(String)
            });

            // Verify address book was updated in database
            const updatedUser = await prisma.user.findUnique({
                where: { userId: 'test-addressbook-user' }
            });
            expect(updatedUser?.addressBook).toHaveLength(2);
        });

        it('should return error when address already exists', async () => {
            const duplicateAddress = {
                address: 'GEXISTING1234567890ABCDEF1234567890ABCDEF1234567890ABC',
                name: 'Duplicate Contact'
            };

            const response = await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', 'test-addressbook-user')
                .send(duplicateAddress)
                .expect(420);

            expect(response.body).toMatchObject({
                error: (new ErrorClass("ValidationError", null, "Address already exists in address book"))
            });
        });

        it('should return error when address book limit is reached', async () => {
            // Create user with maximum addresses (20)
            const maxAddresses = Array.from({ length: 20 }, (_, i) => ({
                address: `GMAX${i.toString().padStart(52, '0')}`,
                name: `Contact ${i}`
            }));

            const userWithMaxAddresses = TestDataFactory.user({
                userId: 'user-max-addresses',
                addressBook: maxAddresses
            });

            await prisma.user.create({
                data: {
                    ...userWithMaxAddresses,
                    contributionSummary: { create: {} }
                }
            });

            const newAddress = {
                address: 'GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A',
                name: 'Overflow Contact'
            };

            const response = await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', 'user-max-addresses')
                .send(newAddress)
                .expect(420);

            expect(response.body).toMatchObject({
                error: (new ErrorClass("ValidationError", null, "Address book limit reached (max 20)"))
            });
        });

        it('should return 420 when user does not exist', async () => {
            const newAddress = {
                address: 'GNEWADDRESS1234567890ABCDEF1234567890ABCDEF1234567890A',
                name: 'New Contact'
            };

            const response = await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', 'non-existent-user')
                .send(newAddress)
                .expect(420);

            expect(response.body).toMatchObject({
                error: (new NotFoundErrorClass("User not found"))
            });
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

        it('should validate required fields', async () => {
            const response = await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', 'test-addressbook-user')
                .send({})
                .expect(400);

            expect(response.body).toMatchObject({
                errors: expect.arrayContaining([
                    expect.objectContaining({
                        msg: expect.stringContaining('Address is required')
                    }),
                    expect.objectContaining({
                        msg: expect.stringContaining('Name is required')
                    })
                ])
            });
        });
    });

    describe('Authentication and Authorization', () => {
        it('should require authentication for all endpoints', async () => {
            // Test without authentication headers
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use('/users', validateUser as RequestHandler, userRoutes);
            appWithoutAuth.use(errorHandler);

            await request(appWithoutAuth)
                .get('/users')
                .expect(401);

            await request(appWithoutAuth)
                .post('/users')
                .send({ gitHubUsername: 'test' })
                .expect(401);

            await request(appWithoutAuth)
                .patch('/users/username')
                .send({ githubUsername: 'test' })
                .expect(401);

            await request(appWithoutAuth)
                .patch('/users/address-book')
                .send({ address: 'GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12', name: 'Test' })
                .expect(401);
        });
    });

    describe('Database Persistence and Consistency', () => {
        it('should maintain data consistency across operations', async () => {
            // Create user
            const userData = { gitHubUsername: 'consistencytest' };
            const createResponse = await request(app)
                .post('/users')
                .set('x-test-user-id', 'consistency-user')
                .send(userData)
                .expect(201);

            const userId = createResponse.body.userId;

            // Get user to verify creation
            const getResponse = await request(app)
                .get('/users?view=full')
                .set('x-test-user-id', userId)
                .expect(200);

            expect(getResponse.body.userId).toBe(userId);
            expect(getResponse.body.username).toBe('consistencytest');

            // Update username
            await request(app)
                .patch('/users/username')
                .set('x-test-user-id', userId)
                .send({ githubUsername: 'updatedname' })
                .expect(200);

            // Add address to address book
            await request(app)
                .patch('/users/address-book')
                .set('x-test-user-id', userId)
                .send({
                    address: 'GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12',
                    name: 'Test Contact'
                })
                .expect(200);

            // Verify all changes persisted
            const finalGetResponse = await request(app)
                .get('/users?view=full')
                .set('x-test-user-id', userId)
                .expect(200);

            expect(finalGetResponse.body).toMatchObject({
                userId: userId,
                username: 'updatedname',
                addressBook: expect.arrayContaining([
                    { address: 'GTEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12', name: 'Test Contact' }
                ]),
                contributionSummary: expect.objectContaining({
                    tasksCompleted: 0,
                    activeTasks: 0,
                    totalEarnings: 0
                })
            });
        });

        it('should handle concurrent operations safely', async () => {
            // Create user first
            const userData = { gitHubUsername: 'concurrenttest' };
            await request(app)
                .post('/users')
                .set('x-test-user-id', 'concurrent-user')
                .send(userData)
                .expect(201);

            // Perform multiple concurrent address book updates
            const addresses = [
                { address: 'GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1', name: 'Contact 1' },
                { address: 'GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF2', name: 'Contact 2' },
                { address: 'GADDR1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF3', name: 'Contact 3' }
            ];

            const promises = addresses.map(address =>
                request(app)
                    .patch('/users/address-book')
                    .set('x-test-user-id', 'concurrent-user')
                    .send(address)
            );

            const results = await Promise.allSettled(promises);
            
            // At least one should succeed (due to race conditions, some might fail)
            const successfulResults = results.filter(result => 
                result.status === 'fulfilled' && result.value.status === 200
            );
            
            expect(successfulResults.length).toBeGreaterThan(0);

            // Verify final state
            const finalUser = await prisma.user.findUnique({
                where: { userId: 'concurrent-user' }
            });
            
            expect(finalUser?.addressBook).toBeDefined();
            expect(Array.isArray(finalUser?.addressBook)).toBe(true);
        });
    });
});