import { prisma } from "../config/database.config";
import { firebaseAdmin } from "../config/firebase.config";
import { STATUS_CODES } from "../utilities/data";
import { getFieldFromUnknownObject, responseWrapper } from "../utilities/helper";
import { Request, Response, NextFunction } from "express";
import { AuthorizationError } from "../models/error.model";
import { dataLogger } from "../config/logger.config";

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

            // Add user data to response locals
            res.locals.user = decodedToken;
            res.locals.userId = decodedToken.uid;

            next();
        } catch (error) {
            dataLogger.error("Failed to verify ID token", { error });
            // Token verification failed 
            return responseWrapper({
                res,
                status: STATUS_CODES.UNAUTHENTICATED,
                data: {},
                message: "Authentication failed",
                warning: getFieldFromUnknownObject<string>(error, "message")
            });
        }
    } else {
        // No token provided
        return responseWrapper({
            res,
            status: STATUS_CODES.UNAUTHENTICATED,
            data: {},
            message: "No authorization token sent"
        });
    }
};

/**
 * Middleware to validate user belongs to a GitHub installation
 */
export const validateUserInstallation = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { userId } = res.locals;


    try {
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

        next();
    } catch (error) {
        next(error);
    }
};

/**
 * Middleware to validate if the current user is a Firebase admin
 */
export const validateAdmin = async (req: Request, res: Response, next: NextFunction) => {
    const currentUser = res.locals.user;

    // Check if user has admin privileges
    if (!currentUser?.admin && !currentUser?.custom_claims?.admin) {
        return responseWrapper({
            res,
            status: STATUS_CODES.UNAUTHORIZED,
            data: {},
            message: "Access denied. Admin privileges required."
        });
    }

    next();
};
