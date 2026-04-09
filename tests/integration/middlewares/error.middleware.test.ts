import { vi, describe, it, expect, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { errorHandler } from "../../../api/middlewares/error.middleware.js";
import {
    AIReviewError,
    AuthorizationError,
    ErrorClass,
    GitHubAPIError,
    GeminiServiceError,
    NotFoundError,
    ValidationError
} from "../../../api/models/error.model.js";
import { STATUS_CODES } from "../../../api/utilities/data.js";

vi.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getDefaultBranch: vi.fn()
    }
}));

describe("Error Handling Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            body: {},
            get: vi.fn(),
            url: "/test",
            method: "GET",
            ip: "127.0.0.1"
        };

        mockResponse = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            set: vi.fn().mockReturnThis()
        } as any;

        mockNext = vi.fn() as any;

        vi.clearAllMocks();
    });


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
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                code: "CUSTOM_ERROR",
                message: "Custom error message"
            }));

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
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                code: "REVIEW_ERROR",
                message: "Review failed"
            }));

            // GitHub API
            error = new GitHubAPIError("Failed to fetch pr");
            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                code: "GITHUB_API_ERROR",
                message: "Failed to fetch pr"
            }));

            // Gemini API
            error = new GeminiServiceError("Completion failed");
            errorHandler(error, mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.SERVER_ERROR);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                code: "GEMINI_SERVICE_ERROR",
                message: "Completion failed"
            }));
        });

        it("should handle ValidationError with correct status codes", () => {
            const error = {
                name: "ValidationError",
                message: "Validation failed",
                errors: ["Field is required"]
            };

            errorHandler(error as any, mockRequest as Request, mockResponse as Response, mockNext);

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
                message: "Generic error",
                details: error
            });
        });
    });
});
