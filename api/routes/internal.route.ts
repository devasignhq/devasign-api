import { Router, RequestHandler } from "express";
import { handleBountyPayoutJob } from "../controllers/internal/index.js";
import { ENDPOINTS } from "../utils/data.js";

export const internalRoutes = Router();

// Run Bounty Payout
internalRoutes.post(
    ENDPOINTS.INTERNAL.BOUNTY_PAYOUT,
    handleBountyPayoutJob as RequestHandler
);
