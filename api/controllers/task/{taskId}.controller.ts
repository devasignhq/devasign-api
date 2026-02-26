import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { FirebaseService } from "../../services/firebase.service";
import { stellarService } from "../../services/stellar.service";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { MessageType, TaskIssue } from "../../models/task.model";
import { HorizonApi } from "../../models/horizonapi.model";
import { TaskStatus, TransactionCategory } from "../../../prisma_client";
import { OctokitService } from "../../services/octokit.service";
import {
    AuthorizationError,
    EscrowContractError,
    NotFoundError,
    ValidationError
} from "../../models/error.model";
import { ContractService } from "../../services/contract.service";
import { KMSService } from "../../services/kms.service";
import { dataLogger } from "../../config/logger.config";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

/**
 * Add bounty comment id to a task. Fallback if saving the bounty comment id during task creation failed.
 */
export const addBountyCommentId = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const { installationId, bountyLabelId, issueId } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                id: true,
                status: true,
                bounty: true,
                creatorId: true,
                issue: true,
                installation: {
                    select: { status: true }
                }
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }

        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot modify task for an archived installation");
        }
        // Verify user is the creator
        if (task.creatorId !== userId) {
            throw new AuthorizationError("Only task creator can perform this action");
        }
        // Verify task is still open
        if (task.status !== "OPEN") {
            throw new ValidationError("Only open tasks can be updated");
        }

        // Add bounty label to issue and post bounty comment on issue
        const bountyComment = await OctokitService.addBountyLabelAndCreateBountyComment(
            installationId,
            issueId,
            bountyLabelId,
            OctokitService.customBountyMessage(task.bounty.toString(), task.id)
        );

        // Update task with bounty comment id
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                issue: {
                    ...(typeof task.issue === "object" && task.issue !== null ? task.issue : {}),
                    bountyCommentId: bountyComment.id
                }
            },
            select: { id: true }
        });

        // Return updated task
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedTask,
            message: "Bounty comment added successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update the bounty amount of an open task. Only allowed if there are no existing applications.
 */
export const updateTaskBounty = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const { newBounty } = req.body;

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
                        wallet: true,
                        status: true
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
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot update task for an archived installation");
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
        let contractResult, contractTxHash;

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
            try {
                const { result, txHash } = await ContractService.increaseBounty(
                    decryptedWalletSecret,
                    taskId,
                    bountyDifference
                );
                contractResult = result;
                contractTxHash = txHash;
            } catch (error) {
                if (error instanceof EscrowContractError) {
                    throw error;
                }
                throw new EscrowContractError("Failed to increase bounty on smart contract", { error });
            }
        } else {
            try {
                // Excess funds - decrease bounty on contract
                const { result, txHash } = await ContractService.decreaseBounty(
                    decryptedWalletSecret,
                    taskId,
                    Math.abs(bountyDifference)
                );
                contractResult = result;
                contractTxHash = txHash;
            } catch (error) {
                if (error instanceof EscrowContractError) {
                    throw error;
                }
                throw new EscrowContractError("Failed to decrease bounty on smart contract", { error });
            }
        }

        // Create increase transaction data
        const increaseTransactionData = {
            txHash: contractTxHash,
            category: TransactionCategory.BOUNTY,
            amount: bountyDifference,
            task: { connect: { id: taskId } },
            installation: { connect: { id: task.installationId } },
            doneAt: stellarTimestampToDate(contractResult.createdAt)
        };
        // Create decrease transaction data
        const decreaseTransactionData = {
            txHash: contractTxHash,
            category: TransactionCategory.TOP_UP,
            amount: Math.abs(bountyDifference),
            asset: "USDC",
            sourceAddress: "Escrow Funds",
            task: { connect: { id: taskId } },
            installation: { connect: { id: task.installationId } },
            doneAt: stellarTimestampToDate(contractResult.createdAt)
        };

        const [updatedTask] = await prisma.$transaction([
            // Update task bounty
            prisma.task.update({
                where: { id: taskId },
                data: {
                    bounty: parseFloat(newBounty),
                    escrowTransactions: {
                        push: {
                            txHash: contractTxHash,
                            method: bountyDifference > 0 ? "increase_bounty" : "decrease_bounty"
                        }
                    }
                },
                select: {
                    bounty: true,
                    updatedAt: true
                }
            }),
            // Record transaction bounty increase or decrease
            prisma.transaction.create({
                data: bountyDifference > 0 ? increaseTransactionData : decreaseTransactionData
            })
        ]);

        let updatedComment = false;
        try {
            // Update bounty comment on GitHub to reflect new bounty amount
            await OctokitService.updateIssueComment(
                task.installationId,
                (task.issue as TaskIssue).bountyCommentId!,
                OctokitService.customBountyMessage(newBounty as string, taskId)
            );
            updatedComment = true;
        } catch (error) {
            // Log error and continue
            dataLogger.info("Failed to update bounty comment", { taskId, error });
        }

        // Return updated task and notify user bounty comment failed to update
        if (!updatedComment) {
            return responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                data: {
                    bountyCommentPosted: false,
                    task: updatedTask
                },
                message: "Task bounty updated",
                warning: "Failed to update bounty amount on GitHub."
            });
        }

        // Return updated task
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedTask,
            message: "Task bounty updated"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update task timeline
 */
