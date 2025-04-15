import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../config/stellar";
import { encrypt } from "../helper";
import { NotFoundErrorClass } from "../types/general";

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.params;

    // TODO: reduce the amount of data returned to only what is needed and add filer for selection
    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: {
                userId: true,
                username: true,
                walletAddress: true,
                contributionSummary: {
                    select: {
                        tasksTaken: true,
                        tasksCompleted: true,
                        averageRating: true,
                        totalEarnings: true
                    }
                },
                projects: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        repoUrl: true,
                        createdAt: true
                    }
                },
                createdTasks: {
                    select: {
                        id: true,
                        project: {
                            select: {
                                name: true,
                                repoUrl: true
                            }
                        },
                        issue: true,
                        bounty: true,
                        status: true,
                        createdAt: true
                    }
                },
                contributedTasks: {
                    select: {
                        id: true,
                        project: {
                            select: {
                                name: true,
                                repoUrl: true
                            }
                        },
                        issue: true,
                        bounty: true,
                        status: true,
                        acceptedAt: true,
                        completedAt: true
                    }
                },
                addressBook: true,
                createdAt: true,
                updatedAt: true
            }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        try {
            const accountInfo = await stellarService.getAccountInfo(user.walletAddress);
            res.status(200).json({
                ...user,
                assets: accountInfo.balances
            });
        } catch (error: any) {
            // Return user data even if getting Stellar account info fails
            next({
                ...error,
                user,
                message: "User found but failed to fetch Stellar account info"
            });
        }
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubUsername } = req.body;

    try {
        const userWallet = await stellarService.createWallet();
        const encryptedUserSecret = encrypt(userWallet.secretKey);

        const user = await prisma.user.create({
            data: {
                userId,
                username: githubUsername,
                walletAddress: userWallet.publicKey,
                walletSecret: encryptedUserSecret,
                contributionSummary: {
                    create: {}
                }
            },
            select: {
                userId: true,
                username: true,
                walletAddress: true,
                contributionSummary: true
            }
        });

        try {
            await stellarService.fundWallet(userWallet.publicKey);
            await stellarService.addTrustLine(userWallet.secretKey);
            
            res.status(201).json(user);
        } catch (error: any) {
            next({ 
                ...error, 
                user, 
                message: "User successfully created. Failed to fund wallet/add USDC trustline."
            });
        }
    } catch (error) {
        next(error);
    }
}

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, username } = req.body;

    try {
        const user = await prisma.user.update({
            where: { userId },
            data: { username }
        });
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

export const updateAddressBook = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, address, name } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId },
            select: {
                addressBook: true
            }
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        const newAddress = { address, name };
        const updatedAddressBook = [...user.addressBook, newAddress];

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                addressBook: updatedAddressBook as InputJsonValue[]
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
}