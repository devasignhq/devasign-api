import rateLimit from "express-rate-limit";
import { STATUS_CODES, ENDPOINTS } from "../utilities/data";
import { messageLogger } from "../config/logger.config";

/**
 * General API rate limiter
 * Limits requests to 150 per 15 minutes by default
 */
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 150, // Limit each IP to 150 requests per 15 minutes
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        message: "Too many requests from this IP, please try again after 15 minutes"
    },
    statusCode: STATUS_CODES.RATE_LIMIT,
    skip: (req) => req.originalUrl.startsWith(ENDPOINTS.WEBHOOK.PREFIX),
    handler: (req, res, next, options) => {
        messageLogger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    }
});

/**
 * Webhook rate limiter
 * More permissive for webhook events which might be bursty
 */
export const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 300, // Limit each IP to 300 requests per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many webhook requests from this IP, please try again after 1 minute"
    },
    statusCode: STATUS_CODES.RATE_LIMIT,
    handler: (req, res, next, options) => {
        messageLogger.warn(`Webhook rate limit exceeded for IP: ${req.ip}`);
        res.status(options.statusCode).json(options.message);
    }
});
