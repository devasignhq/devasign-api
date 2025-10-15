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
import { validateUserInstallation } from "../middlewares/auth.middleware";

export const githubRoutes = Router();

// Get installation repositories
githubRoutes.get(
    "/installations/:installationId/repositories", 
    getInstallationRepositoriesValidator, 
    validateUserInstallation as RequestHandler,
    getInstallationRepositories as RequestHandler
);

// Get repository issues
githubRoutes.get(
    "/installations/:installationId/issues", 
    getRepositoryIssuesValidator, 
    validateUserInstallation as RequestHandler,
    getRepositoryIssues as RequestHandler
);

// Get repository resources (labels and milestones)
githubRoutes.get(
    "/installations/:installationId/resources", 
    getRepositoryResourcesValidator, 
    validateUserInstallation as RequestHandler,
    getRepositoryResources as RequestHandler
);

// Set bounty label on repo
githubRoutes.get(
    "/installations/:installationId/set-bounty-label", 
    getOrCreateBountyLabelValidator, 
    validateUserInstallation as RequestHandler,
    getOrCreateBountyLabel as RequestHandler
);

// Manual trigger for PR analysis
githubRoutes.post(
    "/installations/:installationId/analyze-pr",
    triggerManualPRAnalysisValidator,
    validateUserInstallation as RequestHandler,
    triggerManualPRAnalysis as RequestHandler
);
