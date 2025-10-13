import { RequestHandler, Router, Request, Response } from "express";
import { validateUser } from "../middlewares/auth.middleware";
import { STATUS_CODES } from "../helper";

export const healthRoutes = Router();

// Health check endpoint for Google Cloud Run
healthRoutes.get("/", (req: Request, res: Response) => {
    res.status(STATUS_CODES.SUCCESS).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
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

        const statusCode = recoveryResult.success ? STATUS_CODES.SUCCESS : STATUS_CODES.UNKNOWN;
        res.status(statusCode).json({
            recovery: recoveryResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(STATUS_CODES.UNKNOWN).json({
            error: "Recovery attempt failed",
            details: String(error),
            timestamp: new Date().toISOString()
        });
    }
}) as RequestHandler);