export const updateTaskTimeline = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const { newTimeline } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                timeline: true,
                installation: { select: { status: true } },
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
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot update task timeline for an archived installation");
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

        // Update task timeline
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: { timeline: newTimeline },
            select: { timeline: true, updatedAt: true }
        });

        // Return updated task
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedTask,
            message: "Task timeline updated"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Submit application for a task
 */
export const submitTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;

    try {
        // Fetch the task and check if it exists and is open
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                installation: { select: { status: true } }
            }
        });

        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot submit application for a task in an archived installation");
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
            throw new ValidationError(
                "You have already applied for this task!",
                { applied: true }
            );
        }

        // Create task application activity
        const taskActivity = await prisma.taskActivity.create({
            data: {
                task: {
                    connect: { id: taskId }
                },
                user: {
                    connect: { userId }
                }
            },
            select: {
                id: true,
                user: { select: { techStack: true, username: true } }
            }
        });

        // Return success response
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: null,
            message: "Task application submitted"
        });

        // Update task activity for live updates
        FirebaseService.updateAppActivity({
            userId: task.creatorId,
            type: "task",
            taskId
        }).catch(
            error => dataLogger.warn(
                "Failed to update task activity for live updates",
                { taskId, error }
            )
        );

        // Update user tech stack if none was found
        if (taskActivity.user?.techStack && taskActivity.user.techStack.length === 0) {
            let techStack: string[] = [];
            try {
                techStack = await OctokitService.getUserTopLanguages(taskActivity.user.username);
            } catch (error) {
                dataLogger.warn(
                    "Failed to get user top languages",
                    { userId, error }
                );
            }

            if (techStack.length > 0) {
                prisma.user.update({
                    where: { userId },
                    data: { techStack }
                }).catch(error => {
                    dataLogger.warn(
                        "Failed to update user tech stack",
                        { userId, error }
                    );
                });
            }
        }
    } catch (error) {
        next(error);
    }
};

/**
 * Accept a contributor's application for a task
 */
