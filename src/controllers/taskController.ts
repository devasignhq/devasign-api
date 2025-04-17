import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { commentsCollection, createComment, updateComment } from "../services/taskService";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { CommentType, CreateTask, ErrorClass, NotFoundErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

// TODO: Add 'create many' task route

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload: data } = req.body;
    const payload = data as CreateTask;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletSecret: true, walletAddress: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const project = await prisma.project.findUnique({
            where: { id: payload.projectId },
            select: { escrowSecret: true, escrowAddress: true }
        });

        if (!project) {
            throw new NotFoundErrorClass("Project not found");
        }

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ErrorClass("TaskError", null, "Insufficient balance");
        }

        // Confirm USDC trustline
        const decryptedUserSecret = decrypt(user.walletSecret);
        const projectWallet = await stellarService.getAccountInfo(project.escrowAddress!);

        if (
            !(projectWallet.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            ))
        ) {
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                project.escrowSecret!,
            );
        }

        // Transfer to escrow
        await stellarService.transferAsset(
            decryptedUserSecret,
            project.escrowAddress!,
            usdcAssetId,
            usdcAssetId,
            payload.bounty,
        );

        const { projectId, ...others } = payload;

        const task = await prisma.task.create({
            data: {
                ...others,
                bounty: parseFloat(payload.bounty),
                project: {
                    connect: { id: projectId }
                },
                creator: {
                    connect: { userId }
                }
            }
        });

        try {
            // TODO: Update issue on GitHub
        } catch (error) {
            
        }

        res.status(201).json(task);
    } catch (error) {
        next(error);
    }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        status, 
        projectId, 
        userId,
        role,  // 'creator' | 'contributor'
        page = 1,
        limit = 10
    } = req.query;

    try {
        // Build where clause based on filters
        const where: any = {};
        
        if (status) {
            where.status = status;
        }
        
        if (projectId) {
            where.projectId = projectId;
        }

        if (userId && role) {
            if (role === 'creator') {
                where.creatorId = userId;
            } else if (role === 'contributor') {
                where.contributorId = userId;
            }
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
                pullRequests: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        repoUrl: true
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
            },
            orderBy: {
                createdAt: 'desc'
            },
            skip,
            take: Number(limit)
        });

        res.status(200).json({
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

export const getTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
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
                pullRequests: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                        repoUrl: true
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
            throw new NotFoundErrorClass("Task not found");
        }

        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
};

export const updateTaskBounty = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, newbounty } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: { 
                status: true, 
                bounty: true,
                projectId: true,
                creatorId: true,
                project: {
                    select: {
                        escrowAddress: true,
                        escrowSecret: true
                    }
                }
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be updated");
        }
        if (task.bounty === newbounty) {
            throw new ErrorClass("TaskError", null, "New bounty is the same as current bounty");
        }
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only task creator can update bounty");
        }

        // Get user wallet info
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletAddress: true, walletSecret: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const bountyDifference = Number(newbounty) - task.bounty;
        const decryptedUserSecret = decrypt(user.walletSecret!);

        if (bountyDifference > 0) {
            // Additional funds needed - transfer from user to escrow
            const accountInfo = await stellarService.getAccountInfo(user.walletAddress!);
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset || parseFloat(usdcAsset.balance) < bountyDifference) {
                throw new ErrorClass("TaskError", null, "Insufficient USDC balance for compensation increase");
            }

            await stellarService.transferAsset(
                decryptedUserSecret,
                task.project.escrowAddress!,
                usdcAssetId,
                usdcAssetId,
                bountyDifference.toString()
            );
        } else {
            // Excess funds - return from escrow to user
            const decryptedEscrowSecret = decrypt(task.project.escrowSecret!);
            await stellarService.transferAssetViaSponsor(
                decryptedUserSecret,
                decryptedEscrowSecret,
                user.walletAddress!,
                usdcAssetId,
                usdcAssetId,
                Math.abs(bountyDifference).toString()
            );
        }

        // Update task bounty
        const updatedTask = await prisma.task.update({
            where: { id },
            data: { bounty: newbounty }
        });

        res.status(200).json({
            message: "Task bounty updated successfully",
            data: updatedTask
        });
    } catch (error) {
        next(error);
    }
};

export const acceptTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: { status: true }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Task is not open");
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: "IN_PROGRESS",
                acceptedAt: new Date(),
                contributor: {
                    connect: { userId }
                }
            }
        });

        // TODO: Update issues/milestones (assign to contributor)

        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

export const addTaskComment = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, message, attachments } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            include: { creator: true, contributor: true }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        // Check if user can comment
        if (userId !== task.creatorId && userId !== task.contributorId) {
            throw new ErrorClass("TaskError", null, "Not authorized to comment");
        }

        // ? Review (Allow comments on completed tasks)
        if (["OPEN", "COMPLETED"].includes(task.status)) {
            throw new ErrorClass("TaskError", null, "Can only comment on active tasks");
        }

        const comment = await createComment({
            userId,
            taskId: id,
            message,
            attachments,
            type: CommentType.GENERAL
        });
        res.status(201).json(comment);
    } catch (error) {
        next(error);
    }
};

