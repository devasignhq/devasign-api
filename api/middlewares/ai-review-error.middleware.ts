import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import {
    AIReviewError,
    GroqServiceError,
    PineconeServiceError,
    GitHubAPIError,
    PRNotEligibleError,
    TimeoutError,
    ErrorUtils
} from '../models/ai-review.errors';
import { LoggingService } from '../services/logging.service';

/**
 * AI Review Error Middleware
 * Handles AI review specific errors with appropriate responses and logging
 * Requirements: 7.4, 6.4
 */
export const aiReviewErrorHandler = ((
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error with context
    LoggingService.logError('ai_review_error', error, {
        url: req.url,
        method: req.method,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        installationId: req.body?.installationId || req.params?.installationId,
        prNumber: req.body?.prNumber || req.params?.prNumber
    });

    // Handle AI Review specific errors
    if (error instanceof AIReviewError) {
        handleAIReviewError(error, res);
        return;
    }

    // Handle non-AI review errors
    handleGenericError(error, res);
}) as ErrorRequestHandler;

/**
 * Handles AI Review specific errors
 */
function handleAIReviewError(error: AIReviewError, res: Response): void {
    // Sanitize error for client response
    const sanitizedError = ErrorUtils.sanitizeError(error);

    // Handle specific error types
    if (error instanceof PRNotEligibleError) {
        res.status(200).json({
            success: false,
            message: 'PR not eligible for AI review',
            reason: error.reason,
            error: sanitizedError
        });
        return;
    }

    if (error instanceof GroqServiceError) {
        res.status(503).json({
            success: false,
            message: 'AI analysis service temporarily unavailable',
            error: sanitizedError,
            retryable: error.retryable
        });
        return;
    }

    if (error instanceof PineconeServiceError) {
        res.status(503).json({
            success: false,
            message: 'Context retrieval service temporarily unavailable',
            error: sanitizedError,
            retryable: error.retryable
        });
        return;
    }

    if (error instanceof GitHubAPIError) {
        const statusCode = error.statusCode || 503;
        res.status(statusCode).json({
            success: false,
            message: 'GitHub API operation failed',
            error: sanitizedError,
            retryable: error.retryable
        });
        return;
    }

    if (error instanceof TimeoutError) {
        res.status(408).json({
            success: false,
            message: 'Operation timed out',
            error: sanitizedError,
            retryable: error.retryable
        });
        return;
    }

    // Generic AI review error
    const statusCode = error.retryable ? 503 : 400;
    res.status(statusCode).json({
        success: false,
        message: 'AI review operation failed',
        error: sanitizedError,
        retryable: error.retryable
    });
}

/**
 * Handles non-AI review errors
 */
function handleGenericError(error: any, res: Response): void {
    console.error('Non-AI review error in AI review middleware:', error);

    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: {
            name: 'InternalError',
            message: 'An unexpected error occurred',
            timestamp: new Date().toISOString(),
            retryable: false
        }
    });
}