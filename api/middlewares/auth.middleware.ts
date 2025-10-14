import { prisma } from "../config/database.config";
import { firebaseAdmin } from "../config/firebase.config";
import { STATUS_CODES, getFieldFromUnknownObject } from "../helper";
import { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../models/error.model";

/**
 * Middleware to validate user authorization token
 */
export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
        // Get ID token from Authorization header
        const idToken = req.headers.authorization.split("Bearer ")[1];
    
        try {
            // Verify token with Firebase Admin SDK
            const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
            
            // Add user info to request
            req.body = { 
                ...req.body, 
                currentUser: decodedToken,
                userId: decodedToken.uid
            };
            
            next();
        } catch (error) {
            // Token verification failed 
            return res.status(STATUS_CODES.UNAUTHENTICATED).json({ 
                error: "Authentication failed",
                details: getFieldFromUnknownObject<string>(error, "message") 
            });
        }
    } else {
        // No token provided
        return res.status(STATUS_CODES.UNAUTHENTICATED).json({ 
            error: "No authorization token sent" 
        });
    }
};

/**
 * Helper to validate user belongs to a GitHub installation
 */
export const validateUserInstallation = async (installationId: string, userId: string) => {
    // Check if user is part of the installation
    const installation = await prisma.installation.findUnique({
        where: {
            id: installationId,
            users: { some: { userId } }
        },
        select: { id: true }
    });

    // If not, throw authorization error
    if (!installation) {
        throw new AuthorizationError("Only members of this installation are allowed access");
    }
};
