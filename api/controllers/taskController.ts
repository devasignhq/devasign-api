import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { createMessage } from "../services/firebaseService";
import { stellarService, usdcAssetId } from "../config/stellar";
import { decrypt } from "../helper";
import { MessageType, CreateTask, ErrorClass, NotFoundErrorClass, TaskIssue, FilterTasks } from "../types/general";
import { HorizonApi } from "../types/horizonapi";
import { Prisma, TaskStatus, TimelineType } from "../generated/client";
import { GitHubService } from "../services/githubService";

type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload: data } = req.body;
    const payload = data as CreateTask;

    try {
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
            throw new NotFoundErrorClass("Installation not found");
        }

        // Check user balance
        const accountInfo = await stellarService.getAccountInfo(installation.walletAddress);
        const usdcAsset = accountInfo.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        ) as USDCBalance;

        if (parseFloat(usdcAsset.balance) < parseFloat(payload.bounty)) {
            throw new ErrorClass("TaskError", null, "Insufficient balance");
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
            await stellarService.addTrustLineViaSponsor(
                decryptedInstallationWalletSecret,
                decryptedEscrowWalletSecret,
            );
        }

        // Transfer to escrow
        const { txHash } = await stellarService.transferAsset(
            decryptedInstallationWalletSecret,
            installation.escrowAddress!,
            usdcAssetId,
            usdcAssetId,
            payload.bounty,
        );

        const { installationId, bountyLabelId, ...others } = payload;

        if (others.timeline && others.timelineType && others.timelineType === "DAY" && others.timeline > 6) {
            const weeks = Math.floor(others.timeline / 7);
            const days = others.timeline % 7;
            others.timeline = weeks + (days / 10);
            others.timelineType = "WEEK" as any;
        }

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

        
        const bountyTransactionStatus: any = { 
            recorded: false,
            error: undefined
        };

        try {
            await prisma.transaction.create({
                data: {
                    txHash: txHash,
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
            const bountyComment = await GitHubService.addBountyLabelAndCreateBountyComment(
                installationId,
                others.issue.id,
                bountyLabelId,
                GitHubService.customBountyMessage(others.bounty, task.id),
            );

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

            if (!bountyTransactionStatus.recorded) {
                return res.status(202).json({ 
                    error: bountyTransactionStatus.error, 
                    task: updatedTask,
                    message: "Failed to record bounty transaction."
                });
            }

            res.status(201).json({ ...task, ...updatedTask });
        } catch (error: any) {
            let message = "Failed to either create bounty comment or add bounty label.";
            
            if (!bountyTransactionStatus.recorded) {
                message = "Failed to record bounty transaction and to either create bounty comment or add bounty label."
            }

            res.status(202).json({ 
                error, 
                task,
                message
            });
        }
    } catch (error) {
        next(error);
    }
};

// ? TODO: Add publishTaskToGithub route

// ? Delete this
export const createManyTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, payload, installationId } = req.body;
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

        // Get installation details once for all tasks
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { escrowSecret: true, escrowAddress: true }
        });

        if (!installation) {
            throw new NotFoundErrorClass(`Installation not found`);
        }

        // Ensure USDC trustline exists
        const installationWallet = await stellarService.getAccountInfo(installation.escrowAddress!);
        if (!installationWallet.balances.find(
            (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
        )) {
            await stellarService.addTrustLineViaSponsor(
                decryptedUserSecret,
                installation.escrowSecret!,
            );
        }

        // Transfer total bounty to escrow in one transaction
        await stellarService.transferAsset(
            decryptedUserSecret,
            installation.escrowAddress!,
            usdcAssetId,
            usdcAssetId,
            totalBounty.toString(),
        );

        // TODO: find a way to refund user if creating tasks fails
        // Create all tasks in a single transaction
        const createdTasks = await prisma.$transaction(
            tasks.map(task => {
                const { installationId, ...others } = task;
                return prisma.task.create({
                    data: {
                        ...others,
                        bounty: parseFloat(task.bounty),
                        installation: {
                            connect: { id: installationId }
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

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const { 
        installationId,
        role, // contributor | creator
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels,
        issueMilestone,
    } = req.query;
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels,
        issueMilestone,
    } as FilterTasks;

    try {
        const where: Prisma.TaskWhereInput = { status: "OPEN" };

        if (installationId) {
            where.installationId = installationId as string;
        }
        if (role) {
            if (role === "contributor") {
                where.contributorId = userId;
                where.status = { not: "OPEN" };
            } else if (role === "creator") {
                where.creatorId = userId;
            }
        }

        const issueFilters: any[] = [];
        
        if (filters.repoUrl) {
            issueFilters.push({
                path: ["repository", "url"],
                string_contains: filters.repoUrl,
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
                array_contains: filters.issueLabels.map((label) => ({ name: label })),
            });
        }
        if (filters.issueMilestone) {
            if (filters.issueMilestone === "none") {
                issueFilters.push({
                    path: ["milestone"],
                    equals: Prisma.AnyNull,
                });
            } else {
                issueFilters.push({
                    path: ["milestone", "title"],
                    string_contains: filters.issueMilestone,
                });
            }
        }
        if (issueFilters.length > 0) {
            where.AND = issueFilters.map(filter => ({ issue: filter }));
        }

        let selectRelations: any = {};

        if (detailed) {
            selectRelations = {
                installation: {
                    select: { account: true  }
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
                contributorId: true,
                creatorId: true,
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

export const getInstallationTasks = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        status,
        detailed,
        page = 1,
        limit = 10,
        sort,
        repoUrl,
        issueTitle,
        issueLabels,
        issueMilestone,
    } = req.query;
    const { installationId } = req.params;
    const { userId } = req.body;
    const filters = {
        repoUrl,
        issueTitle,
        issueLabels,
        issueMilestone,
    } as FilterTasks;

    try {
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

        const issueFilters: any[] = [];
        
        if (filters.repoUrl) {
            issueFilters.push({
                path: ["repository", "url"],
                string_contains: filters.repoUrl,
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
                array_contains: filters.issueLabels.map((label) => ({ name: label })),
            });
        }
        if (filters.issueMilestone) {
            if (filters.issueMilestone === "none") {
                issueFilters.push({
                    path: ["milestone"],
                    equals: Prisma.AnyNull,
                });
            } else {
                issueFilters.push({
                    path: ["milestone", "title"],
                    string_contains: filters.issueMilestone,
                });
            }
        }
        if (issueFilters.length > 0) {
            where.AND = issueFilters.map(filter => ({ issue: filter }));
        }

        let selectRelations: any = {};

        if (detailed) {
            selectRelations = {
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
                contributorId: true,
                creatorId: true,
                createdAt: true,
                updatedAt: true,
                ...selectRelations
            },
            orderBy: {
                createdAt: (sort as "asc" | "desc") || "desc"
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
            throw new NotFoundErrorClass("Task not found");
        }

        res.status(200).json(task);
    } catch (error) {
        next(error);
    }
};

export const getInstallationTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id, installationId } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({
            where: { 
                id,
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

export const addBountyCommentId = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, bountyCommentId } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id },
            select: { 
                id: true, 
                status: true, 
                creatorId: true, 
                issue: true 
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be updated");
        }
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only task creator can perform action");
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data: { 
                issue: { ...(typeof task.issue === "object" && task.issue !== null ? task.issue : {}), bountyCommentId }
            },
            select: { id: true }
        });

        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

export const updateTaskBounty = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId } = req.params;
    const { userId, newBounty } = req.body;

    try {
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
                }
            } 
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be updated");
        }
        if (task.bounty === newBounty) {
            throw new ErrorClass("TaskError", null, "New bounty is the same as current bounty");
        }
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only task creator can update bounty");
        }

        const bountyDifference = Number(newBounty) - task.bounty;
        const decryptedWalletSecret = decrypt(task.installation.walletSecret!);
        const additionalFundsTransaction: any = { 
            txHash: "", 
            amount: "",
            recorded: false,
            error: undefined
        };

        if (bountyDifference > 0) {
            // Additional funds needed - transfer from wallet to escrow
            const accountInfo = await stellarService.getAccountInfo(task.installation.walletAddress!);
            const usdcAsset = accountInfo.balances.find(
                (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
            );

            if (!usdcAsset || parseFloat(usdcAsset.balance) < bountyDifference) {
                throw new ErrorClass("TaskError", null, "Insufficient USDC balance for compensation increase");
            }

            const { txHash } =await stellarService.transferAsset(
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

        try {
            if (additionalFundsTransaction.txHash) {     
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
            }
        } catch (error) {
            additionalFundsTransaction.error = error;
        }

        try {
            await GitHubService.updateIssueComment(
                task.installationId,
                (task.issue as TaskIssue).bountyCommentId!,
                GitHubService.customBountyMessage(newBounty as string, taskId),
            );

            if (!additionalFundsTransaction.recorded && additionalFundsTransaction.txHash) {
                return res.status(202).json({ 
                    error: additionalFundsTransaction.error, 
                    task: updatedTask,
                    message: "Failed to record additional bounty transaction."
                });
            }

            res.status(200).json(updatedTask);
        } catch (error: any) {
            let message = "Failed to update bounty amount on GitHub.";
            
            if (!additionalFundsTransaction.recorded && additionalFundsTransaction.txHash) {
                message = "Failed to update bounty amount on GitHub and also record the additional bounty transaction."
            }

            res.status(202).json({ 
                error, 
                task: updatedTask,
                message
            });
        }
    } catch (error) {
        next(error);
    }
};

export const updateTaskTimeline = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId, newTimeline, newTimelineType } = req.body;

    try {
        // Fetch the task and check if it exists and is open
        const task = await prisma.task.findUnique({
            where: { id },
            select: {
                status: true,
                creatorId: true,
                timeline: true,
                timelineType: true
            }
        });

        if (!task) {
            throw new NotFoundErrorClass("Task not found");
        }
        if (task.status !== "OPEN") {
            throw new ErrorClass("TaskError", null, "Only open tasks can be updated");
        }
        if (task.creatorId !== userId) {
            throw new ErrorClass("TaskError", null, "Only task creator can update timeline");
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

        const updatedTask = await prisma.task.update({
            where: { id },
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

        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

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

        await prisma.taskActivity.create({
            data: {
                task: {
                    connect: { id: taskId }
                },
                user: {
                    connect: { userId }
                },
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

        res.status(200).json(updatedTask);
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

        const body = `${githubUsername} is requesting for a ${requestedTimeline} ${(timelineType as string).toLowerCase()}(s) 
            time extension for this task. Kindly approve or reject it below.`;

        const message = await createMessage({
            userId,
            taskId: id,
            type: MessageType.TIMELINE_MODIFICATION,
            body,
            attachments: attachments || [],
            metadata: { 
                requestedTimeline,
                timelineType,
                reason
            }
        });

        res.status(200).json(message);
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
            
            // ? Add newTimeline and newTimelineType for clarity
            const message = await createMessage({
                userId,
                taskId: id,
                type: MessageType.TIMELINE_MODIFICATION,
                body: `You’ve extended the timeline of this task by ${requestedTimeline} ${(timelineType as string).toLowerCase()}(s).`,
                attachments: [],
                metadata: { 
                    requestedTimeline: newTimeline,
                    timelineType: newTimelineType as any,
                    reason: "ACCEPTED"
                }
            });

            return res.status(200).json({ message, task: updatedTask });
        }

        const message = await createMessage({
            userId,
            taskId: id,
            type: MessageType.TIMELINE_MODIFICATION,
            body: "Timeline extension rejected.",
            attachments: [],
            metadata: { 
                requestedTimeline,
                timelineType,
                reason: "REJECTED"
            }
        });

        res.status(200).json({ message });
    } catch (error) {
        next(error);
    }
};

export const markAsComplete = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId } = req.params;
    const { userId, pullRequest, attachmentUrl } = req.body;

    try {
        const task = await prisma.task.findUnique({ 
            where: { id: taskId },
            select: {
                status: true,
                contributorId: true,
                installationId: true,
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
                        attachmentUrl: true,
                    }
                }
            }
        });

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
                },
            }
        });

        res.status(200).json(updatedTask);
    } catch (error) {
        next(error);
    }
};

