import {
    AIReviewError,
    GroqRateLimitError,
    GitHubAPIError,
    TimeoutError
} from "../models/ai-review.errors";
import { LoggingService } from "./logging.service";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { getFieldFromUnknownObject } from "../helper";

/**
 * Retry Service for AI Review System
 * Provides intelligent retry logic with exponential backoff and circuit breaker integration
 */
export class RetryService {
    private static readonly DEFAULT_MAX_RETRIES = 3;
    private static readonly DEFAULT_BASE_DELAY = 1000; // 1 second
    private static readonly DEFAULT_MAX_DELAY = 30000; // 30 seconds
    private static readonly DEFAULT_TIMEOUT = 60000; // 60 seconds

    /**
     * Executes operation with retry logic and circuit breaker protection
     */
    static async executeWithRetry<T>(
        operationName: string,
        operation: () => Promise<T>,
        options: RetryOptions = {}
    ): Promise<T> {
        const {
            maxRetries = RetryService.DEFAULT_MAX_RETRIES,
            baseDelay = RetryService.DEFAULT_BASE_DELAY,
            maxDelay = RetryService.DEFAULT_MAX_DELAY,
            timeout = RetryService.DEFAULT_TIMEOUT,
            useCircuitBreaker = true,
            fallback,
            retryCondition = RetryService.defaultRetryCondition
        } = options;

        const timer = LoggingService.createTimer(`retry_${operationName}`);
        let lastError: Error | undefined;

        try {
            // Use circuit breaker if enabled
            if (useCircuitBreaker) {
                const result = await CircuitBreakerService.execute(
                    operationName,
                    () => RetryService.executeWithTimeoutAndRetry(
                        operationName,
                        operation,
                        maxRetries,
                        baseDelay,
                        maxDelay,
                        timeout,
                        retryCondition
                    ),
                    fallback
                );

                timer.end({
                    operationName,
                    success: true
                });

                return result as T;
            }

            // Execute without circuit breaker
            const result = await RetryService.executeWithTimeoutAndRetry(
                operationName,
                operation,
                maxRetries,
                baseDelay,
                maxDelay,
                timeout,
                retryCondition
            );

            timer.end({
                operationName,
                success: true
            });

            return result;
        } catch (error) {
            lastError = error as Error;

            // Log final failure
            LoggingService.logError("retry_exhausted", lastError, {
                operationName,
                maxRetries,
                totalDuration: timer.getCurrentDuration()
            });

            // Use fallback if available
            if (fallback) {
                LoggingService.logWarning("using_fallback", `Using fallback for ${operationName}`, {
                    originalError: lastError.message
                });
                const fallbackResult = await fallback();

                timer.end({
                    operationName,
                    success: true,
                    usedFallback: true
                });

                return fallbackResult as T;
            }

            timer.end({
                operationName,
                success: false,
                error: lastError.message
            });

            throw lastError;
        }
    }

