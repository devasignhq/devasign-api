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
import { BOUNTY_LABEL } from "../../../../api/models/github.model";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock external services
jest.mock("../../../../api/services/pr-review/orchestration.service", () => ({
    orchestrationService: {
        triggerReviewBackgroundJob: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        extractLinkedIssues: jest.fn()
    }
}));

jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        updateTaskStatus: jest.fn().mockResolvedValue(true),
        updateAppActivity: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock("../../../../api/services/octokit.service", () => {
    const { BOUNTY_LABEL } = jest.requireActual("../../../../api/models/github.model");
    return {
        OctokitService: {
            getOctokit: jest.fn(),
            getOwnerAndRepo: jest.fn(),
            getDefaultBranch: jest.fn(),
            removeBountyLabelAndDeleteBountyComment: jest.fn(),
            getBountyLabel: jest.fn().mockResolvedValue({ id: "mock-label-id" }),
            createBountyLabels: jest.fn().mockResolvedValue([{ name: BOUNTY_LABEL, id: "mock-label-id" }]),
            customBountyMessage: jest.fn().mockReturnValue("mock-bounty-message"),
            addBountyLabelAndCreateBountyComment: jest.fn().mockResolvedValue({ id: "mock-comment-id" }),
            createComment: jest.fn()
        }
    };
});

jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        approveCompletion: jest.fn(),
        refund: jest.fn(),
        createEscrow: jest.fn().mockResolvedValue({
            txHash: "mock-tx-hash",
            result: { createdAt: (new Date().getTime() / 1000).toString() }
        })
    }
}));

jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
    }
}));

jest.mock("../../../../api/services/pr-review/indexing.service", () => ({
    indexingService: {
        clearInstallationData: jest.fn().mockResolvedValue(true),
        clearRepositoryData: jest.fn().mockResolvedValue(true)
    }
}));

jest.mock("../../../../api/services/cloud-tasks.service", () => ({
    cloudTasksService: {
        addRepositoryIndexingJob: jest.fn().mockResolvedValue("job-id-123"),
        addBountyPayoutJob: jest.fn().mockResolvedValue("job-id-123")
    }
}));

jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: jest.fn().mockResolvedValue({ balances: [{ asset_code: "USDC", balance: "1000" }] })
    }
}));

