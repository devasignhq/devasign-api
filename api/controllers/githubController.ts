import { Request, Response, NextFunction } from 'express';
import { GitHubService } from '../services/githubService';
import { ErrorClass, IssueFilters } from '../types/general';
import { prisma } from '../config/database';

const validateUserInstallation = async (installationId: string, userId: string) => {
    const installation = await prisma.installation.findUnique({
        where: {
            id: installationId,
            users: { some: { userId } }
        },
        select: { id: true }
    });

    if (!installation) {
        throw new ErrorClass(
            "AuthenticationError", 
            null, 
            "Only members of this installation are allowed access"
        );
    }
}

export const getInstallationRepositories = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const repositories = await GitHubService.getInstallationRepositories(installationId);

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

export const getRepositoryResources = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repoUrl } = req.query;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const resources = await GitHubService.getRepoLabelsAndMilestones(
            repoUrl as string,
            installationId
        );

        res.status(200).json(resources);
    } catch (error) {
        next(error);
    }
};

export const setBountyLabel = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { repoUrl } = req.query;
    const { userId } = req.body;

    try {
        await validateUserInstallation(installationId, userId);

        const bountyLabel = await GitHubService.getBountyLabel(
            repoUrl as string,
            installationId
        );

        if (bountyLabel) {
            return res.status(200).json({ valid: true });
        }
        
        await GitHubService.createBountyLabel(
            repoUrl as string,
            installationId
        );

        res.status(200).json({ valid: true });
    } catch (error) {
        next(error);
    }
};