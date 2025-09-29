import { ErrorHandlerService } from "./error-handler.service";
import { CircuitBreakerService } from "./circuit-breaker.service";
import { LoggingService } from "./logging.service";
import { prisma } from "../config/database.config";

/**
 * Health Check Service for AI Review System
 * Monitors system health and provides degraded mode capabilities
 */
export class HealthCheckService {
    private static readonly HEALTH_CHECK_TIMEOUT = 5000; // 5 seconds
    private static lastHealthCheck?: HealthCheckResult;
    private static healthCheckInProgress = false;

    /**
     * Performs comprehensive health check of all services
     */
    static async performHealthCheck(includeDetailed: boolean = false): Promise<HealthCheckResult> {
        if (HealthCheckService.healthCheckInProgress) {
            return HealthCheckService.lastHealthCheck || HealthCheckService.createUnhealthyResult("Health check in progress");
        }

        HealthCheckService.healthCheckInProgress = true;
        const timer = LoggingService.createTimer("health_check");

        try {
            const result = await HealthCheckService.checkAllServices(includeDetailed);
            HealthCheckService.lastHealthCheck = result;

            timer.end({
                overallStatus: result.status,
                servicesChecked: Object.keys(result.services).length
            });

            LoggingService.logHealthStatus("ai-review-system", result.status, {
                services: result.services,
                degradedMode: result.degradedMode
            });

            return result;
        } catch (error) {
            const errorResult = HealthCheckService.createUnhealthyResult(`Health check failed: ${error}`);
            timer.end({ error: true });
            LoggingService.logError("health_check_failed", error as Error);
            return errorResult;
        } finally {
            HealthCheckService.healthCheckInProgress = false;
        }
    }

    /**
     * Checks health of all services
     */
    private static async checkAllServices(includeDetailed: boolean): Promise<HealthCheckResult> {
        const services: Record<string, ServiceHealth> = {};
        const checks: Promise<[string, ServiceHealth]>[] = [];

        // Check core services
        checks.push(HealthCheckService.checkService("database", () => HealthCheckService.checkDatabase()));
        checks.push(HealthCheckService.checkService("groq", () => HealthCheckService.checkGroq()));
        checks.push(HealthCheckService.checkService("github", () => HealthCheckService.checkGitHub()));

        // Wait for all checks with timeout
        const results = await Promise.allSettled(checks);

        // Process results
        for (const result of results) {
            if (result.status === "fulfilled") {
                const [serviceName, health] = result.value;
                services[serviceName] = health;
            } else {
                // Handle rejected promises
                console.error("Health check promise rejected:", result.reason);
            }
        }

        // Determine overall status
        const overallStatus = HealthCheckService.determineOverallStatus(services);
        const degradedMode = HealthCheckService.isDegradedMode(services);

        const healthResult: HealthCheckResult = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            services,
            degradedMode,
            circuitBreakers: includeDetailed ? CircuitBreakerService.getCircuitStatus() : undefined
        };

