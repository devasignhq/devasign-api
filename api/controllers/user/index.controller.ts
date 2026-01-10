import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../../services/stellar.service";
import { STATUS_CODES } from "../../utilities/data";
import { NotFoundError, ValidationError } from "../../models/error.model";
import { dataLogger } from "../../config/logger.config";
import { Prisma } from "../../../prisma_client";
import { KMSService } from "../../services/kms.service";

// User's address book
export type AddressBook = {
    name: string;
    address: string;
}

/**
 * Create a new user.
 */
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { githubUsername } = req.body;
    const { skipWallet } = req.query;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { userId }
        });

        if (existingUser) {
            throw new ValidationError("User already exists");
        }

        // Fields to return
        const select: Prisma.UserSelect = {
            userId: true,
            username: true,
            wallet: { select: { address: true } },
            contributionSummary: true,
            createdAt: true,
            updatedAt: true
        };

        // Create user without wallet (for the project maintainer app)
        if (skipWallet === "true") {
            const user = await prisma.user.create({
                data: {
                    userId,
                    username: githubUsername,
                    contributionSummary: {
                        create: {}
                    }
                },
                select
            });

            // Return user
            return res.status(STATUS_CODES.CREATED).json(user);
        }

        // Create user wallet (for the contributor app)
        const userWallet = await stellarService.createWallet();
        const encryptedUserSecret = await KMSService.encryptWallet(userWallet.secretKey);

        // Create user with wallet
        const user = await prisma.user.create({
            data: {
                userId,
                username: githubUsername,
                wallet: {
                    create: {
                        address: userWallet.publicKey,
                        ...encryptedUserSecret
                    }
                },
                contributionSummary: {
                    create: {}
                }
            },
            select
        });

        try {
            // Add USDC trustline to wallet
            await stellarService.addTrustLineViaSponsor(
                process.env.STELLAR_MASTER_SECRET_KEY!,
                userWallet.secretKey
            );

            // Return user
            res.status(STATUS_CODES.CREATED).json(user);
        } catch (error) {
            // Return user info and notify user USDC trustline addition failed
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

/**
 * Get user details.
 */
export const getUser = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { view = "basic", setWallet } = req.query; // view: "basic" | "full"

    try {
        // Base selection - always included
        const baseSelect: Prisma.UserSelect = {
            userId: true,
            username: true,
            wallet: { select: { address: true } },
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

        // Fetch user and handle not found
        let user = await prisma.user.findUnique({
            where: { userId },
            select: selectObject
        });

        if (!user) {
            throw new NotFoundError("User not found");
        }

        // If setWallet is true and user has no wallet, create one
        const walletStatus = { wallet: false, usdcTrustline: false };

        // TODO: Idempotency check
        if ((!user.wallet || !user.wallet.address) && setWallet === "true") {
            try {
                // Create wallet
                const userWallet = await stellarService.createWallet();
                const encryptedUserSecret = await KMSService.encryptWallet(userWallet.secretKey);

                // Update user with wallet information
                const updatedUser = await prisma.user.update({
                    where: { userId },
                    data: {
                        wallet: {
                            create: {
                                address: userWallet.publicKey,
                                ...encryptedUserSecret
                            }
                        }
                    },
                    select: selectObject
                });

                user = updatedUser;
                walletStatus.wallet = true;

                try {
                    // Add USDC trustline to wallet
                    await stellarService.addTrustLineViaSponsor(
                        process.env.STELLAR_MASTER_SECRET_KEY!,
                        userWallet.secretKey
                    );
                    walletStatus.usdcTrustline = true;
                } catch (walletError) {
                    dataLogger.warn("Failed to add USDC trustline", { walletError });

                    // Return user info and notify user USDC trustline addition failed 
                    return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                        user,
                        error: walletError,
                        walletStatus,
                        message: "Created wallet but failed to add USDC trustline for wallet"
                    });
                }

                // Return user with new wallet
                return res.status(STATUS_CODES.SUCCESS).json({ user, walletStatus });
            } catch (walletCreationError) {
                dataLogger.warn("Failed to create wallet for existing user", { walletCreationError });
                // Return user info and notify user wallet creation failed
                return res.status(STATUS_CODES.PARTIAL_SUCCESS).json({
                    user,
                    error: walletCreationError,
                    walletStatus,
                    message: "Failed to create wallet"
                });
            }
        }

        // Return user data
        res.status(STATUS_CODES.SUCCESS).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * Update user's GitHub username.
 */
export const updateUsername = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { newUsername } = req.body;

    try {
        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { userId },
            select: { userId: true }
        });

        if (!existingUser) {
            throw new NotFoundError("User not found");
        }

        // Update username
        const user = await prisma.user.update({
            where: { userId },
            data: { username: newUsername },
            select: {
                userId: true,
                username: true,
                updatedAt: true
            }
        });

        // Return updated user
        res.status(STATUS_CODES.SUCCESS).json(user);
    } catch (error) {
        next(error);
    }
};

/**
 * Add a new entry in the user's address book.
 */
export const updateAddressBook = async (req: Request, res: Response, next: NextFunction) => {
    const { userId } = res.locals;
    const { address, name } = req.body;

    try {
        // Fetch user and verify user exists
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
            throw new ValidationError("Address already exists in address book");
        }

        const newAddress = { address, name };
        let updatedAddressBook = [...user.addressBook, newAddress];

        // Ensure address book does not exceed 20 entries
        if (updatedAddressBook.length > 20) {
            updatedAddressBook = updatedAddressBook.slice(-20);
        }

        // Update user's address book
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

        // Return updated user
        res.status(STATUS_CODES.SUCCESS).json(updatedUser);
    } catch (error) {
        next(error);
    }
};
