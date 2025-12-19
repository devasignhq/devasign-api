import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { FirebaseService } from "../../services/firebase.service";
import { stellarService } from "../../services/stellar.service";

import { stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { MessageType, TaskIssue } from "../../models/task.model";
import { HorizonApi } from "../../models/horizonapi.model";
import { TaskStatus, TimelineType, TransactionCategory } from "../../../prisma_client";
import { OctokitService } from "../../services/octokit.service";
import {
    AuthorizationError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";
import { ContractService } from "../../services/contract.service";
import { KMSService } from "../../services/kms.service";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

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
                        wallet: true
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
        // Verify installation wallet exists
        if (!task.installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
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
        if (task.bounty === Number(newBounty)) {
            throw new ValidationError("New bounty is the same as current bounty");
        }

        // Handle fund transfers
        const bountyDifference = Number(newBounty) - task.bounty;
        const decryptedWalletSecret = await KMSService.decryptWallet(task.installation.wallet);

        if (bountyDifference > 0) {
            // Additional funds needed
            const accountInfo = await stellarService.getAccountInfo(task.installation.wallet.address);
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            // Verify installation has sufficient USDC
            if (!usdcAsset || parseFloat(usdcAsset.balance) < bountyDifference) {
                throw new ValidationError("Insufficient USDC balance for compensation increase");
            }

            // Increase bounty on contract
            const { result, txHash } = await ContractService.increaseBounty(
                decryptedWalletSecret,
                taskId,
                bountyDifference
            );

            // Record transaction
            await prisma.transaction.create({
                data: {
                    txHash,
                    category: TransactionCategory.BOUNTY,
                    amount: bountyDifference,
                    task: { connect: { id: taskId } },
                    installation: { connect: { id: task.installationId } },
                    doneAt: stellarTimestampToDate(result.createdAt)
                }
            });
        } else {
            // Excess funds - decrease bounty on contract
            const { result, txHash } = await ContractService.decreaseBounty(
                decryptedWalletSecret,
                taskId,
                Math.abs(bountyDifference)
            );

            // Record transaction
            await prisma.transaction.create({
                data: {
                    txHash,
                    category: TransactionCategory.TOP_UP,
                    amount: Math.abs(bountyDifference),
                    asset: "USDC",
                    sourceAddress: "Escrow Funds",
                    task: { connect: { id: taskId } },
                    installation: { connect: { id: task.installationId } },
                    doneAt: stellarTimestampToDate(result.createdAt)
                }
            });
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

        try {
            // Update bounty comment on GitHub to reflect new bounty amount
            await OctokitService.updateIssueComment(
                task.installationId,
                (task.issue as TaskIssue).bountyCommentId!,
                OctokitService.customBountyMessage(newBounty as string, taskId)
            );

            // Return updated task
            res.status(STATUS_CODES.SUCCESS).json(updatedTask);
        } catch (error) {
            // Return updated task and notify user of partial failures
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                message: "Failed to update bounty amount on GitHub.",
                task: updatedTask,
                error
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
            throw new ValidationError("You have already applied for this task!");
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
            throw new ValidationError("User did not apply for this task");
        }

        // Fetch contributor's wallet
        const contributor = await prisma.user.findUnique({
            where: { userId: contributorId },
            select: { wallet: { select: { address: true } } }
        });

        if (!contributor || !contributor.wallet) {
            throw new ValidationError("Contributor does not have a wallet");
        }

        // Get Installation Wallet Secret
        const installation = await prisma.installation.findFirst({
            where: { tasks: { some: { id: taskId } } },
            select: { wallet: true }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }
        if (!installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }

        const decryptedWalletSecret = await KMSService.decryptWallet(installation.wallet);

        // Assign contributor on contract
        await ContractService.assignContributor(
            decryptedWalletSecret,
            taskId,
            contributor.wallet.address
        );

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

        // Update contribution summary
        await prisma.contributionSummary.update({
            where: { userId: contributorId },
            data: { activeTasks: { increment: 1 } }
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
                        wallet: { select: { address: true } }
                    }
                },
                installation: {
                    select: {
                        id: true,
                        wallet: true
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
        if (task.status !== TaskStatus.MARKED_AS_COMPLETED) {
            throw new ValidationError("Task has not been marked as completed");
        }
        // Verify task has a contributor
        if (!task.contributor) {
            throw new ValidationError("Contributor not found");
        }
        // Verify installation wallet exists
        if (!task.installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }

        // Transfer bounty from escrow to contributor via smart contract
        const decryptedWalletSecret = await KMSService.decryptWallet(task.installation.wallet);

        // Approve completion via smart contract
        const transactionResponse = await ContractService.approveCompletion(
            decryptedWalletSecret,
            taskId
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
                user: { connect: { userId: task.contributor.userId } },
                doneAt: stellarTimestampToDate(transactionResponse.result.createdAt)
            }
        });

        try {
            // Update contribution summary
            await prisma.contributionSummary.update({
                where: { userId: task.contributor.userId },
                data: {
                    activeTasks: { decrement: 1 },
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: task.bounty }
                }
            });

            try {
                // Disable chat for the task
                await FirebaseService.updateTaskStatus(taskId);

                // Return success response
                res.status(STATUS_CODES.SUCCESS).json(updatedTask);
            } catch (error) {
                // Return updated task but notify user of partial failure
                res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                    error,
                    validated: true,
                    task,
                    message: "Failed to disable chat for the task."
                });
            }
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