        return healthResult;
    }

    /**
     * Checks individual service with timeout and error handling
     */
    private static async checkService(
        serviceName: string,
        checkFunction: () => Promise<ServiceHealth>
    ): Promise<[string, ServiceHealth]> {
        try {
            const health = await ErrorHandlerService.withTimeout(
                checkFunction,
                `health_check_${serviceName}`,
                HealthCheckService.HEALTH_CHECK_TIMEOUT
            );
            return [serviceName, health];
        } catch (error) {
            return [serviceName, {
                status: "unhealthy",
                message: `Health check failed: ${error}`,
                lastChecked: new Date().toISOString(),
                responseTime: HealthCheckService.HEALTH_CHECK_TIMEOUT
            }];
        }
    }

    /**
     * Checks database health
     */
    private static async checkDatabase(): Promise<ServiceHealth> {
        const startTime = Date.now();

        try {
            // Simple query to check database connectivity
            await prisma.$queryRaw`SELECT 1`;

            const responseTime = Date.now() - startTime;
            return {
                status: "healthy",
                message: "Database connection successful",
                lastChecked: new Date().toISOString(),
                responseTime
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: "unhealthy",
                message: `Database connection failed: ${error}`,
                lastChecked: new Date().toISOString(),
                responseTime,
                error: String(error)
            };
        }
    }

    /**
     * Checks Groq AI service health
     */
    private static async checkGroq(): Promise<ServiceHealth> {
        const startTime = Date.now();

        try {
            if (!process.env.GROQ_API_KEY) {
                throw new Error("GROQ_API_KEY not configured");
            }

            // Simple health check - in real implementation, this would make a minimal API call
            // For now, just check if the API key is configured
            const responseTime = Date.now() - startTime;

            return {
                status: "healthy",
                message: "Groq service configuration valid",
                lastChecked: new Date().toISOString(),
                responseTime
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: "unhealthy",
                message: `Groq service check failed: ${error}`,
                lastChecked: new Date().toISOString(),
                responseTime,
                error: String(error)
            };
        }
    }

    /**
     * Checks GitHub API health
     */
    private static async checkGitHub(): Promise<ServiceHealth> {
        const startTime = Date.now();

        try {
            if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_APP_PRIVATE_KEY) {
                throw new Error("GitHub app credentials not configured");
            }

            // Simple health check - in real implementation, this would check API status
            const responseTime = Date.now() - startTime;

            return {
                status: "healthy",
                message: "GitHub service configuration valid",
                lastChecked: new Date().toISOString(),
                responseTime
            };
        } catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                status: "unhealthy",
                message: `GitHub service check failed: ${error}`,
                lastChecked: new Date().toISOString(),
                responseTime,
                error: String(error)
            };
        }
    }

    /**
     * Determines overall system status based on individual services
     */
    private static determineOverallStatus(services: Record<string, ServiceHealth>): "healthy" | "degraded" | "unhealthy" {
        const serviceStatuses = Object.values(services).map(s => s.status);

        // If database is unhealthy, system is unhealthy
        if (services.database?.status === "unhealthy") {
            return "unhealthy";
        }

        // If all services are healthy
        if (serviceStatuses.every(status => status === "healthy")) {
            return "healthy";
        }

        // If critical services (database) are healthy but others are not
        if (services.database?.status === "healthy") {
            return "degraded";
        }

        return "unhealthy";
    }

    /**
     * Determines if system should operate in degraded mode
     */
    private static isDegradedMode(services: Record<string, ServiceHealth>): boolean {
        // System is in degraded mode if AI services are unavailable but core services work
        const coreServicesHealthy = services.database?.status === "healthy";
        const aiServicesUnhealthy = services.groq?.status !== "healthy";

        return coreServicesHealthy && aiServicesUnhealthy;
    }

    /**
     * Creates unhealthy result for error cases
     */
    private static createUnhealthyResult(message: string): HealthCheckResult {
        return {
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || "1.0.0",
            environment: process.env.NODE_ENV || "development",
            services: {},
            degradedMode: false,
            error: message
        };
    }

    /**
     * Gets cached health status (for quick checks)
     */
    static getCachedHealthStatus(): HealthCheckResult | null {
        return HealthCheckService.lastHealthCheck || null;
    }

    /**
     * Checks if system is currently healthy
     */
    static isSystemHealthy(): boolean {
        const cached = HealthCheckService.getCachedHealthStatus();
        return cached?.status === "healthy";
    }

    /**
     * Checks if system is in degraded mode
     */
    static isSystemDegraded(): boolean {
        const cached = HealthCheckService.getCachedHealthStatus();
        return cached?.degradedMode === true;
    }

    /**
     * Gets service-specific health status
     */
    static getServiceHealth(serviceName: string): ServiceHealth | null {
        const cached = HealthCheckService.getCachedHealthStatus();
        return cached?.services[serviceName] || null;
    }
}

/**
 * Health check result structure
 */
export interface HealthCheckResult {
    status: "healthy" | "degraded" | "unhealthy";
    timestamp: string;
    uptime: number;
    version: string;
    environment: string;
    services: Record<string, ServiceHealth>;
    degradedMode: boolean;
    circuitBreakers?: Record<string, unknown>;
    error?: string;
}

/**
 * Individual service health structure
 */
export interface ServiceHealth {
    status: "healthy" | "degraded" | "unhealthy";
    message: string;
    lastChecked: string;
    responseTime: number;
    error?: string;
    details?: Record<string, unknown>;
}
