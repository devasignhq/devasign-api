import { STATUS_CODES } from "../helper";

/**
 * Base error class for general api errors
 */
export class ErrorClass {
    public readonly name: string;
    public readonly message: string;
    public readonly details: unknown;
    public readonly status: number;

    constructor(
        name: string, 
        details: unknown, 
        message: string, 
        status: number
    ) {
        this.name = name;
        this.message = message;
        this.details = details;
        this.status = status;
    }

}

export class NotFoundErrorClass extends ErrorClass {
    constructor(message: string) {
        super(
            "NotFoundError", 
            null,
            message,
            STATUS_CODES.NOT_FOUND
        );
    }
}

export class AuthorizationError extends ErrorClass {
    constructor(message: string) {
        super(
            "UnauthorizedError", 
            null, 
            message, 
            STATUS_CODES.UNAUTHORIZED
        );
    }
}


/**
 * Base error class for all AI review related errors
 */
export abstract class AIReviewError extends Error {
    public code: string;
    public readonly details?: unknown;
    public readonly timestamp: Date;
    public readonly retryable: boolean;

    constructor(
        message: string,
        code: string,
        details?: unknown,
        retryable: boolean = false
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details;
        this.timestamp = new Date();
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
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            timestamp: this.timestamp.toISOString(),
            retryable: this.retryable,
            stack: this.stack
        };
    }
}

// ============================================================================
// External Service Errors
// ============================================================================

/**
 * Groq AI service related errors
 */
export class GroqServiceError extends AIReviewError {
    constructor(message: string, details?: unknown, retryable: boolean = true) {
        super(message, "GROQ_SERVICE_ERROR", details, retryable);
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
export class GitHubAPIError extends AIReviewError {
    public readonly statusCode?: number;
    public readonly rateLimitRemaining?: number;

    constructor(
        message: string,
        statusCode?: number,
        rateLimitRemaining?: number,
        details?: unknown
    ) {
        const retryable = statusCode ? statusCode >= 500 || statusCode === 429 : true;
        super(message, "GITHUB_API_ERROR", details, retryable);
        this.statusCode = statusCode;
        this.rateLimitRemaining = rateLimitRemaining;
    }
}

/**
 * GitHub webhook validation errors
 */
export class GitHubWebhookError extends AIReviewError {
    constructor(message: string, details?: unknown) {
        super(message, "GITHUB_WEBHOOK_ERROR", details, false);
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
        details?: unknown,
        retryable: boolean = true
    ) {
        super(message, "PR_ANALYSIS_ERROR", details, retryable);
        this.prNumber = prNumber;
        this.repositoryName = repositoryName;
    }
}

/**
 * PR does not meet analysis criteria
 */
export class PRNotEligibleError extends PRAnalysisError {
    public readonly reason: string;

    constructor(
        prNumber: number,
        repositoryName: string,
        reason: string,
        details?: unknown
    ) {
        super(
            prNumber,
            repositoryName,
            `PR #${prNumber} is not eligible for analysis: ${reason}`,
            details,
            false
        );
        this.code = "PR_NOT_ELIGIBLE";
        this.reason = reason;
    }
}

/**
 * Database operation errors
 */
export class PrismaError extends AIReviewError {
    public readonly operation: string;

    constructor(operation: string, message: string, details?: unknown) {
        super(message, "DATABASE_ERROR", details, true);
        this.operation = operation;
    }
}

// ============================================================================
// Timeout and Resource Errors
// ============================================================================

/**
 * Operation timeout errors
 */
export class TimeoutError extends AIReviewError {
    public readonly timeoutMs: number;
    public readonly operation: string;

    constructor(operation: string, timeoutMs: number, details?: unknown) {
        super(
            `Operation '${operation}' timed out after ${timeoutMs}ms`,
            "TIMEOUT_ERROR",
            details,
            true
        );
        this.operation = operation;
        this.timeoutMs = timeoutMs;
    }
}

// ============================================================================
// Generic Error Classes
// ============================================================================

/**
 * Generic wrapped error for non-AIReviewError instances
 */
export class WrappedError extends AIReviewError {
    public readonly originalError: string;

    constructor(context: string, originalError: Error, details?: unknown, retryable: boolean = false) {
        super(`${context}: ${originalError.message}`, "WRAPPED_ERROR", details, retryable);
        this.originalError = originalError.message;
    }
}

// ============================================================================
// Error Utilities
// ============================================================================

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
     * Wraps an error with additional context
     */
    static wrapError(originalError: Error, context: string, details?: unknown): AIReviewError {
        if (originalError instanceof AIReviewError) {
            return originalError;
        }

        return new WrappedError(
            context,
            originalError,
            details,
            ErrorUtils.isRetryable(originalError)
        );
    }

    /**
     * Sanitizes error for client response (removes sensitive data)
     */
    static sanitizeError(error: AIReviewError): Partial<AIReviewError> {
        return {
            name: error.name,
            message: error.message,
            code: error.code,
            timestamp: error.timestamp,
            retryable: error.retryable
            // Exclude details and stack trace for security
        };
    }
}
