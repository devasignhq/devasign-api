import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config.js";
import { stellarService } from "../../services/stellar.service.js";
import { responseWrapper, stellarTimestampToDate } from "../../utils/helper.js";
import { STATUS_CODES } from "../../utils/data.js";
import { CreateTask, TaskIssue, FilterTasks } from "../../models/task.model.js";
import { HorizonApi } from "../../models/horizonapi.model.js";
import { Prisma, TaskStatus, TransactionCategory } from "../../../prisma_client/index.js";
import { OctokitService } from "../../services/octokit.service.js";
import {
    AuthorizationError,
    EscrowContractError,
    NotFoundError,
    ValidationError
} from "../../models/error.model.js";
import { ContractService } from "../../services/contract.service.js";
import { KMSService } from "../../services/kms.service.js";
import { dataLogger } from "../../config/logger.config.js";
import { statsigService } from "../../services/statsig.service.js";
import { SocketService } from "../../services/socket.service.js";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

/**
 * Create a new task
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { payload: data } = req.body;
    const payload = data as CreateTask;
    const activityData = (message: string) => ({
        userId: userId as string,
        type: "installation" as const,
        installationId: payload.installationId,
        issueUrl: payload.issue.url,
        operation: "task_creation",
        message
    });

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: {
                id: payload.installationId,
                users: { some: { userId } }
            },
            select: { wallet: true, status: true }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found or user is not a member of the installation");
        }

        // Check if installation is archived
        if (installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot create task for an archived installation");
        }
        // Check if installation wallet exists
        if (!installation.wallet) {
            throw new ValidationError("Installation wallet not found");
        }

        // Update activity: Preparing task creation
        SocketService.updateAppActivity(activityData("Recording task details..."))
            .catch((error: Error) => {
                dataLogger.error(
                    "Failed to update app activity (Recording task details...)",
                    { error }
                );
            });

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(installation.wallet.address);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        // Confirm USDC trustline
        if (!usdcAsset) {
            throw new ValidationError("USDC trustline not found");
        }
        // Confirm USDC balance
        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ValidationError("Insufficient balance");
        }

        const decryptedInstallationWalletSecret = await KMSService.decryptWallet(installation.wallet);

        const { installationId, bountyLabelId, ...others } = payload;

        // Create task
        const task = await prisma.task.create({
            data: {
                ...others,
                bounty: parseFloat(payload.bounty),
                installation: {
                    connect: { id: installationId }
                },
                creator: {
                    connect: { userId }
                }
            }
        });

        // Update activity: Creating escrow on smart contract
        SocketService.updateAppActivity(activityData("Creating escrow on Stellar network..."))
            .catch((error: Error) => {
                dataLogger.error(
                    "Failed to update app activity (Creating escrow on Stellar network...)",
                    { taskId: task.id, error }
                );
            });

        // Create escrow on smart contract
        let escrowResult;
        try {
            escrowResult = await ContractService.createEscrow(
                decryptedInstallationWalletSecret,
                task.id,
                payload.issue.url,
                parseFloat(payload.bounty)
            );
        } catch (error) {
            // If escrow creation fails, log, rollback task creation and throw error
            dataLogger.error(
                "Failed to create escrow on smart contract",
                { issueId: payload.issue.id, installationId }
            );

            try {
                await prisma.task.delete({ where: { id: task.id } });
            } catch (error) {
                dataLogger.error(
                    "Failed to rollback task creation",
                    { taskId: task.id, installationId, issueId: payload.issue.id, error }
                );
            }

            if (error instanceof EscrowContractError) {
                throw error;
            }
            throw new EscrowContractError("Failed to create escrow on smart contract", { error });
        }

        // Update activity: Posting bounty details to GitHub
        SocketService.updateAppActivity(activityData("Posting bounty details to GitHub..."))
            .catch((error: Error) => {
                dataLogger.error(
                    "Failed to update app activity (Posting bounty details to GitHub...)",
                    { taskId: task.id, error }
                );
            });

        let bountyComment, postedComment = false;
        try {
            // Add bounty label to issue and post bounty comment on issue
            bountyComment = await OctokitService.addBountyLabelAndCreateBountyComment(
                installationId,
                others.issue.id,
                bountyLabelId,
                OctokitService.customBountyMessage(others.bounty, task.id)
            );
            postedComment = true;
        } catch (error) {
            // Log error and continue
            dataLogger.info(
                "Failed to either post bounty comment or add bounty label",
                { taskId: task.id, error }
            );
        }

        // Update activity: Finalizing task creation
        SocketService.updateAppActivity(activityData("Finalizing task setup..."))
            .catch((error: Error) => {
                dataLogger.error(
                    "Failed to update app activity (Finalizing task setup...)",
                    { taskId: task.id, error }
                );
            });

        const [updatedTask] = await prisma.$transaction([
            // Update task status, escrow transaction hash and issue bindings with bounty comment id
            prisma.task.update({
                where: { id: task.id },
                data: {
                    status: TaskStatus.OPEN,
                    issue: {
                        ...(typeof task.issue === "object" && task.issue !== null ? task.issue : {}),
                        bountyLabelId,
                        ...(bountyComment && { bountyCommentId: bountyComment.id })
                    },
                    escrowTransactions: {
                        push: { txHash: escrowResult.txHash, method: "creation" }
                    }
                },
                select: { issue: true }
            }),
            // Record bounty transaction
            prisma.transaction.create({
                data: {
                    txHash: escrowResult.txHash,
                    category: "BOUNTY",
                    amount: parseFloat(task.bounty.toString()),
                    task: { connect: { id: task.id } },
                    installation: { connect: { id: installationId } },
                    doneAt: stellarTimestampToDate(escrowResult.result.createdAt)
                }
            })
        ]);

        // Log statsig event
        statsigService.logEvent(
            { userID: userId, email: res.locals.user.email },
            "bounty_creation_manual_success",
            parseFloat(payload.bounty),
            { installationId, issueUrl: payload.issue.url }
        );

        // Return task and notify user if bounty comment was not posted
        if (!postedComment) {
            return responseWrapper({
                res,
                status: STATUS_CODES.OK,
                data: task,
                message: "Task created successfully",
                warning: "Failed to either post bounty comment or add bounty label."
            });
        }

        // All operations successful
        responseWrapper({
            res,
            status: STATUS_CODES.CREATED,
            data: { ...task, ...updatedTask },
            message: "Task created successfully"
        });

        // Delete app activity
        SocketService.deleteAppActivity(activityData(""))
            .catch((error: Error) => {
                dataLogger.error(
                    "Failed to delete app activity",
                    { taskId: task.id, error }
                );
            });
    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: userId, email: res.locals.user.email },
            "bounty_creation_manual_failed",
            parseFloat(req.body?.payload?.bounty || 0),
            {
                error: error instanceof Error ? error.message : "Unknown error",
                installationId: payload.installationId,
                issueUrl: payload.issue.url
            }
        );
        next(error);
    }
};

/**
 * Get open tasks. Used in the task explorer page of the contributor app.
 */
