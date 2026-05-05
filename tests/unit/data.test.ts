import { describe, it, expect } from "vitest";
import { STATUS_CODES, ENDPOINTS } from "../../api/utils/data.js";

describe("STATUS_CODES", () => {
    // =========================================================================
    // 2xx Success codes
    // =========================================================================
    describe("2xx Success codes", () => {
        it("OK should be 200", () => {
            expect(STATUS_CODES.OK).toBe(200);
        });

        it("CREATED should be 201", () => {
            expect(STATUS_CODES.CREATED).toBe(201);
        });

        it("ACCEPTED should be 202", () => {
            expect(STATUS_CODES.ACCEPTED).toBe(202);
        });

        it("NO_CONTENT should be 204", () => {
            expect(STATUS_CODES.NO_CONTENT).toBe(204);
        });
    });

    // =========================================================================
    // 4xx Client error codes
    // =========================================================================
    describe("4xx Client error codes", () => {
        it("BAD_REQUEST should be 400", () => {
            expect(STATUS_CODES.BAD_REQUEST).toBe(400);
        });

        it("UNAUTHORIZED should be 401", () => {
            expect(STATUS_CODES.UNAUTHORIZED).toBe(401);
        });

        it("FORBIDDEN should be 403", () => {
            expect(STATUS_CODES.FORBIDDEN).toBe(403);
        });

        it("NOT_FOUND should be 404", () => {
            expect(STATUS_CODES.NOT_FOUND).toBe(404);
        });

        it("REQUEST_TIMEOUT should be 408", () => {
            expect(STATUS_CODES.REQUEST_TIMEOUT).toBe(408);
        });

        it("CONFLICT should be 409", () => {
            expect(STATUS_CODES.CONFLICT).toBe(409);
        });

        it("UNPROCESSABLE_ENTITY should be 422", () => {
            expect(STATUS_CODES.UNPROCESSABLE_ENTITY).toBe(422);
        });

        it("TOO_MANY_REQUESTS should be 429", () => {
            expect(STATUS_CODES.TOO_MANY_REQUESTS).toBe(429);
        });
    });

    // =========================================================================
    // 5xx Server error codes
    // =========================================================================
    describe("5xx Server error codes", () => {
        it("INTERNAL_SERVER_ERROR should be 500", () => {
            expect(STATUS_CODES.INTERNAL_SERVER_ERROR).toBe(500);
        });
    });

    // =========================================================================
    // Verify old renamed codes no longer exist
    // =========================================================================
    describe("Renamed constants (old names should not exist)", () => {
        it("should not have SUCCESS code (renamed to OK)", () => {
            expect((STATUS_CODES as any).SUCCESS).toBeUndefined();
        });

        it("should not have SERVER_ERROR code (renamed to INTERNAL_SERVER_ERROR)", () => {
            expect((STATUS_CODES as any).SERVER_ERROR).toBeUndefined();
        });

        it("should not have UNAUTHENTICATED code (renamed to UNAUTHORIZED)", () => {
            expect((STATUS_CODES as any).UNAUTHENTICATED).toBeUndefined();
        });

        it("should not have RATE_LIMIT code (renamed to TOO_MANY_REQUESTS)", () => {
            expect((STATUS_CODES as any).RATE_LIMIT).toBeUndefined();
        });

        it("should not have PARTIAL_SUCCESS code (removed)", () => {
            expect((STATUS_CODES as any).PARTIAL_SUCCESS).toBeUndefined();
        });

        it("should not have BAD_PAYLOAD code (renamed to BAD_REQUEST)", () => {
            expect((STATUS_CODES as any).BAD_PAYLOAD).toBeUndefined();
        });

        it("should not have UNKNOWN code (renamed to INTERNAL_SERVER_ERROR)", () => {
            expect((STATUS_CODES as any).UNKNOWN).toBeUndefined();
        });

        it("should not have TIMEOUT code (renamed to REQUEST_TIMEOUT)", () => {
            expect((STATUS_CODES as any).TIMEOUT).toBeUndefined();
        });
    });

    // =========================================================================
    // Semantic correctness
    // =========================================================================
    describe("Semantic correctness", () => {
        it("UNAUTHORIZED (401) should differ from FORBIDDEN (403)", () => {
            expect(STATUS_CODES.UNAUTHORIZED).not.toBe(STATUS_CODES.FORBIDDEN);
            expect(STATUS_CODES.UNAUTHORIZED).toBeLessThan(STATUS_CODES.FORBIDDEN);
        });

        it("OK (200) should be less than BAD_REQUEST (400)", () => {
            expect(STATUS_CODES.OK).toBeLessThan(STATUS_CODES.BAD_REQUEST);
        });

        it("BAD_REQUEST (400) should be less than INTERNAL_SERVER_ERROR (500)", () => {
            expect(STATUS_CODES.BAD_REQUEST).toBeLessThan(STATUS_CODES.INTERNAL_SERVER_ERROR);
        });

        it("all codes should be positive integers", () => {
            for (const [key, value] of Object.entries(STATUS_CODES)) {
                expect(value, `${key} should be a positive integer`).toBeGreaterThan(0);
                expect(Number.isInteger(value), `${key} should be an integer`).toBe(true);
            }
        });

        it("all codes should be in valid HTTP range (100-599)", () => {
            for (const [key, value] of Object.entries(STATUS_CODES)) {
                expect(value, `${key} should be >= 100`).toBeGreaterThanOrEqual(100);
                expect(value, `${key} should be <= 599`).toBeLessThanOrEqual(599);
            }
        });
    });
});

