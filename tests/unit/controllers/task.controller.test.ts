import { Request, Response, NextFunction } from "express";
import {
    createTask,
    getTasks,
    getInstallationTasks,
    getContributorTasks,
    getTask,
    updateTaskBounty,
    updateTaskTimeline,
    submitTaskApplication,
    acceptTaskApplication,
    requestTimelineExtension,
    markAsComplete,
    validateCompletion,
    getTaskActivities,
    markActivityAsViewed
} from "../../../api/controllers/task.controller";
import { prisma } from "../../../api/config/database.config";
import { stellarService } from "../../../api/services/stellar.service";
import { FirebaseService } from "../../../api/services/firebase.service";
import { OctokitService } from "../../../api/services/octokit.service";
import { decrypt } from "../../../api/helper";
import { ErrorClass, NotFoundErrorClass, MessageType } from "../../../api/models/general.model";
import { TaskStatus, TimelineType } from "../../../api/generated/client";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { createMockRequest, createMockResponse, createMockNext } from "../../helpers/test-utils";
import { Timestamp } from "firebase-admin/firestore";

// Mock Firebase configuration first to prevent initialization issues
jest.mock("../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        initializeApp: jest.fn(),
        credential: {
            cert: jest.fn()
        }
    },
    firestoreDB: {
        collection: jest.fn(() => ({
            doc: jest.fn(() => ({
                set: jest.fn(),
                get: jest.fn(),
                update: jest.fn(),
                delete: jest.fn()
            }))
        }))
    }
}));

// Mock dependencies
jest.mock("../../../api/config/database.config", () => ({
    prisma: {
        installation: {
            findUnique: jest.fn()
        },
        task: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            count: jest.fn(),
            delete: jest.fn()
        },
        transaction: {
            create: jest.fn()
        },
        taskActivity: {
            create: jest.fn(),
            findFirst: jest.fn(),
            findMany: jest.fn(),
            findUnique: jest.fn(),
            update: jest.fn(),
            count: jest.fn()
        },
        taskSubmission: {
            create: jest.fn()
        },
        contributionSummary: {
            update: jest.fn()
        },
        $transaction: jest.fn()
    }
}));

jest.mock("../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: jest.fn(),
        addTrustLineViaSponsor: jest.fn(),
        transferAsset: jest.fn(),
        transferAssetViaSponsor: jest.fn()
    }
}));

jest.mock("../../../api/services/firebase.service", () => ({
    FirebaseService: {
        createTask: jest.fn(),
        createMessage: jest.fn(),
        updateTaskStatus: jest.fn()
    }
}));

jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        addBountyLabelAndCreateBountyComment: jest.fn(),
        customBountyMessage: jest.fn(),
        updateIssueComment: jest.fn()
    }
}));

jest.mock("../../../api/helper", () => ({
    decrypt: jest.fn()
}));

jest.mock("../../../api/config/stellar.config", () => ({
    wallet: {
        stellar: jest.fn(() => ({
            account: jest.fn()
        })),
        anchor: jest.fn()
    },
    stellar: {
        account: jest.fn()
    },
    account: {
        getInfo: jest.fn()
    },
    anchor: {},
    xlmAssetId: {},
    usdcAssetId: {
        code: "USDC",
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
    }
}));

