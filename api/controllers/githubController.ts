import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '../services/githubService';
import { ErrorClass, IssueFilters } from '../types/general';

/**
 * Get installation repositories
 */
export const getInstallationRepositories = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;

    try {
        const repositories = await GitHubService.getInstallationRepositories(installationId);

        res.status(200).json({
            success: true,
            data: repositories
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get repository issues
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
        const filters: IssueFilters = {
            title: title as string,
            labels: labels ? (labels as string).split(',') : undefined,
            milestone: milestone as string,
            sort: sort as ("created" | "updated" | "comments"),
            direction: direction as ("asc" | "desc"),
        };

        const result = await GitHubService.getRepoIssuesWithSearch(
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

/**
 * Get repository resources (labels and milestones)
 */
export const getRepositoryResources = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repoUrl } = req.query;
    
    try {
        const resources = await GitHubService.getRepoLabelsAndMilestones(
            repoUrl as string,
            installationId
        );

        res.status(200).json(resources);
    } catch (error) {
        next(error);
    }
};