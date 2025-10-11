import { getFieldFromUnknownObject } from "../helper";

/**
 * Structured Logging Service for AI Review System
 * Provides centralized logging with structured format and monitoring integration
 */
export class LoggingService {
    private static readonly SERVICE_NAME = "ai-review";
    private static readonly LOG_LEVELS = {
        ERROR: "error",
        WARN: "warn",
        INFO: "info",
        DEBUG: "debug"
    } as const;

    /**
     * Logs error events with structured format
     */
    static logError(
        eventType: string,
        error: Error | unknown,
        context?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            LoggingService.LOG_LEVELS.ERROR,
            eventType,
            getFieldFromUnknownObject<string>(error, "message") || String(error),
            {
                ...context,
                error: {
                    message: getFieldFromUnknownObject<string>(error, "message") || String(error),
                    code: getFieldFromUnknownObject<string>(error, "code"),
                    stack: getFieldFromUnknownObject<string>(error, "stack"),
                    retryable: getFieldFromUnknownObject<string>(error, "retryable")
                }
            }
        );

        console.error(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Logs warning events
     */
    static logWarning(
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            LoggingService.LOG_LEVELS.WARN,
            eventType,
            message,
            context
        );

        console.warn(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Logs info events
     */
    static logInfo(
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            LoggingService.LOG_LEVELS.INFO,
            eventType,
            message,
            context
        );

        console.log(JSON.stringify(logEntry));
    }

    /**
     * Logs debug events (only in development)
     */
    static logDebug(
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        if (process.env.NODE_ENV !== "development") {
            return;
        }

        const logEntry = LoggingService.createLogEntry(
            LoggingService.LOG_LEVELS.DEBUG,
            eventType,
            message,
            context
        );

        console.debug(JSON.stringify(logEntry));
    }

    /**
     * Logs performance metrics
     */
    static logPerformance(
        operation: string,
        durationMs: number,
        context?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            LoggingService.LOG_LEVELS.INFO,
            "performance_metric",
            `${operation} completed in ${durationMs}ms`,
            {
                ...context,
                performance: {
                    operation,
                    durationMs,
                    timestamp: new Date().toISOString()
                }
            }
        );

        console.log(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Logs service health status
     */
    static logHealthStatus(
        serviceName: string,
        status: "healthy" | "degraded" | "unhealthy",
        details?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            status === "healthy" ? LoggingService.LOG_LEVELS.INFO : LoggingService.LOG_LEVELS.WARN,
            "health_check",
            `Service ${serviceName} is ${status}`,
            {
                health: {
                    serviceName,
                    status,
                    details,
                    timestamp: new Date().toISOString()
                }
            }
        );

        console.log(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Logs AI review workflow events
     */
    static logAIReviewEvent(
        eventType: "started" | "completed" | "failed" | "skipped",
        installationId: string,
        prNumber: number,
        repositoryName: string,
        details?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            eventType === "failed" ? LoggingService.LOG_LEVELS.ERROR : LoggingService.LOG_LEVELS.INFO,
            `ai_review_${eventType}`,
            `AI review ${eventType} for PR #${prNumber} in ${repositoryName}`,
            {
                ...details,
                aiReview: {
                    eventType,
                    installationId,
                    prNumber,
                    repositoryName,
                    timestamp: new Date().toISOString()
                }
            }
        );

        console.log(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Logs external service interactions
     */
    static logExternalServiceCall(
        serviceName: "groq" | "github",
        operation: string,
        status: "success" | "failure" | "timeout",
        durationMs: number,
        details?: Record<string, unknown>
    ): void {
        const logEntry = LoggingService.createLogEntry(
            status === "success" ? LoggingService.LOG_LEVELS.INFO : LoggingService.LOG_LEVELS.WARN,
            "external_service_call",
            `${serviceName} ${operation} ${status} (${durationMs}ms)`,
            {
                ...details,
                externalService: {
                    serviceName,
                    operation,
                    status,
                    durationMs,
                    timestamp: new Date().toISOString()
                }
            }
        );

        console.log(JSON.stringify(logEntry));
        LoggingService.sendToMonitoring(logEntry);
    }

    /**
     * Creates structured log entry
     */
    private static createLogEntry(
        level: string,
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            service: LoggingService.SERVICE_NAME,
            eventType,
            message,
            environment: process.env.NODE_ENV || "development",
            version: process.env.npm_package_version || "1.0.0",
            requestId: LoggingService.generateRequestId(),
            ...context
        };
    }

    /**
     * Sends log entry to monitoring services
     */
    private static async sendToMonitoring(logEntry: LogEntry): Promise<void> {
        try {
            // In production, this would integrate with monitoring services like:
            // - DataDog: await datadogClient.log(logEntry)
            // - New Relic: await newRelicClient.recordCustomEvent('AIReviewLog', logEntry)
            // - Sentry: Sentry.addBreadcrumb(logEntry)
            // - CloudWatch: await cloudWatchClient.putLogEvents(logEntry)

            // For now, we'll implement a simple webhook-based monitoring
            if (process.env.MONITORING_WEBHOOK_URL) {
                await LoggingService.sendToWebhook(logEntry);
            }

            // Store critical errors in database for analysis
            if (logEntry.level === "error") {
                await LoggingService.storeErrorInDatabase(logEntry);
            }
        } catch (error) {
            // Don't let monitoring failures break the main flow
            console.error("Failed to send log to monitoring:", error);
        }
    }

    /**
     * Sends log to monitoring webhook
     */
    private static async sendToWebhook(logEntry: LogEntry): Promise<void> {
        try {
            const response = await fetch(process.env.MONITORING_WEBHOOK_URL!, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.MONITORING_WEBHOOK_TOKEN || ""}`
                },
                body: JSON.stringify(logEntry)
            });

            if (!response.ok) {
                throw new Error(`Webhook responded with status: ${response.status}`);
            }
        } catch (error) {
            console.error("Failed to send log to webhook:", error);
        }
    }

    /**
     * Stores error logs in database for analysis
     */
    private static async storeErrorInDatabase(logEntry: LogEntry): Promise<void> {
        try {
            // This would integrate with the existing Prisma client
            // await prisma.errorLog.create({
            //   data: {
            //     timestamp: new Date(logEntry.timestamp),
            //     level: logEntry.level,
            //     eventType: logEntry.eventType,
            //     message: logEntry.message,
            //     context: logEntry,
            //     environment: logEntry.environment
            //   }
            // });

            // For now, just log that we would store it
            console.debug("Would store error in database:", {
                eventType: logEntry.eventType,
                message: logEntry.message
            });
        } catch (error) {
            console.error("Failed to store error in database:", error);
        }
    }

    /**
     * Generates unique request ID for tracing
     */
    private static generateRequestId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Creates a performance timer
     */
    static createTimer(operation: string): PerformanceTimer {
        return new PerformanceTimer(operation);
    }
}

/**
 * Log entry structure
 */
interface LogEntry {
    timestamp: string;
    level: string;
    service: string;
    eventType: string;
    message: string;
    environment: string;
    version: string;
    requestId: string;
    [key: string]: unknown;
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
    private startTime: number;

    constructor(private operation: string) {
        this.startTime = Date.now();
    }

    /**
     * Ends the timer and logs performance
     */
    end(context?: Record<string, unknown>): number {
        const durationMs = Date.now() - this.startTime;
        LoggingService.logPerformance(this.operation, durationMs, context);
        return durationMs;
    }

    /**
     * Gets current duration without ending timer
     */
    getCurrentDuration(): number {
        return Date.now() - this.startTime;
    }
}
