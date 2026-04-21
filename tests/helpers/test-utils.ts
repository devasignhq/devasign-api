import { vi, Mock, expect } from "vitest";
import { Request, Response } from "express";
import { ENDPOINTS } from "../../api/utils/data.js";

/**
 * Creates a mock Express request object for testing
 */
export function createMockRequest(overrides: Partial<Request> = {}): Partial<Request> {
    return {
        body: {},
        params: {},
        query: {},
        headers: {},
        method: "GET",
        url: "/",
        path: "/",
        ...overrides
    };
}

/**
 * Creates a mock Express response object for testing
 */
export function createMockResponse(): Partial<Response> {
    const res: Partial<Response> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
        end: vi.fn().mockReturnThis(),
        setHeader: vi.fn().mockReturnThis(),
        cookie: vi.fn().mockReturnThis(),
        clearCookie: vi.fn().mockReturnThis()
    };
    return res;
}

/**
 * Creates a mock next function for middleware testing
 */
export function createMockNext(): Mock {
    return vi.fn();
}

/**
 * Waits for a specified amount of time (useful for async testing)
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generates a random string for testing
 */
export function generateRandomString(length: number = 10): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generates a random email for testing
 */
export function generateRandomEmail(): string {
    return `test-${generateRandomString(8)}@example.com`;
}

/**
 * Generates a random UUID for testing
 */
export function generateRandomUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === "x" ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

/**
 * Generates a random CUID for testing
 */
export function generateRandomCUID(): string {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "c";
    for (let i = 0; i < 24; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Creates a deep clone of an object (useful for test data manipulation)
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Asserts that a function throws an error with a specific message
 */
export async function expectToThrow(
    fn: () => Promise<any> | any,
    expectedError?: string | RegExp
): Promise<void> {
    try {
        await fn();
        throw new Error("Expected function to throw an error");
    } catch (error) {
        if (expectedError && error instanceof Error) {
            if (typeof expectedError === "string") {
                expect(error.message).toContain(expectedError);
            } else {
                expect(error.message).toMatch(expectedError);
            }
        }
    }
}

/**
 * Validates that an object has the expected structure
 */
export function validateObjectStructure(obj: any, expectedKeys: string[]): boolean {
    if (!obj || typeof obj !== "object") {
        return false;
    }

    return expectedKeys.every(key => key in obj);
}

/**
 * Creates a promise that resolves after a specified timeout
 */
export function createTimeoutPromise<T>(ms: number, value?: T): Promise<T> {
    return new Promise(resolve => {
        setTimeout(() => resolve(value as T), ms);
    });
}

/**
 * Creates a promise that rejects after a specified timeout
 */
export function createTimeoutRejection(ms: number, error: Error): Promise<never> {
    return new Promise((_, reject) => {
        setTimeout(() => reject(error), ms);
    });
}

/**
 * Utility to suppress console output during tests
 */
export function suppressConsole(): { restore: () => void } {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn,
        info: console.info
    };

    console.log = vi.fn();
    console.error = vi.fn();
    console.warn = vi.fn();
    console.info = vi.fn();

    return {
        restore: () => {
            console.log = originalConsole.log;
            console.error = originalConsole.error;
            console.warn = originalConsole.warn;
            console.info = originalConsole.info;
        }
    };
}

const record = (value: any) => {
    return value as Record<string, any>;
};
const getEndpoint = (path: string[]) => {
    let result: any = ENDPOINTS;
    for (const value of path) {
        result = record(result)[value];
    }
    return result as string;
};

/**
 * Gets the full url of an endpoint
 */
export const getEndpointWithPrefix = (path: string[]): string => {
    const prefix = record(ENDPOINTS)[path[0]].PREFIX;
    const endpoint = getEndpoint(path);

    return prefix + endpoint;
};
