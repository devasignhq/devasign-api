import { Request, Response, NextFunction } from 'express';
import { LoggingService, PerformanceTimer } from '../services/logging.service';

/**
 * Monitoring Middleware for AI Review System
 * Tracks API performance, errors, and usage metrics
 * Requirements: 7.4, 6.4
 */

// Extend Request interface to include monitoring data
declare global {
    namespace Express {
        interface Request {
            startTime?: number;
            requestId?: string;
            performanceTimer?: PerformanceTimer;
        }
    }
}

/**
 * Request monitoring middleware
 * Tracks request performance and logs API usage
 */
export const requestMonitoring = (req: Request, res: Response, next: NextFunction): void => {
    // Generate unique request ID
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    req.startTime = Date.now();

    // Create performance timer for the request
    req.performanceTimer = LoggingService.createTimer(`${req.method} ${req.path}`);

    // Log request start
    LoggingService.logInfo('api_request_started', `${req.method} ${req.path}`, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
        body: sanitizeRequestBody(req.body)
    });

    // Override res.json to capture response
    const originalJson = res.json;
    res.json = function (body: any) {
        // Log response
        const duration = req.performanceTimer?.getCurrentDuration() || 0;
        const statusCode = res.statusCode;

        LoggingService.logInfo('api_request_completed', `${req.method} ${req.path} - ${statusCode}`, {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            responseSize: JSON.stringify(body).length,
            success: statusCode < 400
        });

        // End performance timer
        req.performanceTimer?.end({
            requestId: req.requestId,
            statusCode,
            success: statusCode < 400
        });

        return originalJson.call(this, body);
    };

    // Handle response end for non-JSON responses
    res.on('finish', () => {
        if (!req.performanceTimer) return;

        const duration = req.performanceTimer.getCurrentDuration();
        const statusCode = res.statusCode;

        // Only log if we haven't already logged via res.json
        if (!res.headersSent || res.get('Content-Type')?.includes('application/json')) {
            return;
        }

        LoggingService.logInfo('api_request_completed', `${req.method} ${req.path} - ${statusCode}`, {
            requestId: req.requestId,
            method: req.method,
            path: req.path,
            statusCode,
            duration,
            success: statusCode < 400
        });

        req.performanceTimer.end({
            requestId: req.requestId,
            statusCode,
            success: statusCode < 400
        });
    });

    next();
};

/**
 * AI Review specific monitoring middleware
 * Tracks AI review operations and metrics
 */
export const aiReviewMonitoring = (req: Request, res: Response, next: NextFunction): void => {
    // Extract AI review context from request
    const installationId = req.body?.installationId || req.params?.installationId;
    const prNumber = req.body?.prNumber || req.params?.prNumber;
    const repositoryName = req.body?.repositoryName || req.params?.repositoryName;

    if (installationId && prNumber && repositoryName) {
        // Log AI review operation start
        LoggingService.logAIReviewEvent('started', installationId, prNumber, repositoryName, {
            requestId: req.requestId,
            endpoint: req.path,
            method: req.method
        });

        // Override response to log completion
        const originalJson = res.json;
        res.json = function (body: any) {
            const success = res.statusCode < 400;
            const eventType = success ? 'completed' : 'failed';

            LoggingService.logAIReviewEvent(eventType, installationId, prNumber, repositoryName, {
                requestId: req.requestId,
                statusCode: res.statusCode,
                duration: req.performanceTimer?.getCurrentDuration(),
                success,
                error: success ? undefined : body?.error
            });

            return originalJson.call(this, body);
        };
    }

    next();
};

/**
 * Error monitoring middleware
 * Captures and logs unhandled errors
 */
export const errorMonitoring = (error: any, req: Request, res: Response, next: NextFunction): void => {
    // Log the error with request context
    LoggingService.logError('unhandled_api_error', error, {
        requestId: req.requestId,
        method: req.method,
        path: req.path,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
        query: req.query,
        body: sanitizeRequestBody(req.body),
        statusCode: res.statusCode
    });

    // End performance timer if it exists
    if (req.performanceTimer) {
        req.performanceTimer.end({
            requestId: req.requestId,
            error: true,
            statusCode: res.statusCode
        });
    }

    next(error);
};

/**
 * Rate limiting monitoring middleware
 * Tracks rate limiting events
 */
export const rateLimitMonitoring = (req: Request, res: Response, next: NextFunction): void => {
    // Check for rate limiting headers
    res.on('finish', () => {
        const rateLimitRemaining = res.get('X-RateLimit-Remaining');
        const rateLimitReset = res.get('X-RateLimit-Reset');

        if (rateLimitRemaining !== undefined) {
            const remaining = parseInt(rateLimitRemaining, 10);

            // Log when rate limit is getting low
            if (remaining < 10) {
                LoggingService.logWarning('rate_limit_low', `Rate limit low: ${remaining} requests remaining`, {
                    requestId: req.requestId,
                    path: req.path,
                    remaining,
                    resetTime: rateLimitReset,
                    ip: req.ip
                });
            }

            // Log rate limit exceeded
            if (res.statusCode === 429) {
                LoggingService.logWarning('rate_limit_exceeded', 'Rate limit exceeded', {
                    requestId: req.requestId,
                    path: req.path,
                    resetTime: rateLimitReset,
                    ip: req.ip
                });
            }
        }
    });

    next();
};

/**
 * Circuit breaker monitoring middleware
 * Tracks circuit breaker state changes
 */
export const circuitBreakerMonitoring = (req: Request, res: Response, next: NextFunction): void => {
    // This would integrate with the CircuitBreakerService to log state changes
    // For now, we'll just add the middleware structure

    next();
};

/**
 * Sanitizes request body for logging (removes sensitive data)
 */
function sanitizeRequestBody(body: any): any {
    if (!body || typeof body !== 'object') {
        return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    return sanitized;
}

/**
 * Metrics collection middleware
 * Collects and aggregates metrics for monitoring dashboards
 */
export const metricsCollection = (req: Request, res: Response, next: NextFunction): void => {
    // This would collect metrics for monitoring dashboards
    // Metrics could include:
    // - Request count by endpoint
    // - Response time percentiles
    // - Error rates
    // - AI review success rates
    // - External service call metrics

    // For now, we'll just track basic metrics
    res.on('finish', () => {
        const metrics = {
            endpoint: req.path,
            method: req.method,
            statusCode: res.statusCode,
            duration: req.performanceTimer?.getCurrentDuration() || 0,
            timestamp: new Date().toISOString()
        };

        // In a real implementation, this would send to a metrics aggregation service
        LoggingService.logInfo('api_metrics', 'Request metrics collected', {
            requestId: req.requestId,
            metrics
        });
    });

    next();
};