export const updateTaskComment = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId, commentId } = req.params;
    const { userId, message, attachments } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id: taskId },
            include: { creator: true, contributor: true }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        // Check if user can edit comment (must be comment creator)
        const comment = (await commentsCollection.doc(commentId).get()).data();
        if (!comment || comment.userId !== userId) {
            throw new ErrorClass("TaskError", null, "Not authorized to edit this comment");
        }

        const updatedComment = await updateComment(commentId, {
            message,
            attachments
        });

        res.status(200).json(updatedComment);
    } catch (error) {
        next(error);
    }
};

export const requestTimelineModification = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, newTimeline, reason, attachments } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: {
                status: true,
                contributorId: true,
                timeline: true,
                timelineType: true,
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        if (task.status !== "IN_PROGRESS" || task.contributorId !== userId) {
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Timeline adjustment can only be requested by active contributor"
            );
        }

        if (task.timeline! >= Number(newTimeline)) {
            throw new ErrorClass(
                "ValidationError",
                null,
                "New timeline must be greater than current timeline"
            );
        }

        const comment = await createComment({
            userId,
            taskId: id,
            type: CommentType.TIMELINE_MODIFICATION,
            message: reason || "Timeline modification requested",
            attachments: [],
            metadata: {
                currentTimeline: task.timeline!,
                requestedTimeline: Number(newTimeline),
                timelineType: task.timelineType! as any
            }
        });

        res.status(200).json(comment);
    } catch (error) {
        next(error);
    }
};

export const replyTimelineModificationRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { 
        userId, 
        accepted, 
        newTimeline, 
        reason, 
        attachments 
    } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: { creatorId: true } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        // TODO: Update to allow team members
        if (task.creatorId !== userId) { 
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Only task creator can respond to timeline adjustments"
            );
        }

        if (accepted === "TRUE") {
            await prisma.task.update({
                where: { id },
                data: { timeline: Number(newTimeline) }
            });
        }

        if (reason || attachments) {
            const comment = await createComment({
                userId,
                taskId: id,
                message: reason || "",
                attachments,
            });

            if (accepted === "TRUE") {
                return res.status(200).json({ comment, task: { ...task, timeline: Number(newTimeline) } });
            }

            return res.status(200).json({ comment });
        }

        res.status(200).json({ 
            message: accepted === "TRUE" 
                ? "Successfully modified timeline" 
                : "Successfully rejected timeline modification request" 
        });
    } catch (error) {
        next(error);
    }
};

export const markAsComplete = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, pullRequests } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: {
                status: true,
                contributorId: true
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "IN_PROGRESS" || task.contributorId !== userId) {
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Only the active contributor can make this action"
            );
        }

        await prisma.task.update({
            where: { id },
            data: {
                status: "MARKED_AS_COMPLETED",
                pullRequests
            }
        });

        res.status(200).json("Action successful");
    } catch (error) {
        next(error);
    }
};

export const validateCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
            select: {
                creator: {
                    select: {
                        userId: true,
                        walletSecret: true
                    }
                },
                contributor: {
                    select: {
                        userId: true,
                        walletAddress: true
                    }
                },
                project: {
                    select: {
                        id: true,
                        escrowSecret: true
                    }
                },
                issue: true,
                bounty: true,
                status: true,
            }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "MARKED_AS_COMPLETED") {
            throw new ErrorClass("TaskError", null, "Task has not been marked as completed");
        }

        // TODO: Update to allow team members
        if (task.creator.userId !== userId) { 
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Only task creator can validate if task is completed"
            );
        }
        if (!task.contributor) { 
            throw new ErrorClass("TaskError", null, "Contributor not found");
        }
        
        const decryptedUserSecret = decrypt(task.creator.walletSecret);
        const decryptedEscrowSecret = decrypt(task.project.escrowSecret!);

        await stellarService.transferAssetViaSponsor(
            decryptedUserSecret,
            decryptedEscrowSecret,
            task.contributor!.walletAddress,
            usdcAssetId,
            usdcAssetId,
            task.bounty.toString()
        );

        await prisma.task.update({
            where: { id },
            data: {
                status: "COMPLETED",
                completedAt: new Date(),
                settled: true
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
            
            res.status(201).json("Validation Complete");
        } catch (error: any) {
            next({ 
                ...error, 
                validated: true, 
                message: "Validation complete. Failed to update contribution summary."
            });
        }
    } catch (error) {
        next(error);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
            select: {
                status: true,
                bounty: true,
                creatorId: true,
                contributorId: true,
                creator: {
                    select: {
                        walletAddress: true,
                        walletSecret: true
                    }
                },
                project: {
                    select: {
                        escrowSecret: true
                    }
                }
            }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        // Validations
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only task creator can delete the task");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be deleted");
        }
        if (task.contributorId) {
            throw new ErrorClass("TaskError", null, "Cannot delete task with assigned contributor");
        }

        // Return bounty to creator if exists
        if (task.bounty > 0) {
            const decryptedUserSecret = decrypt(task.creator.walletSecret);
            const decryptedEscrowSecret = decrypt(task.project.escrowSecret!);

            await stellarService.transferAssetViaSponsor(
                decryptedUserSecret,
                decryptedEscrowSecret,
                task.creator.walletAddress,
                usdcAssetId,
                usdcAssetId,
                task.bounty.toString()
            );
        }

        // Delete task
        await prisma.task.delete({
            where: { id }
        });

        // TODO: Update issue on GitHub

        res.status(200).json({
            message: "Task deleted successfully",
            refunded: `${task.bounty} USDC`
        });
    } catch (error) {
        next(error);
    }
};