import { Request, Response, NextFunction } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { indexingService } from "../pr-review/indexing.service";
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
                        dataLogger.info(`Indexing added repository for installation ${installationId}: ${repo.full_name}`);
                        try {
                            await cloudTasksService.addRepositoryIndexingJob(installationId, repo.full_name);
                        } catch (error) {
                            dataLogger.warn(`Failed to add indexing job for added repository ${repo.full_name}:`, { error });
                        }
                    }
                }
            }

            // Clear all indexed files across removed repositories
            if (action === "removed" && repositories_removed && Array.isArray(repositories_removed)) {
                for (const repo of repositories_removed) {
                    if (repo && repo.full_name) {
                        try {
                            await indexingService.clearRepositoryData(installationId, repo.full_name);
                            dataLogger.info(`Cleared indexing data for removed repository ${installationId}: ${repo.full_name}`);
                        } catch (error) {
                            dataLogger.warn(`Failed to clear indexing data for removed repository ${repo.full_name}:`, { error });
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
