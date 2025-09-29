// ============================================================================
// Base Error Classes for AI Review System
// Requirement 7.3: System shall handle rate limiting and service failures gracefully
// ============================================================================

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
 * GitHub installation not found or invalid
 */
export class GitHubInstallationError extends GitHubAPIError {
    public readonly installationId: string;

    constructor(installationId: string, message: string, details?: unknown) {
        super(message, 404, undefined, details);
        this.code = "GITHUB_INSTALLATION_ERROR";
        this.installationId = installationId;
    }
}

// ============================================================================
// Processing and Validation Errors
// ============================================================================

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
 * Rule evaluation errors
 */
export class RuleEvaluationError extends AIReviewError {
    public readonly ruleId: string;
    public readonly ruleName: string;

    constructor(ruleId: string, ruleName: string, message: string, details?: unknown) {
        super(message, "RULE_EVALUATION_ERROR", details, true);
        this.ruleId = ruleId;
        this.ruleName = ruleName;
    }
}

/**
 * Custom rule validation errors
 */
export class RuleValidationError extends AIReviewError {
    public readonly validationErrors: string[];

    constructor(validationErrors: string[], details?: unknown) {
        super(
            `Rule validation failed: ${validationErrors.join(", ")}`,
            "RULE_VALIDATION_ERROR",
            details,
            false
        );
        this.validationErrors = validationErrors;
    }
}

/**
 * Context retrieval errors
 */
export class ContextRetrievalError extends AIReviewError {
    public readonly contextType: string;

    constructor(contextType: string, message: string, details?: unknown) {
        super(message, "CONTEXT_RETRIEVAL_ERROR", details, true);
        this.contextType = contextType;
    }
}

/**
 * Embedding generation errors
 */
export class EmbeddingGenerationError extends AIReviewError {
    public readonly contentLength: number;

    constructor(contentLength: number, message: string, details?: unknown) {
        super(message, "EMBEDDING_GENERATION_ERROR", details, true);
        this.contentLength = contentLength;
    }
}

// ============================================================================
// Database and Storage Errors
// ============================================================================

/**
 * Database operation errors
 */
export class DatabaseError extends AIReviewError {
    public readonly operation: string;
    public readonly table?: string;

    constructor(operation: string, message: string, table?: string, details?: unknown) {
        super(message, "DATABASE_ERROR", details, true);
        this.operation = operation;
        this.table = table;
    }
}

/**
 * Review result not found
 */
export class ReviewResultNotFoundError extends AIReviewError {
    public readonly installationId: string;
    public readonly prNumber: number;
    public readonly repositoryName: string;

    constructor(installationId: string, prNumber: number, repositoryName: string) {
        super(
            `Review result not found for PR #${prNumber} in ${repositoryName}`,
            "REVIEW_RESULT_NOT_FOUND",
            { installationId, prNumber, repositoryName },
            false
        );
        this.installationId = installationId;
        this.prNumber = prNumber;
        this.repositoryName = repositoryName;
    }
}

/**
 * Custom rule not found
 */
export class CustomRuleNotFoundError extends AIReviewError {
    public readonly ruleId: string;

    constructor(ruleId: string) {
        super(
            `Custom rule not found: ${ruleId}`,
            "CUSTOM_RULE_NOT_FOUND",
            { ruleId },
            false
        );
        this.ruleId = ruleId;
    }
}

// ============================================================================
// Configuration and Setup Errors
// ============================================================================

/**
 * Configuration errors
 */
export class ConfigurationError extends AIReviewError {
    public readonly configKey: string;

    constructor(configKey: string, message: string, details?: unknown) {
        super(message, "CONFIGURATION_ERROR", details, false);
        this.configKey = configKey;
    }
}

/**
 * Missing required environment variables
 */
export class MissingEnvironmentError extends ConfigurationError {
    public readonly requiredVars: string[];

    constructor(requiredVars: string[]) {
        super(
            "environment",
            `Missing required environment variables: ${requiredVars.join(", ")}`,
            { requiredVars }
        );
        this.code = "MISSING_ENVIRONMENT";
        this.requiredVars = requiredVars;
    }
}

/**
 * Service initialization errors
 */
export class ServiceInitializationError extends AIReviewError {
    public readonly serviceName: string;

    constructor(serviceName: string, message: string, details?: unknown) {
        super(message, "SERVICE_INITIALIZATION_ERROR", details, false);
        this.serviceName = serviceName;
    }
}

// ============================================================================
// Authentication and Authorization Errors
// ============================================================================

/**
 * Authentication errors
 */
export class AuthenticationError extends AIReviewError {
    constructor(message: string, details?: unknown) {
        super(message, "AUTHENTICATION_ERROR", details, false);
    }
}

/**
 * Authorization errors
 */
export class AuthorizationError extends AIReviewError {
    public readonly requiredPermission: string;
    public readonly userId?: string;

    constructor(requiredPermission: string, userId?: string, details?: unknown) {
        super(
            `Insufficient permissions: ${requiredPermission} required`,
            "AUTHORIZATION_ERROR",
            details,
            false
        );
        this.requiredPermission = requiredPermission;
        this.userId = userId;
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

/**
 * Resource limit exceeded errors
 */
export class ResourceLimitError extends AIReviewError {
    public readonly resource: string;
    public readonly limit: number;
    public readonly current: number;

    constructor(resource: string, current: number, limit: number, details?: unknown) {
        super(
            `Resource limit exceeded for ${resource}: ${current}/${limit}`,
            "RESOURCE_LIMIT_ERROR",
            details,
            false
        );
        this.resource = resource;
        this.limit = limit;
        this.current = current;
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