    /**
     * Executes operation with timeout and retry logic
     */
    private static async executeWithTimeoutAndRetry<T>(
        operationName: string,
        operation: () => Promise<T>,
        maxRetries: number,
        baseDelay: number,
        maxDelay: number,
        timeout: number,
         
        retryCondition: (error: Error, attempt: number) => boolean
    ): Promise<T> {
        let lastError: unknown;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Execute with timeout
                const result = await RetryService.withTimeout(operation, operationName, timeout);

                // Log success if this was a retry
                if (attempt > 0) {
                    LoggingService.logInfo("retry_success", `${operationName} succeeded on attempt ${attempt + 1}`, {
                        operationName,
                        attempt: attempt + 1,
                        totalAttempts: maxRetries
                    });
                }

                return result;
            } catch (error) {
                lastError = error;

                // Log the attempt
                LoggingService.logWarning("retry_attempt_failed", `Attempt ${attempt + 1}/${maxRetries} failed for ${operationName}`, {
                    operationName,
                    attempt: attempt + 1,
                    totalAttempts: maxRetries,
                    error: getFieldFromUnknownObject<number>(error, "message"),
                    errorCode: getFieldFromUnknownObject<number>(error, "code"),
                    retryable: retryCondition(error as Error, attempt)
                });

                // Check if we should retry
                if (!retryCondition(error as Error, attempt)) {
                    LoggingService.logError("retry_aborted", lastError, {
                        operationName,
                        attempt: attempt + 1,
                        reason: "Non-retryable error"
                    });
                    throw error;
                }

                // Don't wait after the last attempt
                if (attempt < maxRetries - 1) {
                    const delay = RetryService.calculateDelay(error as Error, attempt, baseDelay, maxDelay);
                    LoggingService.logInfo("retry_delay", `Waiting ${delay}ms before retry ${attempt + 2}/${maxRetries} for ${operationName}`, {
                        operationName,
                        delay,
                        nextAttempt: attempt + 2
                    });
                    await RetryService.sleep(delay);
                }
            }
        }

        // All retries exhausted
        throw lastError!;
    }

    /**
     * Wraps operation with timeout
     */
    private static async withTimeout<T>(
        operation: () => Promise<T>,
        operationName: string,
        timeoutMs: number
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new TimeoutError(operationName, timeoutMs));
                }, timeoutMs);
            })
        ]);
    }

    /**
     * Default retry condition
     */
    private static defaultRetryCondition(error: Error, attempt: number): boolean {
        // Don't retry if we've exceeded max attempts
        if (attempt >= RetryService.DEFAULT_MAX_RETRIES) {
            return false;
        }

        // Use error-specific retry logic
        if (error instanceof AIReviewError) {
            return error.retryable;
        }

        // Retry on network/timeout errors
        if (error instanceof TimeoutError ||
            error.message.includes("timeout") ||
            error.message.includes("network") ||
            error.message.includes("connection") ||
            error.message.includes("ECONNRESET") ||
            error.message.includes("ENOTFOUND")) {
            return true;
        }

        // Don't retry by default
        return false;
    }

    /**
     * Calculates retry delay with exponential backoff and jitter
     */
    private static calculateDelay(
        error: Error,
        attempt: number,
        baseDelay: number,
        maxDelay: number
    ): number {
        // Handle specific error types
        if (error instanceof GroqRateLimitError && error.retryAfter) {
            return Math.min(error.retryAfter * 1000, maxDelay);
        }

        if (error instanceof GitHubAPIError && error.statusCode === 429) {
            // GitHub rate limiting - use longer delay
            return Math.min(baseDelay * Math.pow(2, attempt + 2), maxDelay);
        }

        // Exponential backoff with jitter
        const exponentialDelay = baseDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * exponentialDelay;

        return Math.min(exponentialDelay + jitter, maxDelay);
    }

    /**
     * Sleep utility
     */
    private static sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Creates a retry configuration for Groq AI operations
     */
    static groqRetryConfig(): RetryOptions {
        return {
            maxRetries: 5,
            baseDelay: 2000,
            maxDelay: 60000,
            timeout: 120000,
            useCircuitBreaker: true,
            retryCondition: (error: Error, attempt: number) => {
                if (attempt >= 5) return false;

                if (error instanceof GroqRateLimitError) return true;
                if (error instanceof TimeoutError) return true;

                return RetryService.defaultRetryCondition(error, attempt);
            }
        };
    }

    /**
     * Creates a retry configuration for GitHub API operations
     */
    static githubRetryConfig(): RetryOptions {
        return {
            maxRetries: 4,
            baseDelay: 1000,
            maxDelay: 30000,
            timeout: 45000,
            useCircuitBreaker: true,
            retryCondition: (error: Error, attempt: number) => {
                if (attempt >= 4) return false;

                if (error instanceof GitHubAPIError) {
                    // Retry on rate limiting and server errors
                    return error.statusCode === 429 || (error.statusCode !== undefined && error.statusCode >= 500);
                }

                return RetryService.defaultRetryCondition(error, attempt);
            }
        };
    }

    /**
     * Creates a retry configuration for database operations
     */
    static databaseRetryConfig(): RetryOptions {
        return {
            maxRetries: 2,
            baseDelay: 500,
            maxDelay: 5000,
            timeout: 10000,
            useCircuitBreaker: false, // Don't use circuit breaker for database
            retryCondition: (error: Error, attempt: number) => {
                if (attempt >= 2) return false;

                // Retry on connection errors
                return error.message.includes("connection") ||
                    error.message.includes("timeout") ||
                    error.message.includes("ECONNRESET");
            }
        };
    }
}

/**
 * Retry configuration options
 */
export interface RetryOptions {
    /** Maximum number of retry attempts */
    maxRetries?: number;
    /** Base delay between retries in milliseconds */
    baseDelay?: number;
    /** Maximum delay between retries in milliseconds */
    maxDelay?: number;
    /** Timeout for each operation attempt in milliseconds */
    timeout?: number;
    /** Whether to use circuit breaker protection */
    useCircuitBreaker?: boolean;
    /** Fallback function to execute if all retries fail */
    fallback?: () => Promise<unknown>;
    /** Custom retry condition function */
    retryCondition?: (error: Error, attempt: number) => boolean;
}
