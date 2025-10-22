import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { FirebaseService } from "../services/firebase.service";
import { usdcAssetId } from "../config/stellar.config";
import { stellarService } from "../services/stellar.service";
import { STATUS_CODES, decrypt } from "../helper";
import {
    MessageType,
    CreateTask,
    TaskIssue,
    FilterTasks
} from "../models";
import { HorizonApi } from "../models/horizonapi.model";
import { $Enums, Prisma, TaskStatus, TimelineType } from "../../prisma_client";
import { OctokitService } from "../services/octokit.service";
import {
    AuthorizationError,
    ErrorClass,
    NotFoundError,
    ValidationError
} from "../models/error.model";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

class TaskError extends ErrorClass {
    constructor(message: string, details: unknown = null) {
        super("TASK_ERROR", details, message);
    }
}

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
            select: {
                walletSecret: true,
                walletAddress: true,
                escrowSecret: true,
                escrowAddress: true
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(installation.walletAddress);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new TaskError("Insufficient balance");
        }

        // Confirm USDC trustline
        const decryptedInstallationWalletSecret = decrypt(installation.walletSecret);
        const decryptedEscrowWalletSecret = decrypt(installation.escrowSecret);
        const installationEscrowWallet = await stellarService.getAccountInfo(installation.escrowAddress!);

        if (
            !(installationEscrowWallet.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            ))
        ) {
            // Add USDC trustline if it does not exist
            await stellarService.addTrustLineViaSponsor(
                decryptedInstallationWalletSecret,
                decryptedEscrowWalletSecret
            );
        }

        // Transfer to escrow
        const { txHash } = await stellarService.transferAsset(
            decryptedInstallationWalletSecret,
            installation.escrowAddress!,
            usdcAssetId,
            usdcAssetId,
            payload.bounty
        );

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

        // Record bounty transaction
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
                    installation: { connect: { id: installationId } }
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

// ? TODO: Add publishTaskToGithub route
// ? TODO: Add createManyTasks route

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
 * Get tasks for a specific installation. Used in the project maintainer app.
 */
