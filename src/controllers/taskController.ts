import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { commentsCollection, createComment, updateComment } from "../services/taskService";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { CreateTask, ErrorClass, NotFoundErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

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
            (asset): asset is USDCBalance => 'asset_code' in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ErrorClass("TaskError", null, "Insufficient balance");
        }

        // Confirm USDC trustline
        const decryptedUserSecret = decrypt(user.walletSecret);
        const projectWallet = await stellarService.getAccountInfo(project.escrowAddress!);

        if (
            !(projectWallet.balances.find(
                (asset): asset is USDCBalance => 'asset_code' in asset && asset.asset_code === "USDC"
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
        if (task.status !== 'OPEN') {
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
                (asset): asset is USDCBalance => 'asset_code' in asset && asset.asset_code === "USDC"
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
            message: 'Task bounty updated successfully',
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
        if (task.status !== 'OPEN') {
            throw new ErrorClass("TaskError", null, "Task is not open");
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
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

// export const addTaskComment = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const { userId, message, attachments } = req.body;

//     try {
//         const task = await prisma.task.findUnique({ 
//             where: { id },
//             include: { creator: true, contributor: true }
//         });

//         if (!task) return res.status(404).json({ error: "Task not found" });
//         // ! Review (Allow comments on completed tasks)
//         if (task.status === 'COMPLETED') {
//             return res.status(400).json({ error: "Cannot comment on completed tasks" });
//         }

//         // Check if user can comment
//         if (task.status !== 'OPEN' && 
//             userId !== task.creatorId && 
//             userId !== task.contributorId) {
//             return res.status(403).json({ error: "Not authorized to comment" });
//         }

//         const comment = await createComment({
//             userId,
//             taskId: id,
//             message,
//             attachments
//         });
//         res.status(201).json(comment);
//     } catch (error) {
//         res.status(400).json({ error: "Failed to add comment" });
//     }
// };

// export const updateTaskComment = async (req: Request, res: Response, next: NextFunction) => {
//     const { id: taskId, commentId } = req.params;
//     const { userId, message, attachments } = req.body;

//     try {
//         const task = await prisma.task.findUnique({ 
//             where: { id: taskId },
//             include: { creator: true, contributor: true }
//         });

//         if (!task) {
//             return res.status(404).json({ error: "Task not found" });
//         }

//         // Check if user can edit comment (must be comment creator)
//         const comment = (await commentsCollection.doc(commentId).get()).data();
//         if (!comment || comment.userId !== userId) {
//             return res.status(403).json({ error: "Not authorized to edit this comment" });
//         }

//         const updatedComment = await updateComment(commentId, {
//             message,
//             attachments
//         });

//         res.status(200).json(updatedComment);
//     } catch (error) {
//         res.status(400).json({ error: "Failed to update comment" });
//     }
// };


export const requestTimelineModification = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, newTimeline, reason, attachments } = req.body;

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
        if (task.status !== 'IN_PROGRESS' || task.contributorId !== userId) {
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Timeline adjustment can only be requested by active contributor"
            );
        }

        // TODO: Update if comments are generally allowed
        const comment = await createComment({
            userId,
            taskId: id,
            message: reason,
            attachments: [...attachments, `${newTimeline}`],
        });

        res.status(200).json({ comment });
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
    const { pullRequests } = req.body;
    const { userId } = req.body; 

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: "Task not found" });
        if (task.contributorId !== userId || task.status !== 'IN_PROGRESS') {
            return res.status(400).json({ error: "Invalid completion request" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: 'MARKED_AS_COMPLETED',
                pullRequests
            }
        });
        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

export const validateCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, approved } = req.body;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
            include: {
                creator: true,
                contributor: true
            }
        });

        if (!task || !task.contributor) {
            return res.status(404).json({ error: "Task not found" });
        }

        if (task.creatorId !== userId || task.status !== 'MARKED_AS_COMPLETED') {
            return res.status(400).json({ error: "Invalid validation request" });
        }

        if (approved) {
            // Release funds from escrow to contributor
            // const decryptedEscrowSecret = decrypt(task.creator.escrowSecret!);
            // await stellarService.transferUSDC(
            //     decryptedEscrowSecret,
            //     task.contributor.walletAddress!,
            //     task.bounty.toString()
            // );

            await prisma.task.update({
                where: { id },
                data: {
                    status: 'COMPLETED',
                    completedAt: new Date(),
                    settled: true
                }
            });

            // Update contribution summary
            await prisma.contributionSummary.update({
                where: { userId: task.contributorId! },
                data: {
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: task.bounty }
                }
            });
        }

        res.status(200).json({ message: approved ? "Task completed" : "Completion rejected" });
    } catch (error) {
        next(error);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: "Task not found" });
        if (!['OPEN', 'HOLD'].includes(task.status)) {
            return res.status(400).json({ error: "Can only delete open or on-hold tasks" });
        }

        await prisma.task.delete({ where: { id } });
        res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
        res.status(400).json({ error: "Failed to delete task" });
    }
};