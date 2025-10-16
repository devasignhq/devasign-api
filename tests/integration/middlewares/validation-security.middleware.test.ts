import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import { dynamicRoute, localhostOnly } from "../../../api/middlewares";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { validateGitHubWebhook, validatePRWebhookEvent } from "../../../api/middlewares/webhook.middleware";
import {
    AIReviewError,
    AuthorizationError,
    ErrorClass,
    GitHubAPIError,
    GroqServiceError,
    NotFoundError,
    ValidationError
} from "../../../api/models/error.model";
import { STATUS_CODES } from "../../../api/helper";

jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getDefaultBranch: jest.fn()
    }
}));

describe("Validation and Security Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockOctokitService: jest.Mock;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            body: {},
            get: jest.fn(),
            url: "/test",
            method: "GET",
            ip: "127.0.0.1"
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();

        jest.clearAllMocks();
    });

    describe("General Middleware", () => {
        describe("dynamicRoute", () => {
            it("should set cache control headers", () => {
                dynamicRoute(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.set).toHaveBeenCalledWith({
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    Pragma: "no-cache",
                    Expires: "0"
                });
                expect(mockNext).toHaveBeenCalled();
            });

            it("should call next middleware", () => {
                dynamicRoute(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledTimes(1);
            });
        });

        describe("localhostOnly", () => {
            it("should allow requests with no origin or referer", () => {
                (mockRequest.get as jest.Mock).mockReturnValue(undefined);

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow localhost origin", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("http://localhost:3000")
                    .mockReturnValueOnce(undefined);

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow 127.0.0.1 origin", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("http://127.0.0.1:3000")
                    .mockReturnValueOnce(undefined);

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow ::1 (IPv6 localhost) origin", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("http://[::1]:3000")
                    .mockReturnValueOnce(undefined);

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow localhost referer when origin is not localhost", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("http://example.com")
                    .mockReturnValueOnce("http://localhost:3000/page");

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should reject non-localhost origin", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("http://example.com")
                    .mockReturnValueOnce("http://example.com/page");

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(403);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. This endpoint is only available from localhost."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject when both origin and referer are non-localhost", () => {
                (mockRequest.get as jest.Mock)
                    .mockReturnValueOnce("https://malicious.com")
                    .mockReturnValueOnce("https://malicious.com/page");

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(403);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. This endpoint is only available from localhost."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });
    });

    describe("Error Handling Middleware", () => {
        describe("errorHandler", () => {
            it("should handle custom errors with correct status codes", () => {
                // Regular
                let error: any = new ErrorClass(
                    "CUSTOM_ERROR", 
                    { detail: "test" }, 
                    "Custom error message", 
                    STATUS_CODES.BAD_PAYLOAD
                );
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.BAD_PAYLOAD);
                expect(mockResponse.json).toHaveBeenCalledWith({ ...error });
                
                // Not found
                error = new NotFoundError("Access denied");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.NOT_FOUND);

                // Authorization
                error = new AuthorizationError("Access denied");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);

                // Validation
                error = new ValidationError("Access denied");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SERVER_ERROR);

                // AI review
                error = new AIReviewError("REVIEW_ERROR", null, "Review failed");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SERVER_ERROR);

                // GitHub API
                error = new GitHubAPIError("Failed to fetch pr");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GITHUB_API_ERROR);

                // Groq API
                error = new GroqServiceError("Completion failed");
                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GROQ_API_ERROR);
            });

            it("should handle ValidationError with correct status codes", () => {
                const error = {
                    name: "ValidationError",
                    message: "Validation failed",
                    errors: ["Field is required"]
                };

                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SERVER_ERROR);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: error.message,
                    details: error.errors
                });
            });

            it("should handle generic errors with 500 status", () => {
                const error = new Error("Generic error");

                errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNKNOWN);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    message: "An unknown error occured",
                    details: error
                });
            });
        });
    });

    describe("Webhook Security Middleware", () => {
        describe("validateGitHubWebhook", () => {
            const originalEnv = process.env;

            beforeEach(() => {
                process.env = { ...originalEnv };
                process.env.GITHUB_WEBHOOK_SECRET = "test-secret";
            });

            afterEach(() => {
                process.env = originalEnv;
            });

            it("should validate correct webhook signature", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                const signature = `sha256=${crypto.createHmac("sha256", "test-secret").update(rawBody).digest("hex")}`;

                mockRequest.body = rawBody;
                (mockRequest.get as jest.Mock).mockReturnValue(signature);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body).toEqual({ test: "data" });
            });

            it("should reject request with missing signature", () => {
                const payload = JSON.stringify({ test: "data" });
                mockRequest.body = Buffer.from(payload);
                (mockRequest.get as jest.Mock).mockReturnValue(undefined);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GITHUB_API_ERROR);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "Missing webhook signature",
                    code: "GITHUB_WEBHOOK_ERROR"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject request with invalid signature", () => {
                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                const invalidSignature = "sha256=invalid-signature";

                mockRequest.body = rawBody;
                (mockRequest.get as jest.Mock).mockReturnValue(invalidSignature);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNKNOWN);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "Webhook validation failed",
                    code: "WEBHOOK_VALIDATION_ERROR"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should reject request when webhook secret is not configured", () => {
                delete process.env.GITHUB_WEBHOOK_SECRET;

                const payload = JSON.stringify({ test: "data" });
                mockRequest.body = Buffer.from(payload);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GITHUB_API_ERROR);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "GitHub webhook secret not configured",
                    code: "GITHUB_WEBHOOK_ERROR"
                });
            });

            it("should reject request with non-buffer body", () => {
                mockRequest.body = "string-body";
                (mockRequest.get as jest.Mock).mockReturnValue("sha256=signature");

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GITHUB_API_ERROR);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "Invalid request body format",
                    code: "GITHUB_WEBHOOK_ERROR"
                });
            });

            it("should reject request with invalid JSON payload", () => {
                const invalidJson = Buffer.from("invalid-json{");
                const signature = `sha256=${crypto.createHmac("sha256", "test-secret").update(invalidJson).digest("hex")}`;

                mockRequest.body = invalidJson;
                (mockRequest.get as jest.Mock).mockReturnValue(signature);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.GITHUB_API_ERROR);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "Invalid JSON payload",
                    code: "GITHUB_WEBHOOK_ERROR"
                });
            });

            it("should handle unexpected errors", () => {
                // Simulate an error by making crypto.timingSafeEqual throw
                const originalTimingSafeEqual = crypto.timingSafeEqual;
                crypto.timingSafeEqual = jest.fn().mockImplementation(() => {
                    throw new Error("Crypto error");
                });

                const payload = JSON.stringify({ test: "data" });
                const rawBody = Buffer.from(payload);
                const signature = "sha256=test-signature";

                mockRequest.body = rawBody;
                (mockRequest.get as jest.Mock).mockReturnValue(signature);

                validateGitHubWebhook(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error: "Webhook validation failed",
                    code: "WEBHOOK_VALIDATION_ERROR"
                });

                // Restore original function
                crypto.timingSafeEqual = originalTimingSafeEqual;
            });
        });

        describe("validatePRWebhookEvent", () => {
            beforeAll(async () => {
                const { OctokitService } = await import("../../../api/services/octokit.service");
                mockOctokitService = OctokitService.getDefaultBranch as jest.Mock;
            });

            it("should process valid pull_request event", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "opened",
                    pull_request: {
                        number: 123,
                        base: { ref: "main" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    },
                    installation: {
                        id: 12345
                    }
                };

                mockOctokitService.mockResolvedValue("main");

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toEqual({
                    eventType: "pull_request",
                    action: "opened",
                    deliveryId: "pull_request",
                    timestamp: expect.any(String)
                });
            });

            it("should skip non-pull_request events", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("push");

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    message: "Event type not processed",
                    eventType: "push"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should skip invalid PR actions", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "closed"
                };

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    message: "PR action not processed",
                    action: "closed"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should skip PRs not targeting default branch", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "opened",
                    pull_request: {
                        number: 123,
                        base: { ref: "feature-branch" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    },
                    installation: {
                        id: 12345
                    }
                };

                mockOctokitService.mockResolvedValue("main");

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SUCCESS);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: true,
                    message: "PR not targeting default branch - skipping review",
                    data: {
                        prNumber: 123,
                        repositoryName: "owner/repo",
                        targetBranch: "feature-branch",
                        defaultBranch: "main",
                        reason: "not_default_branch"
                    }
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should continue processing if default branch validation fails", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "opened",
                    pull_request: {
                        number: 123,
                        base: { ref: "main" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    },
                    installation: {
                        id: 12345
                    }
                };

                mockOctokitService.mockRejectedValue(new Error("API error"));

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta).toBeDefined();
            });

            it("should handle synchronize action", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "synchronize",
                    pull_request: {
                        number: 123,
                        base: { ref: "main" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    },
                    installation: {
                        id: 12345
                    }
                };

                mockOctokitService.mockResolvedValue("main");

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta.action).toBe("synchronize");
            });

            it("should handle ready_for_review action", async () => {
                (mockRequest.get as jest.Mock).mockReturnValue("pull_request");
                mockRequest.body = {
                    action: "ready_for_review",
                    pull_request: {
                        number: 123,
                        base: { ref: "main" }
                    },
                    repository: {
                        full_name: "owner/repo"
                    },
                    installation: {
                        id: 12345
                    }
                };

                mockOctokitService.mockResolvedValue("main");

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockRequest.body.webhookMeta.action).toBe("ready_for_review");
            });

            it("should handle unexpected errors", async () => {
                const error = new Error("Unexpected error");
                (mockRequest.get as jest.Mock).mockImplementation(() => {
                    throw error;
                });

                await validatePRWebhookEvent(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    success: false,
                    error,
                    code: "EVENT_VALIDATION_ERROR"
                });
                expect(mockNext).not.toHaveBeenCalled();
            });
        });
    });
});
