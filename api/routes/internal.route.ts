import { Router, RequestHandler } from "express";
import { handleBountyPayoutJob } from "../controllers/internal";
import { ENDPOINTS } from "../utilities/data";

export const internalRoutes = Router();

// Run Bounty Payout
internalRoutes.post(
    ENDPOINTS.INTERNAL.BOUNTY_PAYOUT,
    handleBountyPayoutJob as RequestHandler
);
