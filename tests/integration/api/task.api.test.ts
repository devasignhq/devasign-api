import request from 'supertest';
import express, { RequestHandler } from 'express';
import { TestDataFactory } from '../../helpers/test-data-factory';
import { taskRoutes } from '../../../api/routes/task.route';
import { execSync } from 'child_process';
import { errorHandler } from '../../../api/middlewares/error.middleware';
import { DatabaseTestHelper } from '@tests/helpers';
import { ErrorClass, NotFoundErrorClass } from '@/models/general.model';
import { TaskStatus, TimelineType } from '@/generated/client';

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
        getAccountInfo: jest.fn(),
        transferAsset: jest.fn(),
        transferAssetViaSponsor: jest.fn(),
        addTrustLineViaSponsor: jest.fn()
    }
}));

// Mock Firebase service for task messaging
jest.mock('../../../api/services/firebase.service', () => ({
    FirebaseService: {
        createTask: jest.fn(),
        updateTaskStatus: jest.fn()
    }
}));

// Mock Octokit service for GitHub operations
jest.mock('../../../api/services/octokit.service', () => ({
    OctokitService: {
        updateIssueComment: jest.fn(),
        addBountyLabelAndCreateBountyComment: jest.fn(),
        removeBountyLabelAndDeleteBountyComment: jest.fn(),
        customBountyMessage: jest.fn()
    }
}));

// Mock encryption helper
jest.mock('../../../api/helper', () => ({
    encrypt: jest.fn((secret: string) => `encrypted_${secret}`),
    decrypt: jest.fn((encrypted: string) => encrypted.replace('encrypted_', ''))
}));

