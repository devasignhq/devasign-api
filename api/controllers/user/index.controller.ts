import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../../services/stellar.service";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { NotFoundError, ValidationError } from "../../models/error.model";
import { dataLogger } from "../../config/logger.config";
import { Prisma } from "../../../prisma_client";
import { KMSService } from "../../services/kms.service";
import { OctokitService } from "../../services/octokit.service";

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

    // Extract the origin from headers
    const origin = req.get("origin");
    // Check if it matches the maintainer app domain
    const isMaintainerApp = origin?.includes("app.devasign.com");

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
            verified: true,
            wallet: { select: { address: true } },
            contributionSummary: true,
            techStack: true,
            createdAt: true,
            updatedAt: true
        };

        // Create user without wallet (for the project maintainer app)
        if (isMaintainerApp) {
            const user = await prisma.user.create({
                data: {
                    userId,
                    username: githubUsername,
                    contributionSummary: { create: {} }
                },
                select
            });

            // Return user
            return responseWrapper({
                res,
                status: STATUS_CODES.CREATED,
                data: user,
                message: "User created successfully"
            });
        }

        // Fetch tech stack from GitHub
        const techStack = await OctokitService.getUserTopLanguages(githubUsername);

        // Create user wallet (for the contributor app)
        const userWallet = await stellarService.createWallet();
        const encryptedUserSecret = await KMSService.encryptWallet(userWallet.secretKey);

        // Create user with wallet
        const user = await prisma.user.create({
            data: {
                userId,
                username: githubUsername,
                techStack,
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
            responseWrapper({
                res,
                status: STATUS_CODES.CREATED,
                data: user,
                message: "User created successfully"
            });
        } catch (error) {
            // Return user info and notify user USDC trustline addition failed
            responseWrapper({
                res,
                status: STATUS_CODES.PARTIAL_SUCCESS,
                data: user,
                message: "User created successfully",
                warning: "Failed to add USDC trustline to wallet",
                meta: { error }
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
    const { view = "basic" } = req.query; // view: "basic" | "full"

    // Extract the origin from headers
    const origin = req.get("origin");
    // Check if it matches the contributor app domain
    const isContributorApp = origin?.includes("contributor.devasign.com");

    try {
        // Base selection - always included
        const baseSelect: Prisma.UserSelect = {
            userId: true,
            username: true,
            verified: true,
            wallet: { select: { address: true } },
            addressBook: true,
            techStack: true,
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

        // Fetch tech stack from GitHub if it's empty and it's the contributor app
        if (user.techStack.length === 0 && isContributorApp) {
            try {
                const techStack = await OctokitService.getUserTopLanguages(user.username);
                user = await prisma.user.update({
                    where: { userId },
                    data: { techStack },
                    select: selectObject
                });
            } catch (error) {
                dataLogger.warn("Failed to fetch tech stack for user", { userId, error });
            }
        }

        // If setWallet is true and user has no wallet, create one
        const walletStatus = { wallet: false, usdcTrustline: false };

        // TODO: Idempotency protection
        if ((!user.wallet || !user.wallet.address) && isContributorApp) {
            let userWallet;
            try {
                // Create wallet
                userWallet = await stellarService.createWallet();
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
            } catch (error) {
                dataLogger.warn("Failed to create wallet for existing user", { error });
                // Return user info and notify user wallet creation failed
                return responseWrapper({
                    res,
                    status: STATUS_CODES.PARTIAL_SUCCESS,
                    data: user,
                    message: "Failed to create wallet",
                    meta: { walletStatus }
                });
            }

            try {
                // Add USDC trustline to wallet
                await stellarService.addTrustLineViaSponsor(
                    process.env.STELLAR_MASTER_SECRET_KEY!,
                    userWallet.secretKey
                );
                walletStatus.usdcTrustline = true;
            } catch (error) {
                dataLogger.warn("Failed to add USDC trustline", { error });

                // Return user info and notify user USDC trustline addition failed 
                return responseWrapper({
                    res,
                    status: STATUS_CODES.PARTIAL_SUCCESS,
                    data: user,
                    message: "Created wallet successfully",
                    warning: "Failed to add USDC trustline to wallet",
                    meta: { walletStatus }
                });
            }

            // Return user with new wallet
            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: { user, walletStatus }
            });
        }

        // Return user data
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: user
        });
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
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: updatedUser,
            message: "Address added to address book"
        });
    } catch (error) {
        next(error);
    }
};
