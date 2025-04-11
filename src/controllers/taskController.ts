import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { commentsCollection, createComment, updateComment } from "../services/taskService";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { CreateTask, ErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload: data } = req.body;
    const payload = data as CreateTask;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletSecret: true, walletAddress: true }
        });

        if (!user) {
            throw new ErrorClass("TaskError", null, "User not found");
        }

        const project = await prisma.project.findUnique({
            where: { id: payload.projectId },
            select: { escrowAddress: true }
        });

        if (!project) {
            throw new ErrorClass("TaskError", null, "Project not found");
        }

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is HorizonApi.BalanceLineAsset<"credit_alphanum12"> => 
                'asset_code' in asset && asset.asset_code === "USDC"
        ) as HorizonApi.BalanceLineAsset<"credit_alphanum12">;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ErrorClass("TaskError", null, "Insufficient balance");
        }

        // Transfer to escrow
        const decryptedSecret = decrypt(user.walletSecret);
        await stellarService.transferAsset(
            decryptedSecret,
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

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { payload } = req.body;

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: "Task not found" });
        if (!['OPEN', 'HOLD'].includes(task.status)) {
            return res.status(400).json({ error: "Can only update open or on-hold tasks" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { ...payload }
        });
        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(400).json({ error: "Failed to update task" });
    }
};

// export const applyForTask = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const { userId } = req.body;

//     try {
//         const task = await prisma.task.findUnique({ where: { id } });
//         if (!task) return res.status(404).json({ error: "Task not found" });
//         if (task.status !== 'OPEN') return res.status(400).json({ error: "Task is not open for applications" });

//         await prisma.task.update({
//             where: { id },
//             data: {
//                 applications: {
//                     connect: { userId }
//                 }
//             }
//         });
//         res.status(200).json({ message: "Application submitted successfully" });
//     } catch (error) {
//         res.status(400).json({ error: "Failed to apply for task" });
//     }
// };

export const acceptTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: "Task not found" });
        if (task.status !== 'OPEN') return res.status(400).json({ error: "Task is not open" });

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
        res.status(400).json({ error: "Failed to accept task" });
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

        if (!task) return res.status(404).json({ error: "Task not found" });
        // ! Review (Allow comments on completed tasks)
        if (task.status === 'COMPLETED') {
            return res.status(400).json({ error: "Cannot comment on completed tasks" });
        }

        // Check if user can comment
        if (task.status !== 'OPEN' && 
            userId !== task.creatorId && 
            userId !== task.contributorId) {
            return res.status(403).json({ error: "Not authorized to comment" });
        }

        const comment = await createComment({
            userId,
            taskId: id,
            message,
            attachments
        });
        res.status(201).json(comment);
    } catch (error) {
        res.status(400).json({ error: "Failed to add comment" });
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
            return res.status(404).json({ error: "Task not found" });
        }

        // Check if user can edit comment (must be comment creator)
        const comment = (await commentsCollection.doc(commentId).get()).data();
        if (!comment || comment.userId !== userId) {
            return res.status(403).json({ error: "Not authorized to edit this comment" });
        }

        const updatedComment = await updateComment(commentId, {
            message,
            attachments
        });

        res.status(200).json(updatedComment);
    } catch (error) {
        res.status(400).json({ error: "Failed to update comment" });
    }
};

export const putOnHold = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: "Task not found" });
        if (task.status !== 'OPEN') {
            return res.status(400).json({ error: "Only open tasks can be put on hold" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { status: 'HOLD' }
        });
        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(400).json({ error: "Failed to put task on hold" });
    }
};

// export const adjustTimeline = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const { newTimeline, reason } = req.body;
//     const { userId } = req.body; 

//     try {
//         const task = await prisma.task.findUnique({ where: { id } });
//         if (!task) return res.status(404).json({ error: "Task not found" });
//         if (task.status !== 'IN_PROGRESS' || task.contributorId !== userId) {
//             return res.status(400).json({ error: "Timeline adjustment can only be requested by active contributor" });
//         }

//         // Store timeline adjustment request (implement in your preferred way)
//         // For MVP, you might want to add this to the task's metadata or comments
        
//         res.status(200).json({ message: "Timeline adjustment requested" });
//     } catch (error) {
//         res.status(400).json({ error: "Failed to request timeline adjustment" });
//     }
// };

// export const replyTimelineAdjustment = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const { accepted, newTimeline } = req.body;
//     const { userId } = req.body; 

//     try {
//         const task = await prisma.task.findUnique({ where: { id } });
//         if (!task) return res.status(404).json({ error: "Task not found" });
//         if (task.creatorId !== userId) {
//             return res.status(403).json({ error: "Only task creator can respond to timeline adjustments" });
//         }

//         if (accepted) {
//             await prisma.task.update({
//                 where: { id },
//                 data: { timeline: newTimeline }
//             });
//         }

//         res.status(200).json({ message: accepted ? "Timeline adjusted" : "Timeline adjustment rejected" });
//     } catch (error) {
//         res.status(400).json({ error: "Failed to process timeline adjustment" });
//     }
// };

// export const updateCompensation = async (req: Request, res: Response, next: NextFunction) => {
//     const { id } = req.params;
//     const { newBounty } = req.body;

//     try {
//         const task = await prisma.task.findUnique({ where: { id } });
//         if (!task) return res.status(404).json({ error: "Task not found" });
//         if (task.status !== 'OPEN') {
//             return res.status(400).json({ error: "Can only update compensation for open tasks" });
//         }

//         const updatedTask = await prisma.task.update({
//             where: { id },
//             data: { bounty: newBounty }
//         });
//         res.status(200).json(updatedTask);
//     } catch (error) {
//         res.status(400).json({ error: "Failed to update compensation" });
//     }
// };

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
        res.status(400).json({ error: "Failed to mark task as complete" });
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
            const decryptedEscrowSecret = decrypt(task.creator.escrowSecret!);
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
        res.status(400).json({ error: "Failed to validate completion" });
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