describe("TaskController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockPrisma = prisma as any;
    const mockStellarService = stellarService as jest.Mocked<typeof stellarService>;
    const mockFirebaseService = FirebaseService as jest.Mocked<typeof FirebaseService>;
    const mockOctokitService = OctokitService as jest.Mocked<typeof OctokitService>;
    const mockDecrypt = decrypt as jest.MockedFunction<typeof decrypt>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
        TestDataFactory.resetCounters();
    });

    describe("createTask", () => {
        const testTaskData = {
            userId: "test-user-123",
            payload: {
                installationId: "test-installation-1",
                issue: TestDataFactory.githubIssue(),
                timeline: 1,
                timelineType: "WEEK" as TimelineType,
                bounty: "100.0",
                bountyLabelId: "bounty-label-123"
            }
        };

        beforeEach(() => {
            mockRequest.body = testTaskData;
        });

        it("should create task successfully with sufficient balance", async () => {
            const mockInstallation = TestDataFactory.installation({
                id: testTaskData.payload.installationId,
                walletSecret: "encrypted_wallet_secret",
                walletAddress: "GWALLET123",
                escrowSecret: "encrypted_escrow_secret",
                escrowAddress: "GESCROW123"
            });

            const mockAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "500.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            const mockEscrowAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "0.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            const mockCreatedTask = {
                id: "task-123",
                ...testTaskData.payload,
                bounty: 100.0,
                status: TaskStatus.OPEN,
                creatorId: testTaskData.userId
            };

            const mockBountyComment = { id: "comment-123" };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockStellarService.getAccountInfo
                .mockResolvedValueOnce(mockAccountInfo as any)
                .mockResolvedValueOnce(mockEscrowAccountInfo as any);
            mockDecrypt
                .mockReturnValueOnce("decrypted_wallet_secret")
                .mockReturnValueOnce("decrypted_escrow_secret");
            mockStellarService.addTrustLineViaSponsor.mockResolvedValue({ txHash: "tx-hash-222" });
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "tx-hash-123" });
            mockPrisma.task.create.mockResolvedValue(mockCreatedTask);
            mockPrisma.transaction.create.mockResolvedValue({ id: "transaction-123" });
            mockOctokitService.addBountyLabelAndCreateBountyComment.mockResolvedValue(mockBountyComment as any);
            mockOctokitService.customBountyMessage.mockReturnValue("Bounty message");
            mockPrisma.task.update.mockResolvedValue({
                ...mockCreatedTask,
                issue: { ...mockCreatedTask.issue, bountyCommentId: mockBountyComment.id }
            });

            await createTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findUnique).toHaveBeenCalledWith({
                where: { id: testTaskData.payload.installationId },
                select: {
                    walletSecret: true,
                    walletAddress: true,
                    escrowSecret: true,
                    escrowAddress: true
                }
            });

            expect(mockStellarService.getAccountInfo).toHaveBeenCalledWith(mockInstallation.walletAddress);
            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                "decrypted_wallet_secret",
                mockInstallation.escrowAddress,
                expect.any(Object),
                expect.any(Object),
                testTaskData.payload.bounty
            );

            expect(mockPrisma.task.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    bounty: 100.0,
                    timeline: 1,
                    timelineType: "WEEK",
                    installation: { connect: { id: testTaskData.payload.installationId } },
                    creator: { connect: { userId: testTaskData.userId } }
                })
            });

            expect(mockResponse.status).toHaveBeenCalledWith(201);
        });

        it("should throw error when installation not found", async () => {
            mockPrisma.installation.findUnique.mockResolvedValue(null);

            await createTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Installation not found"
                })
            );
        });

        it("should throw error when insufficient balance", async () => {
            const mockInstallation = TestDataFactory.installation({
                id: testTaskData.payload.installationId
            });

            const mockAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "50.0", // Less than required bounty
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo as any);

            await createTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Insufficient balance"
                })
            );
        });

        it("should handle bounty comment creation failure gracefully", async () => {
            const mockInstallation = TestDataFactory.installation({
                id: testTaskData.payload.installationId
            });

            const mockAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "500.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            const mockCreatedTask = {
                id: "task-123",
                ...testTaskData.payload,
                bounty: 100.0
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo as any);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "tx-hash-123" });
            mockPrisma.task.create.mockResolvedValue(mockCreatedTask);
            mockPrisma.transaction.create.mockResolvedValue({ id: "transaction-123" });
            mockOctokitService.addBountyLabelAndCreateBountyComment.mockRejectedValue(
                new Error("GitHub API error")
            );

            await createTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    error: expect.any(Error),
                    transactionRecord: true,
                    task: mockCreatedTask,
                    message: "Failed to either create bounty comment or add bounty label."
                })
            );
        });

        it("should convert days to weeks when timeline > 6 days", async () => {
            const taskDataWithLongTimeline = {
                ...testTaskData,
                payload: {
                    ...testTaskData.payload,
                    timeline: 10, // 10 days = 1 week + 3 days = 1.3 weeks
                    timelineType: "DAY" as TimelineType
                }
            };

            mockRequest.body = taskDataWithLongTimeline;

            const mockInstallation = TestDataFactory.installation();
            const mockAccountInfo = {
                balances: [{ asset_code: "USDC", balance: "500.0", asset_type: "credit_alphanum12" }]
            };

            mockPrisma.installation.findUnique.mockResolvedValue(mockInstallation);
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo as any);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "tx-hash-123" });
            mockPrisma.task.create.mockResolvedValue({ id: "task-123" });

            await createTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    timeline: 1.3, // 1 week + 0.3 (3 days)
                    timelineType: "WEEK"
                })
            });
        });
    });

    describe("getTasks", () => {
        beforeEach(() => {
            mockRequest.query = {};
        });

        it("should return paginated tasks with default parameters", async () => {
            const mockTasks = TestDataFactory.tasks(5);
            const totalCount = 15;

            mockPrisma.task.count.mockResolvedValue(totalCount);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: { status: "OPEN" }
            });

            expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
                where: { status: "OPEN" },
                select: expect.objectContaining({
                    id: true,
                    issue: true,
                    bounty: true,
                    status: true
                }),
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockTasks,
                pagination: {
                    currentPage: 1,
                    totalPages: 2,
                    totalItems: totalCount,
                    itemsPerPage: 10,
                    hasMore: true
                }
            });
        });

        it("should filter tasks by installation ID", async () => {
            mockRequest.query = { installationId: "test-installation-1" };

            const mockTasks = TestDataFactory.tasks(3);
            mockPrisma.task.count.mockResolvedValue(3);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: {
                    status: "OPEN",
                    installationId: "test-installation-1"
                }
            });
        });

        it("should include detailed relations when detailed=true", async () => {
            mockRequest.query = { detailed: "true" };

            const mockTasks = TestDataFactory.tasks(2);
            mockPrisma.task.count.mockResolvedValue(2);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
                where: { status: "OPEN" },
                select: expect.objectContaining({
                    installation: {
                        select: { account: true }
                    },
                    creator: {
                        select: {
                            userId: true,
                            username: true
                        }
                    }
                }),
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10
            });
        });

        it("should apply issue filters correctly", async () => {
            mockRequest.query = {
                repoUrl: "github.com/test/repo",
                issueTitle: "bug fix",
                issueLabels: ["bug", "urgent"]
            };

            const mockTasks = TestDataFactory.tasks(1);
            mockPrisma.task.count.mockResolvedValue(1);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: {
                    status: "OPEN",
                    AND: expect.arrayContaining([
                        { issue: { path: ["repository", "url"], string_contains: "github.com/test/repo" } },
                        { issue: { path: ["title"], string_contains: "bug fix", mode: "insensitive" } },
                        { issue: { path: ["labels"], array_contains: [{ name: "bug" }, { name: "urgent" }] } }
                    ])
                }
            });
        });

        it("should handle pagination correctly", async () => {
            mockRequest.query = { page: "2", limit: "5" };

            const mockTasks = TestDataFactory.tasks(5);
            mockPrisma.task.count.mockResolvedValue(12);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    skip: 5, // (page 2 - 1) * limit 5
                    take: 5
                })
            );

            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockTasks,
                pagination: {
                    currentPage: 2,
                    totalPages: 3,
                    totalItems: 12,
                    itemsPerPage: 5,
                    hasMore: true
                }
            });
        });
    }); 
    
    describe("getInstallationTasks", () => {
        const testParams = {
            installationId: "test-installation-1"
        };

        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should return installation tasks for authorized user", async () => {
            const mockTasks = TestDataFactory.tasks(3, {
                installationId: testParams.installationId
            });

            mockPrisma.task.count.mockResolvedValue(3);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getInstallationTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: {
                    installation: {
                        id: testParams.installationId,
                        users: {
                            some: { userId: testBody.userId }
                        }
                    }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockTasks,
                pagination: expect.any(Object)
            });
        });

        it("should filter by task status when provided", async () => {
            mockRequest.query = { status: "IN_PROGRESS" };

            const mockTasks = TestDataFactory.tasks(2, {
                status: TaskStatus.IN_PROGRESS
            });

            mockPrisma.task.count.mockResolvedValue(2);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getInstallationTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: {
                    installation: {
                        id: testParams.installationId,
                        users: {
                            some: { userId: testBody.userId }
                        }
                    },
                    status: "IN_PROGRESS"
                }
            });
        });

        it("should include detailed relations when requested", async () => {
            mockRequest.query = { detailed: "true" };

            const mockTasks = TestDataFactory.tasks(1);
            mockPrisma.task.count.mockResolvedValue(1);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getInstallationTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
                where: expect.any(Object),
                select: expect.objectContaining({
                    installation: {
                        select: {
                            id: true,
                            account: true
                        }
                    },
                    creator: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    contributor: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    applications: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    taskSubmissions: {
                        select: {
                            id: true,
                            pullRequest: true,
                            attachmentUrl: true
                        }
                    }
                }),
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10
            });
        });
    });

    describe("getContributorTasks", () => {
        const testBody = {
            userId: "test-contributor-123"
        };

        beforeEach(() => {
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should return tasks for contributor", async () => {
            const mockTasks = TestDataFactory.tasks(2, {
                contributorId: testBody.userId
            });

            mockPrisma.task.count.mockResolvedValue(2);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getContributorTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: { contributorId: testBody.userId }
            });

            expect(mockPrisma.task.findMany).toHaveBeenCalledWith({
                where: { contributorId: testBody.userId },
                select: expect.objectContaining({
                    id: true,
                    issue: true,
                    bounty: true,
                    status: true,
                    contributorId: true
                }),
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
        });

        it("should filter by installation and status", async () => {
            mockRequest.query = {
                installationId: "test-installation-1",
                status: "COMPLETED"
            };

            const mockTasks = TestDataFactory.tasks(1);
            mockPrisma.task.count.mockResolvedValue(1);
            mockPrisma.task.findMany.mockResolvedValue(mockTasks);

            await getContributorTasks(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.count).toHaveBeenCalledWith({
                where: {
                    contributorId: testBody.userId,
                    status: "COMPLETED",
                    installationId: "test-installation-1"
                }
            });
        });
    });

    describe("getTask", () => {
        const testParams = {
            id: "test-task-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
        });

        it("should return task by ID when it exists and is open", async () => {
            const mockTask = {
                id: testParams.id,
                ...TestDataFactory.task(),
                status: TaskStatus.OPEN
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await getTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
                where: { id: testParams.id, status: "OPEN" },
                select: {
                    id: true,
                    issue: true,
                    bounty: true,
                    timeline: true,
                    timelineType: true,
                    status: true,
                    installation: {
                        select: {
                            id: true,
                            account: true
                        }
                    },
                    creator: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    createdAt: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockTask);
        });

        it("should throw NotFoundError when task does not exist", async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);

            await getTask(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Task not found"
                })
            );
        });
    });

    describe("updateTaskBounty", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-creator-123",
            newBounty: 150.0
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should update bounty successfully when increasing", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                bounty: 100.0,
                installationId: "test-installation-1",
                creatorId: testBody.userId,
                installation: {
                    escrowAddress: "GESCROW123",
                    escrowSecret: "encrypted_escrow_secret",
                    walletAddress: "GWALLET123",
                    walletSecret: "encrypted_wallet_secret"
                },
                _count: { taskActivities: 0 }
            };

            const mockAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "200.0",
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            const mockUpdatedTask = {
                bounty: testBody.newBounty,
                updatedAt: new Date()
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockDecrypt.mockReturnValue("decrypted_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo as any);
            mockStellarService.transferAsset.mockResolvedValue({ txHash: "tx-hash-456" });
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
            mockPrisma.transaction.create.mockResolvedValue({ id: "transaction-456" });
            mockOctokitService.updateIssueComment.mockResolvedValue({} as any);
            mockOctokitService.customBountyMessage.mockReturnValue("Updated bounty message");

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.transferAsset).toHaveBeenCalledWith(
                "decrypted_secret",
                mockTask.installation.escrowAddress,
                expect.any(Object),
                expect.any(Object),
                "50" // Difference: 150 - 100
            );

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: { bounty: testBody.newBounty },
                select: {
                    bounty: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedTask);
        });

        it("should throw error when task not found", async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
        });

        it("should throw error when task is not open", async () => {
            const mockTask = {
                status: TaskStatus.COMPLETED,
                creatorId: testBody.userId
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Only open tasks can be updated"
                })
            );
        });

        it("should throw error when user is not task creator", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: "different-user-123"
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Only task creator can update bounty"
                })
            );
        });

        it("should throw error when task has existing applications", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                _count: { taskActivities: 3 }
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Cannot update the bounty amount for tasks with existing applications"
                })
            );
        });

        it("should throw error when new bounty equals current bounty", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                bounty: 150.0, // Same as newBounty
                creatorId: testBody.userId,
                _count: { taskActivities: 0 }
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "New bounty is the same as current bounty"
                })
            );
        });

        it("should throw error when insufficient balance for bounty increase", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                bounty: 100.0,
                creatorId: testBody.userId,
                installation: {
                    walletAddress: "GWALLET123",
                    walletSecret: "encrypted_wallet_secret"
                },
                _count: { taskActivities: 0 }
            };

            const mockAccountInfo = {
                balances: [
                    {
                        asset_code: "USDC",
                        balance: "25.0", // Less than required 50.0 difference
                        asset_type: "credit_alphanum12"
                    }
                ]
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockDecrypt.mockReturnValue("decrypted_secret");
            mockStellarService.getAccountInfo.mockResolvedValue(mockAccountInfo as any);

            await updateTaskBounty(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Insufficient USDC balance for compensation increase"
                })
            );
        });
    });

    describe("updateTaskTimeline", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-creator-123",
            newTimeline: 2,
            newTimelineType: "WEEK"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should update timeline successfully", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                timeline: 1,
                timelineType: TimelineType.WEEK,
                _count: { taskActivities: 0 }
            };

            const mockUpdatedTask = {
                timeline: testBody.newTimeline,
                timelineType: testBody.newTimelineType,
                updatedAt: new Date()
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);

            await updateTaskTimeline(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: {
                    timeline: testBody.newTimeline,
                    timelineType: testBody.newTimelineType
                },
                select: {
                    timeline: true,
                    timelineType: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedTask);
        });

        it("should convert days to weeks when timeline > 6 days", async () => {
            const testBodyWithDays = {
                ...testBody,
                newTimeline: 10, // 10 days = 1 week + 3 days = 1.3 weeks
                newTimelineType: "DAY"
            };

            mockRequest.body = testBodyWithDays;

            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                _count: { taskActivities: 0 }
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.task.update.mockResolvedValue({});

            await updateTaskTimeline(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: {
                    timeline: 1.3, // 1 week + 0.3 (3 days)
                    timelineType: "WEEK"
                },
                select: expect.any(Object)
            });
        });

        it("should throw error when task has existing applications", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                _count: { taskActivities: 2 }
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await updateTaskTimeline(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Cannot update the timeline for tasks with existing applications"
                })
            );
        });
    });
    describe("submitTaskApplication", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-applicant-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should submit application successfully", async () => {
            const mockTask = {
                status: TaskStatus.OPEN
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.taskActivity.findFirst.mockResolvedValue(null); // No existing application
            mockPrisma.taskActivity.create.mockResolvedValue({ id: "activity-123" });

            await submitTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.findUnique).toHaveBeenCalledWith({
                where: { id: testParams.id },
                select: { status: true }
            });

            expect(mockPrisma.taskActivity.findFirst).toHaveBeenCalledWith({
                where: {
                    taskId: testParams.id,
                    userId: testBody.userId,
                    taskSubmissionId: null
                },
                select: { id: true }
            });

            expect(mockPrisma.taskActivity.create).toHaveBeenCalledWith({
                data: {
                    task: { connect: { id: testParams.id } },
                    user: { connect: { userId: testBody.userId } }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Task application submitted"
            });
        });

        it("should throw error when task not found", async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);

            await submitTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
        });

        it("should throw error when task is not open", async () => {
            const mockTask = {
                status: TaskStatus.IN_PROGRESS
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await submitTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Task is not open"
                })
            );
        });

        it("should throw error when user already applied", async () => {
            const mockTask = {
                status: TaskStatus.OPEN
            };

            const existingApplication = {
                id: "existing-application-123"
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.taskActivity.findFirst.mockResolvedValue(existingApplication);

            await submitTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "You have already applied for this task!"
                })
            );
        });
    });

    describe("acceptTaskApplication", () => {
        const testParams = {
            id: "test-task-123",
            contributorId: "test-contributor-123"
        };

        const testBody = {
            userId: "test-creator-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should accept application successfully", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                contributorId: null,
                taskActivities: [
                    { userId: testParams.contributorId },
                    { userId: "other-user-123" }
                ]
            };

            const mockUpdatedTask = {
                id: testParams.id,
                status: TaskStatus.IN_PROGRESS,
                contributor: {
                    userId: testParams.contributorId,
                    username: "testcontributor"
                },
                acceptedAt: new Date()
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
            mockFirebaseService.createTask.mockResolvedValue(undefined);

            await acceptTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: {
                    contributor: { connect: { userId: testParams.contributorId } },
                    status: "IN_PROGRESS",
                    acceptedAt: expect.any(Date)
                },
                select: {
                    id: true,
                    status: true,
                    contributor: { select: { userId: true, username: true } },
                    acceptedAt: true
                }
            });

            expect(mockFirebaseService.createTask).toHaveBeenCalledWith(
                testParams.id,
                testBody.userId,
                testParams.contributorId
            );

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedTask);
        });

        it("should handle Firebase task creation failure gracefully", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                contributorId: null,
                taskActivities: [{ userId: testParams.contributorId }]
            };

            const mockUpdatedTask = {
                id: testParams.id,
                status: TaskStatus.IN_PROGRESS
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
            mockFirebaseService.createTask.mockRejectedValue(new Error("Firebase error"));

            await acceptTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: expect.any(Error),
                task: mockUpdatedTask,
                message: "Failed to enable chat functionality for this task."
            });
        });

        it("should throw error when task already has contributor", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                contributorId: "existing-contributor-123"
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await acceptTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Task has already has already been delegated to a contributor"
                })
            );
        });

        it("should throw error when user did not apply", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                creatorId: testBody.userId,
                contributorId: null,
                taskActivities: [
                    { userId: "other-user-123" } // Different user
                ]
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await acceptTaskApplication(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "User did not apply for this task"
                })
            );
        });
    });

    describe("requestTimelineExtension", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-contributor-123",
            githubUsername: "testcontributor",
            requestedTimeline: 1,
            timelineType: "WEEK",
            reason: "Need more time for testing",
            attachments: ["attachment1.png"]
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should create timeline extension request successfully", async () => {
            const mockTask = {
                status: TaskStatus.IN_PROGRESS,
                contributorId: testBody.userId,
                timeline: 2,
                timelineType: TimelineType.WEEK
            };

            const mockMessage = {
                id: "message-123",
                taskId: "test-task-123",
                userId: "test-contributor-123",
                body: expect.stringContaining("requesting for a 1 week"),
                type: MessageType.TIMELINE_MODIFICATION,
                metadata: {
                    requestedTimeline: 4, 
                    timelineType: "WEEK" as TimelineType
                },
                attachments: [],
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockFirebaseService.createMessage.mockResolvedValue(mockMessage);

            await requestTimelineExtension(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockFirebaseService.createMessage).toHaveBeenCalledWith({
                userId: testBody.userId,
                taskId: testParams.id,
                type: MessageType.TIMELINE_MODIFICATION,
                body: expect.stringContaining("requesting for a 1 week"),
                attachments: testBody.attachments,
                metadata: {
                    requestedTimeline: testBody.requestedTimeline,
                    timelineType: testBody.timelineType,
                    reason: testBody.reason
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockMessage);
        });

        it("should throw error when task not found", async () => {
            mockPrisma.task.findUnique.mockResolvedValue(null);

            await requestTimelineExtension(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
        });

        it("should throw error when task is not in progress or user is not contributor", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                contributorId: "different-user-123"
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await requestTimelineExtension(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Requesting timeline extension can only be requested by the active contributor"
                })
            );
        });
    });

    describe("markAsComplete", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-contributor-123",
            pullRequest: "https://github.com/test/repo/pull/1",
            attachmentUrl: "https://example.com/attachment.zip"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should mark task as complete successfully", async () => {
            const mockTask = {
                status: TaskStatus.IN_PROGRESS,
                contributorId: testBody.userId,
                installationId: "test-installation-1"
            };

            const mockSubmission = {
                id: "submission-123"
            };

            const mockUpdatedTask = {
                status: TaskStatus.MARKED_AS_COMPLETED,
                updatedAt: new Date(),
                taskSubmissions: [{
                    id: mockSubmission.id,
                    pullRequest: testBody.pullRequest,
                    attachmentUrl: testBody.attachmentUrl
                }]
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockPrisma.taskSubmission.create.mockResolvedValue(mockSubmission);
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
            mockPrisma.taskActivity.create.mockResolvedValue({ id: "activity-123" });

            await markAsComplete(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.taskSubmission.create).toHaveBeenCalledWith({
                data: {
                    user: { connect: { userId: testBody.userId } },
                    task: { connect: { id: testParams.id } },
                    installation: { connect: { id: mockTask.installationId } },
                    pullRequest: testBody.pullRequest,
                    attachmentUrl: testBody.attachmentUrl
                },
                select: { id: true }
            });

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: { status: "MARKED_AS_COMPLETED" },
                select: expect.objectContaining({
                    status: true,
                    updatedAt: true,
                    taskSubmissions: expect.any(Object)
                })
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedTask);
        });

        it("should throw error when user is not the contributor", async () => {
            const mockTask = {
                status: TaskStatus.IN_PROGRESS,
                contributorId: "different-user-123"
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await markAsComplete(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Only the active contributor can make this action"
                })
            );
        });

        it("should throw error when task is not in valid status", async () => {
            const mockTask = {
                status: TaskStatus.OPEN,
                contributorId: testBody.userId
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await markAsComplete(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Task is not active"
                })
            );
        });
    });

    describe("validateCompletion", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-creator-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should validate completion and transfer bounty successfully", async () => {
            const mockTask = {
                creator: { userId: testBody.userId },
                contributor: {
                    userId: "test-contributor-123",
                    walletAddress: "GCONTRIBUTOR123"
                },
                installation: {
                    id: "test-installation-1",
                    walletSecret: "encrypted_wallet_secret",
                    escrowSecret: "encrypted_escrow_secret"
                },
                issue: TestDataFactory.githubIssue(),
                bounty: 100.0,
                status: TaskStatus.MARKED_AS_COMPLETED
            };

            const mockUpdatedTask = {
                status: TaskStatus.COMPLETED,
                completedAt: new Date(),
                settled: true,
                updatedAt: new Date()
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockDecrypt
                .mockReturnValueOnce("decrypted_wallet_secret")
                .mockReturnValueOnce("decrypted_escrow_secret");
            mockStellarService.transferAssetViaSponsor.mockResolvedValue({
                txHash: "tx-hash",
                sponsorTxHash: "sponsor-tx-hash"
            });
            mockPrisma.task.update.mockResolvedValue(mockUpdatedTask);
            mockPrisma.transaction.create.mockResolvedValue({ id: "completion-transaction" });
            mockPrisma.contributionSummary.update.mockResolvedValue({});
            mockFirebaseService.updateTaskStatus.mockResolvedValue({
                conversationStatus: "CLOSED",
                updatedAt: Timestamp.now()
            });

            await validateCompletion(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockStellarService.transferAssetViaSponsor).toHaveBeenCalledWith(
                "decrypted_wallet_secret",
                "decrypted_escrow_secret",
                mockTask.contributor.walletAddress,
                expect.any(Object),
                expect.any(Object),
                mockTask.bounty.toString()
            );

            expect(mockPrisma.task.update).toHaveBeenCalledWith({
                where: { id: testParams.id },
                data: {
                    status: "COMPLETED",
                    completedAt: expect.any(Date),
                    settled: true
                },
                select: {
                    status: true,
                    completedAt: true,
                    settled: true,
                    updatedAt: true
                }
            });

            expect(mockPrisma.contributionSummary.update).toHaveBeenCalledWith({
                where: { userId: mockTask.contributor.userId },
                data: {
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: mockTask.bounty }
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith(mockUpdatedTask);
        });

        it("should throw error when task not marked as completed", async () => {
            const mockTask = {
                status: TaskStatus.IN_PROGRESS
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await validateCompletion(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Task has not been marked as completed"
                })
            );
        });

        it("should throw error when user is not task creator", async () => {
            const mockTask = {
                creator: { userId: "different-user-123" },
                status: TaskStatus.MARKED_AS_COMPLETED
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);

            await validateCompletion(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(ErrorClass));
            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "TaskError",
                    message: "Only task creator can validate if task is completed"
                })
            );
        });

        it("should handle contribution summary update failure gracefully", async () => {
            const mockTask = {
                creator: { userId: testBody.userId },
                contributor: {
                    userId: "test-contributor-123",
                    walletAddress: "GCONTRIBUTOR123"
                },
                installation: {
                    walletSecret: "encrypted_wallet_secret",
                    escrowSecret: "encrypted_escrow_secret"
                },
                bounty: 100.0,
                status: TaskStatus.MARKED_AS_COMPLETED
            };

            mockPrisma.task.findUnique.mockResolvedValue(mockTask);
            mockStellarService.transferAssetViaSponsor.mockResolvedValue({
                txHash: "tx-hash",
                sponsorTxHash: "sponsor-tx-hash"
            });
            mockPrisma.task.update.mockResolvedValue({});
            mockPrisma.transaction.create.mockResolvedValue({});
            mockPrisma.contributionSummary.update.mockRejectedValue(
                new Error("Summary update failed")
            );

            await validateCompletion(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(202);
            expect(mockResponse.json).toHaveBeenCalledWith({
                error: expect.any(Error),
                validated: true,
                task: mockTask,
                message: "Failed to update the developer contribution summary."
            });
        });
    });

    describe("getTaskActivities", () => {
        const testParams = {
            id: "test-task-123"
        };

        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
            mockRequest.query = {};
        });

        it("should return paginated task activities", async () => {
            const mockActivities = [
                TestDataFactory.taskActivity({
                    taskId: testParams.id,
                    userId: "applicant-1"
                }),
                TestDataFactory.taskActivity({
                    taskId: testParams.id,
                    userId: "applicant-2"
                })
            ];

            mockPrisma.taskActivity.count.mockResolvedValue(2);
            mockPrisma.taskActivity.findMany.mockResolvedValue(mockActivities);

            await getTaskActivities(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.taskActivity.count).toHaveBeenCalledWith({
                where: { taskId: testParams.id }
            });

            expect(mockPrisma.taskActivity.findMany).toHaveBeenCalledWith({
                where: {
                    taskId: testParams.id,
                    task: {
                        installation: {
                            users: { some: { userId: testBody.userId } }
                        }
                    }
                },
                select: expect.objectContaining({
                    id: true,
                    taskId: true,
                    userId: true,
                    viewed: true,
                    user: expect.any(Object),
                    taskSubmission: expect.any(Object)
                }),
                orderBy: { createdAt: "desc" },
                skip: 0,
                take: 10
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                data: mockActivities,
                pagination: expect.objectContaining({
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: 2
                })
            });
        });
    });

    describe("markActivityAsViewed", () => {
        const testParams = {
            taskActivityId: "activity-123"
        };

        const testBody = {
            userId: "test-user-123"
        };

        beforeEach(() => {
            mockRequest.params = testParams;
            mockRequest.body = testBody;
        });

        it("should mark activity as viewed successfully", async () => {
            const mockActivity = {
                id: testParams.taskActivityId,
                viewed: false
            };

            const mockUpdatedActivity = {
                id: testParams.taskActivityId,
                viewed: true,
                updatedAt: new Date()
            };

            mockPrisma.taskActivity.findUnique.mockResolvedValue(mockActivity);
            mockPrisma.taskActivity.update.mockResolvedValue(mockUpdatedActivity);

            await markActivityAsViewed(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.taskActivity.update).toHaveBeenCalledWith({
                where: { id: testParams.taskActivityId },
                data: { viewed: true },
                select: {
                    id: true,
                    viewed: true,
                    updatedAt: true
                }
            });

            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                message: "Activity marked as viewed",
                activity: mockUpdatedActivity
            });
        });

        it("should throw error when activity not found", async () => {
            mockPrisma.taskActivity.findUnique.mockResolvedValue(null);

            await markActivityAsViewed(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(NotFoundErrorClass));
        });
    });
});
