import { Request, Response } from "express";
import { prisma } from "../config/database";

export const createUser = async (req: Request, res: Response) => {
    const { currentUser } = req.body;

    try {
        
    } catch (error) {
        res.status(400).send(error);
    }
}