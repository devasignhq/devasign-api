import { Request, Response, NextFunction } from "express";
import { OctokitService } from "../services/octokit.service";
import { IssueFilters } from "../models/general.model";
import { validateUserInstallation } from "../middlewares/auth.middleware";
import { PRAnalysisService } from "../services/pr-analysis.service";
import {
    PullRequestData,
    APIResponse
} from "../models/ai-review.model";
import {
    PRNotEligibleError,
    PRAnalysisError,
    GitHubAPIError
} from "../models/ai-review.errors";
import { getFieldFromUnknownObject } from "../helper";

export const getInstallationRepositories = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const repositories = await OctokitService.getInstallationRepositories(installationId);

        res.status(200).json(repositories);
    } catch (error) {
        next(error);
    }
};

export const getRepositoryIssues = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const {
        repoUrl,
        title,
        labels,
        milestone,
        sort = "created",
        direction = "desc",
        page = 1,
        perPage = 30
    } = req.query;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const filters: IssueFilters = {
            title: title as string,
            labels: labels ? labels as string[] : undefined,
            milestone: milestone as string,
            sort: sort as ("created" | "updated" | "comments"),
            direction: direction as ("asc" | "desc")
        };

        const result = await OctokitService.getRepoIssuesWithSearch(
            repoUrl as string,
            installationId,
            filters,
            parseInt(page as string),
            parseInt(perPage as string)
        );

        res.status(200).json({
            issues: result.issues,
            hasMore: result.hasMore,
            pagination: {
                page: parseInt(page as string),
                perPage: parseInt(perPage as string)
            }
        });
    } catch (error) {
        next(error);
    }
};

export const getRepositoryResources = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repoUrl } = req.query;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const resources = await OctokitService.getRepoLabelsAndMilestones(
            repoUrl as string,
            installationId
        );

        res.status(200).json(resources);
    } catch (error) {
        next(error);
    }
};

export const getOrCreateBountyLabel = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repositoryId } = req.query;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        let bountyLabel;

        try {
            bountyLabel = await OctokitService.getBountyLabel(
                repositoryId as string,
                installationId
            );
        } catch { /* empty */ }

        if (bountyLabel) {
            return res.status(200).json({ valid: true, bountyLabel });
        }

        bountyLabel = await OctokitService.createBountyLabel(
            repositoryId as string,
            installationId
        );

        res.status(200).json({ valid: true, bountyLabel });
    } catch (error) {
        next(error);
    }
};

/**
 * Manual trigger for PR analysis
 * 
 * This endpoint allows authorized users to manually trigger AI analysis for a specific PR
 * - Validates user has access to the installation
 * - Fetches PR data from GitHub API
 * - Performs immediate analysis workflow
 * - Returns analysis results or queues for background processing
 */
