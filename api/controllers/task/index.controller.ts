import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { stellarService } from "../../services/stellar.service";
import { decryptWallet, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { CreateTask, TaskIssue, FilterTasks } from "../../models/task.model";
import { HorizonApi } from "../../models/horizonapi.model";
import { $Enums, Prisma } from "../../../prisma_client";
import { OctokitService } from "../../services/octokit.service";
import {
    AuthorizationError,
    EscrowContractError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";
import { ContractService } from "../../services/contract.service";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

/**
 * Create a new task
 */
export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload: data } = req.body;
    const payload = data as CreateTask;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: payload.installationId },
            select: { wallet: true }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(installation.wallet.address);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ValidationError("Insufficient balance");
        }

        // Confirm USDC trustline
        const decryptedInstallationWalletSecret = await decryptWallet(installation.wallet);

        const { installationId, bountyLabelId, ...others } = payload;

        // Format timeline if needed (ie 10 days -> 1.4 weeks)
        if (others.timeline && others.timelineType && others.timelineType === "DAY" && others.timeline > 6) {
            const weeks = Math.floor(others.timeline / 7);
            const days = others.timeline % 7;
            others.timeline = weeks + (days / 10);
            others.timelineType = "WEEK" as $Enums.TimelineType;
        }

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
            // If escrow creation fails, delete the task and rethrow
            await prisma.task.delete({ where: { id: task.id } });
            throw new EscrowContractError("Failed to create escrow on smart contract", error);
        }

        // Record bounty transaction
        const txHash = escrowResult.txHash;
        const bountyTransactionStatus = {
            recorded: false,
            error: undefined
        } as { recorded: boolean; error?: unknown };

        try {
            await prisma.transaction.create({
                data: {
                    txHash,
                    category: "BOUNTY",
                    amount: parseFloat(task.bounty.toString()),
                    task: { connect: { id: task.id } },
                    installation: { connect: { id: installationId } },
                    doneAt: stellarTimestampToDate(escrowResult.result.createdAt)
                }
            });

            bountyTransactionStatus.recorded = true;
        } catch (error) {
            bountyTransactionStatus.error = error;
        }

        try {
            // Add bounty label to issue and post bounty comment on issue
            const bountyComment = await OctokitService.addBountyLabelAndCreateBountyComment(
                installationId,
                others.issue.id,
                bountyLabelId,
                OctokitService.customBountyMessage(others.bounty, task.id)
            );

            // Update task with bounty comment id
            const updatedTask = await prisma.task.update({
                where: { id: task.id },
                data: {
                    issue: {
                        ...(typeof task.issue === "object" && task.issue !== null ? task.issue : {}),
                        bountyCommentId: bountyComment.id
                    }
                },
                select: { issue: true }
            });

            // Return task and notify user if bounty was not recorded 
            if (!bountyTransactionStatus.recorded) {
                return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                    error: bountyTransactionStatus.error,
                    transactionRecord: false,
                    task: { ...task, ...updatedTask },
                    message: "Failed to record bounty transaction."
                });
            }

            // All operations successful
            res.status(STATUS_CODES.POST).json({ ...task, ...updatedTask });
        } catch (error) {
            let message = "Failed to either create bounty comment or add bounty label.";

            // Update message if bounty transaction was not recorded
            if (!bountyTransactionStatus.recorded) {
                message = "Failed to record bounty transaction and to either create bounty comment or add bounty label.";
            }

            // Return task and notify user
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                transactionRecord: bountyTransactionStatus.recorded,
                task,
                message
            });
        }
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

        // Get total count for pagination
        const totalTasks = await prisma.task.count({ where });
        const totalPages = Math.ceil(totalTasks / Number(limit));
        const skip = (Number(page) - 1) * Number(limit);

        // Get tasks with pagination
        const tasks = await prisma.task.findMany({
            where,
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                timelineType: true,
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
            take: Number(limit)
        });

        // Return paginated tasks
        res.status(STATUS_CODES.SUCCESS).json({
            data: tasks,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalItems: totalTasks,
                itemsPerPage: Number(limit),
                hasMore: Number(page) < totalPages
            }
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
                timelineType: true,
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
        res.status(STATUS_CODES.SUCCESS).json(task);
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a task
 */
export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = req.body;

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
                    select: { id: true, wallet: true }
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
        // Verify task is still open
        if (task.status !== "OPEN") {
            throw new ValidationError("Only open tasks can be deleted");
        }
        // Verify task has no assigned contributor
        if (task.contributorId) {
            throw new ValidationError("Cannot delete task with assigned contributor");
        }

        const taskIssue = task.issue as TaskIssue;

        // Return bounty to installation wallet if it exists
        if (task.bounty > 0) {
            const decryptedWalletSecret = await decryptWallet(task.installation.wallet);

            await ContractService.refund(decryptedWalletSecret, taskId);
        }

        // Delete task
        await prisma.task.delete({
            where: { id: taskId }
        });

        try {
            // Remove bounty label from issue and delete bounty comment
            await OctokitService.removeBountyLabelAndDeleteBountyComment(
                task.installation.id,
                taskIssue.id,
                taskIssue.bountyCommentId!
            );

            // Return success response
            res.status(STATUS_CODES.SUCCESS).json({
                message: "Task deleted successfully",
                refunded: `${task.bounty} USDC`
            });
        } catch (error) {
            // Return success response but notify user of partial failure
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                data: {
                    message: "Task deleted successfully",
                    refunded: `${task.bounty} USDC`
                },
                message: "Failed to either remove bounty label from the task issue or delete bounty comment."
            });
        }
    } catch (error) {
        next(error);
    }
};