export const acceptTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId, contributorId } = req.params;
    const { userId } = res.locals;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                issue: true,
                bounty: true,
                taskActivities: { select: { userId: true } },
                contributorId: true,
                installationId: true,
                installation: { select: { wallet: true, status: true } }
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify installation and wallet exists
        if (!task.installation) {
            throw new NotFoundError("Installation not found");
        }
        if (!task.installation.wallet) {
            throw new NotFoundError("Installation wallet not found");
        }
        // Check if installation is archived
        if (task.installation.status === "ARCHIVED") {
            throw new ValidationError("Cannot accept task application for an archived installation");
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
        // Verify contributor actually applied
        const hasApplied = task.taskActivities.find(activity => activity.userId === contributorId);
        if (!hasApplied) {
            throw new ValidationError("User did not apply for this task");
        }

        // Verify contributor exists
        const contributor = await prisma.user.findUnique({
            where: { userId: contributorId },
            select: { wallet: true }
        });
        if (!contributor) {
            throw new NotFoundError("Contributor not found");
        }
        if (!contributor.wallet) {
            throw new ValidationError("Contributor does not have a wallet");
        }

        const decryptedWalletSecret = await KMSService.decryptWallet(task.installation.wallet);

        // Assign contributor on contract
        const { txHash: assignmentTxHash } = await ContractService.assignContributor(
            decryptedWalletSecret,
            taskId,
            contributor.wallet.address
        );

        // Assign the contributor and update task status
        const [updatedTask] = await prisma.$transaction([
            // Update task
            prisma.task.update({
                where: { id: taskId },
                data: {
                    contributor: { connect: { userId: contributorId } },
                    status: "IN_PROGRESS",
                    acceptedAt: new Date(),
                    escrowTransactions: {
                        push: { txHash: assignmentTxHash, method: "assign_contributor" }
                    }
                },
                select: {
                    id: true,
                    status: true,
                    contributor: { select: { userId: true, username: true } },
                    acceptedAt: true
                }
            }),
            // Update contribution summary
            prisma.contributionSummary.update({
                where: { userId: contributorId },
                data: { activeTasks: { increment: 1 } }
            })
        ]);

        try {
            // Enable chat for the task
            await FirebaseService.createTask(taskId, userId, contributorId);

            // Return success response
            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: updatedTask,
                message: "Task application accepted"
            });
        } catch (error) {
            dataLogger.info("Failed to enable chat functionality for this task", { error });
            // Return updated task but notify user of partial failure
            responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                data: updatedTask,
                message: "Task application accepted",
                warning: "Failed to enable chat functionality for this task."
            });
        }

        // Update task activity for live updates
        FirebaseService.updateAppActivity({
            userId: contributorId,
            type: "contributor"
        }).catch(
            error => dataLogger.warn(
                "Failed to update contributor activity for live updates",
                { contributorId, error }
            )
        );

        // Update bounty comment on GitHub to state task has been assigned
        OctokitService.updateIssueComment(
            task.installationId,
            (task.issue as TaskIssue).bountyCommentId!,
            OctokitService.customBountyMessage(task.bounty.toString(), taskId, true)
        ).catch(
            error => dataLogger.warn(
                "Failed to update bounty comment",
                { taskId, error }
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Request timeline extension for a task
 */
export const requestTimelineExtension = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const {
        githubUsername,
        requestedTimeline,
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
                installation: { select: { status: true } }
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
        const timelineText = requestedTimeline < 7
            ? "day(s)"
            : requestedTimeline % 7 === 0
                ? ["week(s)", "day(s)"]
                : "week(s)";
        const timelineTextValue = requestedTimeline < 7
            ? requestedTimeline
            : requestedTimeline % 7 === 0
                ? requestedTimeline / 7
                : [Math.floor(requestedTimeline / 7), requestedTimeline % 7];

        // Format the message body
        const displayValue = Array.isArray(timelineTextValue)
            ? `${timelineTextValue[0]} ${timelineText[0]} and ${timelineTextValue[1]} ${timelineText[1]}`
            : `${timelineTextValue} ${timelineText}`;

        const body = `${githubUsername} is requesting for a ${displayValue} time extension for this task. Kindly approve or reject it below.`;

        const message = await FirebaseService.createMessage({
            userId,
            taskId,
            type: MessageType.TIMELINE_MODIFICATION,
            body,
            attachments: attachments || [],
            metadata: { requestedTimeline, reason }
        });

        // Return message
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: message,
            message: "Timeline extension request sent successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Reply to a timeline extension request
 */
export const replyTimelineExtensionRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const { accept, requestedTimeline } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                creatorId: true,
                status: true,
                timeline: true,
                installation: { select: { status: true } }
            }
        });

        // Verify task exists
        if (!task) {
            throw new NotFoundError("Task not found");
        }
        // Verify task is in progress and user is the creator
        if (task.status !== "IN_PROGRESS" || task.creatorId !== userId) {
            throw new ValidationError(
                "Replying to timeline extensions can only be done by the task creator while the task is in progress"
            );
        }

        // Update timeline if extension is accepted
        if (accept) {
            // Calculate new timeline
            const newTimeline = task.timeline! + requestedTimeline;

            // Update task timeline and status
            const updatedTask = await prisma.task.update({
                where: { id: taskId },
                data: {
                    timeline: newTimeline,
                    status: "IN_PROGRESS"
                },
                select: {
                    timeline: true,
                    status: true,
                    updatedAt: true
                }
            });

            // Format the timeline text display
            const timelineText = requestedTimeline < 7
                ? "day(s)"
                : requestedTimeline % 7 === 0
                    ? ["week(s)", "day(s)"]
                    : "week(s)";
            const timelineTextValue = requestedTimeline < 7
                ? requestedTimeline
                : requestedTimeline % 7 === 0
                    ? requestedTimeline / 7
                    : [Math.floor(requestedTimeline / 7), requestedTimeline % 7];

            const displayValue = Array.isArray(timelineTextValue)
                ? `${timelineTextValue[0]} ${timelineText[0]} and ${timelineTextValue[1]} ${timelineText[1]}`
                : `${timelineTextValue} ${timelineText}`;

            // Create acceptance message
            const message = await FirebaseService.createMessage({
                userId,
                taskId,
                type: MessageType.TIMELINE_MODIFICATION,
                body: `You’ve extended the timeline of this task by ${displayValue}.`,
                attachments: [],
                metadata: {
                    requestedTimeline: newTimeline,
                    reason: "ACCEPTED"
                }
            });

            // Return message and updated task
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { message, task: updatedTask },
                message: "Timeline extension request accepted"
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
                reason: "REJECTED"
            }
        });

        // Return message
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: { message },
            message: "Timeline extension request rejected"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Mark a task as complete
 */
