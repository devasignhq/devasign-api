import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { validateGitHubWebhook, validateGitHubWebhookEvent, validateSumsubWebhook } from "../../../api/middlewares/webhook.middleware";
import { STATUS_CODES } from "../../../api/utilities/data";
import { OctokitService } from "../../../api/services/octokit.service";
import { GitHubWebhookError, SumsubWebhookError } from "../../../api/models/error.model";

// Mock OctokitService
jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getDefaultBranch: jest.fn(),
        updateIssueComment: jest.fn(),
        createBountyLabel: jest.fn(),
        getOwnerAndRepo: jest.fn()
    }
}));

// Mock logger
jest.mock("../../../api/config/logger.config", () => ({
    dataLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe("Webhook Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let originalWebhookSecret: string | undefined;

    const WEBHOOK_SECRET = "test-webhook-secret";

    beforeAll(() => {
        originalWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
    });

    beforeEach(() => {
        mockRequest = {
            headers: {},
            body: {},
            get: jest.fn()
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    afterAll(() => {
        if (originalWebhookSecret) {
            process.env.GITHUB_WEBHOOK_SECRET = originalWebhookSecret;
        } else {
            delete process.env.GITHUB_WEBHOOK_SECRET;
        }
    });

    describe("validateGitHubWebhook", () => {
        const createValidSignature = (payload: string): string => {
            return `sha256=${crypto
                .createHmac("sha256", WEBHOOK_SECRET)
                .update(payload)
                .digest("hex")}`;
        };

        describe("Valid Webhook Signatures", () => {
            it("should accept valid webhook signature", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                const signature = createValidSignature(payload);

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return signature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
                expect(mockRequest.body).toEqual({ test: "data" });
            });

            it("should parse JSON payload after validation", () => {
                const payload = JSON.stringify({
                    action: "opened",
                    pull_request: { number: 1 }
                });
                const rawBody = Buffer.from(payload);
                const signature = createValidSignature(payload);

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return signature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body).toHaveProperty("action", "opened");
                expect(mockRequest.body).toHaveProperty("pull_request");
            });

            it("should handle complex webhook payloads", () => {
                const payload = JSON.stringify({
                    action: "synchronize",
                    pull_request: {
                        number: 42,
                        title: "Test PR",
                        user: { login: "testuser" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    }
                });
                const rawBody = Buffer.from(payload);
                const signature = createValidSignature(payload);

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return signature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.pull_request.number).toBe(42);
            });
        });

        describe("Invalid Webhook Signatures", () => {
            it("should reject invalid signature", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                // Create a valid-length signature but with wrong content
                const validSignature = createValidSignature(payload);
                const invalidSignature = `${validSignature.slice(0, -10)}0000000000`;

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return invalidSignature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error.message).toBe("Invalid webhook signature");
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should reject missing signature", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);

                (mockRequest.get as jest.Mock).mockReturnValue(undefined);
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error.message).toBe("Missing webhook signature");
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should reject when webhook secret is not configured", () => {
                delete process.env.GITHUB_WEBHOOK_SECRET;

                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);

                (mockRequest.get as jest.Mock).mockReturnValue("sha256=something");
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error.message).toBe("GitHub webhook secret not configured");
                expect(mockResponse.status).not.toHaveBeenCalled();

                // Restore secret
                process.env.GITHUB_WEBHOOK_SECRET = WEBHOOK_SECRET;
            });

            it("should reject non-Buffer request body", () => {
                const signature = "sha256=test";

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return signature;
                    return undefined;
                });
                mockRequest.body = { test: "data" }; // Not a Buffer

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error.message).toBe("Invalid request body format");
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should reject malformed JSON payload", () => {
                const payload = "{ invalid json";
                const rawBody = Buffer.from(payload);
                const signature = createValidSignature(payload);

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return signature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error.message).toBe("Invalid JSON payload");
                expect(mockResponse.status).not.toHaveBeenCalled();
            });
        });

        describe("Security", () => {
            it("should use timing-safe comparison for signatures", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                const validSignature = createValidSignature(payload);

                // Create a signature with same length but different content
                const invalidSignature = validSignature.replace(/[0-9]/g, "a");

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-Hub-Signature-256") return invalidSignature;
                    return undefined;
                });
                mockRequest.body = rawBody;

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(GitHubWebhookError));
                expect(mockResponse.status).not.toHaveBeenCalled();
            });
        });
    });

    describe("validateGitHubWebhookEvent", () => {
        const createValidPRPayload = (overrides = {}) => ({
            action: "opened",
            pull_request: {
                number: 1,
                title: "Test PR",
                base: { ref: "main" },
                user: { login: "testuser" }
            },
            repository: {
                full_name: "owner/repo"
            },
            installation: {
                id: 12345678
            },
            ...overrides
        });

        beforeEach(() => {
            (OctokitService.getDefaultBranch as jest.Mock).mockResolvedValue("main");
        });

        describe("Installation Events", () => {
            it("should process valid installation created event", async () => {
                const payload = {
                    action: "created",
                    installation: { id: 12345678 }
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "installation";
                    if (header === "X-GitHub-Delivery") return "test-delivery-123";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toMatchObject({
                    eventType: "installation",
                    action: "created",
                    deliveryId: "test-delivery-123"
                });
            });

            it("should ignore unsupported installation action", async () => {
                const payload = {
                    action: "new_permissions_accepted", // unsupported action
                    installation: { id: 12345678 }
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "installation";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Installation action not processed",
                        meta: { action: "new_permissions_accepted" }
                    })
                );
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject when installation data is missing", async () => {
                const payload = {
                    action: "created"
                    // missing installation object
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "installation";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Missing required installation data",
                        meta: { installation: false }
                    })
                );
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Valid PR Events", () => {
            it("should process valid opened PR event", async () => {
                const payload = createValidPRPayload();

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    if (header === "X-GitHub-Delivery") return "test-delivery-123";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toBeDefined();
                expect(mockRequest.body.webhookMeta.eventType).toBe("pull_request");
                expect(mockRequest.body.webhookMeta.action).toBe("opened");
            });

            it("should skip draft PRs", async () => {
                const payload = createValidPRPayload({
                    pull_request: {
                        number: 1,
                        draft: true
                    }
                });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Skipping draft PR"
                    })
                );
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should process synchronize action", async () => {
                const payload = createValidPRPayload({ action: "synchronize" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    if (header === "X-GitHub-Delivery") return "test-delivery-456";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta.action).toBe("synchronize");
            });

            it("should process ready_for_review action", async () => {
                const payload = createValidPRPayload({ action: "ready_for_review" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it("should process closed action", async () => {
                const payload = createValidPRPayload({ action: "closed" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it("should add webhook metadata to request", async () => {
                const payload = createValidPRPayload();
                const deliveryId = "unique-delivery-id";

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    if (header === "X-GitHub-Delivery") return deliveryId;
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockRequest.body.webhookMeta).toMatchObject({
                    eventType: "pull_request",
                    action: "opened",
                    deliveryId
                });
                expect(mockRequest.body.webhookMeta.timestamp).toBeDefined();
            });
        });

        describe("Event Filtering", () => {
            it("should skip non-PR events", async () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "push";
                    return undefined;
                });
                mockRequest.body = {};

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    data: {},
                    message: "Event type not processed",
                    meta: { eventType: "push" }
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should skip non-relevant PR actions", async () => {
                const payload = createValidPRPayload({ action: "labeled" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    data: {},
                    message: "PR action not processed",
                    meta: { action: "labeled" }
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should skip PRs not targeting default branch", async () => {
                const payload = createValidPRPayload({
                    pull_request: {
                        number: 1,
                        base: { ref: "develop" }
                    }
                });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "PR not targeting default branch - skipping review",
                        meta: expect.objectContaining({
                            targetBranch: "develop"
                        })
                    })
                );
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Validation Errors", () => {
            it("should reject when pull_request is missing", async () => {
                const payload = {
                    action: "opened",
                    repository: { full_name: "owner/repo" },
                    installation: { id: 12345678 }
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    data: {},
                    message: "Missing required webhook data",
                    meta: {
                        pull_request: false,
                        repository: true,
                        installation: true
                    }
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject when repository is missing", async () => {
                const payload = {
                    action: "opened",
                    pull_request: { number: 1, base: { ref: "main" } },
                    installation: { id: 12345678 }
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject when installation is missing", async () => {
                const payload = {
                    action: "opened",
                    pull_request: { number: 1, base: { ref: "main" } },
                    repository: { full_name: "owner/repo" }
                };

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Error Handling", () => {
            it("should continue processing if default branch validation fails", async () => {
                (OctokitService.getDefaultBranch as jest.Mock).mockRejectedValue(
                    new Error("Failed to fetch repository info")
                );

                const payload = createValidPRPayload();

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toBeDefined();
            });

            it("should handle missing required data", async () => {
                const payload = createValidPRPayload();
                // Simulate an error during processing by providing invalid data structure
                payload.pull_request = null as any;

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "pull_request";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Missing required webhook data"
                    })
                );
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        // =====================================================================
        // issue_comment middleware handling
        // =====================================================================
        describe("Issue Comment Events", () => {
            const createIssueCommentBody = (overrides: any = {}) => ({
                action: "created",
                comment: { id: 1, body: "review", user: { login: "testuser" } },
                issue: { number: 42, title: "My PR", pull_request: { url: "..." } },
                repository: { full_name: "owner/repo" },
                installation: { id: 12345678 },
                ...overrides
            });

            it("should pass through 'created' issue_comment events", async () => {
                const payload = createIssueCommentBody({ action: "created" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "issue_comment";
                    if (header === "X-GitHub-Delivery") return "delivery-ic-1";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toMatchObject({
                    eventType: "issue_comment",
                    action: "created",
                    deliveryId: "delivery-ic-1"
                });
            });

            it("should pass through 'edited' issue_comment events", async () => {
                const payload = createIssueCommentBody({ action: "edited" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "issue_comment";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta.action).toBe("edited");
            });

            it("should reject 'deleted' issue_comment events (non-created/edited action)", async () => {
                const payload = createIssueCommentBody({ action: "deleted" });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "issue_comment";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).not.toHaveBeenCalled();
                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Issue comment action not processed",
                        meta: { action: "deleted" }
                    })
                );
            });

            it("should reject issue_comment when comment payload is missing", async () => {
                const payload = createIssueCommentBody({ comment: undefined });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "issue_comment";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).not.toHaveBeenCalled();
                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockResponse.json).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: "Missing required webhook data",
                        meta: expect.objectContaining({ comment: false })
                    })
                );
            });

            it("should reject issue_comment when issue payload is missing", async () => {
                const payload = createIssueCommentBody({ issue: undefined });

                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "X-GitHub-Event") return "issue_comment";
                    return undefined;
                });
                mockRequest.body = payload;

                await validateGitHubWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).not.toHaveBeenCalled();
                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
            });
        });
    });
    
    describe("validateSumsubWebhook", () => {
        const SUMSUB_SECRET = "test-sumsub-secret";
        let originalSumsubSecret: string | undefined;

        const createValidSumsubSignature = (payload: string): string => {
            return crypto
                .createHmac("sha256", SUMSUB_SECRET)
                .update(payload)
                .digest("hex");
        };

        beforeAll(() => {
            originalSumsubSecret = process.env.SUMSUB_WEBHOOK_SECRET;
            process.env.SUMSUB_WEBHOOK_SECRET = SUMSUB_SECRET;
        });

        afterAll(() => {
            if (originalSumsubSecret) {
                process.env.SUMSUB_WEBHOOK_SECRET = originalSumsubSecret;
            } else {
                delete process.env.SUMSUB_WEBHOOK_SECRET;
            }
        });

        it("should accept valid webhook signature", () => {
            const payload = JSON.stringify({ test: "sumsub-data" });
            const rawBody = Buffer.from(payload);
            const signature = createValidSumsubSignature(payload);

            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === "x-payload-digest") return signature;
                return undefined;
            });
            mockRequest.body = rawBody;

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(mockRequest.body).toEqual({ test: "sumsub-data" });
        });

        it("should reject invalid signature", () => {
            const payload = JSON.stringify({ test: "sumsub-data" });
            const rawBody = Buffer.from(payload);
            const validSignature = createValidSumsubSignature(payload);
            const invalidSignature = `${validSignature.slice(0, -10)}0000000000`;

            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === "x-payload-digest") return invalidSignature;
                return undefined;
            });
            mockRequest.body = rawBody;

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(SumsubWebhookError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe("Invalid webhook signature");
        });

        it("should reject missing signature", () => {
            const payload = JSON.stringify({ test: "data" });
            const rawBody = Buffer.from(payload);

            (mockRequest.get as jest.Mock).mockReturnValue(undefined);
            mockRequest.body = rawBody;

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(SumsubWebhookError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe("Missing webhook signature");
        });

        it("should reject when secret not configured", () => {
            delete process.env.SUMSUB_WEBHOOK_SECRET;

            const payload = JSON.stringify({ test: "data" });
            const rawBody = Buffer.from(payload);

            (mockRequest.get as jest.Mock).mockReturnValue("some-signature");
            mockRequest.body = rawBody;

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(SumsubWebhookError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe("Sumsub webhook secret not configured");

            process.env.SUMSUB_WEBHOOK_SECRET = SUMSUB_SECRET;
        });

        it("should reject non-Buffer body", () => {
            const signature = "signature";

            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === "x-payload-digest") return signature;
                return undefined;
            });
            mockRequest.body = { test: "data" };

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(SumsubWebhookError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe("Invalid request body format");
        });

        it("should reject malformed JSON", () => {
            const payload = "{ invalid json";
            const rawBody = Buffer.from(payload);
            const signature = createValidSumsubSignature(payload);

            (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                if (header === "x-payload-digest") return signature;
                return undefined;
            });
            mockRequest.body = rawBody;

            validateSumsubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(SumsubWebhookError));
            const error = (mockNext as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe("Invalid JSON payload");
        });
    });
});
