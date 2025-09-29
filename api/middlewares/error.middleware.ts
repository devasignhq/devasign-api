import { ErrorClass } from "../models/general.model";
import { AIReviewError, ErrorUtils } from "../models/ai-review.errors";
import { LoggingService } from "../services/logging.service";
import { Request, Response, ErrorRequestHandler } from "express";
import { getFieldFromUnknownObject } from "../helper";

export const errorHandler = ((error: unknown, req: Request, res: Response) => {
    console.error("Error:", error);

    // Handle AI Review specific errors
    if (error instanceof AIReviewError) {
        // Log the error with structured logging
        LoggingService.logError("api_error", error, {
            url: req.url,
            method: req.method,
            userAgent: req.get("User-Agent"),
            ip: req.ip
        });

        // Determine appropriate HTTP status code
        let statusCode = 500;
        if (error.code === "AUTHENTICATION_ERROR") statusCode = 401;
        else if (error.code === "AUTHORIZATION_ERROR") statusCode = 403;
        else if (error.code === "PR_NOT_ELIGIBLE" || error.code === "REVIEW_RESULT_NOT_FOUND" || error.code === "CUSTOM_RULE_NOT_FOUND") statusCode = 404;
        else if (error.code === "RULE_VALIDATION_ERROR" || error.code === "CONFIGURATION_ERROR") statusCode = 400;
        else if (error.code === "GROQ_RATE_LIMIT" || error.code === "GITHUB_API_ERROR") statusCode = 429;
        else if (error.code === "TIMEOUT_ERROR") statusCode = 408;

        return res.status(statusCode).json({
            error: ErrorUtils.sanitizeError(error),
            retryable: error.retryable,
            timestamp: error.timestamp.toISOString()
        });
    }

    if (error instanceof ErrorClass) {
        return res.status(420).json({
            error: { ...error }
        });
    }

    if (getFieldFromUnknownObject<string>(error, "name") === "ValidationError") {
        return res.status(404).json({
            error: {
                name: "ValidationError",
                message: getFieldFromUnknownObject<string>(error, "message"),
                details: getFieldFromUnknownObject<string>(error, "errors")
            }
        });
    }

    // Log unhandled errors
    LoggingService.logError("unhandled_error", error, {
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        ip: req.ip
    });

    res.status(getFieldFromUnknownObject<number>(error, "status") || 500).json({
        error: {
            message: "Internal Server Error",
            details: error || null
        }
    });
}) as ErrorRequestHandler;
