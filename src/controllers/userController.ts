import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../config/stellar";
import { encrypt } from "../helper";

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
            return res.status(404).json({ message: "User not found" });
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