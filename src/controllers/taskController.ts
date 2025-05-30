import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { commentsCollection, createComment, updateComment } from "../services/firebaseService";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { CommentType, CreateTask, ErrorClass, NotFoundErrorClass } from "../types/general";
import { HorizonApi } from "../types/horizonapi";
import { getRepoIssue, updateRepoIssue } from "../services/githubService";
import { TimelineType } from "../generated/client";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubToken, payload: data } = req.body;
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

        if (others.timeline && others.timelineType && others.timelineType === "DAY" && others.timeline > 6) {
            const weeks = Math.floor(others.timeline / 7);
            const days = others.timeline % 7;
            others.timeline = weeks + (days / 10);
        }

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
            const issue = await getRepoIssue(payload.repoUrl, githubToken, payload.issue.number);

            if (typeof issue.labels[0] === "string") {
                issue.labels = [...issue.labels, "💵 Bounty"];
            } else {
                const labelNames = issue.labels.reduce((acc: any[], label) => [...acc, (label as any).name], []);
                issue.labels = [...labelNames, "💵 Bounty"];
            }

            await updateRepoIssue(
                payload.repoUrl, 
                githubToken, 
                issue.number,
                issue.title + ` (${payload.bounty} USDC)`,
                issue.body + `
## 💵 ${payload.bounty} USDC bounty
 
### ❗ Important guidelines:
- To claim a bounty, you need to **provide a short demo video** of your changes in your pull request.
- If anything is unclear, **ask for clarification** before starting as this will help avoid potential rework.

**To work on this task, [Apply here](https://dev.devasign.com?taskId=${task.id})**`,
                issue.labels as unknown as string[]
            )
        } catch (error) {
                // Return task data even if updating issue fails
                next({
                    error,
                    task,
                    message: "Task created but failed to update repo issue"
                });
        }

        res.status(201).json(task);
    } catch (error) {
        next(error);
    }
};

// ? Delete this
export const createManyTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload, projectId } = req.body;
    const tasks = payload as CreateTask[];

    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: { walletSecret: true, walletAddress: true }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        // Calculate total bounty needed for all tasks
        const totalBounty = tasks.reduce((sum: number, task: CreateTask) => 
            sum + parseFloat(task.bounty), 0
        );

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < totalBounty) {
            throw new ErrorClass("TaskError", null, "Insufficient balance for all tasks");
        }

        const decryptedUserSecret = decrypt(user.walletSecret);

        // Get project details once for all tasks
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            select: { escrowSecret: true, escrowAddress: true }
        });

        if (!project) {
            throw new NotFoundErrorClass(`Project not found`);
        }

        // Ensure USDC trustline exists
        const projectWallet = await stellarService.getAccountInfo(project.escrowAddress!);
        if (!projectWallet.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        )) {
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                project.escrowSecret!,
            );
        }

        // Transfer total bounty to escrow in one transaction
        await stellarService.transferAsset(
            decryptedUserSecret,
            project.escrowAddress!,
            usdcAssetId,
            usdcAssetId,
            totalBounty.toString(),
        );

        // TODO: find a way to refund user if creating tasks fails
        // Create all tasks in a single transaction
        const createdTasks = await prisma.$transaction(
            tasks.map(task => {
                const { projectId, ...others } = task;
                return prisma.task.create({
                    data: {
                        ...others,
                        bounty: parseFloat(task.bounty),
                        project: {
                            connect: { id: projectId }
                        },
                        creator: {
                            connect: { userId }
                        }
                    }
                });
            })
        );

        res.status(201).json({
            message: `Successfully created ${createdTasks.length} tasks`,
            tasks: createdTasks
        });
    } catch (error) {
        next(error);
    }
};

// TODO: add publishTaskToIssue route
// TODO: add saveTaskDraft route

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        status, 
        projectId,
        role,  // 'creator' | 'contributor'
        detailed,
        page = 1,
        limit = 10,
        sort,
    } = req.query;
    const { userId } = req.body;

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

        let selectRelations: any = {};

        // TODO: Check user type (dev or pm). Also in getTask.
        if (detailed) {
            selectRelations = {
                project: {
                    select: {
                        id: true,
                        name: true,
                        repoUrls: true
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
                        pullRequest: true,
                        videoUrl: true
                    }
                }
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
                createdAt: true,
                updatedAt: true,
                ...selectRelations
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || 'desc'
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
                project: {
                    select: {
                        id: true,
                        name: true,
                        repoUrls: true
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
                        pullRequest: true,
                        videoUrl: true
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
            data: { bounty: newbounty },
            select: {
                bounty: true,
                updatedAt: true
            }
        });

        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

// TODO: Add updateTaskTimeline

export const submitTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id: taskId },
            select: { status: true, applications: { select: { userId: true } } }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Task is not open");
        }

        const alreadyApplied = task.applications.some(user => user.userId === userId);
        if (alreadyApplied) {
            throw new ErrorClass("TaskError", null, "You have already applied for this task!");
        }

        await prisma.task.update({
            where: { id: taskId },
            data: {
                applications: {
                    connect: { userId }
                }
            }
        });

        res.status(200).json({ message: "Task application submitted" });
    } catch (error) {
        next(error);
    }
};

