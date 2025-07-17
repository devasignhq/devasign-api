import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../config/stellar";
import { encrypt } from "../helper";
import { AddressBook, ErrorClass, NotFoundErrorClass } from "../types/general";

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const { view = "basic" } = req.query; // "basic" | "full" | "profile"

    try {
        // Base selection - always included
        const baseSelect = {
            userId: true,
            username: true,
            walletAddress: true,
            addressBook: true,
            createdAt: true,
            updatedAt: true
        };

        // Build select object based on view type
        const selectObject: any = {
            ...baseSelect,
            _count: {
                select: {
                    installations: true
                }
            },
            ...(view === "full" || view === "profile" ? {
                contributionSummary: {
                    select: {
                        tasksCompleted: true,
                        activeTasks: true,
                        totalEarnings: true
                    }
                }
            } : {})
        };

        const user = await prisma.user.findUnique({
            where: { userId },
            select: selectObject
        });

        if (!user) {
            throw new NotFoundErrorClass("User not found");
        }

        // Get Stellar balance only for full view
        if (view === "full") {
            try {
                const accountInfo = await stellarService.getAccountInfo((user as any).walletAddress);
                return res.status(200).json({
                    ...user,
                    assets: accountInfo.balances
                });
            } catch (error: any) {
                // Return user data even if getting Stellar account info fails
                next({
                    error,
                    user,
                    message: "User found but failed to fetch Stellar account info"
                });
            }
        }

        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

// TODO: Add route to create user wallet separately
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, gitHubUsername } = req.body;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { userId }
        });

        if (existingUser) {
            throw new ErrorClass("UserError", null, "User already exists");
        }
        
        const userWallet = await stellarService.createWallet();
        const encryptedUserSecret = encrypt(userWallet.secretKey);

        const user = await prisma.user.create({
            data: {
                userId,
                username: gitHubUsername,
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
                contributionSummary: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        try {
            await stellarService.fundWallet(userWallet.publicKey);
            await stellarService.addTrustLine(userWallet.secretKey);
            
            res.status(201).json(user);
        } catch (error: any) {
            next({ 
                error, 
                user, 
                message: "User successfully created. Failed to fund wallet/add USDC trustline."
            });
        }
    } catch (error) {
        next(error);
    }
}

export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubUsername } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { userId }
        });

        if (!existingUser) {
            throw new NotFoundErrorClass("User not found");
        }

        const user = await prisma.user.update({
            where: { userId },
            data: { username: githubUsername },
            select: {
                userId: true,
                username: true,
                updatedAt: true
            }
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

        // Check for duplicate address
        const addressExists = (user.addressBook as AddressBook[]).some(
            entry => entry.address === address
        );
        if (addressExists) {
            throw new ErrorClass("ValidationError", null, "Address already exists in address book");
        }

        // TODO: Add a way to delete or replace other addresses
        // Limit address book size
        if (user.addressBook.length >= 20) {
            throw new ErrorClass("ValidationError", null, "Address book limit reached (max 20)");
        }

        const newAddress = { address, name };
        const updatedAddressBook = [...user.addressBook, newAddress];

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                addressBook: updatedAddressBook as InputJsonValue[]
            },
            select: {
                userId: true,
                addressBook: true,
                updatedAt: true
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        next(error);
    }
}