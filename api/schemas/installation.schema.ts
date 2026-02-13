import * as z from "zod";
import {
    installationIdSchema,
    paginationSchema,
    userIdSchema
} from "./index.schema";

export const getInstallationsSchema = {
    query: z.object({
        ...paginationSchema.shape,
        status: z.enum(["ACTIVE", "ARCHIVED"]).optional()
    })
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

export const archiveInstallationSchema = {
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
        title: z.string().optional(),
        labels: z.union([z.string(), z.array(z.string())])
            .optional()
            .transform((val) => {
                if (!val) return undefined;
                if (typeof val === "string") {
                    return val.split(",").map(l => l.trim()).filter(l => l.length > 0);
                }
                return val;
            }),
        milestone: z.union([
            z.string(),
            z.literal("none"),
            z.literal("*")
        ]).optional(),
        sort: z.enum(["created", "updated", "comments"]).optional(),
        direction: z.enum(["asc", "desc"]).optional(),
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

export const indexInstallationRepositoriesSchema = {
    params: z.object({
        installationId: installationIdSchema
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
