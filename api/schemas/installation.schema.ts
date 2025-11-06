import * as z from "zod";
import { RuleType, RuleSeverity } from "../../prisma_client";
import {
    cuidSchema,
    installationIdSchema,
    paginationSchema,
    userIdSchema
} from "./index.schema";

export const getInstallationsSchema = {
    query: paginationSchema
};

export const getInstallationSchema = {
    params: z.object({
        installationId: installationIdSchema
    })
};

export const createInstallationSchema = {
    body: z.object({
        installationId: installationIdSchema
    })
};

export const updateInstallationSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        htmlUrl: z.url("HTML URL must be a valid URL").optional(),
        targetId: z.number().int("Target ID must be an integer").optional(),
        account: z.object({
            login: z.string(),
            nodeId: z.string(),
            avatarUrl: z.string(),
            htmlUrl: z.string()
        }).optional()
    })
};

export const deleteInstallationSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar wallet address format")
    })
};

// ============================================================================
// ============================================================================

export const addTeamMemberSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        username: z.string().min(1, "Username is required"),
        permissionCodes: z.array(z.string()).min(1, "Permission codes must be a non-empty array"),
        email: z.email("Email must be valid").optional()
    })
};

export const updateTeamMemberPermissionsSchema = {
    params: z.object({
        installationId: installationIdSchema,
        userId: userIdSchema
    }),
    body: z.object({
        permissionCodes: z.array(z.string()).min(1, "Permission codes must be a non-empty array")
    })
};

export const removeTeamMemberSchema = {
    params: z.object({
        installationId: installationIdSchema,
        userId: userIdSchema
    })
};

// ============================================================================
// ============================================================================

export const getInstallationRepositoriesSchema = {
    params: z.object({
        installationId: installationIdSchema
    })
};

export const getRepositoryIssuesSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        repoUrl: z.string().regex(/^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/, "Repository URL must be a valid GitHub repository URL"),
        labels: z.string().optional(),
        milestone: z.string().optional(),
        page: z.coerce.number().int().min(1, "Page must be a positive integer").optional(),
        perPage: z.coerce.number().int().min(1).max(100, "Per page must be between 1 and 100").optional()
    })
};

export const getRepositoryResourcesSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        repoUrl: z.string().regex(/^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/, "Repository URL must be a valid GitHub repository URL")
    })
};

export const getOrCreateBountyLabelSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        repositoryId: z.string().min(1, "Repository ID cannot be empty")
    })
};

export const triggerManualPRAnalysisSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        repositoryName: z.string().regex(/^[\w\-\.]+\/[\w\-\.]+$/, 'Repository name must be in format "owner/repo"'),
        prNumber: z.coerce.number().int().min(1, "PR number must be a positive integer")
    })
};

// ============================================================================
// ============================================================================

export const getPRReviewRulesSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        active: z.coerce.boolean().optional(),
        ruleType: z.enum(RuleType).optional(),
        severity: z.enum(RuleSeverity).optional()
    })
};

export const getPRReviewRuleSchema = {
    params: z.object({
        installationId: installationIdSchema,
        ruleId: cuidSchema
    })
};

export const createPRReviewRuleSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        name: z.string().min(1).max(100, "Rule name must be between 1 and 100 characters"),
        description: z.string().min(1).max(500, "Rule description must be between 1 and 500 characters"),
        ruleType: z.enum(RuleType),
        severity: z.enum(RuleSeverity),
        pattern: z.string().refine((val) => {
            try {
                new RegExp(val);
                return true;
            } catch {
                return false;
            }
        }, "Pattern must be a valid regular expression").optional(),
        config: z.record(z.string(), z.unknown()),
        active: z.boolean().optional()
    })
};

export const updatePRReviewRuleSchema = {
    params: z.object({
        installationId: installationIdSchema,
        ruleId: cuidSchema
    }),
    body: z.object({
        name: z.string().min(1).max(100, "Rule name must be between 1 and 100 characters").optional(),
        description: z.string().min(1).max(500, "Rule description must be between 1 and 500 characters").optional(),
        ruleType: z.enum(RuleType).optional(),
        severity: z.enum(RuleSeverity).optional(),
        pattern: z.string().refine((val) => {
            try {
                new RegExp(val);
                return true;
            } catch {
                return false;
            }
        }, "Pattern must be a valid regular expression").optional(),
        config: z.record(z.string(), z.unknown()).optional(),
        active: z.boolean().optional()
    })
};

export const deletePRReviewRuleSchema = {
    params: z.object({
        installationId: installationIdSchema,
        ruleId: cuidSchema
    })
};

