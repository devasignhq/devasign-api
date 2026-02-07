import { Request, Response } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { ErrorRecoveryService } from "../../services/error-recovery.service";
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
