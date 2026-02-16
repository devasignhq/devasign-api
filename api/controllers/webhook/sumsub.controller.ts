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

        // If no externalUserId, return success
        if (!externalUserId) {
            dataLogger.warn("Sumsub webhook received without externalUserId", { type });
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                message: "Webhook processed (no externalUserId)",
                data: {}
            });
        }

        switch (type) {
            case "applicantReviewed":
            // Check if review was successful (GREEN)
                if (reviewResult?.reviewAnswer === "GREEN") {
                    await prisma.user.update({
                        where: { userId: externalUserId },
                        data: { verified: true }
                    });
                    dataLogger.info(`User verified via Sumsub: ${externalUserId}`);
                }
                // Check if review requires retry (RED with RETRY type)
                else if (reviewResult?.reviewAnswer === "RED" && reviewRejectType === "RETRY") {
                // Log warning, client SDK should handle retry guidance automatically
                    dataLogger.info(`User verification retry needed: ${externalUserId}`);
                }
                // Check if review was rejected (RED without RETRY)
                else if (reviewResult?.reviewAnswer === "RED") {
                    await prisma.user.update({
                        where: { userId: externalUserId },
                        data: { verified: false }
                    });
                    dataLogger.info(`User verification rejected via Sumsub: ${externalUserId}`);
                }
                break;

            case "applicantActivated":
            // Check if review was successful (GREEN)
                if (reviewResult?.reviewAnswer === "GREEN") {
                    await prisma.user.update({
                        where: { userId: externalUserId },
                        data: { verified: true }
                    });
                    dataLogger.info(`User verification activated via Sumsub: ${externalUserId}`);
                }
                break;

            case "applicantReset":
            case "applicantDeactivated":
            case "applicantDeleted":
            // For these states, the user is not currently verified (reset or invalid)
                await prisma.user.update({
                    where: { userId: externalUserId },
                    data: { verified: false }
                });
                dataLogger.info(`User verification status updated via Sumsub event: ${type}`, { externalUserId });
                break;

            default:
                dataLogger.info(`Sumsub webhook event type not handled: ${type}`, { externalUserId });
                break;
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