export const getInstallationTasks = async (req: Request, res: Response, next: NextFunction) => {
    const {
        status,
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels
    } = req.query;
    const { installationId } = req.params;
    const { userId } = req.body;

    // Extract filters
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels
    } as FilterTasks;

    try {
        // Build where clause based on filters
        const where: Prisma.TaskWhereInput = {
            installation: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        };

        if (status) {
            where.status = status as TaskStatus;
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
                settled: true,
                acceptedAt: true,
                completedAt: true,
                contributorId: true,
                creatorId: true,
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        taskActivities: {
                            where: { viewed: false }
                        }
                    }
                },
                ...(detailed ? {
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
                    contributor: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    applications: {
                        select: {
                            userId: true,
                            username: true
                        }
                    },
                    taskSubmissions: {
                        select: {
                            id: true,
                            pullRequest: true,
                            attachmentUrl: true
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
 * Get tasks assigned to a contributor. Used in the tasks page of the contributor app.
 */
export const getContributorTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const {
        installationId,
        status,
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
        const where: Prisma.TaskWhereInput = { contributorId: userId };

        if (status) {
            where.status = status as TaskStatus;
        }
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
                settled: true,
                acceptedAt: true,
                completedAt: true,
                contributorId: true,
                creatorId: true,
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
                    contributor: {
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
 * Get details of a specific installation task. Used in the project maintainer app.
 */
export const getInstallationTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId, installationId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch task and ensure it belongs to the installation and user has access
        const task = await prisma.task.findUnique({
            where: {
                id: taskId,
                installation: {
                    id: installationId,
                    users: {
                        some: { userId: userId as string }
                    }
                }
            },
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                timelineType: true,
                status: true,
                settled: true,
                acceptedAt: true,
                completedAt: true,
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
                contributor: {
                    select: {
                        userId: true,
                        username: true
                    }
                },
                createdAt: true,
                updatedAt: true,
                _count: {
                    select: {
                        taskActivities: true
                    }
                }
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
 * Get details of a specific task assigned to a contributor. Used in the tasks page of the contributor app.
 */
export const getContributorTask = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch task and ensure it is assigned to the contributor
        const task = await prisma.task.findUnique({
            where: { id: taskId, contributorId: userId },
            select: {
                id: true,
                issue: true,
                bounty: true,
                timeline: true,
                timelineType: true,
                status: true,
                settled: true,
                acceptedAt: true,
                completedAt: true,
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
                contributor: {
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
 * Add bounty comment id to a task. Fallback if saving the bounty comment id during task creation failed.
 */
export const addBountyCommentId = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId, bountyCommentId } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                id: true,
                status: true,
                creatorId: true,
                issue: true
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
            throw new ValidationError("Only open tasks can be updated");
        }

        // Update task with bounty comment id
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                issue: { ...(typeof task.issue === "object" && task.issue !== null ? task.issue : {}), bountyCommentId }
            },
            select: { id: true }
        });

        // Return updated task
        res.status(STATUS_CODES.SUCCESS).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

/**
 * Update the bounty amount of an open task. Only allowed if there are no existing applications.
 */
export const updateTaskBounty = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId, newBounty } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                bounty: true,
                installationId: true,
                issue: true,
                creatorId: true,
                installation: {
                    select: {
                        escrowAddress: true,
                        escrowSecret: true,
                        walletAddress: true,
                        walletSecret: true
                    }
                },
                _count: {
                    select: {
                        taskActivities: true
                    }
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
            throw new ValidationError("Only open tasks can be updated");
        }
        // Verify there are no existing applications
        if (task._count.taskActivities > 0) {
            throw new ValidationError("Cannot update the bounty amount for tasks with existing applications");
        }
        // Verify new bounty is different
        if (task.bounty === newBounty) {
            throw new ValidationError("New bounty is the same as current bounty");
        }

        // Handle fund transfers
        const bountyDifference = Number(newBounty) - task.bounty;
        const decryptedWalletSecret = decrypt(task.installation.walletSecret!);
        const additionalFundsTransaction = {
            txHash: "",
            amount: "",
            recorded: false,
            error: undefined
        } as { 
            txHash: string; 
            amount: string; 
            recorded: boolean; 
            error?: unknown 
        };

        if (bountyDifference > 0) {
            // Additional funds needed - transfer from wallet to escrow
            const accountInfo = await stellarService.getAccountInfo(task.installation.walletAddress!);
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset || parseFloat(usdcAsset.balance) < bountyDifference) {
                throw new TaskError("Insufficient USDC balance for compensation increase");
            }

            const { txHash } = await stellarService.transferAsset(
                decryptedWalletSecret,
                task.installation.escrowAddress!,
                usdcAssetId,
                usdcAssetId,
                bountyDifference.toString()
            );

            additionalFundsTransaction.txHash = txHash;
            additionalFundsTransaction.amount = bountyDifference.toString();
        } else {
            // Excess funds - return from escrow to wallet
            const decryptedEscrowSecret = decrypt(task.installation.escrowSecret!);
            await stellarService.transferAssetViaSponsor(
                decryptedWalletSecret,
                decryptedEscrowSecret,
                task.installation.walletAddress!,
                usdcAssetId,
                usdcAssetId,
                Math.abs(bountyDifference).toString()
            );
        }

        // Update task bounty
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { bounty: parseFloat(newBounty) },
            select: {
                bounty: true,
                updatedAt: true
            }
        });

        // Record additional funds transaction if any
        if (additionalFundsTransaction.txHash) {
            try {
                await prisma.transaction.create({
                    data: {
                        txHash: additionalFundsTransaction.txHash,
                        category: "BOUNTY",
                        amount: parseFloat(additionalFundsTransaction.amount),
                        task: { connect: { id: taskId } },
                        installation: { connect: { id: task.installationId } }
                    }
                });

                additionalFundsTransaction.recorded = true;
            } catch (error) {
                additionalFundsTransaction.error = error;
            }
        }

        try {
            // Update bounty comment on GitHub to reflect new bounty amount
            await OctokitService.updateIssueComment(
                task.installationId,
                (task.issue as TaskIssue).bountyCommentId!,
                OctokitService.customBountyMessage(newBounty as string, taskId)
            );

            // Return updated task and notify user if recording additional funds transaction failed
            if (!additionalFundsTransaction.recorded && additionalFundsTransaction.txHash) {
                return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                    error: additionalFundsTransaction.error,
                    transactionRecord: false,
                    task: updatedTask,
                    message: "Failed to record additional bounty transaction."
                });
            }

            // All operations successful
            res.status(STATUS_CODES.SUCCESS).json(updatedTask);
        } catch (error) {
            let message = "Failed to update bounty amount on GitHub.";

            // Update message if recording additional funds transaction also failed
            if (!additionalFundsTransaction.recorded && additionalFundsTransaction.txHash) {
                message = "Failed to update bounty amount on GitHub and also record the additional bounty transaction.";
            }

            const transactionRecord = additionalFundsTransaction.txHash
                ? additionalFundsTransaction.recorded
                : null;

            // Return updated task and notify user of partial failures
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                transactionRecord,
                task: updatedTask,
                message
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Update task timeline
 */
export const updateTaskTimeline = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId, newTimeline, newTimelineType } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                timeline: true,
                timelineType: true,
                _count: {
                    select: {
                        taskActivities: true
                    }
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
            throw new ValidationError("Only open tasks can be updated");
        }
        // Verify there are no existing applications
        if (task._count.taskActivities > 0) {
            throw new ValidationError("Cannot update the timeline for tasks with existing applications");
        }

        // Optionally, convert days > 6 to weeks+days as in createTask
        let timeline = newTimeline;
        let timelineType = newTimelineType as TimelineType;
        if (timelineType === "DAY" && timeline > 6) {
            const weeks = Math.floor(timeline / 7);
            const days = timeline % 7;
            timeline = weeks + (days / 10);
            timelineType = "WEEK";
        }

        // Update task timeline
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                timeline,
                timelineType
            },
            select: {
                timeline: true,
                timelineType: true,
                updatedAt: true
            }
        });

        // Return updated task
        res.status(STATUS_CODES.SUCCESS).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