describe("Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockAIReviewOrchestrationService: any;
    let mockOctokitService: any;

    let mockPRAnalysisService: any;
    let mockContractService: any;
    let mockIndexingService: any;
    let mockCloudTasksService: any;

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
        const { OctokitService } = await import("../../../../api/services/octokit.service");

        const { orchestrationService } = await import("../../../../api/services/pr-review/orchestration.service");
        mockAIReviewOrchestrationService = orchestrationService;

        mockOctokitService = {
            getOctokit: jest.fn(),
            getOwnerAndRepo: jest.fn(),
            getDefaultBranch: jest.fn(),
            removeBountyLabelAndDeleteBountyComment: jest.fn(),
            getBountyLabel: jest.fn().mockResolvedValue({ id: "mock-label-id" }),
            createBountyLabels: jest.fn().mockResolvedValue([{ name: BOUNTY_LABEL, id: "mock-label-id" }]),
            customBountyMessage: jest.fn().mockReturnValue("mock-bounty-message"),
            addBountyLabelAndCreateBountyComment: jest.fn().mockResolvedValue({ id: "mock-comment-id" }),
            createComment: jest.fn()
        };
        Object.assign(OctokitService, mockOctokitService);

        const { ContractService } = await import("../../../../api/services/contract.service");
        mockContractService = ContractService;

        const { PRAnalysisService } = await import("../../../../api/services/pr-review/pr-analysis.service");
        mockPRAnalysisService = PRAnalysisService;

        const { indexingService } = await import("../../../../api/services/pr-review/indexing.service");
        mockIndexingService = indexingService;

        const { cloudTasksService } = await import("../../../../api/services/cloud-tasks.service");
        mockCloudTasksService = cloudTasksService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockResolvedValue({
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

        it("should log installation creation and queue indexing jobs when repositories are provided", async () => {
            const basePayload = createInstallationPayload("created");
            const payload = {
                ...basePayload,
                repositories: [
                    { full_name: "test/repo-1" },
                    { full_name: "test/repo-2" }
                ]
            };
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

            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledTimes(2);
            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledWith(VALID_INSTALLATION_ID, "test/repo-1");
            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledWith(VALID_INSTALLATION_ID, "test/repo-2");
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

            // Verify indexing data is cleared
            expect(mockIndexingService.clearInstallationData).toHaveBeenCalledWith(VALID_INSTALLATION_ID);
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

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Installation Repositories Events`, () => {
        const createInstallationReposPayload = (action: string, overrides: any = {}) => {
            return {
                action,
                installation: {
                    id: parseInt(VALID_INSTALLATION_ID)
                },
                ...overrides
            };
        };

        it("should process added repositories", async () => {
            const payload = createInstallationReposPayload("added", {
                repositories_added: [{ full_name: "test/repo-1" }, { full_name: "test/repo-2" }]
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "installation_repositories")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "installation_repositories event processed",
                data: { installationId: VALID_INSTALLATION_ID, action: "added" }
            });

            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledTimes(2);
            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledWith(VALID_INSTALLATION_ID, "test/repo-1");
            expect(mockCloudTasksService.addRepositoryIndexingJob).toHaveBeenCalledWith(VALID_INSTALLATION_ID, "test/repo-2");
        });

        it("should process removed repositories", async () => {
            const payload = createInstallationReposPayload("removed", {
                repositories_removed: [{ full_name: "test/repo-1" }]
            });
            const payloadString = JSON.stringify(payload);
            const signature = createWebhookSignature(payloadString);

            const response = await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                .set("X-GitHub-Event", "installation_repositories")
                .set("X-Hub-Signature-256", signature)
                .set("Content-Type", "application/json")
                .send(payloadString)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "installation_repositories event processed",
                data: { installationId: VALID_INSTALLATION_ID, action: "removed" }
            });

            expect(mockIndexingService.clearRepositoryData).toHaveBeenCalledWith(VALID_INSTALLATION_ID, "test/repo-1");
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Pull Request Events`, () => {
        describe("Pull Request Review", () => {
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
                        prUrl: payload.pull_request.html_url,
                        eligibleForAnalysis: true,
                        status: "queued",
                        timestamp: expect.any(String)
                    }
                });

                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).toHaveBeenCalledWith(
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

            it("should handle PR without linked issues correctly as queued", async () => {
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
                    .expect(STATUS_CODES.BACKGROUND_JOB);

                expect(response.body).toMatchObject({
                    message: "PR webhook processed successfully - analysis queued",
                    data: {
                        prNumber: 1,
                        prUrl: payload.pull_request.html_url,
                        repositoryName: VALID_REPO_NAME,
                        status: "queued"
                    }
                });
            });

            it("should handle workflow processing errors", async () => {
                mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockResolvedValue({
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
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
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
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
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

                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
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

                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
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

                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
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
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).toHaveBeenCalledWith(
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
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: "ready_for_review"
                    })
                );
            });
        });

        describe("Bounty Payout on PR Merge", () => {
            let mockCloudTasksService: any;
            
            beforeAll(async () => {
                const { cloudTasksService } = await import("../../../../api/services/cloud-tasks.service");
                mockCloudTasksService = cloudTasksService;
            });
            
            it("should enqueue bounty payout job when PR is merged", async () => {
                mockCloudTasksService.addBountyPayoutJob.mockResolvedValue("job-123");
                
                const payload = createWebhookPayload({
                    action: "closed",
                    pull_request: {
                        ...createWebhookPayload().pull_request,
                        merged: true
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
                    .expect(STATUS_CODES.BACKGROUND_JOB);

                expect(response.body).toMatchObject({
                    message: "Bounty payout job queued",
                    data: {
                        jobId: "job-123",
                        prNumber: 1,
                        repositoryName: VALID_REPO_NAME,
                        status: "queued"
                    }
                });
                
                expect(mockCloudTasksService.addBountyPayoutJob).toHaveBeenCalledWith({
                    ...payload,
                    webhookMeta: expect.any(Object)
                });
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

                expect(mockCloudTasksService.addBountyPayoutJob).not.toHaveBeenCalled();
            });
        });
    });

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "GITHUB"])} - Issue Comment Events`, () => {
        const COMMENTER = "test-member";
        const PR_NUMBER = 42;

        // Baseline full PR object returned by octokit.rest.pulls.get
        const mockPRData = TestDataFactory.githubPullRequest({
            number: PR_NUMBER,
            title: "My Feature PR",
            draft: false,
            base: {
                ref: "main",
                sha: "def456",
                repo: {
                    name: "repo",
                    full_name: VALID_REPO_NAME,
                    html_url: "https://github.com/test/repo",
                    default_branch: "main"
                }
            }
        });

        /** Helper to build a valid issue_comment payload */
        const createIssueCommentPayload = (overrides: any = {}) => ({
            action: "created",
            issue: {
                number: PR_NUMBER,
                title: "My Feature PR",
                pull_request: { url: `https://api.github.com/repos/test/repo/pulls/${PR_NUMBER}` },
                ...overrides.issue
            },
            comment: {
                id: 99,
                body: "review",
                user: { login: COMMENTER },
                author_association: "MEMBER",
                ...overrides.comment
            },
            repository: {
                id: 123456,
                name: "repo",
                full_name: VALID_REPO_NAME,
                private: false,
                html_url: "https://github.com/test/repo",
                owner: { id: 12345, login: "test" },
                default_branch: "main",
                ...overrides.repository
            },
            installation: {
                id: parseInt(VALID_INSTALLATION_ID),
                account: { id: 12345, login: "test" },
                ...overrides.installation
            },
            ...overrides
        });

        let mockOctokit: any;

        beforeEach(async () => {
            // Seed a member user so the installation membership check passes
            await prisma.user.create({
                data: {
                    userId: "member-user-id",
                    username: COMMENTER,
                    addressBook: [],
                    verified: false,
                    techStack: [],
                    contributionSummary: { create: {} }
                }
            });

            await prisma.installation.create({
                data: {
                    ...TestDataFactory.installation({ id: VALID_INSTALLATION_ID }),
                    users: { connect: [{ userId: "member-user-id" }] },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Mock octokit pulls.get to return our test PR
            mockOctokit = {
                rest: {
                    pulls: {
                        get: jest.fn().mockResolvedValue({ data: mockPRData })
                    }
                }
            };
            mockOctokitService.getOctokit.mockResolvedValue(mockOctokit);
            mockOctokitService.getOwnerAndRepo.mockReturnValue(["test", "repo"]);
            mockOctokitService.getDefaultBranch.mockResolvedValue("main");
        });

        describe("PR Review Trigger", () => {
            it("should queue a review when a member comments 'review' on a PR", async () => {
                const payload = createIssueCommentPayload();
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("X-GitHub-Delivery", "ic-delivery-1")
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.BACKGROUND_JOB);

                expect(response.body.message).toBe("PR webhook processed successfully - analysis queued");
                expect(response.body.data).toMatchObject({
                    jobId: "test-job-123",
                    eligibleForAnalysis: true,
                    status: "queued"
                });

                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).toHaveBeenCalledWith(
                    expect.objectContaining({
                        action: "opened",
                        number: PR_NUMBER,
                        manualTrigger: true
                    })
                );
            });

            it("should be case-insensitive and trim whitespace in 'review' comment", async () => {
                const payload = createIssueCommentPayload({ comment: { id: 101, body: "  REVIEW  ", user: { login: COMMENTER }, author_association: "MEMBER" } });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.BACKGROUND_JOB);

                expect(response.body.message).toBe("PR webhook processed successfully - analysis queued");
            });

            it("should skip when the comment is not on a pull request", async () => {
                const payload = createIssueCommentPayload({
                    issue: { number: PR_NUMBER, title: "A plain issue" }  // no pull_request key
                });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Comment is not on a pull request - skipping");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should skip when comment body is not exactly 'review' and not a bounty command", async () => {
                const payload = createIssueCommentPayload({ comment: { id: 102, body: "lgtm", user: { login: COMMENTER }, author_association: "MEMBER" } });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Comment does not trigger any action - skipping");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should skip when the commenter is not an authorized repo maintainer", async () => {
                const payload = createIssueCommentPayload({
                    comment: { id: 103, body: "review", user: { login: "outside-contributor" }, author_association: "CONTRIBUTOR" }
                });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("User is not authorized to trigger review (association: CONTRIBUTOR) - skipping");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should skip when the installation is not active", async () => {
                // Update the prisma installation to be INACTIVE
                await prisma.installation.update({
                    where: { id: VALID_INSTALLATION_ID },
                    data: { status: "ARCHIVED" }
                });

                const payload = createIssueCommentPayload({ author_association: "OWNER" });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Installation is not active or not found - skipping");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should skip draft PRs", async () => {
                const draftPR = { ...mockPRData, draft: true };
                mockOctokit.rest.pulls.get.mockResolvedValue({ data: draftPR });

                const payload = createIssueCommentPayload();
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Skipping draft PR");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should skip PRs not targeting the default branch", async () => {
                const featurePR = {
                    ...mockPRData,
                    base: { ...mockPRData.base, ref: "develop", repo: { ...mockPRData.base.repo, default_branch: "main" } }
                };
                mockOctokit.rest.pulls.get.mockResolvedValue({ data: featurePR });

                const payload = createIssueCommentPayload();
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("PR not targeting default branch - skipping review");
                expect(response.body.meta).toMatchObject({
                    targetBranch: "develop",
                    defaultBranch: "main",
                    reason: "not_default_branch"
                });
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });

            it("should return server error when triggerReviewBackgroundJob fails", async () => {
                mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockResolvedValue({
                    success: false,
                    error: "GitHub API rate limit exceeded"
                });

                const payload = createIssueCommentPayload();
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SERVER_ERROR);

                expect(response.body.message).toBe("GitHub API rate limit exceeded");
            });

            it("should skip non-created/edited comment actions (e.g. deleted)", async () => {
                // The middleware should reject 'deleted' before it reaches the controller
                const payload = createIssueCommentPayload({ action: "deleted" });
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Issue comment action not processed");
                expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).not.toHaveBeenCalled();
            });
        });

        describe("Bounty Comment Creation", () => {
            it("should process valid bounty comment and queue creation", async () => {
                const payload = createIssueCommentPayload({
                    issue: {
                        number: PR_NUMBER,
                        title: "A plain issue", // NOT a PR
                        state: "open"
                    },
                    comment: { id: 104, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                });
                delete payload.issue.pull_request; // Explicitly remove pull_request to make it an issue

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Bounty comment recognized - processing in background");
            });

            it("should parse variations of command, amount, and time units", async () => {
                const variations = [
                    "/bounty 150.5 1.5 weeks", // decimals
                    "/bounty 300 1 day",      // no $, singular day
                    "/BOUNTY $150.5 1 week",    // uppercase command, singular week
                    "/Bounty $500 2.5 weeks"  // mixed case command, decimal time
                ];

                for (let i = 0; i < variations.length; i++) {
                    const payload = createIssueCommentPayload({
                        issue: {
                            number: PR_NUMBER,
                            title: "A plain issue",
                            state: "open"
                        },
                        comment: { id: 105 + i, body: variations[i], user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    const response = await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    expect(response.body.message).toBe("Bounty comment recognized - processing in background");
                }
            });

            it("should ignore /'not bounty' comments", async () => {
                const payload = createIssueCommentPayload({
                    issue: {
                        number: PR_NUMBER,
                        title: "A plain issue",
                        state: "open"
                    },
                    comment: { id: 106, body: "/task 150.5 1.5 weeks", user: { login: COMMENTER }, author_association: "MEMBER" }
                });
                delete payload.issue.pull_request;

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Comment does not trigger any action - skipping");
            });

            it("should skip bounty on a pull request", async () => {
                const payload = createIssueCommentPayload({
                    comment: { id: 106, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                });
                // Payload already has issue.pull_request by default
                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Comment is on a pull request - skipping bounty creation");
            });

            it("should skip bounty if issue is closed", async () => {
                const payload = createIssueCommentPayload({
                    issue: { state: "closed" },
                    comment: { id: 107, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                });
                delete payload.issue.pull_request;

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Issue is not open - skipping bounty creation");
            });

            it("should skip bounty if commenter is not a repo maintainer", async () => {
                const payload = createIssueCommentPayload({
                    issue: { state: "open" },
                    comment: { id: 108, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "NONE" }
                });
                delete payload.issue.pull_request;

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("User is not authorized to create bounties (association: NONE) - skipping");
            });

            it("should skip bounty if commenter is not registered", async () => {
                const payload = createIssueCommentPayload({
                    issue: { state: "open" },
                    comment: { id: 109, body: "/bounty $300 2 days", user: { login: "unregistered-user" }, author_association: "MEMBER" }
                });
                delete payload.issue.pull_request;

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Commenter is not a registered user on DevAsign - skipping bounty creation");
            });

            it("should skip bounty if installation is inactive or missing wallet", async () => {
                // Temporarily mark installation as ARCHIVED
                await prisma.installation.update({
                    where: { id: VALID_INSTALLATION_ID },
                    data: { status: "ARCHIVED" }
                });

                const payload = createIssueCommentPayload({
                    issue: { state: "open" },
                    comment: { id: 110, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                });
                delete payload.issue.pull_request;

                const payloadString = JSON.stringify(payload);
                const signature = createWebhookSignature(payloadString);

                const response = await request(app)
                    .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                    .set("X-GitHub-Event", "issue_comment")
                    .set("X-Hub-Signature-256", signature)
                    .set("Content-Type", "application/json")
                    .send(payloadString)
                    .expect(STATUS_CODES.SUCCESS);

                expect(response.body.message).toBe("Installation is not active or wallet missing - skipping");

                // Restore installation status
                await prisma.installation.update({
                    where: { id: VALID_INSTALLATION_ID },
                    data: { status: "ACTIVE" }
                });
            });

            describe("Asynchronous Background Processing", () => {
                const waitFor = async (condition: () => Promise<boolean>, timeout: number = 3000) => {
                    const start = Date.now();
                    while (Date.now() - start < timeout) {
                        if (await condition()) return true;
                        await new Promise(resolve => setTimeout(resolve, 50));
                    }
                    return false;
                };

                let OctokitServiceMock: any;
                let stellarServiceMock: any;

                beforeAll(async () => {
                    const { OctokitService } = await import("../../../../api/services/octokit.service");
                    OctokitServiceMock = OctokitService;
                    const { stellarService } = await import("../../../../api/services/stellar.service");
                    stellarServiceMock = stellarService;
                });

                beforeEach(() => {
                    jest.clearAllMocks();
                    stellarServiceMock.getAccountInfo.mockResolvedValue({ balances: [{ asset_code: "USDC", balance: "1000" }] });
                    mockContractService.createEscrow.mockResolvedValue({
                        txHash: "mock-tx-hash",
                        result: { createdAt: (Date.now() / 1000).toString() }
                    });
                    OctokitServiceMock.getBountyLabel.mockResolvedValue({ id: "mock-label-id" });
                    OctokitServiceMock.addBountyLabelAndCreateBountyComment.mockResolvedValue({ id: "mock-comment-id" });
                    OctokitServiceMock.createComment.mockResolvedValue({ id: "mock-failure-comment-id" });
                });

                it("should successfully create bounty task, escrow, and comments", async () => {
                    const payload = createIssueCommentPayload({
                        issue: { number: PR_NUMBER + 1, title: "A plain issue", state: "open", node_id: "node_id_123", html_url: `https://github.com/test/repo/issues/${PR_NUMBER + 1}` },
                        comment: { id: 200, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    const response = await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    expect(response.body.message).toBe("Bounty comment recognized - processing in background");

                    const backgroundTaskFinished = await waitFor(async () => {
                        const task = await prisma.task.findFirst({
                            where: { issue: { path: ["number"], equals: PR_NUMBER + 1 } }
                        });
                        return task?.status === "OPEN";
                    });

                    expect(backgroundTaskFinished).toBe(true);

                    const task = await prisma.task.findFirst({
                        where: { issue: { path: ["number"], equals: PR_NUMBER + 1 } }
                    });
                    expect(task).toBeDefined();
                    expect(task?.bounty).toBe(300);
                    expect(task?.timeline).toBe(2);

                    const transaction = await prisma.transaction.findFirst({
                        where: { taskId: task?.id }
                    });
                    expect(transaction).toBeDefined();
                    expect(transaction?.amount).toBe(300);

                    expect(mockContractService.createEscrow).toHaveBeenCalledWith(
                        expect.any(String),
                        task?.id,
                        expect.any(String),
                        300
                    );

                    expect(OctokitServiceMock.addBountyLabelAndCreateBountyComment).toHaveBeenCalledWith(
                        expect.any(String),
                        expect.any(String),
                        "mock-label-id",
                        "mock-bounty-message"
                    );
                });

                it("should fail background processing and post comment if insufficient USDC balance", async () => {
                    stellarServiceMock.getAccountInfo.mockResolvedValueOnce({ balances: [{ asset_code: "USDC", balance: "10" }] }); // 10 is < 300

                    const payload = createIssueCommentPayload({
                        issue: { number: PR_NUMBER + 2, title: "A plain issue", state: "open", node_id: "node_id_123", html_url: `https://github.com/test/repo/issues/${PR_NUMBER + 2}` },
                        comment: { id: 201, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    const failureCommentCalled = await waitFor(async () => {
                        return OctokitServiceMock.createComment.mock.calls.length > 0;
                    });
                    expect(failureCommentCalled).toBe(true);
                    expect(OctokitServiceMock.createComment).toHaveBeenCalledWith(
                        expect.any(String),
                        VALID_REPO_NAME,
                        PR_NUMBER + 2,
                        "Your USDC balance is insufficient to create this bounty"
                    );
                });

                it("should handle failure getting or creating bounty label", async () => {
                    OctokitServiceMock.getBountyLabel.mockRejectedValueOnce(new Error("Not found"));
                    OctokitServiceMock.createBountyLabels.mockResolvedValueOnce([]); // No bounty label created

                    const payload = createIssueCommentPayload({
                        issue: { number: PR_NUMBER + 3, title: "A plain issue", state: "open", node_id: "node_id_123", html_url: `https://github.com/test/repo/issues/${PR_NUMBER + 3}` },
                        comment: { id: 202, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    const failureCommentCalled = await waitFor(async () => {
                        return OctokitServiceMock.createComment.mock.calls.length > 0;
                    });
                    expect(failureCommentCalled).toBe(true);
                    expect(OctokitServiceMock.createComment).toHaveBeenCalledWith(
                        expect.any(String),
                        VALID_REPO_NAME,
                        PR_NUMBER + 3,
                        expect.any(String)
                    );
                });

                it("should handle failure in escrow creation and rollback task", async () => {
                    mockContractService.createEscrow.mockRejectedValueOnce(new Error("Contract error"));

                    const payload = createIssueCommentPayload({
                        issue: { number: PR_NUMBER + 4, title: "A plain issue", state: "open", node_id: "node_id_123", html_url: `https://github.com/test/repo/issues/${PR_NUMBER + 4}` },
                        comment: { id: 203, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    const failureCommentCalled = await waitFor(async () => {
                        return OctokitServiceMock.createComment.mock.calls.length > 0;
                    });
                    expect(failureCommentCalled).toBe(true);

                    // Allow time for rollback to complete
                    await new Promise(resolve => setTimeout(resolve, 100));

                    const task = await prisma.task.findFirst({
                        where: { issue: { path: ["number"], equals: PR_NUMBER + 4 } }
                    });
                    expect(task).toBeNull();
                });

                it("should handle failure when adding bounty label on issue", async () => {
                    OctokitServiceMock.addBountyLabelAndCreateBountyComment.mockRejectedValueOnce(new Error("Octokit error"));

                    const payload = createIssueCommentPayload({
                        issue: { number: PR_NUMBER + 5, title: "A plain issue", state: "open", node_id: "node_id_123", html_url: `https://github.com/test/repo/issues/${PR_NUMBER + 5}` },
                        comment: { id: 204, body: "/bounty $300 2 days", user: { login: COMMENTER }, author_association: "MEMBER" }
                    });
                    delete payload.issue.pull_request;

                    const payloadString = JSON.stringify(payload);
                    const signature = createWebhookSignature(payloadString);

                    await request(app)
                        .post(getEndpointWithPrefix(["WEBHOOK", "GITHUB"]))
                        .set("X-GitHub-Event", "issue_comment")
                        .set("X-Hub-Signature-256", signature)
                        .set("Content-Type", "application/json")
                        .send(payloadString)
                        .expect(STATUS_CODES.SUCCESS);

                    const failureCommentCalled = await waitFor(async () => {
                        return OctokitServiceMock.createComment.mock.calls.length > 0;
                    });
                    expect(failureCommentCalled).toBe(true);
                    expect(OctokitServiceMock.createComment).toHaveBeenCalledWith(
                        expect.any(String),
                        VALID_REPO_NAME,
                        PR_NUMBER + 5,
                        "Bounty was created but there was an issue while posting the bounty comment or adding the bounty label on issue"
                    );
                });
            });
        });
    });

    describe("Error Handling and Retry Mechanisms", () => {
        it("should handle GitHub API errors gracefully", async () => {
            const { GitHubAPIError } = await import("../../../../api/models/error.model");
            mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockRejectedValue(
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
            mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockRejectedValue(
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
            mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockRejectedValue(
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

                mockAIReviewOrchestrationService.triggerReviewBackgroundJob.mockResolvedValue({
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

            expect(mockAIReviewOrchestrationService.triggerReviewBackgroundJob).toHaveBeenCalledTimes(5);
        });
    });
});