export const validateCompletion = async (req: Request, res: Response, next: NextFunction) => {
    const { id: taskId } = req.params;
    const { userId } = req.body;

    try {
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
            
            res.status(201).json(updatedTask);
        } catch (error: any) {
            res.status(202).json({ 
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

export const getTaskActivities = async (req: Request, res: Response, next: NextFunction) => {
    const { 
        page = 1,
        limit = 10,
        sort,
    } = req.query;
    const { id: taskId } = req.params;
    const { userId } = req.body;

    try {
        // Get total count for pagination
        const totalActivities = await prisma.taskActivity.count({ where: { taskId } });
        const totalPages = Math.ceil(totalActivities / Number(limit));
        const skip = (Number(page) - 1) * Number(limit);

        // Get task activities with pagination
        const activities = await prisma.taskActivity.findMany({
            where: { taskId },
            select: {
                id: true,
                taskId: true,
                userId: true,
                taskSubmissionId: true,
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
                createdAt: (sort as "asc" | "desc") || 'desc'
            },
            skip,
            take: Number(limit)
        });

        res.status(200).json({
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

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { userId } = req.body;

    try {
        const task = await prisma.task.findUnique({
            where: { id },
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

        // Return bounty to wallet if it exists
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
            where: { id }
        });

        try {
            await GitHubService.removeBountyLabelAndDeleteBountyComment(
                task.installation.id,
                (task.issue as TaskIssue).id,
                (task.issue as TaskIssue).bountyCommentId!,
            );
            
            res.status(200).json({
                message: "Task deleted successfully",
                refunded: `${task.bounty} USDC`
            });
        } catch (error: any) {
            res.status(202).json({ 
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