import { RequestHandler, Router, Request, Response } from "express";
import { validateUser } from "../middlewares/auth.middleware";

export const healthRoutes = Router();

// Health check endpoint for Google Cloud Run
healthRoutes.get("/", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Comprehensive health check endpoint for AI Review system
healthRoutes.get("/detailed", async (req: Request, res: Response) => {
    try {
        const { HealthCheckService } = await import("../services/health-check.service");
        const healthResult = await HealthCheckService.performHealthCheck(true);

        const statusCode = healthResult.status === "healthy" 
            ? 200 
            : healthResult.status === "degraded" 
                ? 206 
                : 503;

        res.status(statusCode).json(healthResult);
    } catch (error) {
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health check failed",
            details: error
        });
    }
});

// Quick health status endpoint
healthRoutes.get("/status", (async (req: Request, res: Response) => {
    try {
        const { HealthCheckService } = await import("../services/health-check.service");
        const cached = HealthCheckService.getCachedHealthStatus();

        if (!cached) {
            // Perform quick health check if no cached result
            const healthResult = await HealthCheckService.performHealthCheck(false);
            const statusCode = healthResult.status === "healthy" ? 200 :
                healthResult.status === "degraded" ? 206 : 503;
            return res.status(statusCode).json({
                status: healthResult.status,
                degradedMode: healthResult.degradedMode,
                timestamp: healthResult.timestamp
            });
        }

        const statusCode = cached.status === "healthy" ? 200 :
            cached.status === "degraded" ? 206 : 503;

        res.status(statusCode).json({
            status: cached.status,
            degradedMode: cached.degradedMode,
            timestamp: cached.timestamp,
            cached: true
        });
    } catch {
        res.status(503).json({
            status: "unhealthy",
            timestamp: new Date().toISOString(),
            error: "Health status check failed"
        });
    }
}) as RequestHandler);

// Error handling status endpoint
healthRoutes.get("/error-handling", async (req: Request, res: Response) => {
    try {
        const { ErrorHandlerService } = await import("../services/error-handler.service");
        const { ErrorRecoveryService } = await import("../services/error-recovery.service");

        const status = ErrorHandlerService.getErrorHandlingStatus();
        const recoveryStatus = ErrorRecoveryService.getRecoveryStatus();

        res.status(200).json({
            timestamp: new Date().toISOString(),
            errorHandling: status,
            recovery: recoveryStatus
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to get error handling status",
            details: String(error),
            timestamp: new Date().toISOString()
        });
    }
});

// Manual recovery endpoint (admin only)
healthRoutes.post("/recover", validateUser as RequestHandler, (async (req: Request, res: Response) => {
    try {
        // Check if user has admin privileges
        const { currentUser } = req.body;

        if (!currentUser?.admin && !currentUser?.custom_claims?.admin) {
            return res.status(403).json({
                error: "Access denied. Admin privileges required."
            });
        }

        const { ErrorRecoveryService } = await import("../services/error-recovery.service");
        const { type = "complete", context } = req.body;

        const recoveryResult = await ErrorRecoveryService.attemptSystemRecovery(type, context);

        const statusCode = recoveryResult.success ? 200 : 500;
        res.status(statusCode).json({
            recovery: recoveryResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            error: "Recovery attempt failed",
            details: String(error),
            timestamp: new Date().toISOString()
        });
    }
}) as RequestHandler);
