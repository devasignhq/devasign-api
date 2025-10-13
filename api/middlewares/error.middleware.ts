import { AIReviewError, ErrorClass, ErrorUtils } from "../models/error.model";
import { Request, Response, ErrorRequestHandler } from "express";
import { STATUS_CODES, getFieldFromUnknownObject } from "../helper";
import { dataLogger } from "../config/logger.config";

export const errorHandler = ((error: unknown, req: Request, res: Response) => {
    // Log the error
    dataLogger.error("api_error", {
        error,
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        ip: req.ip
    });

    // Handle AI Review specific errors
    if (error instanceof AIReviewError) {
        // Determine appropriate HTTP status code
        let statusCode = STATUS_CODES.SERVER_ERROR;
        if (error.code === "GROQ_RATE_LIMIT" || error.code === "GITHUB_RATE_LIMIT") statusCode = STATUS_CODES.RATE_LIMIT;
        else if (error.code === "TIMEOUT_ERROR") statusCode = STATUS_CODES.TIMEOUT;

        return res.status(statusCode).json({
            ...ErrorUtils.sanitizeError(error),
            retryable: error.retryable
        });
    }

    if (error instanceof ErrorClass) {
        return res.status(error.status).json({ ...ErrorUtils.sanitizeError(error) });
    }

    const development = process.env.NODE_ENV === "development";

    if (getFieldFromUnknownObject<string>(error, "name") === "ValidationError") {
        return res.status(STATUS_CODES.SERVER_ERROR).json({
            name: "ValidationError",
            message: getFieldFromUnknownObject<string>(error, "message"),
            details: development ? getFieldFromUnknownObject<string>(error, "errors") : null
        });
    }

    res.status(STATUS_CODES.UNKNOWN).json({
        message: "An unknown error occured",
        details: development ? { ...(typeof error === "object" ? error : { error }) } : null
    });
}) as ErrorRequestHandler;
