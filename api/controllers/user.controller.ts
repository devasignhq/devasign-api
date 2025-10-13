import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../services/stellar.service";
import { STATUS_CODES, encrypt } from "../helper";
import { AddressBook } from "../models";
import { NotFoundError, ErrorClass } from "../models/error.model";
import { dataLogger } from "../config/logger.config";

class UserError extends ErrorClass {
    constructor(message: string, details: unknown = null) {
        super("USER_ERROR", details, message);
    }
}

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = req.body;
    const { view = "basic", setWallet } = req.query; // view: "basic" | "full"

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
        const selectObject = {
            ...baseSelect,
            _count: {
                select: {
                    installations: true
                }
            },
            ...(view === "full" ? {
                contributionSummary: {
                    select: {
                        tasksCompleted: true,
                        activeTasks: true,
                        totalEarnings: true
                    }
                }
            } : {})
        };

        let user = await prisma.user.findUnique({
            where: { userId },
            select: selectObject
        });
    
        if (!user) {
            throw new NotFoundError("User not found");
        }

        const walletStatus = { wallet: false, usdcTrustline: false };
    
        if ((!user.walletAddress || user.walletAddress === "") && setWallet === "true") {
            try {
                const userWallet = await stellarService.createWallet();
                const encryptedUserSecret = encrypt(userWallet.secretKey);
        
                // Update user with wallet information
                const updatedUser = await prisma.user.update({
                    where: { userId },
                    data: {
                        walletAddress: userWallet.publicKey,
                        walletSecret: encryptedUserSecret
                    },
                    select: selectObject
                });
                
                user = updatedUser;
                walletStatus.wallet = true;
        
                // Fund wallet and add trustline in background
                try {
                    await stellarService.addTrustLineViaSponsor(
                        process.env.STELLAR_MASTER_SECRET_KEY!,
                        userWallet.secretKey
                    );
                    walletStatus.usdcTrustline = true;
                } catch (walletError) {
                    dataLogger.warn("Failed to add USDC trustline", { walletError });
                    return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({ 
                        user, 
                        error: walletError,
                        walletStatus,
                        message: "Created wallet but failed to add USDC trustline for wallet"
                    });
                }

                return res.status(STATUS_CODES.SUCCESS).json({ user, walletStatus });
            } catch (walletCreationError) {
                dataLogger.warn("Failed to create wallet for existing user", { walletCreationError });
                return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({ 
                    user, 
                    error: walletCreationError,
                    walletStatus,
                    message: "Failed to create wallet"
                });
            }
        }
        
        res.status(STATUS_CODES.SUCCESS).json(user);
    } catch (error) {
        next(error);
    }
};

export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, gitHubUsername } = req.body;
    const { skipWallet } = req.query;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { userId }
        });

        if (existingUser) {
            throw new UserError("User already exists");
        }

        const select = {
            userId: true,
            username: true,
            walletAddress: true,
            contributionSummary: true,
            createdAt: true,
            updatedAt: true
        };

        if (skipWallet === "true") {
            const user = await prisma.user.create({
                data: {
                    userId,
                    username: gitHubUsername,
                    walletAddress: "",
                    walletSecret: "",
                    contributionSummary: {
                        create: {}
                    }
                },
                select
            });
        
            return res.status(STATUS_CODES.POST).json(user);
        }
    
        // Create wallet for contributor.devasign.com or when not skipping
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
            select
        });

        try {
            await stellarService.addTrustLineViaSponsor(
                process.env.STELLAR_MASTER_SECRET_KEY!,
                userWallet.secretKey
            );
            
            res.status(STATUS_CODES.POST).json(user);
        } catch (error) {
            res.status(STATUS_CODES.PARTIAL_SUCCESS).json({ 
                error, 
                user, 
                message: "Failed to add USDC trustline for wallet."
            });
        }
    } catch (error) {
        next(error);
    }
};

export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
    const { userId, githubUsername } = req.body;

    try {
        const existingUser = await prisma.user.findUnique({
            where: { userId }
        });

        if (!existingUser) {
            throw new NotFoundError("User not found");
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

        res.status(STATUS_CODES.SUCCESS).json(user);
    } catch (error) {
        next(error);
    }
};

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
            throw new NotFoundError("User not found");
        }

        // Check for duplicate address
        const addressExists = (user.addressBook as AddressBook[]).some(
            entry => entry.address === address
        );
        if (addressExists) {
            throw new UserError("Address already exists in address book");
        }

        const newAddress = { address, name };
        let updatedAddressBook = [...user.addressBook, newAddress];

        if (updatedAddressBook.length > 20) {
            updatedAddressBook = updatedAddressBook.slice(-20);
        }

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

        res.status(STATUS_CODES.SUCCESS).json(updatedUser);
    } catch (error) {
        next(error);
    }
};
