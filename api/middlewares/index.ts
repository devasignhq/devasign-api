import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../helper";

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
    // Get origin and referer headers
    const origin = req.get("origin") || req.get("host");
    const referer = req.get("referer");

    // Allow requests with no origin (direct API calls, curl, etc.)
    if (!origin && !referer) {
        return next();
    }

    // Check if origin or referer contains localhost
    const isLocalhost = (url: string) => {
        return url.includes("localhost") || url.includes("127.0.0.1") || url.includes("::1");
    };

    if ((origin && isLocalhost(origin)) || (referer && isLocalhost(referer))) {
        return next();
    }

    // Deny access if not from localhost
    return res.status(STATUS_CODES.UNAUTHORIZED).json({
        error: "Access denied. This endpoint is only available from localhost."
    });
};
