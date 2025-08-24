import { RequestHandler, Router } from "express";
import {
    getInstallationRepositories,
    getRepositoryIssues,
    getRepositoryResources,
    getOrCreateBountyLabel,
    triggerManualPRAnalysis
} from "../controllers/github.controller";
import {
    getInstallationRepositoriesValidator,
    getRepositoryIssuesValidator,
    getRepositoryResourcesValidator,
    getOrCreateBountyLabelValidator,
    triggerManualPRAnalysisValidator
} from "../validators/github.validator";

export const githubRoutes = Router();

// Get installation repositories
githubRoutes.get(
    "/installations/:installationId/repositories", 
    getInstallationRepositoriesValidator, 
    getInstallationRepositories as RequestHandler
);

// Get repository issues
githubRoutes.get(
    "/installations/:installationId/issues", 
    getRepositoryIssuesValidator, 
    getRepositoryIssues as RequestHandler
);

// Get repository resources (labels and milestones)
githubRoutes.get(
    "/installations/:installationId/resources", 
    getRepositoryResourcesValidator, 
    getRepositoryResources as RequestHandler
);

// Set bounty label on repo
githubRoutes.get(
    "/installations/:installationId/set-bounty-label", 
    getOrCreateBountyLabelValidator, 
    getOrCreateBountyLabel as RequestHandler
);

// Manual trigger for PR analysis
// Requirements: 1.4, 6.4
githubRoutes.post(
    "/installations/:installationId/analyze-pr",
    triggerManualPRAnalysisValidator,
    triggerManualPRAnalysis as RequestHandler
);