/**
 * Submit application for a task
 */
export const submitTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch the task and check if it exists and is open
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { status: true }
        });

        if (!task) {
            throw new NotFoundError("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ValidationError("Task is not open");
        }

        // Check if user has already applied
        const existingApplication = await prisma.taskActivity.findFirst({
            where: {
                taskId,
                userId,
                taskSubmissionId: null
            },
            select: { id: true }
        });

        if (existingApplication) {
            throw new TaskError("You have already applied for this task!");
        }

        // Create task application activity
        await prisma.taskActivity.create({
            data: {
                task: {
                    connect: { id: taskId }
                },
                user: {
                    connect: { userId }
                }
            }
        });

        // Return success response
        res.status(STATUS_CODES.SUCCESS).json({ message: "Task application submitted" });
    } catch (error) {
        next(error);
    }
};

/**
 * Accept a contributor's application for a task
 */
export const acceptTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId, contributorId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                contributorId: true,
                taskActivities: { select: { userId: true } }
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
            throw new ValidationError("Only open tasks can be assigned");
        }
        // Verify task is not already assigned
        if (task.contributorId) {
            throw new ValidationError("Task has already has already been delegated to a contributor");
        }

        // Check if the contributor actually applied
        const hasApplied = task.taskActivities.find(activity => activity.userId === contributorId);
        if (!hasApplied) {
            throw new TaskError("User did not apply for this task");
        }

        // Assign the contributor and update task status
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                contributor: { connect: { userId: contributorId } },
                status: "IN_PROGRESS",
                acceptedAt: new Date()
            },
            select: {
                id: true,
                status: true,
                contributor: { select: { userId: true, username: true } },
                acceptedAt: true
            }
        });

        try {
            // Enable chat for the task
            await FirebaseService.createTask(taskId, userId, contributorId);

            // Return success response
            res.status(STATUS_CODES.SUCCESS).json(updatedTask);
        } catch (error) {
            // Return updated task but notify user of partial failure
            return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                task: updatedTask,
                message: "Failed to enable chat functionality for this task."
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Request timeline extension for a task
 */
export const requestTimelineExtension = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const {
        userId,
        githubUsername,
        requestedTimeline,
        timelineType,
        reason,
        attachments
    } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                contributorId: true,
                timeline: true,
                timelineType: true
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify task is in progress and user is the assigned contributor
        if (task.status !== "IN_PROGRESS" || task.contributorId !== userId) {
            throw new ValidationError(
                "Requesting timeline extension can only be requested by the active contributor"
            );
        }

        // Create request message in Firebase
        const body = `${githubUsername} is requesting for a ${requestedTimeline} ${(timelineType as string).toLowerCase()}(s) 
            time extension for this task. Kindly approve or reject it below.`;

        const message = await FirebaseService.createMessage({
            userId,
            taskId,
            type: MessageType.TIMELINE_MODIFICATION,
            body,
            attachments: attachments || [],
            metadata: {
                requestedTimeline,
                timelineType,
                reason
            }
        });

        // Return message
        res.status(STATUS_CODES.SUCCESS).json(message);
    } catch (error) {
        next(error);
    }
};

