import { dataLogger } from "../config/logger.config";

/**
 * Provides centralized logging with structured format and monitoring integration
 */
export class LoggingService {
    private static readonly LOG_LEVELS = {
        ERROR: "error",
        WARN: "warn",
        INFO: "info",
        HTTP: "http",
        DEBUG: "debug"
    } as const;

    /**
     * Logs error events with structured format
     */
    static logError(
        service: string,
        eventType: string,
        message: string,
        error: Error | unknown,
        context?: Record<string, unknown>
    ): void {
        dataLogger.error(message, {
            service,
            eventType,
            error,
            context
        });
    }

    /**
     * Logs warning events
     */
    static logWarning(
        service: string,
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        dataLogger.warn(message, {
            service,
            eventType,
            context
        });
    }

    /**
     * Logs info events
     */
    static logInfo(
        service: string,
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        dataLogger.info(message, {
            service,
            eventType,
            context
        });
    }

    /**
     * Logs HTTP events
     */
    static logHttp(
        service: string,
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        dataLogger.http(message, {
            service,
            eventType,
            context
        });
    }

    /**
     * Logs debug events (only in development)
     */
    static logDebug(
        service: string,
        eventType: string,
        message: string,
        context?: Record<string, unknown>
    ): void {
        dataLogger.debug(message, {
            service,
            eventType,
            context
        });
    }

    /**
     * Logs performance metrics
     */
    static logPerformance(
        service: string,
        operation: string,
        durationMs: number,
        context?: Record<string, unknown>
    ): void {
        dataLogger.info(`${operation} completed in ${durationMs}ms`, {
            service,
            eventType: "performance_metric",
            context,
            performance: {
                operation,
                durationMs,
                timestamp: new Date().toISOString()
            }
        });
    }

    /**
     * Creates a performance timer
     */
    static createTimer(service: string, operation: string): PerformanceTimer {
        return new PerformanceTimer(service, operation);
    }

    /**
     * Logs with correlation ID for request tracing
     */
    static logWithCorrelation(
        level: keyof typeof LoggingService.LOG_LEVELS,
        service: string,
        eventType: string,
        message: string,
        correlationId: string,
        context?: Record<string, unknown>
    ): void {
        dataLogger[level.toLowerCase() as "error" | "warn" | "info" | "debug"](message, {
            service,
            eventType,
            correlationId,
            context
        });
    }
}

/**
 * Performance timer utility
 */
export class PerformanceTimer {
    private startTime: number;

    constructor(private service: string, private operation: string) {
        this.startTime = Date.now();
    }

    /**
     * Ends the timer and logs performance
     */
    end(context?: Record<string, unknown>): number {
        const durationMs = Date.now() - this.startTime;
        LoggingService.logPerformance(
            this.service, 
            this.operation, 
            durationMs, 
            context
        );
        return durationMs;
    }

    /**
     * Gets current duration without ending timer
     */
    getCurrentDuration(): number {
        return Date.now() - this.startTime;
    }
}
