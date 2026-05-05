import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
    ErrorClass,
    AuthorizationError,
    ValidationError,
    NotFoundError,
    KmsServiceError,
    StellarServiceError,
    EscrowContractError,
    GeminiServiceError,
    GitHubAPIError,
    VoyageAPIError,
    GitHubWebhookError,
    SumsubWebhookError,
    CloudTasksError,
    TimeoutError,
    AIReviewError,
    ErrorUtils
} from "../../api/models/error.model.js";
import { STATUS_CODES } from "../../api/utils/data.js";

/**
 * Tests for api/models/error.model.ts
 *
 * Focus: status code updates from the PR —
 *   - AuthorizationError now uses FORBIDDEN (403) instead of 401
 *   - ValidationError now uses BAD_REQUEST (400) instead of 500
 *   - Default ErrorClass status is INTERNAL_SERVER_ERROR (500)
 *   - TimeoutError uses REQUEST_TIMEOUT (408)
 *   - ErrorUtils.sanitizeError uses Env.nodeEnv() !== "production"
 */

describe("Error Models", () => {
    describe("ErrorClass (base)", () => {
        it("should default to INTERNAL_SERVER_ERROR status", () => {
            const err = new ErrorClass("SOME_CODE", null, "some message");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
            expect(err.status).toBe(500);
        });

        it("should accept custom status code", () => {
            const err = new ErrorClass("CUSTOM", null, "msg", STATUS_CODES.BAD_REQUEST);
            expect(err.status).toBe(STATUS_CODES.BAD_REQUEST);
        });

        it("should set name to 'ErrorClass'", () => {
            const err = new ErrorClass("CODE", null, "msg");
            expect(err.name).toBe("ErrorClass");
        });

        it("should store code, message, details, and status", () => {
            const details = { extra: "info" };
            const err = new ErrorClass("MY_CODE", details, "My message", STATUS_CODES.NOT_FOUND);
            expect(err.code).toBe("MY_CODE");
            expect(err.message).toBe("My message");
            expect(err.details).toBe(details);
            expect(err.status).toBe(STATUS_CODES.NOT_FOUND);
        });
    });

    // =========================================================================
    // AuthorizationError — changed from UNAUTHORIZED (401) to FORBIDDEN (403)
    // =========================================================================
    describe("AuthorizationError", () => {
        it("should use FORBIDDEN (403) status", () => {
            const err = new AuthorizationError("Not allowed");
            expect(err.status).toBe(STATUS_CODES.FORBIDDEN);
            expect(err.status).toBe(403);
        });

        it("should NOT use UNAUTHORIZED (401) status", () => {
            const err = new AuthorizationError("Not allowed");
            expect(err.status).not.toBe(STATUS_CODES.UNAUTHORIZED);
            expect(err.status).not.toBe(401);
        });

        it("should use code 'UNAUTHORIZED'", () => {
            const err = new AuthorizationError("Not allowed");
            expect(err.code).toBe("UNAUTHORIZED");
        });

        it("should accept a details argument", () => {
            const details = { resource: "task" };
            const err = new AuthorizationError("Not allowed", details);
            expect(err.details).toBe(details);
        });

        it("should default details to null", () => {
            const err = new AuthorizationError("Not allowed");
            expect(err.details).toBeNull();
        });

        it("should be an instance of ErrorClass", () => {
            const err = new AuthorizationError("Not allowed");
            expect(err).toBeInstanceOf(ErrorClass);
        });
    });

    // =========================================================================
    // ValidationError — changed from SERVER_ERROR (500) to BAD_REQUEST (400)
    // =========================================================================
    describe("ValidationError", () => {
        it("should use BAD_REQUEST (400) status", () => {
            const err = new ValidationError("Invalid input");
            expect(err.status).toBe(STATUS_CODES.BAD_REQUEST);
            expect(err.status).toBe(400);
        });

        it("should NOT use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new ValidationError("Invalid input");
            expect(err.status).not.toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'VALIDATION_ERROR'", () => {
            const err = new ValidationError("Invalid input");
            expect(err.code).toBe("VALIDATION_ERROR");
        });

        it("should accept details", () => {
            const details = ["field required"];
            const err = new ValidationError("Invalid", details);
            expect(err.details).toEqual(details);
        });

        it("should be an instance of ErrorClass", () => {
            const err = new ValidationError("Invalid");
            expect(err).toBeInstanceOf(ErrorClass);
        });
    });

    // =========================================================================
    // NotFoundError
    // =========================================================================
    describe("NotFoundError", () => {
        it("should use NOT_FOUND (404) status", () => {
            const err = new NotFoundError("Resource not found");
            expect(err.status).toBe(STATUS_CODES.NOT_FOUND);
            expect(err.status).toBe(404);
        });

        it("should use code 'NOT_FOUND'", () => {
            const err = new NotFoundError("Resource not found");
            expect(err.code).toBe("NOT_FOUND");
        });
    });

    // =========================================================================
    // KmsServiceError
    // =========================================================================
    describe("KmsServiceError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new KmsServiceError("KMS failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'KMS_SERVICE_ERROR'", () => {
            const err = new KmsServiceError("KMS failed");
            expect(err.code).toBe("KMS_SERVICE_ERROR");
        });
    });

    // =========================================================================
    // StellarServiceError
    // =========================================================================
    describe("StellarServiceError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new StellarServiceError("Stellar failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'STELLAR_SERVICE_ERROR'", () => {
            const err = new StellarServiceError("Stellar failed");
            expect(err.code).toBe("STELLAR_SERVICE_ERROR");
        });
    });

    // =========================================================================
    // EscrowContractError
    // =========================================================================
    describe("EscrowContractError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new EscrowContractError("Escrow failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'ESCROW_CONTRACT_ERROR'", () => {
            const err = new EscrowContractError("Escrow failed");
            expect(err.code).toBe("ESCROW_CONTRACT_ERROR");
        });
    });

    // =========================================================================
    // GeminiServiceError
    // =========================================================================
    describe("GeminiServiceError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new GeminiServiceError("Gemini failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'GEMINI_SERVICE_ERROR'", () => {
            const err = new GeminiServiceError("Gemini failed");
            expect(err.code).toBe("GEMINI_SERVICE_ERROR");
        });
    });

    // =========================================================================
    // GitHubAPIError
    // =========================================================================
    describe("GitHubAPIError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new GitHubAPIError("GitHub API failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use default code 'GITHUB_API_ERROR'", () => {
            const err = new GitHubAPIError("GitHub API failed");
            expect(err.code).toBe("GITHUB_API_ERROR");
        });

        it("should accept custom code", () => {
            const err = new GitHubAPIError("Failed", null, 404, undefined, "REPO_NOT_FOUND");
            expect(err.code).toBe("REPO_NOT_FOUND");
        });

        it("should store optional statusCode and rateLimitRemaining", () => {
            const err = new GitHubAPIError("Rate limited", null, 429, 0);
            expect(err.statusCode).toBe(429);
            expect(err.rateLimitRemaining).toBe(0);
        });
    });

    // =========================================================================
    // VoyageAPIError
    // =========================================================================
    describe("VoyageAPIError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new VoyageAPIError("Voyage failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'VOYAGE_API_ERROR'", () => {
            const err = new VoyageAPIError("Voyage failed");
            expect(err.code).toBe("VOYAGE_API_ERROR");
        });
    });

    // =========================================================================
    // GitHubWebhookError
    // =========================================================================
    describe("GitHubWebhookError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new GitHubWebhookError("Webhook validation failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'GITHUB_WEBHOOK_ERROR'", () => {
            const err = new GitHubWebhookError("Webhook validation failed");
            expect(err.code).toBe("GITHUB_WEBHOOK_ERROR");
        });

        it("should not be retryable", () => {
            const err = new GitHubWebhookError("Webhook validation failed");
            expect(err.retryable).toBe(false);
        });
    });

    // =========================================================================
    // SumsubWebhookError
    // =========================================================================
    describe("SumsubWebhookError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new SumsubWebhookError("Sumsub webhook failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'SUMSUB_WEBHOOK_ERROR'", () => {
            const err = new SumsubWebhookError("Sumsub webhook failed");
            expect(err.code).toBe("SUMSUB_WEBHOOK_ERROR");
        });

        it("should not be retryable", () => {
            const err = new SumsubWebhookError("Sumsub webhook failed");
            expect(err.retryable).toBe(false);
        });
    });

    // =========================================================================
    // CloudTasksError
    // =========================================================================
    describe("CloudTasksError", () => {
        it("should use INTERNAL_SERVER_ERROR (500) status", () => {
            const err = new CloudTasksError("Cloud Tasks failed");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should use code 'CLOUD_TASKS_ERROR'", () => {
            const err = new CloudTasksError("Cloud Tasks failed");
            expect(err.code).toBe("CLOUD_TASKS_ERROR");
        });
    });

    // =========================================================================
    // TimeoutError — changed from TIMEOUT to REQUEST_TIMEOUT (408)
    // =========================================================================
    describe("TimeoutError", () => {
        it("should use REQUEST_TIMEOUT (408) status", () => {
            const err = new TimeoutError("database-query", 5000);
            expect(err.status).toBe(STATUS_CODES.REQUEST_TIMEOUT);
            expect(err.status).toBe(408);
        });

        it("should be retryable", () => {
            const err = new TimeoutError("database-query", 5000);
            expect(err.retryable).toBe(true);
        });

        it("should include operation and timeout in message", () => {
            const err = new TimeoutError("pr-analysis", 30000);
            expect(err.message).toContain("pr-analysis");
            expect(err.message).toContain("30000ms");
        });

        it("should store operation and timeoutMs", () => {
            const err = new TimeoutError("some-op", 10000);
            expect(err.operation).toBe("some-op");
            expect(err.timeoutMs).toBe(10000);
        });

        it("should be an instance of AIReviewError and ErrorClass", () => {
            const err = new TimeoutError("op", 1000);
            expect(err).toBeInstanceOf(AIReviewError);
            expect(err).toBeInstanceOf(ErrorClass);
        });
    });

    // =========================================================================
    // AIReviewError
    // =========================================================================
    describe("AIReviewError", () => {
        it("should default to INTERNAL_SERVER_ERROR status", () => {
            const err = new AIReviewError("CODE", null, "message");
            expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("should store retryable flag", () => {
            const retryableErr = new AIReviewError("CODE", null, "message", true);
            const nonRetryableErr = new AIReviewError("CODE", null, "message", false);
            expect(retryableErr.retryable).toBe(true);
            expect(nonRetryableErr.retryable).toBe(false);
        });

        it("toJSON should include retryable field", () => {
            const err = new AIReviewError("MY_CODE", { detail: "x" }, "msg", true, 500);
            const json = err.toJSON();
            expect(json).toEqual({
                code: "MY_CODE",
                details: { detail: "x" },
                message: "msg",
                status: 500,
                retryable: true
            });
        });
    });

    // =========================================================================
    // ErrorUtils.sanitizeError
    // =========================================================================
    describe("ErrorUtils.sanitizeError", () => {
        const originalEnv = process.env.NODE_ENV;

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
        });

        it("should return full error object in development environment", () => {
            process.env.NODE_ENV = "development";
            const err = new ErrorClass("CODE", { data: "sensitive" }, "msg", 400);
            const sanitized = ErrorUtils.sanitizeError(err);
            expect(sanitized).toMatchObject({
                code: "CODE",
                message: "msg",
                status: 400,
                details: { data: "sensitive" }
            });
        });

        it("should return full error object in test environment", () => {
            process.env.NODE_ENV = "test";
            const err = new ErrorClass("CODE", { data: "sensitive" }, "msg", 400);
            const sanitized = ErrorUtils.sanitizeError(err);
            expect(sanitized).toMatchObject({
                code: "CODE",
                message: "msg",
                status: 400,
                details: { data: "sensitive" }
            });
        });

        it("should strip sensitive details in production environment", () => {
            process.env.NODE_ENV = "production";
            const err = new ErrorClass("CODE", { data: "sensitive" }, "msg", 400);
            const sanitized = ErrorUtils.sanitizeError(err);
            expect(sanitized).toEqual({
                code: "CODE",
                message: "msg",
                status: 400
            });
            // Should NOT include details
            expect((sanitized as any).details).toBeUndefined();
        });

        it("should return full error in non-production (staging) environment", () => {
            process.env.NODE_ENV = "staging";
            const err = new ErrorClass("CODE", { secret: "value" }, "msg", 500);
            const sanitized = ErrorUtils.sanitizeError(err);
            // Env.nodeEnv() !== "production" → should return full error
            expect((sanitized as any).details).toBeDefined();
        });
    });

    // =========================================================================
    // ErrorUtils.extractAxiosErrorData
    // =========================================================================
    describe("ErrorUtils.extractAxiosErrorData", () => {
        it("should return details as-is when not an Axios error", () => {
            const plain = { message: "plain error" };
            expect(ErrorUtils.extractAxiosErrorData(plain)).toBe(plain);
        });

        it("should return null as-is", () => {
            expect(ErrorUtils.extractAxiosErrorData(null)).toBeNull();
        });

        it("should extract axios error data when isAxiosError is true", () => {
            const axiosError = {
                isAxiosError: true,
                code: "ECONNREFUSED",
                message: "Connection refused",
                response: {
                    status: 503,
                    data: { error: "Service unavailable" }
                }
            };
            const result = ErrorUtils.extractAxiosErrorData(axiosError) as any;
            expect(result.code).toBe("ECONNREFUSED");
            expect(result.status).toBe(503);
            expect(result.message).toBe("Connection refused");
            expect(result.data).toEqual({ error: "Service unavailable" });
        });

        it("should handle wrapped axios error ({ error: AxiosError })", () => {
            const wrapped = {
                error: {
                    isAxiosError: true,
                    code: "ETIMEDOUT",
                    message: "Timeout",
                    response: { status: 408, data: "timeout" }
                }
            };
            const result = ErrorUtils.extractAxiosErrorData(wrapped) as any;
            expect(result.code).toBe("ETIMEDOUT");
            expect(result.status).toBe(408);
        });

        it("should return undefined as-is", () => {
            expect(ErrorUtils.extractAxiosErrorData(undefined)).toBeUndefined();
        });
    });

    // =========================================================================
    // ErrorUtils.isRetryable
    // =========================================================================
    describe("ErrorUtils.isRetryable", () => {
        it("should use AIReviewError.retryable flag", () => {
            const retryable = new GeminiServiceError("msg", null, true);
            const nonRetryable = new GeminiServiceError("msg", null, false);
            expect(ErrorUtils.isRetryable(retryable as any)).toBe(true);
            expect(ErrorUtils.isRetryable(nonRetryable as any)).toBe(false);
        });

        it("should return true for timeout-related generic errors", () => {
            const err = new Error("connection timeout");
            expect(ErrorUtils.isRetryable(err)).toBe(true);
        });

        it("should return true for network-related generic errors", () => {
            const err = new Error("network error occurred");
            expect(ErrorUtils.isRetryable(err)).toBe(true);
        });

        it("should return false for unrecognized errors", () => {
            const err = new Error("something else went wrong");
            expect(ErrorUtils.isRetryable(err)).toBe(false);
        });
    });
});