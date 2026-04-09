import { Request, Response, NextFunction } from "express";
import { OctokitService } from "../../services/octokit.service.js";
import { IssueFilters } from "../../models/github.model.js";
import { responseWrapper } from "../../utilities/helper.js";
import { STATUS_CODES } from "../../utilities/data.js";

/**
 * Retrieves repositories accessible by a specific GitHub App installation.
 */
export const getInstallationRepositories = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;

    try {
        // Fetch repositories from GitHub API
        const repositories = await OctokitService.getInstallationRepositories(installationId);

        // Return repositories in response
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: repositories,
            message: "Repositories retrieved successfully"
        });
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
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: result.issues,
            pagination: { hasMore: result.hasMore },
            message: "Issues retrieved successfully"
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
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: resources,
            message: "Repository resources retrieved successfully"
        });
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
            return responseWrapper({
                res,
                status: 200,
                data: { bountyLabel },
                message: "Bounty label already exists"
            });
        }

        // If bounty label doesn't exist, create it
        bountyLabel = await OctokitService.createBountyLabels(
            repositoryId as string,
            installationId
        );

        // Return bounty label
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: bountyLabel,
            message: "Bounty label created successfully"
        });
    } catch (error) {
        next(error);
    }
};