/**
 * Reply to a timeline extension request
 */
export const replyTimelineExtensionRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const {
        userId,
        accept,
        requestedTimeline,
        timelineType
    } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                creatorId: true,
                timeline: true,
                timelineType: true
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

        // Update timeline if extension is accepted
        if (accept) {
            // Calculate new timeline
            let newTimeline: number = task.timeline! + requestedTimeline,
                newTimelineType: TimelineType = timelineType;

            if (timelineType === "WEEK" && task.timelineType! == "WEEK") {
                newTimeline = task.timeline! + requestedTimeline;
                newTimelineType = "WEEK";
            }
            if (timelineType === "DAY" && task.timelineType! == "DAY") {
                newTimeline = task.timeline! + requestedTimeline;
                newTimelineType = "DAY";

                if (newTimeline > 6) {
                    const weeks = Math.floor(newTimeline / 7);
                    const days = newTimeline % 7;
                    newTimeline = weeks + (days / 10);
                    newTimelineType = "WEEK";
                }
            }

            if (timelineType === "DAY" && task.timelineType! == "WEEK") {
                if (requestedTimeline === 7) {
                    newTimeline = task.timeline! + 1;
                }
                if (requestedTimeline > 7) {
                    const weeks = Math.floor(requestedTimeline / 7);
                    const days = requestedTimeline % 7;
                    newTimeline = task.timeline! + weeks + (days / 10);
                } else {
                    const weekDayPair = task.timeline!.toString().split(".");
                    const totalDays = (Number(weekDayPair[1]) || 0) + requestedTimeline;

                    if (totalDays > 6) {
                        const weeks = Math.floor(totalDays / 7);
                        const days = totalDays % 7;
                        newTimeline = Number(weekDayPair[0]) + weeks + (days / 10);
                    } else {
                        newTimeline = Number(weekDayPair[0]) + (totalDays / 10);
                    }
                }

                newTimelineType = "WEEK";
            }

            if (timelineType === "WEEK" && task.timelineType! == "DAY") {
                newTimeline = requestedTimeline + (task.timeline! / 10);
                newTimelineType = "WEEK";
            }

            // Update task timeline and status
            const updatedTask = await prisma.task.update({
                where: { id: taskId },
                data: {
                    timeline: newTimeline!,
                    timelineType: newTimelineType!,
                    status: "IN_PROGRESS"
                },
                select: {
                    timeline: true,
                    timelineType: true,
                    status: true,
                    updatedAt: true
                }
            });

            // ? Add newTimeline and newTimelineType for clarity
            // Create acceptance message
            const message = await FirebaseService.createMessage({
                userId,
                taskId,
                type: MessageType.TIMELINE_MODIFICATION,
                body: `You’ve extended the timeline of this task by ${requestedTimeline} ${(timelineType as string).toLowerCase()}(s).`,
                attachments: [],
                metadata: {
                    requestedTimeline: newTimeline,
                    timelineType: newTimelineType,
                    reason: "ACCEPTED"
                }
            });

            // Return message and updated task
            return res.status(STATUS_CODES.SUCCESS).json({ 
                message, 
                task: updatedTask 
            });
        }

        // Create rejection message
        const message = await FirebaseService.createMessage({
            userId,
            taskId,
            type: MessageType.TIMELINE_MODIFICATION,
            body: "Timeline extension rejected.",
            attachments: [],
            metadata: {
                requestedTimeline,
                timelineType,
                reason: "REJECTED"
            }
        });

        // Return message
        res.status(STATUS_CODES.SUCCESS).json({ message });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a task as complete
 */
