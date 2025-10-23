import { RequestHandler, Router } from "express";
import {
    getUserInstallations,
    getUserInstallation,
    createInstallation,
    updateInstallation,
    deleteInstallation,
    addTeamMember,
    updateTeamMember,
    removeTeamMember,
    createPRReviewRule,
    deletePRReviewRule,
    getPRReviewRule,
    getPRReviewRules,
    getDefaultRules,
    getInstallationRepositories,
    getOrCreateBountyLabel,
    getRepositoryIssues,
    getRepositoryResources,
    triggerManualPRAnalysis,
    updatePRReviewRule
} from "../controllers/installation";
import { validateUserInstallation } from "../middlewares/auth.middleware";
import {
    getInstallationsValidator,
    createInstallationValidator,
    updateInstallationValidator,
    addTeamMemberValidator,
    removeTeamMemberValidator,
    updateTeamMemberPermissionsValidator,
    deleteInstallationValidator
} from "../validators/installation.validator";
import {
    getPRReviewRulesValidator,
    getPRReviewRuleValidator,
    createPRReviewRuleValidator,
    updatePRReviewRuleValidator,
    deletePRReviewRuleValidator
} from "../validators/pr-review-rules.validator";
import {
    getInstallationRepositoriesValidator,
    getRepositoryIssuesValidator,
    getRepositoryResourcesValidator,
    getOrCreateBountyLabelValidator,
    triggerManualPRAnalysisValidator
} from "../validators/github.validator";
import { ENDPOINTS } from "../utilities/endpoints";

export const installationRoutes = Router();

// Get all installations
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GET_ALL, 
    getInstallationsValidator, 
    getUserInstallations as RequestHandler
);

// Get a specific installation
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GET_BY_ID, 
    getUserInstallation as RequestHandler
);

// Create a new installation
installationRoutes.post(
    ENDPOINTS.INSTALLATION.CREATE, 
    createInstallationValidator, 
    createInstallation as RequestHandler
);

// Update an existing installation
installationRoutes.patch(
    ENDPOINTS.INSTALLATION.UPDATE, 
    updateInstallationValidator, 
    updateInstallation as RequestHandler
);

// Delete an installation
installationRoutes.delete(
    ENDPOINTS.INSTALLATION.DELETE, 
    deleteInstallationValidator, 
    deleteInstallation as RequestHandler
);

// ============================================================================
// ============================================================================

// Add a team member to an installation
installationRoutes.post(
    ENDPOINTS.INSTALLATION.TEAM.ADD_MEMBER, 
    addTeamMemberValidator, 
    addTeamMember as RequestHandler
);

// Update team member info
installationRoutes.patch(
    ENDPOINTS.INSTALLATION.TEAM.UPDATE_MEMBER, 
    updateTeamMemberPermissionsValidator, 
    updateTeamMember as RequestHandler
);

// Remove a team member from an installation
installationRoutes.delete(
    ENDPOINTS.INSTALLATION.TEAM.REMOVE_MEMBER, 
    removeTeamMemberValidator, 
    removeTeamMember as RequestHandler
);

// ============================================================================
// ============================================================================

// Get installation repositories
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_REPOSITORIES, 
    getInstallationRepositoriesValidator, 
    validateUserInstallation as RequestHandler,
    getInstallationRepositories as RequestHandler
);

// Get repository issues
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_ISSUES, 
    getRepositoryIssuesValidator, 
    validateUserInstallation as RequestHandler,
    getRepositoryIssues as RequestHandler
);

// Get repository resources (labels and milestones)
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_RESOURCES, 
    getRepositoryResourcesValidator, 
    validateUserInstallation as RequestHandler,
    getRepositoryResources as RequestHandler
);

// Set bounty label on repo
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.SET_BOUNTY_LABEL, 
    getOrCreateBountyLabelValidator, 
    validateUserInstallation as RequestHandler,
    getOrCreateBountyLabel as RequestHandler
);

// Manual trigger for PR analysis
installationRoutes.post(
    ENDPOINTS.INSTALLATION.GITHUB.ANALYZE_PR,
    triggerManualPRAnalysisValidator,
    validateUserInstallation as RequestHandler,
    triggerManualPRAnalysis as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all pr review rules for an installation
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_ALL, 
    getPRReviewRulesValidator, 
    validateUserInstallation as RequestHandler,
    getPRReviewRules as RequestHandler
);

// Get a specific pr review rule
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_BY_ID, 
    getPRReviewRuleValidator, 
    validateUserInstallation as RequestHandler,
    getPRReviewRule as RequestHandler
);

// Create a new pr review rule
installationRoutes.post(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.CREATE, 
    createPRReviewRuleValidator, 
    validateUserInstallation as RequestHandler,
    createPRReviewRule as RequestHandler
);

// Update an existing pr review rule
installationRoutes.put(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.UPDATE, 
    updatePRReviewRuleValidator, 
    validateUserInstallation as RequestHandler,
    updatePRReviewRule as RequestHandler
);

// Delete a pr review rule
installationRoutes.delete(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.DELETE, 
    deletePRReviewRuleValidator, 
    validateUserInstallation as RequestHandler,
    deletePRReviewRule as RequestHandler
);

// Get default rules (no installation ID needed)
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_DEFAULT, 
    getDefaultRules as RequestHandler
);
