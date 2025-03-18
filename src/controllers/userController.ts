import { Request, Response } from "express";
import { prisma } from "../config/database";
import { InputJsonValue } from "@prisma/client/runtime/library";

export const createUser = async (req: Request, res: Response) => {
    const { userId, githubUsername } = req.body;

    try {
        const user = await prisma.user.create({
            data: {
                userId,
                username: githubUsername,
                contributionSummary: {
                    create: {}
                }
            }
        });
        res.status(201).json(user);
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