import { Router, RequestHandler } from "express";
import {
    handlePRAnalysisJob,
    handleRepositoryIndexingJob,
    handleIncrementalIndexingJob
} from "../controllers/internal";
import { ENDPOINTS } from "../utilities/data";

export const internalRoutes = Router();

// Run PR Analysis
internalRoutes.post(
    ENDPOINTS.INTERNAL.JOBS.PR_ANALYSIS,
    handlePRAnalysisJob as RequestHandler
);

// Run Repository Indexing
internalRoutes.post(
    ENDPOINTS.INTERNAL.JOBS.REPOSITORY_INDEXING,
    handleRepositoryIndexingJob as RequestHandler
);

// Run Incremental Repository Indexing
internalRoutes.post(
    ENDPOINTS.INTERNAL.JOBS.INCREMENTAL_INDEXING,
    handleIncrementalIndexingJob as RequestHandler
);
