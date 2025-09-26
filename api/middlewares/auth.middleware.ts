import { prisma } from "../config/database.config";
import { firebaseAdmin } from "../config/firebase.config";
import { getFieldFromUnknownObject } from "../helper";
import { ErrorClass } from "../models/general.model";
import { Request, Response, NextFunction } from "express";

export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        const idToken = req.headers.authorization.split("Bearer ")[1];
    
        try {
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            
            // Add user info to request
            req.body = { 
                ...req.body, 
                currentUser: decodedToken,
                userId: decodedToken.uid
            };
            
            next();
        } catch (error) {
            return res.status(401).json({ 
                error: "Authentication failed",
                details: getFieldFromUnknownObject<string>(error, "message") 
            });
        }
    } else {
        return res.status(401).json({ error: "No authorization token sent" });
    }
};

export const validateUserInstallation = async (installationId: string, userId: string) => {
    const installation = await prisma.installation.findUnique({
        where: {
            id: installationId,
            users: { some: { userId } }
        },
        select: { id: true }
    });

    if (!installation) {
        throw new ErrorClass(
            "AuthenticationError", 
            null, 
            "Only members of this installation are allowed access"
        );
    }
};
