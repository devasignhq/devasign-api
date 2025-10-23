import { Request, Response, NextFunction } from "express";
import { OctokitService } from "../../services/octokit.service";
import { IssueFilters } from "../../models/github.model";
import { PRAnalysisService } from "../../services/ai-review/pr-analysis.service";
import { PullRequestData, APIResponse } from "../../models/ai-review.model";
import { PRAnalysisError, GitHubAPIError, ErrorClass } from "../../models/error.model";
import { STATUS_CODES, getFieldFromUnknownObject } from "../../utilities/helper";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * Retrieves repositories accessible by a specific GitHub App installation.
 */
export const getInstallationRepositories = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;

    try {
        // Fetch repositories from GitHub API
        const repositories = await OctokitService.getInstallationRepositories(installationId);

        // Return repositories in response
        res.status(STATUS_CODES.SUCCESS).json(repositories);
    } catch (error) {
        next(error);
    }
};

/**
 * Retrieves issues from a specific repository with optional filters and pagination.
 */
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

    try {
        // Organize filters
        const filters: IssueFilters = {
            title: title as string,
            labels: labels ? labels as string[] : undefined,
            milestone: milestone as string,
            sort: sort as ("created" | "updated" | "comments"),
            direction: direction as ("asc" | "desc")
        };

        // Fetch issues from GitHub API
        const result = await OctokitService.getRepoIssuesWithSearch(
            repoUrl as string,
            installationId,
            filters,
            parseInt(page as string),
            parseInt(perPage as string)
        );

        // Return issues with pagination in response
        res.status(STATUS_CODES.SUCCESS).json({
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

/**
 * Retrieves labels and milestones for a specific repository.
 */
export const getRepositoryResources = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repoUrl } = req.query;

    try {
        // Fetch labels and milestones
        const resources = await OctokitService.getRepoLabelsAndMilestones(
            repoUrl as string,
            installationId
        );

        // Return labels and milestones
        res.status(STATUS_CODES.SUCCESS).json(resources);
    } catch (error) {
        next(error);
    }
};

/**
 * Gets or creates a "bounty" label in the specified repository.
 */
export const getOrCreateBountyLabel = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repositoryId } = req.query;

    try {
        let bountyLabel;

        // Check if bounty label already exists
        try {
            bountyLabel = await OctokitService.getBountyLabel(
                repositoryId as string,
                installationId
            );
        } catch { /* empty */ }

        // If bounty label already exists, return it
        if (bountyLabel) {
            return res.status(200).json({ valid: true, bountyLabel });
        }

        // If bounty label doesn't exist, create it
        bountyLabel = await OctokitService.createBountyLabel(
            repositoryId as string,
            installationId
        );

        // Return bounty label
        res.status(STATUS_CODES.SUCCESS).json({ valid: true, bountyLabel });
    } catch (error) {
        next(error);
    }
};

/**
 * Manual trigger for PR analysis
 */
export const triggerManualPRAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repositoryName, prNumber } = req.body;
    const { userId } = req.body;

    try {
        messageLogger.info(`Manual PR analysis triggered by user ${userId} for PR #${prNumber} in ${repositoryName}`);

        const startTime = Date.now();
        let prData: PullRequestData;

        try {
            // Get PR details from GitHub API
            const prDetails = await OctokitService.getPRDetails(installationId, repositoryName, prNumber);

            if (!prDetails) {
                return res.status(STATUS_CODES.NOT_FOUND).json({
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

            // Extract linked issues from PR body
            const linkedIssues = await PRAnalysisService.extractLinkedIssues(
                prDetails.body || "",
                installationId,
                repositoryName
            );

            // Convert GitHub PR data to our PullRequestData format
            prData = {
                installationId,
                repositoryName,
                prNumber,
                prUrl: prDetails.html_url,
                title: prDetails.title,
                body: prDetails.body || "",
                changedFiles: [], // Will be populated below
                linkedIssues,
                author: prDetails.user.login,
                isDraft: Boolean(prDetails.draft),
                formattedPullRequest: ""
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
            
            // Create a formatted summary of the PR
            const changedFilesInfo = prData.changedFiles.map(file =>
                `${file.filename} (${file.status}, +${file.additions}/-${file.deletions})${file.previousFilename ? ` (renamed from ${file.previousFilename})` : ""}`
            ).join("\n");

            const codeChangesPreview = prData.changedFiles.map((file) => {
                return `\n--- ${file.filename} (${file.status}) ---\n${file.patch}`;
            }).join("\n");

            const linkedIssuesInfo = prData.linkedIssues.map(issue => `- #${issue.number}:\n
                title: ${issue.title}\n
                body: ${issue.body}\n
                labels: ${issue.labels.map(label => `${label.name} (${label.description}), `)}`).join("\n\n");

            prData.formattedPullRequest = `Here's the pull request summary:

PULL REQUEST CHANGES:
Repository: ${prData.repositoryName}
PR #${prData.prNumber}: ${prData.title}
Author: ${prData.author}

Body:
${prData.body || "No body provided"}

Linked Issue(s): 
${linkedIssuesInfo}

CHANGED FILES:
${changedFilesInfo}

CODE CHANGES PREVIEW:
${codeChangesPreview}`;

            const extractionTime = Date.now() - startTime;
            PRAnalysisService.logExtractionResult(prData, extractionTime, true);

        } catch (error: unknown) {
            const extractionTime = Date.now() - startTime;
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");
            const errorMessage = getFieldFromUnknownObject<string>(error, "message");

            // Handle 404 Not Found specifically
            if (errorStatus === 404) {
                return res.status(STATUS_CODES.NOT_FOUND).json({
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
                (errorMessage ? (error as ErrorClass) : undefined)
            );

            throw new GitHubAPIError(
                `Failed to fetch PR data for PR #${prNumber}`,
                { installationId, repositoryName, prNumber, error },
                errorStatus
            );
        }

        // Check if PR is eligible for analysis
        try {
            if (!PRAnalysisService.shouldAnalyzePR(prData)) {
                const reason = prData.isDraft ? "PR is in draft status" : "PR does not link to any issues";

                PRAnalysisService.logAnalysisDecision(prData, false, reason);

                // Return PR not eligible for analysis
                return res.status(STATUS_CODES.SERVER_ERROR).json({
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
            // Handle PRAnalysisError specifically
            if (error instanceof PRAnalysisError) {
                PRAnalysisService.logAnalysisDecision(prData, false, error.message);

                return res.status(error.status).json({
                    success: false,
                    error: error.message,
                    data: {
                        installationId: prData.installationId,
                        repositoryName: prData.repositoryName,
                        prNumber: prData.prNumber,
                        prUrl: prData.prUrl
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
        dataLogger.info("Manual PR analysis data prepared successfully", {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            author: prData.author
        });

        // Return success response with PR analysis data
        res.status(STATUS_CODES.BACKGROUND_JOB).json({
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
                eligibleForAnalysis: true,
                triggerType: "manual",
                triggeredBy: userId
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        dataLogger.error("Manual PR analysis trigger failed", { error });

        // Handle known error types with specific responses
        if (error instanceof PRAnalysisError) {
            return res.status(error.status).json({
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
            return res.status(error.status).json({
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