export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    const {
        installationId,
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels
    } = req.query;

    // Extract filters
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels
    } as FilterTasks;

    try {
        // Build where clause based on filters
        const where: Prisma.TaskWhereInput = { status: "OPEN" };

        if (installationId) {
            where.installationId = installationId as string;
        }

        const issueFilters: Prisma.JsonFilter<"Task">[] = [];

        // TODO: extract to top level (issueLabels, issueTitle, repoUrl)
        if (filters.repoUrl) {
            issueFilters.push({
                path: ["repository", "url"],
                string_contains: filters.repoUrl
            });
        }
        if (filters.issueTitle) {
            issueFilters.push({
                path: ["title"],
                string_contains: filters.issueTitle,
                mode: "insensitive"
            });
        }
        if (filters.issueLabels) {
            const labelsArray = Array.isArray(filters.issueLabels) ? filters.issueLabels : [filters.issueLabels as unknown as string];
            if (labelsArray.length > 0) {
                issueFilters.push({
                    path: ["labels"],
                    array_contains: labelsArray.map((label) => ({ name: label }))
                });
            }
        }
        if (issueFilters.length > 0) {
            where.AND = issueFilters.map(filter => ({ issue: filter }));
        }

        // Parse limit
        const take = Math.min(Number(limit) || 20, 50);
        const skip = (Number(page) - 1) * Number(limit);

        // Get tasks with pagination
        const tasks = await prisma.task.findMany({
            where,
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                status: true,
                contributorId: true,
                creatorId: true,
                installationId: true,
                createdAt: true,
                updatedAt: true,
                ...(detailed ? {
                    installation: {
                        select: { account: true }
                    },
                    creator: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    escrowTransactions: true
                } : {})
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
            },
            skip,
            take: take + 1 // Request one extra record beyond the limit
        });

        // Determine if more results exist and trim the array
        const hasMore = tasks.length > take;
        const results = hasMore ? tasks.slice(0, take) : tasks;

        // Return paginated tasks
        responseWrapper({
            res,
            status: STATUS_CODES.OK,
            data: results,
            pagination: { hasMore }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get details of a specific open task. Used in the task explorer page of the contributor app.
 */
export const getTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;

    try {
        // Fetch task and ensure it is open
        const task = await prisma.task.findFirst({
            where: {
                id: taskId,
                status: { in: ["OPEN", "IN_PROGRESS"] }
            },
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                status: true,
                installation: {
                    select: {
                        id: true,
                        account: true
                    }
                },
                creator: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
                escrowTransactions: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!task) {
            throw new NotFoundError("Task not found");
        }

        // Return task
        responseWrapper({
            res,
            status: STATUS_CODES.OK,
            data: task
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a task
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    let installationId: string, issueUrl: string;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                bounty: true,
                issue: true,
                creatorId: true,
                contributorId: true,
                installation: {
                    select: { id: true, wallet: true, status: true }
                }
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify user is the creator
        if (task.creatorId !== userId) {
            throw new AuthorizationError("Only task creator can perform this action");
        }
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot delete task for an archived installation");
        }
        // Verify task is still open
        if (task.status !== "OPEN") {
            throw new ValidationError("Only open tasks can be deleted");
        }
        // Verify task has no assigned contributor
        if (task.contributorId) {
            throw new ValidationError("Cannot delete task with assigned contributor");
        }

        const taskIssue = task.issue as TaskIssue;
        installationId = task.installation.id;
        issueUrl = taskIssue.url;

        // Return bounty to installation wallet
        if (!task.installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }
        const decryptedWalletSecret = await KMSService.decryptWallet(task.installation.wallet);

        // Refund bounty to installation wallet
        const escrowResult = await ContractService.refund(decryptedWalletSecret, taskId);

        await prisma.$transaction([
            // Delete task
            prisma.task.delete({
                where: { id: taskId }
            }),
            // Record refund transaction
            prisma.transaction.create({
                data: {
                    txHash: escrowResult.txHash,
                    category: TransactionCategory.TOP_UP,
                    amount: parseFloat(task.bounty.toString()),
                    asset: "USDC",
                    sourceAddress: "Escrow Refunds",
                    doneAt: stellarTimestampToDate(escrowResult.result.createdAt),
                    installation: { connect: { id: task.installation.id } }
                }
            })
        ]);

        // Log statsig event
        statsigService.logEvent(
            { userID: userId, email: res.locals.user.email },
            "delete_bounty_success",
            task.bounty.toString(),
            { installationId: task.installation.id, issueUrl: taskIssue.url }
        );

        try {
            // Remove bounty label from issue and delete bounty comment
            await OctokitService.removeBountyLabelAndDeleteBountyComment(
                task.installation.id,
                taskIssue.id,
                taskIssue.bountyCommentId!,
                taskIssue.bountyLabelId!
            );

            // Return success response
            responseWrapper({
                res,
                status: STATUS_CODES.OK,
                message: "Task deleted successfully",
                data: { refunded: `${task.bounty} USDC` }
            });
        } catch (error) {
            // Log error
            dataLogger.info("Failed to remove bounty label from issue or delete bounty comment", { error });
            // Return success response but notify user of partial failure
            responseWrapper({
                res,
                status: STATUS_CODES.OK,
                message: "Task deleted successfully",
                data: { refunded: `${task.bounty} USDC` },
                warning: "Failed to either remove bounty label from the task issue or delete bounty comment."
            });
        }
    } catch (error) {
        // Log statsig event
        statsigService.logEvent(
            { userID: userId, email: res.locals.user.email },
            "delete_bounty_failed",
            undefined,
            {
                error: error instanceof Error ? error.message : "Unknown error",
                installationId: installationId!,
                issueUrl: issueUrl!
            }
        );
        next(error);
    }
};
