import { Request, Response, NextFunction } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { dataLogger } from "../../config/logger.config";
import { cloudTasksService } from "../cloud-tasks.service";

interface PushCommit {
    added: string[];
    modified: string[];
    removed: string[];
}

export class PushWebhookService {
    /**
     * Handles GitHub push webhook events (default branch only — filtered by middleware)
     */
    static async handlePushEvent(req: Request, res: Response, next: NextFunction) {
        const { installation, repository, commits } = req.body;

        try {
            const installationId = installation.id.toString();
            const repositoryName = repository.full_name;

            dataLogger.info(`Handling push event for ${repositoryName}`, {
                installationId,
                commitCount: commits?.length ?? 0
            });

            // Deduplicate changed files across all commits
            const { filesToIndex, filesToRemove } = PushWebhookService.deduplicateChangedFiles(commits || []);

            // Skip if no relevant changes
            if (filesToIndex.length === 0 && filesToRemove.length === 0) {
                dataLogger.info("Push event has no file changes to process", { installationId, repositoryName });
                responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { installationId, repositoryName },
                    message: "No file changes to process"
                });
                return;
            }

            dataLogger.info(`Push event: ${filesToIndex.length} files to index, ${filesToRemove.length} files to remove`, {
                installationId,
                repositoryName
            });

            // Queue incremental indexing job
            await cloudTasksService.addIncrementalIndexingJob(
                installationId,
                repositoryName,
                filesToIndex,
                filesToRemove
            );

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: {
                    installationId,
                    repositoryName,
                    filesToIndex: filesToIndex.length,
                    filesToRemove: filesToRemove.length
                },
                message: "Incremental indexing job queued"
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Deduplicates changed files across all commits in a push.
     * This ensures the final state of files is correctly represented.
     * - A file added or modified will be in `filesToIndex`, even if it was removed in an earlier commit.
     * - A file removed will be in `filesToRemove`, unless it was re-added or modified in a later commit.
     * - A file that is added and then removed within the same push will end up in `filesToRemove`.
     */
    static deduplicateChangedFiles(commits: PushCommit[]): {
        filesToIndex: string[];
        filesToRemove: string[];
    } {
        const addedOrModified = new Set<string>();
        const removed = new Set<string>();

        for (const commit of commits) {
            // Process in order: added/modified files override previous removals
            for (const file of commit.added || []) {
                addedOrModified.add(file);
                removed.delete(file);
            }
            for (const file of commit.modified || []) {
                addedOrModified.add(file);
                removed.delete(file);
            }
            // Removed files override previous additions (unless re-added later)
            for (const file of commit.removed || []) {
                addedOrModified.delete(file);
                removed.add(file);
            }
        }

        return {
            filesToIndex: Array.from(addedOrModified),
            filesToRemove: Array.from(removed)
        };
    }
}
