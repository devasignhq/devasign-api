import { Request, Response } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
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
        responseWrapper({
            res,
            status: statusCode,
            data: { 
                recovery: recoveryResult,
                timestamp: new Date().toISOString() 
            },
            message: recoveryResult.success ? "System recovery completed" : "System recovery failed"
        });
    } catch (error) {
        dataLogger.error("System recovery failed", { error });
        // Handle unexpected errors during recovery
        responseWrapper({
            res,
            status: STATUS_CODES.UNKNOWN,
            data: { timestamp: new Date().toISOString() },
            message: "Recovery attempt failed",
            warning: String(error)
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
        await prisma.wallet.deleteMany();
        await prisma.permission.deleteMany();
        await prisma.aIReviewResult.deleteMany();

        // await prisma.subscriptionPackage.deleteMany();

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Database cleared"
        });
    } catch (error) {
        dataLogger.error("Database clear operation failed", { error });
        responseWrapper({
            res,
            status: STATUS_CODES.SERVER_ERROR,
            data: {},
            message: "Database clear operation failed"
        });
    }
};
