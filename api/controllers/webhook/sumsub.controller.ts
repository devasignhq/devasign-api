import { Request, Response, NextFunction } from "express";
import { STATUS_CODES } from "../../utilities/data";
import { responseWrapper } from "../../utilities/helper";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";

/**
 * Handle Sumsub webhook events
 */
export const handleSumsubWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const body = req.body;
        const { type, reviewResult, reviewRejectType, externalUserId } = body;

        dataLogger.info(`Received Sumsub webhook: ${type}`, { externalUserId, reviewResult });

        // Handle applicant reviewed event
        if (type === "applicantReviewed") {
            // Check if review was successful (GREEN)
            if (reviewResult?.reviewAnswer === "GREEN") {
                if (externalUserId) {
                    // Update user verification status in database
                    await prisma.user.update({
                        where: { userId: externalUserId },
                        data: { verified: true }
                    });
                    dataLogger.info(`User verified via Sumsub: ${externalUserId}`);
                }
            }
            // Check if review requires retry (RED with RETRY type)
            else if (reviewResult?.reviewAnswer === "RED" && reviewRejectType === "RETRY") {
                // Log warning, client SDK will handle retry guidance automatically
                dataLogger.info(`User verification retry needed: ${externalUserId}`);
            }
        }

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            message: "Webhook processed",
            data: {}
        });

    } catch (error) {
        dataLogger.error("Sumsub webhook error", { error });
        next(error);
    }
};
