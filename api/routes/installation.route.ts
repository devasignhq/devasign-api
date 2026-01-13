import { RequestHandler, Router } from "express";
import {
    getInstallations,
    getInstallation,
    createInstallation,
    archiveInstallation,
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
    getInstallationsSchema,
    getInstallationSchema,
    createInstallationSchema,
    archiveInstallationSchema,
    addTeamMemberSchema,
    updateTeamMemberPermissionsSchema,
    removeTeamMemberSchema,
    getInstallationRepositoriesSchema,
    getRepositoryIssuesSchema,
    getRepositoryResourcesSchema,
    getOrCreateBountyLabelSchema,
    triggerManualPRAnalysisSchema,
    getPRReviewRulesSchema,
    getPRReviewRuleSchema,
    createPRReviewRuleSchema,
    updatePRReviewRuleSchema,
    deletePRReviewRuleSchema
} from "../schemas/installation.schema";
import { ENDPOINTS } from "../utilities/data";
import { validateRequestParameters } from "../middlewares/request.middleware";

export const installationRoutes = Router();

// Get all installations
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GET_ALL,
    validateRequestParameters(getInstallationsSchema),
    getInstallations as RequestHandler
);

// Get a specific installation
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GET_BY_ID,
    validateRequestParameters(getInstallationSchema),
    getInstallation as RequestHandler
);

// Create a new installation
installationRoutes.post(
    ENDPOINTS.INSTALLATION.CREATE,
    validateRequestParameters(createInstallationSchema),
    createInstallation as RequestHandler
);

// Archive an installation
installationRoutes.patch(
    ENDPOINTS.INSTALLATION.ARCHIVED,
    validateRequestParameters(archiveInstallationSchema),
    archiveInstallation as RequestHandler
);

// ============================================================================
// ============================================================================

// Add a team member to an installation
installationRoutes.post(
    ENDPOINTS.INSTALLATION.TEAM.ADD_MEMBER,
    validateRequestParameters(addTeamMemberSchema),
    validateUserInstallation as RequestHandler,
    addTeamMember as RequestHandler
);

// Update team member info
installationRoutes.patch(
    ENDPOINTS.INSTALLATION.TEAM.UPDATE_MEMBER,
    validateRequestParameters(updateTeamMemberPermissionsSchema),
    validateUserInstallation as RequestHandler,
    updateTeamMember as RequestHandler
);

// Remove a team member from an installation
installationRoutes.delete(
    ENDPOINTS.INSTALLATION.TEAM.REMOVE_MEMBER,
    validateRequestParameters(removeTeamMemberSchema),
    validateUserInstallation as RequestHandler,
    removeTeamMember as RequestHandler
);

// ============================================================================
// ============================================================================

// Get installation repositories
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_REPOSITORIES,
    validateRequestParameters(getInstallationRepositoriesSchema),
    validateUserInstallation as RequestHandler,
    getInstallationRepositories as RequestHandler
);

// Get repository issues
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_ISSUES,
    validateRequestParameters(getRepositoryIssuesSchema),
    validateUserInstallation as RequestHandler,
    getRepositoryIssues as RequestHandler
);

// Get repository resources (labels and milestones)
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.GET_RESOURCES,
    validateRequestParameters(getRepositoryResourcesSchema),
    validateUserInstallation as RequestHandler,
    getRepositoryResources as RequestHandler
);

// Set bounty label on repo
installationRoutes.get(
    ENDPOINTS.INSTALLATION.GITHUB.SET_BOUNTY_LABEL,
    validateRequestParameters(getOrCreateBountyLabelSchema),
    validateUserInstallation as RequestHandler,
    getOrCreateBountyLabel as RequestHandler
);

// Manual trigger for PR analysis
installationRoutes.post(
    ENDPOINTS.INSTALLATION.GITHUB.ANALYZE_PR,
    validateRequestParameters(triggerManualPRAnalysisSchema),
    validateUserInstallation as RequestHandler,
    triggerManualPRAnalysis as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all pr review rules for an installation
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_ALL,
    validateRequestParameters(getPRReviewRulesSchema),
    validateUserInstallation as RequestHandler,
    getPRReviewRules as RequestHandler
);

// Get a specific pr review rule
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_BY_ID,
    validateRequestParameters(getPRReviewRuleSchema),
    validateUserInstallation as RequestHandler,
    getPRReviewRule as RequestHandler
);

// Create a new pr review rule
installationRoutes.post(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.CREATE,
    validateRequestParameters(createPRReviewRuleSchema),
    validateUserInstallation as RequestHandler,
    createPRReviewRule as RequestHandler
);

// Update an existing pr review rule
installationRoutes.put(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.UPDATE,
    validateRequestParameters(updatePRReviewRuleSchema),
    validateUserInstallation as RequestHandler,
    updatePRReviewRule as RequestHandler
);

// Delete a pr review rule
installationRoutes.delete(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.DELETE,
    validateRequestParameters(deletePRReviewRuleSchema),
    validateUserInstallation as RequestHandler,
    deletePRReviewRule as RequestHandler
);

// Get default rules (no installation ID needed)
installationRoutes.get(
    ENDPOINTS.INSTALLATION.PR_REVIEW_RULES.GET_DEFAULT,
    getDefaultRules as RequestHandler
);