export const markAsComplete = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId, pullRequest, attachmentUrl } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                contributorId: true,
                installationId: true
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify user is the assigned contributor
        if (task.contributorId !== userId) {
            throw new AuthorizationError("Only the active contributor can make this action");
        }
        // Verify task is in progress
        if (task.status !== "IN_PROGRESS" && task.status !== "MARKED_AS_COMPLETED") {
            throw new ValidationError("Task is not active");
        }

        // Create task submission
        const submission = await prisma.taskSubmission.create({
            data: {
                user: { connect: { userId } },
                task: { connect: { id: taskId } },
                installation: { connect: { id: task.installationId } },
                pullRequest,
                attachmentUrl
            },
            select: { id: true }
        });

        // Update task status
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: "MARKED_AS_COMPLETED"
            },
            select: {
                status: true,
                updatedAt: true,
                taskSubmissions: {
                    where: { userId },
                    select: {
                        id: true,
                        pullRequest: true,
                        attachmentUrl: true
                    }
                }
            }
        });

        // Create submision activity
        await prisma.taskActivity.create({
            data: {
                task: {
                    connect: { id: taskId }
                },
                taskSubmission: {
                    connect: { id: submission.id }
                },
                user: {
                    connect: { userId }
                }
            }
        });

        // Return updated task
        res.status(STATUS_CODES.SUCCESS).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

/**
 * Validate and process task completion
 */
