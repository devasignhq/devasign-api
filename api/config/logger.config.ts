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

// Create transports
const transports = [
    new winston.transports.Console({
        format: NODE_ENV === "production" ?
            winston.format.combine(
                winston.format.timestamp(),
                winston.format.errors({ stack: true }),
                winston.format.json()
            ) : undefined
    }),

    // Console transport for development
    ...(NODE_ENV === "development" ? [
        // File transport for errors
        new winston.transports.File({
            filename: "logs/error.log",
            level: "error"
        }),

        // File transport for all logs
        new winston.transports.File({
            filename: "logs/combined.log"
        })
    ] : []),

    // Google Cloud Logging transport for production
    ...(NODE_ENV === "production" ? [
        new LoggingWinston()
    ] : [])
];

// For logging messages
winston.loggers.add("message", {
    level: LOG_LEVEL,
    levels: logLevels,
    format: winston.format.combine(
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
        winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.prettyPrint()
    ),
    transports
});

export const messageLogger = winston.loggers.get("message");
export const dataLogger = winston.loggers.get("data");
