import { Request, Response, NextFunction } from "express";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { Task } from "../../../prisma_client";
import { ContractService } from "../contract.service";
import { KMSService } from "../kms.service";
import { OctokitService } from "../octokit.service";
import { TaskIssue } from "../../models/task.model";
import { cloudTasksService } from "../cloud-tasks.service";

export class InstallationWebhookService {
    /**
     * Handles GitHub Installation webhook events
     */
    static async handleInstallationEvent(req: Request, res: Response, next: NextFunction) {
        const { action } = req.body;

        try {
            switch (action) {
                case "created":
                    await InstallationWebhookService.handleInstallationCreated(req, res, next);
                    return;

                case "deleted":
                case "suspend":
                    await InstallationWebhookService.handleInstallationDeletedOrSuspended(req, res, next);
                    return;

                case "unsuspend":
                    await InstallationWebhookService.handleInstallationUnsuspended(req, res, next);
                    return;

                default:
                    responseWrapper({
                        res,
                        status: STATUS_CODES.SUCCESS,
                        data: { action },
                        message: "Installation action not processed"
                    });
                    return;
            }

        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles new GitHub installation created events
     */
    static async handleInstallationCreated(req: Request, res: Response, next: NextFunction) {
        try {
            const { installation: githubInstallation, repositories } = req.body;
            const installationId = githubInstallation.id.toString();

            // Log creation, actual setup happens via user flow
            dataLogger.info(`Installation created: ${installationId}`);

            // Start indexing job for each repository
            if (repositories && Array.isArray(repositories)) {
                for (const repo of repositories) {
                    if (repo && repo.full_name) {
                        try {
                            await cloudTasksService.addRepositoryIndexingJob(installationId, repo.full_name);
                        } catch (error) {
                            dataLogger.warn(`Failed to add indexing job for ${repo.full_name}:`, { error });
                        }
                    }
                }
            }

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId },
                message: "Installation creation logged"
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles GitHub installation deleted or suspended events
     */
    static async handleInstallationDeletedOrSuspended(req: Request, res: Response, next: NextFunction) {
        try {
            const { action, installation: githubInstallation } = req.body;
            const installationId = githubInstallation.id.toString();

            // Archive installation and refund open tasks
            const installation = await prisma.installation.findUnique({
                where: { id: installationId },
                include: {
                    wallet: true,
                    tasks: {
                        where: {
                            status: {
                                in: ["OPEN", "IN_PROGRESS"]
                            },
                            bounty: { gt: 0 }
                        }
                    }
                }
            });

            if (!installation) {
                // Installation not found
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { installationId },
                    message: "Installation not found in database, skipping archive"
                });
            }

            // Add clear installation job for all installation repos
            if (action === "deleted") {
                dataLogger.info(`Adding clear installation job for installation ${installationId}`);
                try {
                    await cloudTasksService.addClearInstallationJob(installationId);
                } catch (error) {
                    dataLogger.warn(
                        `Failed to add clear installation job for installation ${installationId}:`,
                        { error }
                    );
                }
            }

            let refundedAmount = 0;
            const taskRefunds: { task: Task; refunded: boolean }[] = [];

            // Refund escrow funds
            if (installation.wallet && installation.tasks.length > 0) {
                try {
                    const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);

                    for (const task of installation.tasks) {
                        try {
                            await ContractService.refund(decryptedWalletSecret, task.id);
                            refundedAmount += task.bounty;
                            taskRefunds.push({ task, refunded: true });
                        } catch (error) {
                            dataLogger.warn(
                                `Failed to refund task ${task.id} during installation archive:`,
                                { error, installationId }
                            );
                            taskRefunds.push({ task, refunded: false });
                        }
                    }
                } catch (error) {
                    dataLogger.error(
                        "Failed to decrypt wallet for refund during installation archive",
                        { error, installationId }
                    );
                }
            }

            // Update installation status
            await prisma.installation.update({
                where: { id: installationId },
                data: { status: "ARCHIVED" }
            });

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId, refundedAmount },
                message: `Installation archived and ${refundedAmount} USDC refunded`
            });

            // Execute cleanup operations in the background
            for (const taskRefund of taskRefunds) {
                const taskIssue = taskRefund.task.issue as TaskIssue;

                // Remove bounty label and delete bounty comment
                OctokitService.removeBountyLabelAndDeleteBountyComment(
                    installationId,
                    taskIssue.id,
                    taskIssue.bountyCommentId!,
                    taskIssue.bountyLabelId!
                ).catch((error) => {
                    dataLogger.warn(
                        `Failed to remove bounty label and delete bounty comment for task ${taskRefund.task.id} during installation archive:`,
                        { error, installationId }
                    );
                });

                // Update task status and settled state
                prisma.task.update({
                    where: { id: taskRefund.task.id },
                    data: {
                        status: "ARCHIVED",
                        settled: taskRefund.refunded
                    }
                }).catch((error) => {
                    dataLogger.warn(
                        `Failed to update task ${taskRefund.task.id} status to ARCHIVED during installation archive:`,
                        { error, installationId }
                    );
                });
            }
        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles GitHub installation unsuspend events
     */
    static async handleInstallationUnsuspended(req: Request, res: Response, next: NextFunction) {
        try {
            const { installation: githubInstallation } = req.body;
            const installationId = githubInstallation.id.toString();

            // Reactivate installation
            await prisma.installation.update({
                where: { id: installationId },
                data: { status: "ACTIVE" }
            });

            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { installationId },
                message: "Installation reactivated"
            });
        } catch (error) {
            next(error);
        }
    }
}
