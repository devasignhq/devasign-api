import winston from "winston";
import { LoggingWinston } from "@google-cloud/logging-winston";

const LOG_LEVEL = process.env.LOG_LEVEL || "info";
const NODE_ENV = process.env.NODE_ENV || "development";

// Define log levels and colors
const logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4
};

const logColors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "purple"
};

// Add colors to winston
winston.addColors(logColors);

// Create transports based on environment
const transports = [
    // Console transport - always present
    new winston.transports.Console(),

    // File transports for development
    ...(NODE_ENV === "development" ? [
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        }),
        new winston.transports.File({
            filename: "logs/combined.log"
        })
    ] : []),

    // Google Cloud Logging for production
    ...(NODE_ENV === "production" ? [
        new LoggingWinston({
            logName: "winston_log",
            inspectMetadata: true
        })
    ] : [])
];

// For logging messages
winston.loggers.add("message", {
    level: LOG_LEVEL,
    levels: logLevels,
    format: NODE_ENV === "production"
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        )
        : winston.format.combine(
            winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
            winston.format.colorize({ all: true }),
            winston.format.printf(({ timestamp, level, service, eventType, message }) => {
                let logMessage = `${timestamp} [${level}]`;
                if (service) logMessage += ` [${service}]`;
                if (eventType) logMessage += ` [${eventType}]`;
                logMessage += `: ${message}`;
                return logMessage;
            })
        ),
    transports
});

// For logging objects and data with JSON formatting
winston.loggers.add("data", {
    level: LOG_LEVEL,
    levels: logLevels,
    format: winston.format.combine(
        ...(NODE_ENV !== "production"
            ? [winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" })]
            : [winston.format.timestamp()]),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        ...(NODE_ENV !== "production" ? [winston.format.prettyPrint()] : [])
    ),
    transports
});

export const messageLogger = winston.loggers.get("message");
export const dataLogger = winston.loggers.get("data");