export const acceptTaskApplication = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId, contributorId } = req.params;
    const { userId } = req.body;

    try {
        // Fetch the task and check if it exists and is open
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: {
                status: true,
                creatorId: true,
                applications: { select: { userId: true } },
                contributorId: true
            }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be assigned");
        }
        // TODO: Update when permissions are live
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only the task creator can accept applications");
        }
        if (task.contributorId) {
            throw new ErrorClass("TaskError", null, "Task already has a contributor assigned");
        }

        // Check if the contributor actually applied
        const hasApplied = task.applications.some(app => app.userId === contributorId);
        if (!hasApplied) {
            throw new ErrorClass("TaskError", null, "User did not apply for this task");
        }

        // Assign the contributor and update status
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

        res.status(200).json({
            message: "Task application accepted",
            task: updatedTask
        });
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

export const requestTimelineExtension = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { 
        userId, 
        githubUsername,
        requestedTimeline, 
        timelineType, 
        reason, 
        attachments 
    } = req.body;

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
                "Requesting timeline extension can only be requested by the active contributor"
            );
        }

        if (task.timeline! >= requestedTimeline) {
            throw new ErrorClass(
                "ValidationError",
                null,
                "New timeline must be greater than current timeline"
            );
        }

        const message = `${githubUsername} is requesting for a ${requestedTimeline} ${(timelineType as string).toLowerCase()} 
            time extension for this task. Kindly approve or reject it below.`;

        const comment = await createComment({
            userId,
            taskId: id,
            type: CommentType.TIMELINE_MODIFICATION,
            message,
            attachments: attachments || [],
            metadata: { 
                requestedTimeline,
                timelineType,
                reason
            }
        });

        res.status(200).json(comment);
    } catch (error) {
        next(error);
    }
};

export const replyTimelineExtensionRequest = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { 
        userId, 
        accept, 
        requestedTimeline, 
        timelineType,
    } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: { 
                creatorId: true,
                timeline: true,
                timelineType: true 
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }

        if (task.creatorId !== userId) { 
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Only task creator can respond to timeline extension requests"
            );
        }

        if (accept) {
            let newTimeline: number, newTimelineType: TimelineType;

            if (timelineType === "WEEK" && task.timelineType! == "WEEK") {
                newTimeline = task.timeline! + requestedTimeline;
                newTimelineType = "WEEK";
            }
            if (timelineType === "DAY" && task.timelineType! == "DAY") {
                newTimeline = task.timeline! + requestedTimeline;
                newTimelineType = "DAY";
                
                if (requestedTimeline > 6) {
                    const weeks = Math.floor(newTimeline / 7);
                    const days = newTimeline % 7;
                    newTimeline = task.timeline! + weeks + (days / 10);
                    newTimelineType = "WEEK";
                }
            }

            if (timelineType === "DAY" && task.timelineType! == "WEEK") {
                if (requestedTimeline === 7) newTimeline = task.timeline! + 1;
                if (requestedTimeline > 7) {
                    const weeks = Math.floor(requestedTimeline / 7);
                    const days = requestedTimeline % 7;
                    newTimeline = task.timeline! + weeks + (days / 10);
                } else {
                    newTimeline = task.timeline! + (requestedTimeline / 10);
                }
                newTimelineType = "WEEK";
            }

            if (timelineType === "WEEK" && task.timelineType! == "DAY") {
                newTimeline = requestedTimeline + (task.timeline! / 10);
                newTimelineType = "WEEK";
            }

            const updatedTask = await prisma.task.update({
                where: { id },
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
            
            const comment = await createComment({
                userId,
                taskId: id,
                type: CommentType.TIMELINE_MODIFICATION,
                message: `You’ve extended the timeline of this task by ${requestedTimeline} ${(timelineType as string).toLowerCase()}.`,
                attachments: [],
                metadata: { 
                    requestedTimeline,
                    timelineType,
                }
            });

            return res.status(200).json({ comment, task: updatedTask });
        }

        const comment = await createComment({
            userId,
            taskId: id,
            type: CommentType.TIMELINE_MODIFICATION,
            message: "Timeline extension rejected.",
            attachments: [],
            metadata: { 
                requestedTimeline,
                timelineType,
            }
        });

        res.status(200).json({ comment });
    } catch (error) {
        next(error);
    }
};

export const markAsComplete = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, pullRequest, videoUrl } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: {
                status: true,
                contributorId: true,
                projectId: true,
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.contributorId !== userId) {
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Only the active contributor can make this action"
            );
        }
        if (task.status !== "IN_PROGRESS" && task.status !== "MARKED_AS_COMPLETED") {
            throw new ErrorClass(
                "TaskError", 
                null, 
                "Task is not active"
            );
        }

        await prisma.taskSubmission.create({
            data: {
                user: { connect: { userId } },
                task: { connect: { id } },
                project: { connect: { id: task.projectId } },
                pullRequest,
                videoUrl
            }
        });

        // Update task status
        const updatedTask = await prisma.task.update({
            where: { id },
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
                        videoUrl: true,
                    }
                }
            }
        });

        res.status(200).json(updatedTask);
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

        // TODO: Update to allow team members with permission
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

        const updatedTask = await prisma.task.update({
            where: { id },
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

        // TODO: Update issue on GitHub

        try {
            // Update contribution summary
            await prisma.contributionSummary.update({
                where: { userId: task.contributor.userId },
                data: {
                    tasksCompleted: { increment: 1 },
                    totalEarnings: { increment: task.bounty }
                }
            });
            
            res.status(201).json(updatedTask);
        } catch (error: any) {
            next({ 
                error, 
                validated: true, 
                task,
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