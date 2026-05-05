import { ErrorClass, ErrorUtils } from "../models/error.model.js";
import { Request, Response, ErrorRequestHandler, NextFunction } from "express";
import { STATUS_CODES } from "../utils/data.js";
import { getFieldFromUnknownObject } from "../utils/helper.js";
import { dataLogger } from "../config/logger.config.js";
import { Prisma } from "../../prisma_client/index.js";
import { Env } from "../utils/env.js";

/**
 * Centralized error handling middleware
 */
export const errorHandler = ((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    // Log the error
    dataLogger.error(
        getFieldFromUnknownObject<string>(error, "message") || "An error occured",
        {
            error,
            url: req.url,
            method: req.method,
            userAgent: req.get("User-Agent"),
            ip: req.ip
        }
    );

    const errorName = getFieldFromUnknownObject<string>(error, "name");
    const returnError = Env.nodeEnv() === "development" || Env.nodeEnv() === "test";

    // Handle custom errors
    if (errorName === "ErrorClass") {
        const statusCode = getFieldFromUnknownObject<number>(error, "status") || STATUS_CODES.INTERNAL_SERVER_ERROR;

        return res.status(statusCode).json({
            ...ErrorUtils.sanitizeError(error as ErrorClass)
        });
    }

    // Handle express validation errors
    if (errorName === "ValidationError") {
        return res.status(STATUS_CODES.BAD_REQUEST).json({
            message: getFieldFromUnknownObject<string>(error, "message"),
            details: returnError ? getFieldFromUnknownObject<string>(error, "errors") : null
        });
    }

    // Handle prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
            message: getFieldFromUnknownObject<string>(error, "message"),
            code: getFieldFromUnknownObject<string>(error, "code"),
            details: returnError ? getFieldFromUnknownObject<string>(error, "errors") : null
        });
    }

    // Handle unknown errors
    res.status(STATUS_CODES.INTERNAL_SERVER_ERROR).json({
        message: getFieldFromUnknownObject<string>(error, "message") || "An unknown error occured",
        details: returnError ? error : null
    });
}) as ErrorRequestHandler;
