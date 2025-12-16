import { Router, Request, Response, NextFunction } from "express";
import { ContractService } from "../../services/contract.service";
import { validateRequestParameters } from "../../middlewares/request.middleware";
import {
    createEscrowSchema,
    approveUsdcSpendingSchema,
    getEscrowSchema,
    assignContributorSchema,
    increaseBountySchema,
    decreaseBountySchema,
    approveCompletionSchema,
    disputeTaskSchema,
    resolveDisputeSchema,
    refundSchema
} from "./test.schema";

const router = Router();

/**
 * Helper function to recursively convert BigInt values to strings for JSON serialization.
 */
function convertBigIntToString(obj: any): any {
    if (obj === null || obj === undefined) {
        return obj;
    }

    if (typeof obj === "bigint") {
        return obj.toString();
    }

    if (Array.isArray(obj)) {
        return obj.map(item => convertBigIntToString(item));
    }

    if (typeof obj === "object") {
        const converted: Record<string, unknown> = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                converted[key] = convertBigIntToString(obj[key]);
            }
        }
        return converted;
    }

    return obj;
}

/**
 * Create a new escrow for a task.
 */
router.post("/escrow",
    validateRequestParameters(createEscrowSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId, issueUrl, bountyAmount } = req.body;

            const result = await ContractService.createEscrow(
                creatorSecretKey,
                taskId,
                issueUrl,
                bountyAmount
            );

            res.status(201).json({
                message: "Escrow created successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Approve USDC spending by the escrow contract.
 * This must be called before creating an escrow.
 */
router.post("/usdc/approve",
    validateRequestParameters(approveUsdcSpendingSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { userSecretKey, amount } = req.body;

            const result = await ContractService.approveUsdcSpending(
                userSecretKey,
                amount
            );

            res.status(200).json({
                message: "USDC spending approved successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Get escrow details for a specific task.
 */
router.get("/escrow/:taskId",
    validateRequestParameters(getEscrowSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { taskId } = req.params;

            const escrow = await ContractService.getEscrow(taskId);

            // Convert BigInt values to strings for JSON serialization
            const serializedEscrow = convertBigIntToString(escrow);

            res.status(200).json({
                message: "Escrow details retrieved successfully",
                data: serializedEscrow
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Assign a contributor to a task.
 * Only the task creator can assign a contributor.
 */
router.post("/task/assign",
    validateRequestParameters(assignContributorSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId, contributorPublicKey } = req.body;

            const result = await ContractService.assignContributor(
                creatorSecretKey,
                taskId,
                contributorPublicKey
            );

            res.status(200).json({
                message: "Contributor assigned successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Increase the bounty amount for a task.
 * Called by the task creator.
 */
router.post("/task/increase-bounty",
    validateRequestParameters(increaseBountySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId, amount } = req.body;

            const result = await ContractService.increaseBounty(
                creatorSecretKey,
                taskId,
                amount
            );

            res.status(200).json({
                message: "Bounty increased successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Decrease the bounty amount for a task.
 * Called by the task creator.
 */
router.post("/task/decrease-bounty",
    validateRequestParameters(decreaseBountySchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId, amount } = req.body;

            const result = await ContractService.decreaseBounty(
                creatorSecretKey,
                taskId,
                amount
            );

            res.status(200).json({
                message: "Bounty decreased successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Approve task completion and release funds.
 * Called by the task creator after verifying the work.
 */
router.post("/task/approve",
    validateRequestParameters(approveCompletionSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId } = req.body;

            const result = await ContractService.approveCompletion(
                creatorSecretKey,
                taskId
            );

            res.status(200).json({
                message: "Task completion approved and funds released successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Initiate a dispute for a task.
 * Can be called by either the creator or contributor.
 */
router.post("/task/dispute",
    validateRequestParameters(disputeTaskSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { disputingPartySecretKey, taskId, reason } = req.body;

            const result = await ContractService.disputeTask(
                disputingPartySecretKey,
                taskId,
                reason
            );

            res.status(200).json({
                message: "Dispute initiated successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Resolve a dispute for a task (admin only).
 * Determines how the escrowed funds should be distributed.
 */
router.post("/task/resolve-dispute",
    validateRequestParameters(resolveDisputeSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { adminSecretKey, taskId, resolution } = req.body;

            // Convert resolution if it's a PartialPayment
            let processedResolution: "PayContributor" | "RefundCreator" | { PartialPayment: number };

            if (typeof resolution === "object" && "PartialPayment" in resolution) {
                processedResolution = {
                    PartialPayment: resolution.PartialPayment
                };
            } else {
                processedResolution = resolution as "PayContributor" | "RefundCreator";
            }

            const result = await ContractService.resolveDispute(
                adminSecretKey,
                taskId,
                processedResolution
            );

            res.status(200).json({
                message: "Dispute resolved successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Request a refund from the escrow.
 * Called by the creator when no contributor has been assigned.
 */
router.post("/escrow/refund",
    validateRequestParameters(refundSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { creatorSecretKey, taskId } = req.body;

            const result = await ContractService.refund(
                creatorSecretKey,
                taskId
            );

            res.status(200).json({
                message: "Refund processed successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

export const contractRoutes = router;
