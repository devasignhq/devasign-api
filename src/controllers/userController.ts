import { Request, Response } from "express";
import { prisma } from "../config/database";
import { InputJsonValue } from "@prisma/client/runtime/library";
import { stellarService } from "../config/stellar";
import { decrypt, encrypt } from "../helper";

export const createUser = async (req: Request, res: Response) => {
    const { userId, githubUsername } = req.body;

    try {
        // Create Stellar wallets
        const userWallet = await stellarService.createWallet();
        const escrowWallet = await stellarService.createWallet();

        // Encrypt secret keys
        const encryptedUserSecret = encrypt(userWallet.secretKey);
        const encryptedEscrowSecret = encrypt(escrowWallet.secretKey);

        const user = await prisma.user.create({
            data: {
                userId,
                username: githubUsername,
                walletPublicKey: userWallet.publicKey,
                walletSecretKey: encryptedUserSecret,
                escrowPublicKey: escrowWallet.publicKey,
                escrowSecretKey: encryptedEscrowSecret,
                contributionSummary: {
                    create: {}
                }
            }
        });

        // Fund the user wallet with initial XLM for account activation
        await stellarService.fundWallet(userWallet.publicKey, "2"); // 2 XLM minimum reserve

        res.status(201).json({
            ...user,
            walletAddress: userWallet.publicKey
        });
    } catch (error) {
        res.status(400).send(error);
    }
}

export const updateUser = async (req: Request, res: Response) => {
    const { userId, username } = req.body;

    try {
        const user = await prisma.user.update({
            where: { userId },
            data: { username }
        });
        res.status(200).json(user);
    } catch (error) {
        res.status(400).send(error);
    }
}

export const updateAddressBook = async (req: Request, res: Response) => {
    const { userId, address, network, asset } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const newAddress = { address, network, asset };
        const updatedAddressBook = [...user.addressBook, newAddress];

        const updatedUser = await prisma.user.update({
            where: { userId },
            data: {
                addressBook: updatedAddressBook as InputJsonValue[]
            }
        });

        res.status(200).json(updatedUser);
    } catch (error) {
        res.status(400).send(error);
    }
}

export const withdrawBalance = async (req: Request, res: Response) => {
    const { userId, address, amount } = req.body;

    try {
        const user = await prisma.user.findUnique({
            where: { userId }
        });

        if (!user || !user.walletSecretKey) {
            return res.status(404).json({ message: "User wallet not found" });
        }

        const currentBalance = await stellarService.getBalance(user.walletPublicKey!);
        if (parseFloat(currentBalance) < parseFloat(amount)) {
            return res.status(400).json({ message: "Insufficient balance" });
        }

        const decryptedSecret = decrypt(user.walletSecretKey);
        await stellarService.transferToEscrow(decryptedSecret, address, amount);

        // Update user balance in database
        await prisma.user.update({
            where: { userId },
            data: {
                balance: parseFloat(currentBalance) - parseFloat(amount)
            }
        });

        res.status(200).json({ message: "Withdrawal successful" });
    } catch (error) {
        res.status(400).json({ message: "Withdrawal failed", error });
    }
};