import request from "supertest";
import express from "express";
import crypto from "crypto";
import { webhookRoutes } from "../../../../api/routes/webhook.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../../tests/helpers/database-test-helper";
import { TestDataFactory } from "../../../../tests/helpers/test-data-factory";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock external services
jest.mock("../../../../api/services/ai-review/workflow-integration.service", () => ({
    WorkflowIntegrationService: {
        getInstance: jest.fn()
    }
}));

jest.mock("../../../../api/services/ai-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        extractLinkedIssues: jest.fn()
    }
}));

// Mock Firebase service for task messaging
jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        updateTaskStatus: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        getOctokit: jest.fn(),
        getOwnerAndRepo: jest.fn(),
        getDefaultBranch: jest.fn(),
        removeBountyLabelAndDeleteBountyComment: jest.fn()
    }
}));

// Mock Contract service
jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        approveCompletion: jest.fn(),
        refund: jest.fn()
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
    }
}));

describe("Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockWorkflowService: any;
    let mockOctokitService: any;

    let mockPRAnalysisService: any;
    let mockContractService: any;

    const WEBHOOK_SECRET = "test-webhook-secret";
    const VALID_INSTALLATION_ID = "12345678";
    const VALID_REPO_NAME = "test/repo";

    beforeAll(async () => {
        // Set up test environment
        process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
        process.env.NODE_ENV = "test";

        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with webhook routes
        app = express();

        // Use raw middleware for webhook signature validation
        app.use(
            getEndpointWithPrefix(["WEBHOOK", "GITHUB"]),
            express.raw({ type: "application/json" })
        );
        app.use(ENDPOINTS.WEBHOOK.PREFIX, webhookRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { WorkflowIntegrationService } = await import("../../../../api/services/ai-review/workflow-integration.service");
        const { OctokitService } = await import("../../../../api/services/octokit.service");

        mockWorkflowService = {
            getInstance: jest.fn().mockReturnThis(),
            processWebhookWorkflow: jest.fn()
        };
        WorkflowIntegrationService.getInstance = jest.fn(() => mockWorkflowService);

        mockOctokitService = {
            getOctokit: jest.fn(),
            getOwnerAndRepo: jest.fn(),
            getDefaultBranch: jest.fn(),
            removeBountyLabelAndDeleteBountyComment: jest.fn()
        };
        Object.assign(OctokitService, mockOctokitService);

        const { ContractService } = await import("../../../../api/services/contract.service");
        mockContractService = ContractService;

        const { PRAnalysisService } = await import("../../../../api/services/ai-review/pr-analysis.service");
        mockPRAnalysisService = PRAnalysisService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
            success: true,
            jobId: "test-job-123",
            prData: {
                installationId: VALID_INSTALLATION_ID,
                repositoryName: VALID_REPO_NAME,
                prNumber: 1,
                prUrl: "https://github.com/test/repo/pull/1",
                linkedIssues: [{ number: 1, title: "Test Issue" }],
                changedFiles: [{ filename: "test.ts", status: "modified" }]
            }
        });

        mockOctokitService.getDefaultBranch.mockResolvedValue("main");
        mockOctokitService.getOwnerAndRepo.mockReturnValue(["test", "repo"]);

        mockContractService.approveCompletion.mockResolvedValue({
            success: true,
            txHash: "test-approve-completion-tx-hash",
            result: { createdAt: 1234567890 }
        });
        mockContractService.refund.mockResolvedValue({
            success: true,
            txHash: "test-refund-tx-hash",
            result: { createdAt: 1234567890 }
        });

        mockPRAnalysisService.extractLinkedIssues = jest.fn().mockResolvedValue([
            { number: 1, title: "Test Issue" }
        ]);
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    // Helper function to create valid webhook signature
    const createWebhookSignature = (payload: string): string => {
        return `sha256=${crypto
            .createHmac("sha256", WEBHOOK_SECRET)
            .update(payload)
            .digest("hex")}`;
    };

    // Helper function to create GitHub webhook payload
    const createWebhookPayload = (overrides: any = {}) => {
        return {
            action: "opened",
            number: 1,
            pull_request: TestDataFactory.githubPullRequest({
                number: 1,
                title: "Test PR",
                body: "Closes #1",
                draft: false,
                base: { ref: "main" },
                head: { ref: "feature-branch" },
                ...overrides.pull_request
            }),
            repository: {
                id: 123456,
                name: "repo",
                full_name: VALID_REPO_NAME,
                private: false,
                html_url: "https://github.com/test/repo",
                owner: {
                    id: 12345,
                    login: "test",
                    avatar_url: "https://github.com/test.png",
                    html_url: "https://github.com/test"
                },
                ...overrides.repository
            },
            installation: {
                id: parseInt(VALID_INSTALLATION_ID),
                account: {
                    id: 12345,
                    login: "test",
                    avatar_url: "https://github.com/test.png",
                    html_url: "https://github.com/test"
                },
                ...overrides.installation
            },
            ...overrides
        };
    };

    // Helper function to create Installation webhook payload
    const createInstallationPayload = (action: string, overrides: any = {}) => {
        return {
            action,
            installation: {
                id: parseInt(VALID_INSTALLATION_ID),
                account: {
                    id: 12345,
                    login: "test",
                    url: "https://api.github.com/users/test",
                    type: "User",
                    site_admin: false
                },
                repository_selection: "selected",
                ...overrides
            },
            sender: {
                login: "test-sender",
                id: 12345
            }
        };
    };

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Installation Events`, () => {
        it("should log installation creation", async () => {
            const payload = createInstallationPayload("created");
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "installation")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation creation logged",
                data: { installationId: VALID_INSTALLATION_ID }
            });
        });

        it("should archive installation and refund open tasks on delete", async () => {
            // Create user and installation with wallet
            const creator = await prisma.user.create({
                data: TestDataFactory.user({ userId: "task-creator" })
            });

            const installation = await prisma.installation.create({
                data: {
                    ...TestDataFactory.installation({ id: VALID_INSTALLATION_ID }),
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create an open task with bounty
            await prisma.task.create({
                data: {
                    ...TestDataFactory.task({
                        status: "OPEN",
                        bounty: 100,
                        timeline: 6,
                        creatorId: undefined,
                        contributorId: undefined,
                        installationId: undefined
                    }),
                    creator: { connect: { userId: creator.userId } },
                    installation: { connect: { id: installation.id } }
                }
            });

            mockContractService.approveCompletion.mockResolvedValue({
                success: true,
                txHash: "test-refund-tx-hash",
                result: { createdAt: 1234567890 }
            });
            mockContractService.refund.mockResolvedValue({
                success: true,
                txHash: "refund-tx",
                result: { createdAt: 1234567890 }
            });

            const payload = createInstallationPayload("deleted");
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "installation")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation archived and 100 USDC refunded",
                data: {
                    installationId: VALID_INSTALLATION_ID,
                    refundedAmount: 100
                }
            });

            // Verify installation is archived
            const updatedInstallation = await prisma.installation.findUnique({
                where: { id: VALID_INSTALLATION_ID }
            });
            expect(updatedInstallation?.status).toBe("ARCHIVED");

            expect(mockContractService.refund).toHaveBeenCalled();
            expect(mockOctokitService.removeBountyLabelAndDeleteBountyComment).toHaveBeenCalled();
        });

        it("should reactivate installation on unsuspend", async () => {
            // Create archived installation
            await prisma.installation.create({
                data: {
                    ...TestDataFactory.installation({ id: VALID_INSTALLATION_ID, status: "ARCHIVED" })
                }
            });

            const payload = createInstallationPayload("unsuspend");
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "installation")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Installation reactivated",
                data: { installationId: VALID_INSTALLATION_ID }
            });

            const updatedInstallation = await prisma.installation.findUnique({
                where: { id: VALID_INSTALLATION_ID }
            });
            expect(updatedInstallation?.status).toBe("ACTIVE");
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Pull Request Review`, () => {
        it("should process valid PR webhook with realistic payload successfully", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body).toMatchObject({
                message: "PR webhook processed successfully - analysis queued",
                data: {
                    jobId: "test-job-123",
                    installationId: VALID_INSTALLATION_ID,
                    repositoryName: VALID_REPO_NAME,
                    prNumber: 1,
                    prUrl: "https://github.com/test/repo/pull/1",
                    linkedIssuesCount: 1,
                    changedFilesCount: 1,
                    eligibleForAnalysis: true,
                    status: "queued",
                    timestamp: expect.any(String)
                }
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "opened",
                    number: 1,
                    pull_request: expect.objectContaining({
                        number: 1,
                        title: "Test PR"
                    }),
                    webhookMeta: expect.objectContaining({
                        eventType: "pull_request",
                        action: "opened",
                        deliveryId: "test-delivery-123"
                    })
                })
            );
        });

        it("should handle PR not eligible for analysis", async () => {
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: true,
                reason: "PR not eligible for analysis: No linked issues found",
                jobId: null
            });

            const payload = createWebhookPayload({
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    body: "No issue links"
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR not eligible for analysis: No linked issues found",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    timestamp: expect.any(String)
                }
            });
        });

        it("should handle workflow processing errors", async () => {
            mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                success: false,
                error: "GitHub API rate limit exceeded"
            });

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("GitHub API rate limit exceeded");
        });

        it("should validate webhook signature and reject invalid signatures", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const invalidSignature = `sha256=${crypto
                .createHmac("sha256", "invalid_secret")
                .update("invalid_payload")
                .digest("hex")}`;

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Invalid webhook signature");
            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should reject webhook without signature", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Missing webhook signature");
            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip non-PR events", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "issues")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Event type not processed",
                meta: { eventType: "issues" }
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip non-relevant PR actions", async () => {
            const payload = createWebhookPayload({ action: "closed" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR action not processed",
                data: { action: "closed" }
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should skip PRs not targeting default branch", async () => {
            const payload = createWebhookPayload({
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    base: { ref: "develop" }
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR not targeting default branch - skipping review",
                meta: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    targetBranch: "develop",
                    defaultBranch: "main",
                    reason: "not_default_branch"
                }
            });

            expect(mockWorkflowService.processWebhookWorkflow).not.toHaveBeenCalled();
        });

        it("should handle malformed JSON payload", async () => {
            const invalidJson = "{ invalid json }";
            const signature = createWebhookSignature(invalidJson);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(invalidJson)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Invalid JSON payload");
        });

        it("should process synchronize action for PR updates", async () => {
            const payload = createWebhookPayload({ action: "synchronize" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body.message).toBe("PR webhook processed successfully - analysis queued");
            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "synchronize"
                })
            );
        });

        it("should process ready_for_review action for draft PRs", async () => {
            const payload = createWebhookPayload({ action: "ready_for_review" });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body.message).toBe("PR webhook processed successfully - analysis queued");
            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: "ready_for_review"
                })
            );
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Bounty Payout on PR Merge`, () => {
        let testTask: any;

        beforeEach(async () => {
            const creator = TestDataFactory.user({ userId: "task-creator" });
            await prisma.user.create({
                data: { ...creator, contributionSummary: { create: {} } }
            });

            // Create test user with wallet
            const contributor = TestDataFactory.user({ userId: "test-contributor", username: "test-contributor" });
            await prisma.user.create({
                data: {
                    ...contributor,
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });

            // Create test installation with wallet and escrow
            const installation = TestDataFactory.installation({ id: VALID_INSTALLATION_ID });
            await prisma.installation.create({
                data: {
                    ...installation,
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Create test task
            testTask = TestDataFactory.task({
                status: "MARKED_AS_COMPLETED",
                bounty: 100,
                issue: {
                    number: 1,
                    title: "Test Issue",
                    url: "https://github.com/test/repo/issues/1"
                },
                contributorId: undefined,
                creatorId: undefined,
                installationId: undefined
            });
            testTask = await prisma.task.create({
                data: {
                    ...testTask,
                    creator: { connect: { userId: creator.userId } },
                    contributor: { connect: { userId: contributor.userId } },
                    installation: { connect: { id: VALID_INSTALLATION_ID } }
                }
            });
        });

        it("should process bounty payout when PR is merged", async () => {
            const payload = createWebhookPayload({
                action: "closed",
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    merged: true,
                    user: { login: "test-contributor" },
                    body: "Closes #1"
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR merged - Payment processed successfully",
                data: {
                    prNumber: 1,
                    repositoryName: VALID_REPO_NAME,
                    linkedIssues: [1]
                }
            });

            // Verify Contract service was called
            expect(mockContractService.approveCompletion).toHaveBeenCalledTimes(1);

            // Verify task was updated
            const updatedTask = await prisma.task.findUnique({
                where: { id: testTask.id }
            });
            expect(updatedTask?.status).toBe("COMPLETED");
            expect(updatedTask?.settled).toBe(true);
            expect(updatedTask?.completedAt).toBeTruthy();

            // Verify transaction was recorded
            const transaction = await prisma.transaction.findFirst({
                where: { taskId: testTask.id }
            });
            expect(transaction).toBeTruthy();
            expect(transaction?.category).toBe("BOUNTY");
            expect(transaction?.amount).toBe(100);
        });

        it("should handle PR merge with no linked issues", async () => {
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([]);

            const payload = createWebhookPayload({
                action: "closed",
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    merged: true,
                    body: "No issue links"
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No linked issues found - no payment triggered"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should handle PR merge with no matching task", async () => {
            const payload = createWebhookPayload({
                action: "closed",
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    merged: true,
                    user: { login: "different-user" },
                    body: "Closes #999"
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 999, title: "Different Issue" }
            ]);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No matching active or submitted task found"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should handle contributor without wallet address", async () => {
            // Create user without wallet
            const userWithoutWallet = TestDataFactory.user({
                userId: "no-wallet-user",
                username: "no-wallet-user"
            });
            // Don't create wallet relation for this user

            await prisma.user.create({
                data: {
                    ...userWithoutWallet,
                    contributionSummary: { create: {} }
                }
            });

            // Create task for this user
            const taskWithoutWallet = TestDataFactory.task({
                status: "MARKED_AS_COMPLETED",
                bounty: 50,
                issue: {
                    number: 2,
                    title: "Test Issue 2",
                    url: "https://github.com/test/repo/issues/2"
                },
                contributorId: undefined,
                creatorId: undefined,
                installationId: undefined
            });
            await prisma.task.create({
                data: {
                    ...taskWithoutWallet,
                    creator: { connect: { userId: "task-creator" } },
                    contributor: { connect: { userId: "no-wallet-user" } },
                    installation: { connect: { id: VALID_INSTALLATION_ID } }
                }
            });

            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
                { number: 2, title: "Test Issue 2" }
            ]);

            const payload = createWebhookPayload({
                action: "closed",
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    merged: true,
                    user: { login: "no-wallet-user" },
                    body: "Closes #2"
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "No wallet address found for contributor"
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });

        it("should skip non-merged PR close events", async () => {
            const payload = createWebhookPayload({
                action: "closed",
                pull_request: {
                    ...createWebhookPayload().pull_request,
                    merged: false
                }
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "PR action not processed",
                data: { action: "closed" }
            });

            expect(mockContractService.approveCompletion).not.toHaveBeenCalled();
        });
    });

    describe("Error Handling and Retry Mechanisms", () => {
        it("should handle GitHub API errors gracefully", async () => {
            const { GitHubAPIError } = await import("../../../../api/models/error.model");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new GitHubAPIError("API rate limit exceeded", null, 429, 0)
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("API rate limit exceeded");
            expect(response.body.code).toBe("GITHUB_API_ERROR");
        });

        it("should handle PR analysis errors with context", async () => {
            const { PRAnalysisError } = await import("../../../../api/models/error.model");
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new PRAnalysisError(1, VALID_REPO_NAME, "Failed to analyze PR changes", {})
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("Failed to analyze PR changes");
            expect(response.body.code).toBe("PR_ANALYSIS_ERROR");
            expect(response.body.repositoryName).toBe(VALID_REPO_NAME);
            expect(response.body.prNumber).toBe(1);
        });

        it("should handle unexpected errors and pass to error middleware", async () => {
            mockWorkflowService.processWebhookWorkflow.mockRejectedValue(
                new Error("Unexpected database connection error")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.message).toBe("Unexpected database connection error");
        });

        it("should handle default branch validation errors gracefully", async () => {
            mockOctokitService.getDefaultBranch.mockRejectedValue(
                new Error("Failed to fetch repository info")
            );

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            // Should still process the webhook despite default branch validation error
            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .set("X-GitHub-Delivery", "test-delivery-123")
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body.message).toContain("PR webhook processed successfully");
        });
    });

    describe("Webhook Security Validation", () => {
        it("should reject webhook when secret is not configured", async () => {
            delete process.env.GITHUB_WEBHOOK_SECRET;

            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", "sha256=test")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "GitHub webhook secret not configured",
                code: "GITHUB_WEBHOOK_ERROR"
            });

            // Restore secret for other tests
            process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
        });

        it("should use timing-safe comparison for signature validation", async () => {
            const payload = createWebhookPayload();
            const payloadString = JSON.stringify(payload);

            // Create a signature that has the same length but different content
            const validSignature = createWebhookSignature(payloadString);
            const invalidSignature = validSignature.replace(/[0-9]/g, "a");

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", invalidSignature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "Invalid webhook signature"
            });
        });

        it("should handle non-Buffer request body gracefully", async () => {
            // Create a custom app that doesn't use express.raw middleware
            const testApp = express();
            testApp.use(express.json()); // This will parse JSON instead of keeping raw buffer
            testApp.use(ENDPOINTS.WEBHOOK.PREFIX, webhookRoutes);
            testApp.use(errorHandler);

            const payload = createWebhookPayload();
            const signature = createWebhookSignature(JSON.stringify(payload));

            const response = await request(testApp)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "pull_request")
                .set("X-Hub-Signature-256", signature)
                .send(payload)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "Invalid request body format",
                code: "GITHUB_WEBHOOK_ERROR"
            });
        });
    });

    describe("Concurrent Webhook Processing", () => {
        it("should handle multiple concurrent webhook requests", async () => {
            const webhookPromises = Array.from({ length: 5 }, (_, i) => {
                const payload = createWebhookPayload({
                    number: i + 1,
                    pull_request: {
                        ...createWebhookPayload().pull_request,
                        number: i + 1,
                        title: `PR ${i + 1}`
                    }
                });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                mockWorkflowService.processWebhookWorkflow.mockResolvedValue({
                    success: true,
                    jobId: `concurrent-job-${i + 1}`,
                    prData: {
                        installationId: VALID_INSTALLATION_ID,
                        repositoryName: VALID_REPO_NAME,
                        prNumber: i + 1,
                        prUrl: `https://github.com/test/repo/pull/${i + 1}`,
                        linkedIssues: [{ number: i + 1, title: `Issue ${i + 1}` }],
                        changedFiles: [{ filename: `file${i + 1}.ts`, status: "modified" }]
                    }
                });

                return request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "pull_request")
                    .set("X-Hub-Signature-256", signature)
                    .set("X-GitHub-Delivery", `test-delivery-${i + 1}`)
                    .set("Content-Type", "application/json")
                    .send(payloadString);
            });

            const responses = await Promise.all(webhookPromises);

            responses.forEach((response, _i) => {
                expect(response.status).toBe(STATUS_CODES.BACKGROUND_JOB);
                expect(response.body.message).toContain("PR webhook processed");
            });

            expect(mockWorkflowService.processWebhookWorkflow).toHaveBeenCalledTimes(5);
        });
    });
});
