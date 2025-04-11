import { Request, Response } from "express";
import { prisma } from "../config/database";
import { commentsCollection, createComment, updateComment } from "../services/taskService";
import { stellarService } from "../config/stellar";
import { decrypt } from "../helper";

export const createTask = async (req: Request, res: Response) => {
    const { userId, payload } = req.body;
    const { bounty } = payload;

    try {
        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user || !user.walletSecret) {
            return res.status(404).json({ message: "User wallet not found" });
        }

        // Check user balance
        // const currentBalance = await stellarService.getBalance(user.walletAddress!);
        // if (parseFloat(currentBalance) < bounty) {
        //     return res.status(400).json({ message: "Insufficient balance" });
        // }

        // // Transfer to escrow
        // const decryptedSecret = decrypt(user.walletSecret);
        // await stellarService.transferUSDC(
        //     decryptedSecret,
        //     user.escrowAddress!,
        //     bounty.toString()
        // );

        const task = await prisma.task.create({
            data: {
                creatorId: userId,
                ...payload
            }
        });

        // TODO: Update issues/milestones

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: "Failed to create task" });
    }
};

export const updateTask = async (req: Request, res: Response) => {
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

// export const applyForTask = async (req: Request, res: Response) => {
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

export const acceptTask = async (req: Request, res: Response) => {
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

export const addTaskComment = async (req: Request, res: Response) => {
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

export const updateTaskComment = async (req: Request, res: Response) => {
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

export const putOnHold = async (req: Request, res: Response) => {
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

// export const adjustTimeline = async (req: Request, res: Response) => {
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

// export const replyTimelineAdjustment = async (req: Request, res: Response) => {
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

// export const updateCompensation = async (req: Request, res: Response) => {
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

export const markAsComplete = async (req: Request, res: Response) => {
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

export const validateCompletion = async (req: Request, res: Response) => {
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

export const deleteTask = async (req: Request, res: Response) => {
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