export const validateCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                creator: {
                    select: { userId: true }
                },
                contributor: {
                    select: {
                        userId: true,
                        walletAddress: true
                    }
                },
                installation: {
                    select: {
                        id: true,
                        walletSecret: true,
                        escrowSecret: true
                    }
                },
                issue: true,
                bounty: true,
                status: true
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify user is the creator
        if (task.creator.userId !== userId) {
            throw new AuthorizationError("Only task creator can perform this action");
        }
        // Verify task is marked as completed
        if (task.status !== "MARKED_AS_COMPLETED") {
            throw new ValidationError("Task has not been marked as completed");
        }
        // Verify task has a contributor
        if (!task.contributor) {
            throw new ValidationError("Contributor not found");
        }

        // Transfer bounty from escrow to contributor
        const decryptedWalletSecret = decrypt(task.installation.walletSecret);
        const decryptedEscrowSecret = decrypt(task.installation.escrowSecret!);

        const transactionResponse = await stellarService.transferAssetViaSponsor(
            decryptedWalletSecret,
            decryptedEscrowSecret,
            task.contributor!.walletAddress,
            usdcAssetId,
            usdcAssetId,
            task.bounty.toString()
        );

        // Update task as completed and settled
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
                settled: true
            },
            select: {
                status: true,
                completedAt: true,
                settled: true,
                updatedAt: true
            }
        });

        // Record transaction for contributor
        await prisma.transaction.create({
            data: {
                txHash: transactionResponse.txHash,
                category: "BOUNTY",
                amount: parseFloat(task.bounty.toString()),
                task: { connect: { id: taskId } },
                user: { connect: { userId: task.contributor.userId } }
            }
        });

        try {
            // Update contribution summary
            await prisma.contributionSummary.update({
                where: { userId: task.contributor.userId },
                data: {
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: task.bounty }
                }
            });

            try {
                // Disable chat for the task
                await FirebaseService.updateTaskStatus(taskId);
            } catch { /* empty */ }

            // Return success response
            res.status(STATUS_CODES.SUCCESS).json(updatedTask);
        } catch (error) {
            // Return updated task but notify user of partial failure
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                error,
                validated: true,
                task,
                message: "Failed to update the developer contribution summary."
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Get task activities (applications, submissions, etc.) with pagination
 */
export const getTaskActivities = async (req: Request, res: Response, next: NextFunction) => {
    const {
        page = 1,
        limit = 10,
        sort
    } = req.query;
    const { taskId } = req.params;
    const { userId } = req.body;

    try {
        // Get total count for pagination
        const totalActivities = await prisma.taskActivity.count({ where: { taskId } });
        const totalPages = Math.ceil(totalActivities / Number(limit));
        const skip = (Number(page) - 1) * Number(limit);

        // Get task activities with pagination
        const activities = await prisma.taskActivity.findMany({
            where: {
                taskId,
                task: {
                    installation: {
                        users: { some: { userId } }
                    }
                }
            },
            select: {
                id: true,
                taskId: true,
                userId: true,
                taskSubmissionId: true,
                viewed: true,
                user: {
                    select: {
                        userId: true,
                        username: true,
                        contributionSummary: true
                    }
                },
                taskSubmission: {
                    select: {
                        user: {
                            select: {
                                userId: true,
                                username: true,
                                contributionSummary: true
                            }
                        },
                        pullRequest: true,
                        attachmentUrl: true
                    }
                },
                createdAt: true,
                updatedAt: true
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
            },
            skip,
            take: Number(limit)
        });

        // Return paginated activities
        res.status(STATUS_CODES.SUCCESS).json({
            data: activities,
            pagination: {
                currentPage: Number(page),
                totalPages,
                totalItems: totalActivities,
                itemsPerPage: Number(limit),
                hasMore: Number(page) < totalPages
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a task activity as viewed
 */
export const markActivityAsViewed = async (req: Request, res: Response, next: NextFunction) => {
    const { taskActivityId } = req.params;
    const { userId } = req.body;

    try {
        // Check if the activity exists and user has access to it
        const activity = await prisma.taskActivity.findUnique({
            where: {
                id: taskActivityId,
                task: {
                    installation: {
                        users: { some: { userId } }
                    }
                }
            },
            select: { id: true, viewed: true }
        });

        if (!activity) {
            throw new NotFoundError("Task activity not found");
        }

        // Update the activity as viewed
        const updatedActivity = await prisma.taskActivity.update({
            where: { id: taskActivityId },
            data: { viewed: true },
            select: {
                id: true,
                viewed: true,
                updatedAt: true
            }
        });

        // Return updated activity
        res.status(STATUS_CODES.SUCCESS).json({
            message: "Activity marked as viewed",
            activity: updatedActivity
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
                    select: {
                        id: true,
                        escrowSecret: true,
                        walletAddress: true,
                        walletSecret: true
                    }
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

        // Return bounty to installation wallet if it exists
        if (task.bounty > 0) {
            const decryptedWalletSecret = decrypt(task.installation.walletSecret);
            const decryptedEscrowSecret = decrypt(task.installation.escrowSecret!);

            await stellarService.transferAssetViaSponsor(
                decryptedWalletSecret,
                decryptedEscrowSecret,
                task.installation.walletAddress,
                usdcAssetId,
                usdcAssetId,
                task.bounty.toString()
            );
        }

        // Delete task
        await prisma.task.delete({
            where: { id: taskId }
        });

        try {
            // Remove bounty label from issue and delete bounty comment
            await OctokitService.removeBountyLabelAndDeleteBountyComment(
                task.installation.id,
                (task.issue as TaskIssue).id,
                (task.issue as TaskIssue).bountyCommentId!
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
