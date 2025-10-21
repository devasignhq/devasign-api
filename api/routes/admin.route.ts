import { Router, RequestHandler, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { dataLogger } from "../config/logger.config";
import { STATUS_CODES } from "../helper";
import {
    webhookHealthCheck,
    getJobData,
    getQueueStats,
    getWorkflowStatus,
    systemRecovery
} from "../controllers/admin.controller";

export const adminRoutes = Router();

// Webhook health check
adminRoutes.get("/health", webhookHealthCheck as RequestHandler);

// Get job data by job ID
adminRoutes.get("/jobs/:jobId", getJobData as RequestHandler);

// Get queue statistics
adminRoutes.get("/queue/stats", getQueueStats as RequestHandler);

// Get workflow status
adminRoutes.get("/workflow/status", getWorkflowStatus as RequestHandler);

// Recover failed systems
adminRoutes.get("/recover-system", systemRecovery as RequestHandler);

// To be removed. Used from development only.
adminRoutes.post(
    "/reset-db",
    (async (req: Request, res: Response) => {
        try {
            // Delete all records from each table in correct order
            // due to foreign key constraints
            await prisma.transaction.deleteMany();
            await prisma.taskSubmission.deleteMany();
            await prisma.taskActivity.deleteMany();
            await prisma.userInstallationPermission.deleteMany();
            await prisma.task.deleteMany();
            await prisma.contributionSummary.deleteMany();
            await prisma.installation.deleteMany();
            await prisma.user.deleteMany();
            await prisma.permission.deleteMany();
            await prisma.aIReviewRule.deleteMany();
            await prisma.aIReviewResult.deleteMany();

            // await prisma.subscriptionPackage.deleteMany();

            res.status(STATUS_CODES.SUCCESS).json({ message: "Database cleared" });
        } catch (error) {
            dataLogger.error("Database clear operation failed", { error });
            res.status(STATUS_CODES.SERVER_ERROR).json({
                message: "Database clear operation failed"
            });
        }
    }) as RequestHandler
);
