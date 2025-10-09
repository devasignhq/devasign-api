import { AIReviewError, ErrorClass, ErrorUtils } from "../models/error.model";
import { LoggingService } from "../services/logging.service";
import { Request, Response, ErrorRequestHandler } from "express";
import { STATUS_CODES, getFieldFromUnknownObject } from "../helper";

export const errorHandler = ((error: unknown, req: Request, res: Response) => {
    // Log the error
    LoggingService.logError("api_error", error, {
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        ip: req.ip
    });

    // Handle AI Review specific errors
    if (error instanceof AIReviewError) {
        // Determine appropriate HTTP status code
        let statusCode = STATUS_CODES.SERVER_ERROR;
        if (error.code === "GROQ_RATE_LIMIT" || error.code === "GITHUB_API_ERROR") statusCode = STATUS_CODES.RATE_LIMIT;
        else if (error.code === "TIMEOUT_ERROR") statusCode = STATUS_CODES.TIMEOUT;

        return res.status(statusCode).json({
            error: ErrorUtils.sanitizeError(error),
            retryable: error.retryable,
            timestamp: error.timestamp.toISOString()
        });
    }

    if (error instanceof ErrorClass) {
        return res.status(error.status).json({ ...error });
    }

    if (getFieldFromUnknownObject<string>(error, "name") === "ValidationError") {
        return res.status(STATUS_CODES.SERVER_ERROR).json({
            error: {
                name: "ValidationError",
                message: getFieldFromUnknownObject<string>(error, "message"),
                details: getFieldFromUnknownObject<string>(error, "errors")
            }
        });
    }

    res.status(STATUS_CODES.UNKNOWN).json({
        error: {
            message: "Internal Server Error",
            details: { ...(typeof error === "object" ? error : { error }) }
        }
    });
}) as ErrorRequestHandler;
