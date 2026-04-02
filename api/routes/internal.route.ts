import { Router, RequestHandler } from "express";
import {
    handlePRAnalysisJob,
    handleRepositoryIndexingJob,
    handleIncrementalIndexingJob,
    handleBountyPayoutJob
} from "../controllers/internal";
import { ENDPOINTS } from "../utilities/data";

export const internalRoutes = Router();

// Run PR Analysis
internalRoutes.post(
    ENDPOINTS.INTERNAL.PR_ANALYSIS,
    handlePRAnalysisJob as RequestHandler
);

// Run Repository Indexing
internalRoutes.post(
    ENDPOINTS.INTERNAL.INDEXING.REPOSITORY,
    handleRepositoryIndexingJob as RequestHandler
);

// Run Incremental Repository Indexing
internalRoutes.post(
    ENDPOINTS.INTERNAL.INDEXING.INCREMENTAL,
    handleIncrementalIndexingJob as RequestHandler
);

// Run Bounty Payout
internalRoutes.post(
    ENDPOINTS.INTERNAL.BOUNTY_PAYOUT,
    handleBountyPayoutJob as RequestHandler
);
