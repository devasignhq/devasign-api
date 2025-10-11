import { STATUS_CODES } from "../helper";

/**
 * Base error class for general api errors
 */
export class ErrorClass {
    public code: string;
    public readonly message: string;
    public readonly details: unknown;
    public readonly status: number;

    constructor(
        code: string, 
        details: unknown, 
        message: string, 
        status: number = STATUS_CODES.SERVER_ERROR
    ) {
        this.code = code;
        this.message = message;
        this.details = details;
        this.status = status;
    }

}

export class NotFoundError extends ErrorClass {
    constructor(message: string) {
        super(
            "NOT_FOUND", 
            null,
            message,
            STATUS_CODES.NOT_FOUND
        );
    }
}

export class AuthorizationError extends ErrorClass {
    constructor(message: string) {
        super(
            "UNAUTHORIZED", 
            null, 
            message, 
            STATUS_CODES.UNAUTHORIZED
        );
    }
}

export class ValidationError extends ErrorClass {
    constructor(message: string) {
        super(
            "VALIDATION_ERROR", 
            null, 
            message, 
            STATUS_CODES.UNAUTHORIZED
        );
    }
}


/**
 * Base error class for all AI review related errors
 */
export abstract class AIReviewError extends ErrorClass {
    public readonly retryable: boolean;

    constructor(
        // message: string,
        // code: string,
        // details?: unknown,
        
        code: string, 
        details: unknown, 
        message: string, 
        retryable: boolean = false,
        status: number = STATUS_CODES.SERVER_ERROR
    ) {
        super(code, details, message, status);
        this.retryable = retryable;

        // Maintains proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Converts error to JSON for logging and API responses
     */
    toJSON() {
        return {
            code: this.code,
            details: this.details,
            message: this.message,
            status: this.status,
            retryable: this.retryable
        };
    }
}

// ============================================================================
// External Service Errors
// ============================================================================

export class StellarServiceError extends ErrorClass {
    constructor(message: string, details: unknown = null) {
        super(
            "STELLAR_SERVICE_ERROR", 
            details, 
            message,
            STATUS_CODES.STELLAR_ERROR
        );
    }
}

/**
 * Groq AI service related errors
 */
export class GroqServiceError extends AIReviewError {
    constructor(message: string, details?: unknown, retryable: boolean = true) {
        super(
            "GROQ_SERVICE_ERROR", 
            details, 
            message, 
            retryable, 
            STATUS_CODES.GROQ_API_ERROR
        );
    }
}

/**
 * Groq rate limiting error
 */
export class GroqRateLimitError extends GroqServiceError {
    public readonly retryAfter?: number;

    constructor(message: string, retryAfter?: number, details?: unknown) {
        super(message, details, true);
        this.code = "GROQ_RATE_LIMIT";
        this.retryAfter = retryAfter;
    }
}

/**
 * Groq model context limit exceeded
 */
export class GroqContextLimitError extends GroqServiceError {
    public readonly tokenCount: number;
    public readonly maxTokens: number;

    constructor(tokenCount: number, maxTokens: number, details?: unknown) {
        super(
            `Context limit exceeded: ${tokenCount} tokens (max: ${maxTokens})`,
            details,
            false
        );
        this.code = "GROQ_CONTEXT_LIMIT";
        this.tokenCount = tokenCount;
        this.maxTokens = maxTokens;
    }
}


/**
 * GitHub API related errors
 */
export class GitHubAPIError extends ErrorClass {
    public readonly statusCode?: number;
    public readonly rateLimitRemaining?: number;

    constructor(
        message: string,
        details: unknown,
        statusCode?: number,
        rateLimitRemaining?: number
    ) {
        super(
            "GITHUB_API_ERROR", 
            details, 
            message, 
            STATUS_CODES.GITHUB_API_ERROR
        );
        this.statusCode = statusCode;
        this.rateLimitRemaining = rateLimitRemaining;
    }
}

/**
 * GitHub webhook validation errors
 */
export class GitHubWebhookError extends AIReviewError {
    constructor(message: string, details?: unknown) {
        super(
            "GITHUB_WEBHOOK_ERROR", 
            details, 
            message, 
            false,
            STATUS_CODES.GITHUB_API_ERROR
        );
    }
}

/**
 * PR analysis processing errors
 */
export class PRAnalysisError extends AIReviewError {
    public readonly prNumber: number;
    public readonly repositoryName: string;

    constructor(
        prNumber: number,
        repositoryName: string,
        message: string,
        details: unknown,
        code?: string,
        retryable: boolean = false
    ) {
        super(code || "PR_ANALYSIS_ERROR", details, message, retryable);
        this.prNumber = prNumber;
        this.repositoryName = repositoryName;
    }
}


/**
 * Operation timeout errors
 */
export class TimeoutError extends AIReviewError {
    public readonly timeoutMs: number;
    public readonly operation: string;

    constructor(operation: string, timeoutMs: number, details?: unknown) {
        super(
            "TIMEOUT_ERROR",
            details,
            `Operation '${operation}' timed out after ${timeoutMs}ms`,
            true,
            STATUS_CODES.TIMEOUT
        );
        this.operation = operation;
        this.timeoutMs = timeoutMs;
    }
}

/**
 * Utility functions for error handling
 */
export class ErrorUtils {
    /**
     * Determines if an error is retryable
     */
    static isRetryable(error: Error): boolean {
        if (error instanceof AIReviewError) {
            return error.retryable;
        }

        // Default retry logic for non-AIReviewError instances
        if (error.message.includes("timeout") ||
            error.message.includes("network") ||
            error.message.includes("connection")) {
            return true;
        }

        return false;
    }

    /**
     * Gets retry delay based on error type and attempt count
     */
    static getRetryDelay(error: Error, attempt: number): number {
        const baseDelay = 1000; // 1 second
        const maxDelay = 30000; // 30 seconds

        if (error instanceof GroqRateLimitError && error.retryAfter) {
            return error.retryAfter * 1000;
        }

        // Exponential backoff with jitter
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        const jitter = Math.random() * 0.1 * delay;

        return delay + jitter;
    }

    /**
     * Sanitizes error for client response (removes sensitive data)
     */
    static sanitizeError(error: ErrorClass) {
        return process.env.NODE_ENV === "development" ?
            { ...error } :
            { message: error.message, code: error.code };
    }
}