describe('Task API Integration Tests', () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockStellarService: any;
    let mockFirebaseService: any;
    let mockOctokitService: any;
    let mockEncrypt: jest.Mock;
    let mockDecrypt: jest.Mock;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with task routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use('/tasks', (req, res, next) => {
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

        app.use('/tasks', taskRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = require('../../../api/config/firebase.config');
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken;

        const { stellarService } = require('../../../api/services/stellar.service');
        mockStellarService = stellarService;

        const { FirebaseService } = require('../../../api/services/firebase.service');
        mockFirebaseService = FirebaseService;

        const { OctokitService } = require('../../../api/services/octokit.service');
        mockOctokitService = OctokitService;

        const { encrypt, decrypt } = require('../../../api/helper');
        mockEncrypt = encrypt;
        mockDecrypt = decrypt;
    });

    beforeEach(async () => {
        // Reset database before each test
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

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: 'test-user-1',
            admin: false
        });

        mockStellarService.getAccountInfo.mockResolvedValue({
            balances: [
                {
                    asset_type: 'credit_alphanum12',
                    asset_code: 'USDC',
                    balance: '1000.0000000'
                }
            ]
        });

        mockStellarService.transferAsset.mockResolvedValue({
            txHash: 'mock_tx_hash_123'
        });

        mockStellarService.transferAssetViaSponsor.mockResolvedValue({
            txHash: 'mock_sponsor_tx_hash_123'
        });

        mockStellarService.addTrustLineViaSponsor.mockResolvedValue(true);

        mockFirebaseService.createTask.mockResolvedValue({
            id: 'firebase_task_123',
            creatorId: 'test-user-1',
            contributorId: null
        });

        mockFirebaseService.updateTaskStatus.mockResolvedValue(true);

        mockOctokitService.updateIssueComment.mockResolvedValue({
            id: 'github_comment_123'
        });
        mockOctokitService.addBountyLabelAndCreateBountyComment.mockResolvedValue({
            id: 'github_comment_123'
        });
        mockOctokitService.removeBountyLabelAndDeleteBountyComment.mockResolvedValue('SUCCESS');

        mockOctokitService.customBountyMessage.mockReturnValue('Custom bounty message');

        mockEncrypt.mockImplementation((secret: string) => `encrypted_${secret}`);
        mockDecrypt.mockImplementation((encrypted: string) => encrypted.replace('encrypted_', ''));

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();

        // Clean up Docker container
        try {
            execSync('docker stop test-postgres');
        } catch (error) {
            console.log('Error cleaning up test container:', error);
        }
    });

    describe('POST /tasks - Create Task', () => {
        let testUser: any;
        let testInstallation: any;

        beforeEach(async () => {
            // Create test user
            testUser = TestDataFactory.user({ userId: 'task-creator-1' });
            await prisma.user.create({
                data: {
                    ...testUser,
                    contributionSummary: { create: {} }
                }
            });

            // Create test installation
            testInstallation = TestDataFactory.installation({
                id: 'test-installation-1',
                walletSecret: 'encrypted_installation_secret',
                escrowSecret: 'encrypted_escrow_secret'
            });
            await prisma.installation.create({
                data: testInstallation
            });
        });

        it('should create a new task successfully', async () => {
            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.50',
                timeline: 2,
                timelineType: 'WEEK'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(201);

            expect(response.body).toMatchObject({
                bounty: 100.5,
                timeline: 2,
                timelineType: 'WEEK',
                status: 'OPEN',
                creatorId: 'task-creator-1',
                installationId: 'test-installation-1',
                issue: expect.objectContaining({
                    bountyCommentId: 'github_comment_123'
                })
            });

            // Verify task was created in database
            const createdTask = await prisma.task.findFirst({
                where: { creatorId: 'task-creator-1' }
            });
            expect(createdTask).toBeTruthy();
            expect(createdTask.bounty).toBe(100.5);

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: { taskId: createdTask.id }
            });
            expect(transaction).toBeTruthy();
            expect(transaction.category).toBe('BOUNTY');
            expect(transaction.amount).toBe(100.5);

            // Verify Stellar service was called
            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                'installation_secret',
                testInstallation.escrowAddress,
                expect.any(Object),
                expect.any(Object),
                '100.50'
            );

            // Verify GitHub comment was created
            expect(mockOctokitService.addBountyLabelAndCreateBountyComment).toHaveBeenCalled();
        });

        it('should handle timeline conversion from days to weeks', async () => {
            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '50.00',
                timeline: 14, // 14 days should convert to 2 weeks
                timelineType: 'DAY'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(201);

            expect(response.body.timeline).toBe(2);
            expect(response.body.timelineType).toBe('WEEK');
        });

        it('should return error when installation not found', async () => {
            const taskData = {
                installationId: 'non-existent-installation',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(420);

            expect(response.body.error).toMatchObject(
                new NotFoundErrorClass("Installation not found")
            );
        });

        it('should return error when insufficient balance', async () => {
            // Mock insufficient balance
            mockStellarService.getAccountInfo.mockResolvedValue({
                balances: [
                    {
                        asset_type: 'credit_alphanum12',
                        asset_code: 'USDC',
                        balance: '50.0000000' // Less than required bounty
                    }
                ]
            });

            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(420);

            expect(response.body.error.message).toBe('Insufficient balance');
        });

        it('should handle GitHub comment creation failure gracefully', async () => {
            mockOctokitService.addBountyLabelAndCreateBountyComment.mockRejectedValue(
                new Error('GitHub API error')
            );

            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(202);

            expect(response.body.message).toContain('Failed to either create bounty comment');
            expect(response.body.task).toBeTruthy();
            expect(response.body.transactionRecord).toBe(true);
        });

        it('should handle transaction recording failure', async () => {
            // Mock database error for transaction creation
            const originalCreate = prisma.transaction.create;
            prisma.transaction.create = jest.fn().mockRejectedValue(new Error('Database error'));

            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            const response = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'task-creator-1')
                .send({ payload: taskData })
                .expect(202);

            expect(response.body.message).toContain('Failed to record bounty transaction');
            expect(response.body.transactionRecord).toBe(false);

            // Restore original method
            prisma.transaction.create = originalCreate;
        });
    });

    describe('GET /tasks - Get Tasks', () => {
        beforeEach(async () => {
            // Create test users
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            // Create test installation
            const installation = TestDataFactory.installation({ id: 'test-installation-1' });
            await prisma.installation.create({ data: installation });

            // Create test tasks
            const tasks = [
                TestDataFactory.task({
                    creatorId: 'creator-1',
                    installationId: 'test-installation-1',
                    bounty: 100,
                    status: TaskStatus.OPEN
                }),
                TestDataFactory.task({
                    creatorId: 'creator-1',
                    installationId: 'test-installation-1',
                    bounty: 200,
                    status: TaskStatus.OPEN
                })
            ];

            for (const task of tasks) {
                await prisma.task.create({ data: task });
            }
        });

        it('should get all open tasks with pagination', async () => {
            const response = await request(app)
                .get('/tasks?page=1&limit=10')
                .expect(200);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.pagination).toMatchObject({
                currentPage: 1,
                totalPages: 1,
                totalItems: 2,
                itemsPerPage: 10,
                hasMore: false
            });

            expect(response.body.data[0]).toMatchObject({
                status: 'OPEN',
                bounty: expect.any(Number),
                creatorId: 'creator-1'
            });
        });

        it('should filter tasks by installation', async () => {
            const response = await request(app)
                .get('/tasks?installationId=test-installation-1')
                .expect(200);

            expect(response.body.data).toHaveLength(2);
            expect(response.body.data.every((task: any) =>
                task.installationId === undefined // Not included in select
            )).toBe(true);
        });

        it('should include detailed information when requested', async () => {
            const response = await request(app)
                .get('/tasks?detailed=true')
                .expect(200);

            expect(response.body.data[0]).toMatchObject({
                installation: expect.objectContaining({
                    account: expect.any(Object)
                }),
                creator: expect.objectContaining({
                    userId: 'creator-1',
                    username: expect.any(String)
                })
            });
        });

        it('should sort tasks by creation date', async () => {
            const response = await request(app)
                .get('/tasks?sort=asc')
                .expect(200);

            const tasks = response.body.data;
            expect(new Date(tasks[0].createdAt).getTime())
                .toBeLessThanOrEqual(new Date(tasks[1].createdAt).getTime());
        });
    });

    describe('Task Application Workflow', () => {
        let testTask: any;
        let contributor: any;

        beforeEach(async () => {
            // Create creator and contributor
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            contributor = TestDataFactory.user({ userId: 'contributor-1' });

            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            // Create installation
            const installation = TestDataFactory.installation({ id: 'test-installation-1' });
            await prisma.installation.create({ data: installation });

            // Create task
            const taskData = TestDataFactory.task({
                creatorId: 'creator-1',
                installationId: 'test-installation-1',
                status: TaskStatus.OPEN
            });
            testTask = await prisma.task.create({ data: taskData });
        });

        it('should allow contributor to apply for task', async () => {
            const response = await request(app)
                .post(`/tasks/${testTask.id}/apply`)
                .set('x-test-user-id', 'contributor-1')
                .send({})
                .expect(200);

            expect(response.body.message).toContain('Task application submitted');
        });

        it('should allow creator to accept application', async () => {
            // First apply for the task
            await prisma.taskActivity.create({
                data: {
                    task: {
                        connect: { id: testTask.id }
                    },
                    user: {
                        connect: { userId: 'contributor-1' }
                    },
                }
            });

            const response = await request(app)
                .post(`/tasks/${testTask.id}/accept/contributor-1`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            expect(response.body.status).toBe(TaskStatus.IN_PROGRESS);
            expect(response.body.contributor.userId).toBe('contributor-1');

            // Verify Firebase task was created
            expect(mockFirebaseService.createTask).toHaveBeenCalledWith(
                testTask.id,
                'creator-1',
                'contributor-1'
            );
        });

        it('should prevent non-creator from accepting applications', async () => {
            await request(app)
                .post(`/tasks/${testTask.id}/accept/contributor-1`)
                .set('x-test-user-id', 'contributor-1') // Not the creator
                .send({})
                .expect(420);
        });

        it('should prevent accepting application for non-open task', async () => {
            // Update task to IN_PROGRESS
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: TaskStatus.IN_PROGRESS }
            });

            await request(app)
                .post(`/tasks/${testTask.id}/accept/contributor-1`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(420);
        });
    });

    describe('Task Completion Workflow', () => {
        let testTask: any;

        beforeEach(async () => {
            // Create users
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            const contributor = TestDataFactory.user({ userId: 'contributor-1' });

            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            // Create installation
            const installation = TestDataFactory.installation({
                id: 'test-installation-1',
                escrowSecret: 'encrypted_escrow_secret'
            });
            await prisma.installation.create({ data: installation });

            // Create task in progress
            const taskData = TestDataFactory.task({
                creatorId: 'creator-1',
                contributorId: 'contributor-1',
                installationId: 'test-installation-1',
                status: TaskStatus.IN_PROGRESS,
                bounty: 100
            });
            testTask = await prisma.task.create({ data: taskData });
        });

        it('should allow contributor to mark task as complete', async () => {
            const submissionData = {
                pullRequest: 'https://github.com/test/repo/pull/123'
            };

            const response = await request(app)
                .post(`/tasks/${testTask.id}/complete`)
                .set('x-test-user-id', 'contributor-1')
                .send(submissionData)
                .expect(200);

            expect(response.body.status).toBe(TaskStatus.MARKED_AS_COMPLETED);
            
            // Verify task submission was created
            const submission = await prisma.taskSubmission.findFirst({
                where: { taskId: testTask.id, userId: 'contributor-1' }
            });
            expect(submission?.pullRequest).toBe('https://github.com/test/repo/pull/123');
        });

        it('should allow creator to validate completion and process payment', async () => {
            // First mark task as completed
            await prisma.task.update({
                where: { id: testTask.id },
                data: {
                    status: TaskStatus.MARKED_AS_COMPLETED,
                    completedAt: new Date()
                }
            });

            // Create task submission
            await prisma.taskSubmission.create({
                data: {
                    userId: 'contributor-1',
                    taskId: testTask.id,
                    installationId: 'test-installation-1',
                    pullRequest: 'https://github.com/test/repo/pull/123'
                }
            });

            const response = await request(app)
                .post(`/tasks/${testTask.id}/validate`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            expect(response.body.status).toBe(TaskStatus.COMPLETED);
            expect(response.body.settled).toBe(true);

            // Verify payment transaction
            expect(mockStellarService.transferAssetViaSponsor).toHaveBeenCalled();

            // Verify Firebase task status update
            expect(mockFirebaseService.updateTaskStatus).toHaveBeenCalledWith(testTask.id);

            // Verify contribution summary update
            const contributorSummary = await prisma.contributionSummary.findUnique({
                where: { userId: 'contributor-1' }
            });
            expect(contributorSummary?.tasksCompleted).toBe(1);
            expect(contributorSummary?.totalEarnings).toBe(100);
        });

        it('should prevent non-contributor from marking task complete', async () => {
            await request(app)
                .post(`/tasks/${testTask.id}/complete`)
                .set('x-test-user-id', 'creator-1') // Not the contributor
                .send({ pullRequest: 'https://github.com/test/repo/pull/123' })
                .expect(420);
        });

        it('should prevent non-creator from validating completion', async () => {
            await prisma.task.update({
                where: { id: testTask.id },
                data: { status: TaskStatus.MARKED_AS_COMPLETED }
            });

            await request(app)
                .post(`/tasks/${testTask.id}/validate`)
                .set('x-test-user-id', 'contributor-1') // Not the creator
                .send({})
                .expect(420);
        });
    });
    
    describe('Task Status Transitions', () => {
        let testTask: any;

        beforeEach(async () => {
            // Create users and installation
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            const contributor = TestDataFactory.user({ userId: 'contributor-1' });

            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            const installation = TestDataFactory.installation({ id: 'test-installation-1' });
            await prisma.installation.create({ data: installation });

            const taskData = TestDataFactory.task({
                creatorId: 'creator-1',
                installationId: 'test-installation-1',
                status: TaskStatus.OPEN
            });
            testTask = await prisma.task.create({ data: taskData });
        });

        it('should maintain database consistency during status transitions', async () => {
            // Apply for task
            await request(app)
                .post(`/tasks/${testTask.id}/apply`)
                .set('x-test-user-id', 'contributor-1')
                .send({})
                .expect(200);

            // Accept application
            await request(app)
                .post(`/tasks/${testTask.id}/accept/contributor-1`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            // Mark as complete
            await request(app)
                .post(`/tasks/${testTask.id}/complete`)
                .set('x-test-user-id', 'contributor-1')
                .send({ pullRequest: 'https://github.com/test/repo/pull/123' })
                .expect(200);

            // Validate completion
            await request(app)
                .post(`/tasks/${testTask.id}/validate`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            // Verify final state
            const finalTask = await prisma.task.findUnique({
                where: { id: testTask.id },
                include: {
                    taskSubmissions: true,
                    transactions: true,
                    contributor: {
                        include: { contributionSummary: true }
                    }
                }
            });

            expect(finalTask?.status).toBe(TaskStatus.COMPLETED);
            expect(finalTask?.settled).toBe(true);
            expect(finalTask?.contributorId).toBe('contributor-1');
            expect(finalTask?.taskSubmissions).toHaveLength(1);
            expect(finalTask?.contributor?.contributionSummary?.tasksCompleted).toBe(1);
        });

        it('should handle concurrent status changes safely', async () => {
            // Apply for task first
            await request(app)
                .post(`/tasks/${testTask.id}/apply`)
                .set('x-test-user-id', 'contributor-1')
                .send({})
                .expect(200);

            // Try to accept application and delete task concurrently
            const acceptPromise = request(app)
                .post(`/tasks/${testTask.id}/accept/contributor-1`)
                .set('x-test-user-id', 'creator-1')
                .send({});

            const deletePromise = request(app)
                .delete(`/tasks/${testTask.id}`)
                .set('x-test-user-id', 'creator-1')
                .send({});

            const results = await Promise.allSettled([acceptPromise, deletePromise]);

            // One should succeed, one should fail
            const successCount = results.filter(result =>
                result.status === 'fulfilled' &&
                (result.value.status === 200 || result.value.status === 204)
            ).length;

            expect(successCount).toBe(1);

            // Verify database consistency
            const finalTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });

            // Task should either be deleted or accepted, but not in an inconsistent state
            if (finalTask) {
                expect([TaskStatus.OPEN, TaskStatus.IN_PROGRESS]).toContain(finalTask.status);
            }
        });
    });

    describe('Task Management Operations', () => {
        let testTask: any;

        beforeEach(async () => {
            // Create test data
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const installation = TestDataFactory.installation({
                id: 'test-installation-1',
                walletSecret: 'encrypted_wallet_secret',
                escrowSecret: 'encrypted_escrow_secret'
            });
            await prisma.installation.create({ data: installation });

            const taskData = TestDataFactory.task({
                creatorId: 'creator-1',
                installationId: 'test-installation-1',
                bounty: 100,
                status: TaskStatus.OPEN
            });
            testTask = await prisma.task.create({ data: taskData });
        });

        it('should allow creator to update task bounty', async () => {
            const updateData = { newBounty: 150 };

            const response = await request(app)
                .patch(`/tasks/${testTask.id}/bounty`)
                .set('x-test-user-id', 'creator-1')
                .send(updateData)
                .expect(200);

            expect(response.body.bounty).toBe(150);

            // Verify additional funds transfer
            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                'wallet_secret',
                expect.any(String),
                expect.any(Object),
                expect.any(Object),
                '50' // Difference
            );

            // Verify transaction record
            const transaction = await prisma.transaction.findFirst({
                where: {
                    taskId: testTask.id,
                    category: 'BOUNTY'
                }
            });
            expect(transaction?.amount).toBe(50);
        });

        it('should allow creator to delete task', async () => {
            const response = await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            expect(response.body.data.message).toContain('Task deleted successfully');
        });

        it('should prevent non-creator from updating bounty', async () => {
            await request(app)
                .patch(`/tasks/${testTask.id}/bounty`)
                .set('x-test-user-id', 'other-user')
                .send({ newBounty: 150 })
                .expect(420);
        });

        it('should prevent deleting task with contributor', async () => {
            // Add application to task
            const contributor = TestDataFactory.user({ userId: 'contributor-1' });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            await request(app)
                .post(`/tasks/${testTask.id}/apply`)
                .set('x-test-user-id', 'contributor-1')
                .send({});

            await request(app)
                .delete(`/tasks/${testTask.id}`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(420);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle Stellar service failures gracefully', async () => {
            mockStellarService.transferAsset.mockRejectedValue(new Error('Stellar network error'));

            // Create test data
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            const installation = TestDataFactory.installation({ id: 'test-installation-1' });
            await prisma.installation.create({ data: installation });

            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'creator-1')
                .send({ payload: taskData })
                .expect(500);
        });

        it('should validate task data properly', async () => {
            const invalidTaskData = {
                installationId: 'test-installation-1',
                // Missing required fields
            };

            await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'creator-1')
                .send({ payload: invalidTaskData })
                .expect(400);
        });

        it('should handle non-existent task operations', async () => {
            await request(app)
                .get('/tasks/non-existent-task')
                .expect(420);

            await request(app)
                .post('/tasks/non-existent-task/apply')
                .set('x-test-user-id', 'contributor-1')
                .send({})
                .expect(420);
        });
    });

    describe('Database Persistence and Consistency', () => {
        it('should maintain data consistency across operations', async () => {
            // Create test data
            const creator = TestDataFactory.user({ userId: 'creator-1' });
            const contributor = TestDataFactory.user({ userId: 'contributor-1' });

            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });
            await prisma.user.create({
                data: { ...contributor, contributionSummary: { create: {} } }
            });

            const installation = TestDataFactory.installation({ id: 'test-installation-1' });
            await prisma.installation.create({ data: installation });

            // Create task
            const taskData = {
                installationId: 'test-installation-1',
                bountyLabelId: 'bounty-label-123',
                issue: TestDataFactory.githubIssue(),
                bounty: '100.00'
            };

            const createResponse = await request(app)
                .post('/tasks')
                .set('x-test-user-id', 'creator-1')
                .send({ payload: taskData })
                .expect(201);

            const taskId = createResponse.body.id;

            // Apply for task
            await request(app)
                .post(`/tasks/${taskId}/apply`)
                .set('x-test-user-id', 'contributor-1')
                .send({})
                .expect(200);

            // Accept application
            await request(app)
                .post(`/tasks/${taskId}/accept/contributor-1`)
                .set('x-test-user-id', 'creator-1')
                .send({})
                .expect(200);

            // Verify all changes persisted
            const finalTask = await prisma.task.findUnique({
                where: { id: taskId },
                include: {
                    taskActivities: true,
                    transactions: true
                }
            });

            expect(finalTask).toMatchObject({
                status: TaskStatus.IN_PROGRESS,
                contributorId: 'contributor-1',
                creatorId: 'creator-1'
            });
            expect(finalTask?.taskActivities).toHaveLength(1);
            expect(finalTask?.transactions).toHaveLength(1);
        });
    });
});