describe("ENDPOINTS", () => {
    describe("Structure validation", () => {
        it("should have USER endpoints", () => {
            expect(ENDPOINTS.USER.PREFIX).toBe("/users");
            expect(ENDPOINTS.USER.CREATE).toBe("/");
            expect(ENDPOINTS.USER.GET).toBe("/");
            expect(ENDPOINTS.USER.UPDATE_ADDRESS_BOOK).toBe("/address-book");
            expect(ENDPOINTS.USER.SUMSUB_TOKEN).toBe("/sumsub-token");
        });

        it("should have INSTALLATION endpoints", () => {
            expect(ENDPOINTS.INSTALLATION.PREFIX).toBe("/installations");
            expect(ENDPOINTS.INSTALLATION.GET_ALL).toBe("/");
            expect(ENDPOINTS.INSTALLATION.CREATE).toBe("/");
        });

        it("should have TASK endpoints", () => {
            expect(ENDPOINTS.TASK.PREFIX).toBe("/tasks");
            expect(ENDPOINTS.TASK.GET_ALL).toBe("/");
            expect(ENDPOINTS.TASK.CREATE).toBe("/");
        });

        it("should have WALLET endpoints", () => {
            expect(ENDPOINTS.WALLET.PREFIX).toBe("/wallet");
            expect(ENDPOINTS.WALLET.GET_ACCOUNT).toBe("/account");
            expect(ENDPOINTS.WALLET.WITHDRAW).toBe("/withdraw");
        });

        it("should have WEBHOOK endpoints", () => {
            expect(ENDPOINTS.WEBHOOK.PREFIX).toBe("/webhook");
            expect(ENDPOINTS.WEBHOOK.GITHUB).toBe("/github");
            expect(ENDPOINTS.WEBHOOK.SUMSUB).toBe("/sumsub");
        });

        it("should have INTERNAL endpoints", () => {
            expect(ENDPOINTS.INTERNAL.PREFIX).toBe("/internal");
            expect(ENDPOINTS.INTERNAL.BOUNTY_PAYOUT).toBe("/bounty-payout");
        });

        it("should have AGENT endpoints", () => {
            expect(ENDPOINTS.AGENT.PREFIX).toBe("/agent");
            expect(ENDPOINTS.AGENT.REVIEW).toBe("/review");
        });
    });
});