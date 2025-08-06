import { RequestHandler, Router } from "express";
import {
    getInstallationRepositories,
    getRepositoryIssues,
    getRepositoryResources,
    getOrCreateBountyLabel
} from "../controllers/github.controller";
import {
    getInstallationRepositoriesValidator,
    getRepositoryIssuesValidator,
    getRepositoryResourcesValidator,
    getOrCreateBountyLabelValidator
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