import { Request, Response } from "express";
import { STATUS_CODES } from "../../utilities/helper";
import { ErrorRecoveryService } from "../../services/error-recovery.service";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";

/**
 * Recover failed systems
 */
export const systemRecovery = async (req: Request, res: Response) => {
    const { type = "complete", context } = req.body;

    try {
        // Attempt system recovery
        const recoveryResult = await ErrorRecoveryService.attemptSystemRecovery(type, context);

        // Return recovery result
        const statusCode = recoveryResult.success ? STATUS_CODES.SUCCESS : STATUS_CODES.UNKNOWN;
        res.status(statusCode).json({
            recovery: recoveryResult,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // Handle unexpected errors during recovery
        res.status(STATUS_CODES.UNKNOWN).json({
            error: "Recovery attempt failed",
            details: String(error),
            timestamp: new Date().toISOString()
        });
    }
};

// To be removed. Used from development only.
export const resetDatabase = async (req: Request, res: Response) => {
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
};
