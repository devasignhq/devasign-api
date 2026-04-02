import { Request, Response, NextFunction } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { cloudTasksService } from "../cloud-tasks.service";

export class InstallationRepositoriesWebhookService {
    /**
     * Handles GitHub installation_repositories webhook events
     */
    static async handleInstallationRepositoriesEvent(req: Request, res: Response, next: NextFunction) {
        const { action, installation, repositories_added, repositories_removed } = req.body;

        try {
            const installationId = installation.id.toString();

            dataLogger.info(`Handling installation_repositories event for installation: ${installationId}`, { action });

            // Add indexing job for each added repository
            if (action === "added" && repositories_added && Array.isArray(repositories_added)) {
                for (const repo of repositories_added) {
                    if (repo && repo.full_name) {
                        dataLogger.info(`Adding indexing job for added repository ${installationId}: ${repo.full_name}`);
                        try {
                            await cloudTasksService.addRepositoryIndexingJob(installationId, repo.full_name);
                        } catch (error) {
                            dataLogger.warn(`Failed to add indexing job for added repository ${repo.full_name}:`, { error });
                        }
                    }
                }
            }

            // Add clear repo job for each removed repository
            if (action === "removed" && repositories_removed && Array.isArray(repositories_removed)) {
                for (const repo of repositories_removed) {
                    if (repo && repo.full_name) {
                        dataLogger.info(`Adding clear repo job for removed repository ${installationId}: ${repo.full_name}`);
                        try {
                            await cloudTasksService.addClearRepoJob(installationId, repo.full_name);
                        } catch (error) {
                            dataLogger.warn(`Failed to add clear repo job for removed repository ${repo.full_name}:`, { error });
                        }
                    }
                }
            }

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId, action },
                message: "installation_repositories event processed"
            });
        } catch (error) {
            next(error);
        }
    }
}
