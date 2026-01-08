import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../utilities/data";
import * as z from "zod";
import { ValidationError } from "../models/error.model";
import { dataLogger } from "../config/logger.config";

/**
 * Middleware to prevent caching on dynamic routes
 */
export const dynamicRoute = (req: Request, res: Response, next: NextFunction) => {
    res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
    });
    next();
};

/**
 * Middleware to restrict access to localhost only
 */
export const localhostOnly = (req: Request, res: Response, next: NextFunction) => {
    // req.ip is populated by the 'X-Forwarded-For' header when 'trust proxy' is true
    const clientIp = req.ip;

    const isLocal = 
        clientIp === "127.0.0.1" || 
        clientIp === "::1" || 
        clientIp === "::ffff:127.0.0.1";

    // Allow local access
    if (isLocal) {
        return next();
    }

    dataLogger.warn("Unauthorized local-only access attempt", {
        attemptedIp: clientIp,
        path: req.path,
        // Cloudflare sends the real visitor IP in this header
        cfVisitorIp: req.get("cf-connecting-ip") 
    });

    // Deny access
    res.status(STATUS_CODES.UNAUTHORIZED).json({
        error: "Access denied. Local interface only."
    });
};

/**
 * Middleware to validate the parameters, query, and body of a request
 * 
 * @param params - Validate request parameters (req.params)
 * @param query - Validate query parameters (req.query)
 * @param body - Validate request body (req.body)
 * 
 * @returns Express middleware function that validates the request and calls next() on success or next(error) on validation failure
 * 
 * @throws {ValidationError} When validation fails for any of the provided schemas
 * 
 * @example
 * ```typescript
 * const userParamsSchema = z.object({
 *   id: z.string().uuid()
 * });
 * 
 * const userBodySchema = z.object({
 *   view: z.string(),
 * });
 * 
 * app.get('/users/:id', 
 *   validateRequestParameters({
 *     params: userParamsSchema,
 *     body: userBodySchema
 *   }),
 *   getUserHandler
 * );
 * ```
 */
export const validateRequestParameters = ({
    params,
    query,
    body
}: {
    params?: z.ZodObject,
    query?: z.ZodObject,
    body?: z.ZodObject
}) => {
    return (req: Request, _: Response, next: NextFunction) => {
        try {
            // Validate params if schema provided
            if (params) {
                const paramsResult = params.safeParse(req.params);
                if (!paramsResult.success) {
                    // Throw error if validation failed
                    throw new ValidationError(
                        "Invalid request parameters",
                        paramsResult.error.issues
                    );
                }
                req.params = paramsResult.data as Record<string, string>;
            }

            // Validate query if schema provided
            if (query) {
                const queryResult = query.safeParse(req.query);
                if (!queryResult.success) {
                    // Throw error if validation failed
                    throw new ValidationError(
                        "Invalid query parameters",
                        queryResult.error.issues
                    );
                }
                req.query = queryResult.data as Record<string, string>;
            }

            // Validate body if schema provided
            if (body) {
                const bodyResult = body.safeParse(req.body);
                if (!bodyResult.success) {
                    // Throw error if validation failed
                    throw new ValidationError(
                        "Invalid request body",
                        bodyResult.error.issues
                    );
                }
                req.body = {
                    currentUser: req.body.currentUser,
                    userId: req.body.userId,
                    ...bodyResult.data
                };
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
