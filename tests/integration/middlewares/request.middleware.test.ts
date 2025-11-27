import { Request, Response, NextFunction } from "express";
import * as z from "zod";
import { dynamicRoute, localhostOnly, validateRequestParameters } from "../../../api/middlewares/request.middleware";
import { STATUS_CODES } from "../../../api/utilities/data";
import { ValidationError } from "../../../api/models/error.model";

describe("Request Middleware", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {},
            body: {},
            params: {},
            query: {},
            get: jest.fn()
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis()
        };

        mockNext = jest.fn();
        jest.clearAllMocks();
    });

    describe("dynamicRoute", () => {
        it("should set no-cache headers", () => {
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

        it("should not modify request object", () => {
            const originalRequest = { ...mockRequest };
            dynamicRoute(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRequest).toEqual(originalRequest);
        });
    });

    describe("localhostOnly", () => {
        describe("Localhost Access", () => {
            it("should allow requests from localhost origin", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "http://localhost:3000";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow requests from 127.0.0.1 origin", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "http://127.0.0.1:3000";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow requests from ::1 (IPv6 localhost)", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "http://[::1]:3000";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow requests from localhost referer", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "referer") return "http://localhost:3000/page";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });

            it("should allow requests with no origin or referer (direct API calls)", () => {
                (mockRequest.get as jest.Mock).mockReturnValue(undefined);

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
                expect(mockResponse.status).not.toHaveBeenCalled();
            });
        });

        describe("Non-Localhost Access Denial", () => {
            it("should deny requests from external origin", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "https://example.com";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. This endpoint is only available from localhost."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny requests from external referer", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "referer") return "https://malicious-site.com";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Access denied. This endpoint is only available from localhost."
                });
                expect(mockNext).not.toHaveBeenCalled();
            });

            it("should deny requests from production domain", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "https://production.example.com";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockResponse.status).toHaveBeenCalledWith(STATUS_CODES.UNAUTHORIZED);
                expect(mockNext).not.toHaveBeenCalled();
            });
        });

        describe("Edge Cases", () => {
            it("should allow when host header contains localhost", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return undefined;
                    if (header === "host") return "localhost:3000";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it("should check both origin and referer", () => {
                (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
                    if (header === "origin") return "https://example.com";
                    if (header === "referer") return "http://localhost:3000";
                    return undefined;
                });

                localhostOnly(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });
        });
    });

    describe("validateRequestParameters", () => {
        describe("Parameter Validation", () => {
            it("should validate valid request parameters", () => {
                const paramsSchema = z.object({
                    id: z.string().uuid()
                });

                mockRequest.params = {
                    id: "550e8400-e29b-41d4-a716-446655440000"
                };

                const middleware = validateRequestParameters({ params: paramsSchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.params).toHaveProperty("id");
            });

            it("should throw ValidationError for invalid parameters", () => {
                const paramsSchema = z.object({
                    id: z.string().uuid()
                });

                mockRequest.params = {
                    id: "invalid-uuid"
                };

                const middleware = validateRequestParameters({ params: paramsSchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            });

            it("should transform and validate parameters", () => {
                const paramsSchema = z.object({
                    page: z.string().transform(Number)
                });

                mockRequest.params = {
                    page: "5"
                };

                const middleware = validateRequestParameters({ params: paramsSchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.params.page).toBe(5);
            });
        });

        describe("Query Validation", () => {
            it("should validate valid query parameters", () => {
                const querySchema = z.object({
                    search: z.string().optional(),
                    page: z.string().optional()
                });

                mockRequest.query = {
                    search: "test",
                    page: "1"
                };

                const middleware = validateRequestParameters({ query: querySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.query).toHaveProperty("search", "test");
            });

            it("should throw ValidationError for invalid query parameters", () => {
                const querySchema = z.object({
                    limit: z.string().regex(/^\d+$/)
                });

                mockRequest.query = {
                    limit: "abc"
                };

                const middleware = validateRequestParameters({ query: querySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            });

            it("should handle empty query parameters", () => {
                const querySchema = z.object({
                    search: z.string().optional()
                });

                mockRequest.query = {};

                const middleware = validateRequestParameters({ query: querySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
            });
        });

        describe("Body Validation", () => {
            it("should validate valid request body", () => {
                const bodySchema = z.object({
                    name: z.string(),
                    email: z.string().email()
                });

                mockRequest.body = {
                    name: "Test User",
                    email: "test@example.com"
                };

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.body).toHaveProperty("name", "Test User");
                expect(mockRequest.body).toHaveProperty("email", "test@example.com");
            });

            it("should throw ValidationError for invalid body", () => {
                const bodySchema = z.object({
                    email: z.string().email()
                });

                mockRequest.body = {
                    email: "invalid-email"
                };

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            });

            it("should preserve currentUser and userId in body", () => {
                const bodySchema = z.object({
                    name: z.string()
                });

                mockRequest.body = {
                    currentUser: { uid: "test-uid" },
                    userId: "test-user-id",
                    name: "Test"
                };

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.body).toHaveProperty("currentUser");
                expect(mockRequest.body).toHaveProperty("userId");
                expect(mockRequest.body).toHaveProperty("name", "Test");
            });

            it("should handle complex nested body validation", () => {
                const bodySchema = z.object({
                    user: z.object({
                        name: z.string(),
                        age: z.number().min(0)
                    }),
                    tags: z.array(z.string())
                });

                mockRequest.body = {
                    user: {
                        name: "John",
                        age: 25
                    },
                    tags: ["tag1", "tag2"]
                };

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
            });
        });

        describe("Combined Validation", () => {
            it("should validate params, query, and body together", () => {
                const paramsSchema = z.object({ id: z.string() });
                const querySchema = z.object({ view: z.string().optional() });
                const bodySchema = z.object({ data: z.string() });

                mockRequest.params = { id: "123" };
                mockRequest.query = { view: "full" };
                mockRequest.body = { data: "test" };

                const middleware = validateRequestParameters({
                    params: paramsSchema,
                    query: querySchema,
                    body: bodySchema
                });

                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
                expect(mockRequest.params).toHaveProperty("id", "123");
                expect(mockRequest.query).toHaveProperty("view", "full");
                expect(mockRequest.body).toHaveProperty("data", "test");
            });

            it("should fail if any validation fails", () => {
                const paramsSchema = z.object({ id: z.string().uuid() });
                const bodySchema = z.object({ email: z.string().email() });

                mockRequest.params = { id: "invalid" };
                mockRequest.body = { email: "test@example.com" };

                const middleware = validateRequestParameters({
                    params: paramsSchema,
                    body: bodySchema
                });

                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            });
        });

        describe("Edge Cases", () => {
            it("should handle middleware with no schemas", () => {
                const middleware = validateRequestParameters({});
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith();
            });

            it("should handle missing request properties", () => {
                const bodySchema = z.object({
                    name: z.string()
                });

                mockRequest.body = undefined;

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                expect(mockNext).toHaveBeenCalledWith(expect.any(ValidationError));
            });

            it("should provide detailed error information", () => {
                const bodySchema = z.object({
                    email: z.string().email(),
                    age: z.number().min(18)
                });

                mockRequest.body = {
                    email: "invalid",
                    age: 15
                };

                const middleware = validateRequestParameters({ body: bodySchema });
                middleware(mockRequest as Request, mockResponse as Response, mockNext);

                const error = (mockNext as jest.Mock).mock.calls[0][0];
                expect(error).toBeInstanceOf(ValidationError);
                expect(error.message).toBe("Invalid request body");
                expect(error.details).toBeDefined();
            });
        });
    });
});
