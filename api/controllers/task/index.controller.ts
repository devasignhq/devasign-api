import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { stellarService } from "../../services/stellar.service";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { CreateTask, TaskIssue, FilterTasks } from "../../models/task.model";
import { HorizonApi } from "../../models/horizonapi.model";
import { Prisma, TaskStatus } from "../../../prisma_client";
import { OctokitService } from "../../services/octokit.service";
import {
    AuthorizationError,
    EscrowContractError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";
import { ContractService } from "../../services/contract.service";
import { KMSService } from "../../services/kms.service";
import { dataLogger, messageLogger } from "../../config/logger.config";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

/**
 * Create a new task
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { payload: data } = req.body;
    const payload = data as CreateTask;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: payload.installationId },
            select: { wallet: true, status: true }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if installation is archived
        if (installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot create task for an archived installation");
        }

        // Check user balance
        if (!installation.wallet) {
            throw new ValidationError("Installation wallet not found");
        }
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
            // If escrow creation fails, log and throw error
            messageLogger.error("Failed to create escrow on smart contract");

            if (error instanceof EscrowContractError) {
                throw error;
            }
            throw new EscrowContractError("Failed to create escrow on smart contract", { error });
        }

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
            dataLogger.info("Failed to post bounty comment", { taskId: task.id, error });
        }

        const [updatedTask] = await prisma.$transaction([
            // Update task with bounty comment id
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

        // Return task and notify user if bounty comment was not posted
        if (!postedComment) {
            return responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
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
    } catch (error) {
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
        if (filters.issueLabels && filters.issueLabels.length > 0) {
            issueFilters.push({
                path: ["labels"],
                array_contains: filters.issueLabels.map((label) => ({ name: label }))
            });
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
                    }
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
            status: STATUS_CODES.SUCCESS,
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
        const task = await prisma.task.findUnique({
            where: { id: taskId, status: "OPEN" },
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
            status: STATUS_CODES.SUCCESS,
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
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot delete task for an archived installation");
        }
        // Verify user is the creator
        if (task.creatorId !== userId) {
            throw new AuthorizationError("Only task creator can perform this action");
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

        // Return bounty to installation wallet
        if (!task.installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }
        const decryptedWalletSecret = await KMSService.decryptWallet(task.installation.wallet);

        // Refund bounty to installation wallet
        await ContractService.refund(decryptedWalletSecret, taskId);

        // Delete task
        await prisma.task.delete({
            where: { id: taskId }
        });

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
                status: STATUS_CODES.SUCCESS,
                message: "Task deleted successfully",
                data: { refunded: `${task.bounty} USDC` }
            });
        } catch (error) {
            // Log error
            dataLogger.info("Failed to remove bounty label from issue or delete bounty comment", { error });

            // Return success response but notify user of partial failure
            responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                message: "Task deleted successfully",
                data: { refunded: `${task.bounty} USDC` },
                warning: "Failed to either remove bounty label from the task issue or delete bounty comment."
            });
        }
    } catch (error) {
        next(error);
    }
};