export const triggerManualPRAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repositoryName, prNumber } = req.body;
    const { userId } = req.body;

    try {
        // Validate user has access to this installation
        await validateUserInstallation(installationId, userId);

        console.log(`Manual PR analysis triggered by user ${userId} for PR #${prNumber} in ${repositoryName}`);

        // Fetch PR data from GitHub API
        const startTime = Date.now();
        let prData: PullRequestData;

        try {
            // Get PR details from GitHub API
            const prDetails = await OctokitService.getPRDetails(installationId, repositoryName, prNumber);

            if (!prDetails) {
                return res.status(404).json({
                    success: false,
                    error: `PR #${prNumber} not found in repository ${repositoryName}`,
                    data: {
                        installationId,
                        repositoryName,
                        prNumber
                    },
                    timestamp: new Date().toISOString()
                } as APIResponse);
            }

            // Convert GitHub PR data to our PullRequestData format
            prData = {
                installationId,
                repositoryName,
                prNumber,
                prUrl: prDetails.html_url,
                title: prDetails.title,
                body: prDetails.body || "",
                changedFiles: [], // Will be populated below
                linkedIssues: PRAnalysisService.extractLinkedIssues(prDetails.body || ""),
                author: prDetails.user.login,
                isDraft: Boolean(prDetails.draft)
            };

            // Fix relative issue URLs to use current repository
            prData.linkedIssues = prData.linkedIssues.map(issue => ({
                ...issue,
                url: issue.url.startsWith("#")
                    ? `https://github.com/${repositoryName}/issues/${issue.number}`
                    : issue.url
            }));

            // Fetch changed files
            prData.changedFiles = await PRAnalysisService.fetchChangedFiles(
                installationId,
                repositoryName,
                prNumber
            );

            const extractionTime = Date.now() - startTime;
            PRAnalysisService.logExtractionResult(prData, extractionTime, true);

        } catch (error: unknown) {
            const extractionTime = Date.now() - startTime;
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");
            const errorMessage = getFieldFromUnknownObject<string>(error, "message");

            if (errorStatus === 404) {
                return res.status(404).json({
                    success: false,
                    error: `PR #${prNumber} not found in repository ${repositoryName}`,
                    data: {
                        installationId,
                        repositoryName,
                        prNumber
                    },
                    timestamp: new Date().toISOString()
                } as APIResponse);
            }

            PRAnalysisService.logExtractionResult(
                { installationId, repositoryName, prNumber } as PullRequestData,
                extractionTime,
                false,
                (errorMessage ? (error as Error) : undefined)
            );

            throw new GitHubAPIError(
                `Failed to fetch PR data for PR #${prNumber}`,
                errorStatus,
                undefined,
                { installationId, repositoryName, prNumber, originalError: errorMessage }
            );
        }

        // Validate PR data and check eligibility
        try {
            PRAnalysisService.validatePRData(prData);

            if (!PRAnalysisService.shouldAnalyzePR(prData)) {
                const reason = prData.isDraft ? "PR is in draft status" : "PR does not link to any issues";

                PRAnalysisService.logAnalysisDecision(prData, false, reason);

                return res.status(400).json({
                    success: false,
                    error: `PR not eligible for analysis: ${reason}`,
                    data: {
                        installationId: prData.installationId,
                        repositoryName: prData.repositoryName,
                        prNumber: prData.prNumber,
                        prUrl: prData.prUrl,
                        isDraft: prData.isDraft,
                        linkedIssuesCount: prData.linkedIssues.length,
                        reason
                    },
                    timestamp: new Date().toISOString()
                } as APIResponse);
            }

        } catch (error) {
            if (error instanceof PRNotEligibleError) {
                PRAnalysisService.logAnalysisDecision(prData, false, error.reason);

                return res.status(400).json({
                    success: false,
                    error: `PR not eligible for analysis: ${error.reason}`,
                    data: {
                        installationId: prData.installationId,
                        repositoryName: prData.repositoryName,
                        prNumber: prData.prNumber,
                        prUrl: prData.prUrl,
                        reason: error.reason
                    },
                    timestamp: new Date().toISOString()
                } as APIResponse);
            }
            throw error;
        }

        // Log successful analysis decision
        PRAnalysisService.logAnalysisDecision(prData, true, "Manual trigger");

        // TODO: In future tasks, this will trigger the complete AI analysis workflow
        // For now, we return success with PR data to confirm the trigger worked
        console.log("Manual PR analysis data prepared successfully:", {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            author: prData.author,
            complexity: PRAnalysisService.calculatePRComplexity(prData.changedFiles)
        });

        // Return success response with PR analysis data
        res.status(200).json({
            success: true,
            message: "PR analysis triggered successfully",
            data: {
                installationId: prData.installationId,
                repositoryName: prData.repositoryName,
                prNumber: prData.prNumber,
                prUrl: prData.prUrl,
                title: prData.title,
                author: prData.author,
                isDraft: prData.isDraft,
                linkedIssuesCount: prData.linkedIssues.length,
                changedFilesCount: prData.changedFiles.length,
                linkedIssues: prData.linkedIssues.map(issue => ({
                    number: issue.number,
                    url: issue.url,
                    linkType: issue.linkType
                })),
                complexity: PRAnalysisService.calculatePRComplexity(prData.changedFiles),
                eligibleForAnalysis: true,
                triggerType: "manual",
                triggeredBy: userId
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        console.error("Manual PR analysis trigger failed:", error);

        if (error instanceof PRAnalysisError) {
            return res.status(400).json({
                success: false,
                error: error.message,
                code: error.code,
                data: {
                    installationId,
                    repositoryName,
                    prNumber,
                    details: error.details
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        if (error instanceof GitHubAPIError) {
            return res.status(error.statusCode || 500).json({
                success: false,
                error: error.message,
                code: error.code,
                data: {
                    installationId,
                    repositoryName,
                    prNumber
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Pass unexpected errors to error middleware
        next(error);
    }
};