export const markAsComplete = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;
    const { pullRequest, attachmentUrl } = req.body;

    try {
        // Fetch the task
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                contributorId: true,
                installationId: true,
                creatorId: true,
                installation: { select: { status: true } }
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
        if (task.status !== TaskStatus.IN_PROGRESS) {
            if (task.status === TaskStatus.MARKED_AS_COMPLETED) {
                throw new ValidationError("Task is already in review");
            }
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

        const [updatedTask] = await prisma.$transaction([
            // Update task status
            prisma.task.update({
                where: { id: taskId },
                data: {
                    status: TaskStatus.MARKED_AS_COMPLETED
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
            }),
            // Create submision activity
            prisma.taskActivity.create({
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
            })
        ]);

        // Return updated task
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedTask,
            message: "Task submission completed"
        });

        // Update task activity for live updates
        FirebaseService.updateAppActivity({
            userId: task.creatorId,
            type: "task",
            taskId,
            metadata: {
                status: TaskStatus.MARKED_AS_COMPLETED
            }
        }).catch(
            error => dataLogger.warn(
                "Failed to update task activity for live updates",
                { taskId, error }
            )
        );
    } catch (error) {
        next(error);
    }
};

/**
 * Validate and process task completion
 */
export const validateCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    const { userId } = res.locals;

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
                        wallet: true,
                        status: true
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

        const [updatedTask] = await prisma.$transaction([
            // Update task as completed and settled
            prisma.task.update({
                where: { id: taskId },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    settled: true,
                    escrowTransactions: {
                        push: {
                            txHash: transactionResponse.txHash,
                            method: "bounty_payout"
                        }
                    }
                },
                select: {
                    status: true,
                    completedAt: true,
                    settled: true,
                    updatedAt: true
                }
            }),
            // Record transaction for contributor
            prisma.transaction.create({
                data: {
                    txHash: transactionResponse.txHash,
                    category: "BOUNTY",
                    amount: parseFloat(task.bounty.toString()),
                    task: { connect: { id: taskId } },
                    user: { connect: { userId: task.contributor.userId } },
                    doneAt: stellarTimestampToDate(transactionResponse.result.createdAt)
                }
            }),
            // Update the contributor's contribution summary
            prisma.contributionSummary.update({
                where: { userId: task.contributor.userId },
                data: {
                    activeTasks: { decrement: 1 },
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: task.bounty }
                }
            })
        ]);

        let chatDisabled = false;
        try {
            // Disable chat for the task
            await FirebaseService.updateTaskStatus(taskId);
            chatDisabled = true;
        } catch (error) {
            dataLogger.warn("Failed to disable chat", { taskId, error });
        }

        if (!chatDisabled) {
            return responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                data: { validated: true, task: updatedTask },
                message: "Task validated and completed",
                warning: "Failed to disable chat for the task."
            });
        }

        // Return success response
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedTask,
            message: "Task validated and completed"
        });

        // Add bounty paid label to the issue
        OctokitService.addBountyPaidLabel(
            task.installation.id,
            (task.issue as TaskIssue).id
        ).catch(
            error => dataLogger.warn("Failed to add bounty paid label", { taskId, error })
        );

        // Update task activity for live updates
        FirebaseService.updateAppActivity({
            userId: task.contributor.userId,
            type: "contributor"
        }).catch(
            error => dataLogger.warn(
                "Failed to update contributor activity for live updates",
                { contributorId: task.contributor?.userId, error }
            )
        );
    } catch (error) {
        next(error);
    }
};
