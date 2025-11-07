import { ErrorClass, ErrorUtils } from "../models/error.model";
import { Request, Response, ErrorRequestHandler, NextFunction } from "express";
import { STATUS_CODES } from "../utilities/data";
import { getFieldFromUnknownObject } from "../utilities/helper";
import { dataLogger } from "../config/logger.config";

/**
 * Centralized error handling middleware
 */
export const errorHandler = ((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Log the error
    dataLogger.error("api_error", {
        error,
        url: req.url,
        method: req.method,
        userAgent: req.get("User-Agent"),
        ip: req.ip
    });

    const errorName = getFieldFromUnknownObject<string>(error, "name");
    const returnError = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";

    // Handle custom errors
    if (errorName === "ErrorClass") {
        const statusCode = getFieldFromUnknownObject<number>(error, "status") || STATUS_CODES.SERVER_ERROR;

        return res.status(statusCode).json({ 
            ...ErrorUtils.sanitizeError(error as ErrorClass)
        });
    }

    // Handle express validation errors
    if (errorName === "ValidationError") {
        return res.status(STATUS_CODES.SERVER_ERROR).json({
            message: getFieldFromUnknownObject<string>(error, "message"),
            details: returnError ? getFieldFromUnknownObject<string>(error, "errors") : null
        });
    }

    // Handle unknown errors
    res.status(STATUS_CODES.UNKNOWN).json({
        message: getFieldFromUnknownObject<string>(error, "message") || "An unknown error occured",
        details: returnError ? error : null
    });
}) as ErrorRequestHandler;
