import { prisma } from "../config/database.config";
import { firebaseAdmin } from "../config/firebase.config";
import { STATUS_CODES } from "../utilities/data";
import { getFieldFromUnknownObject } from "../utilities/helper";
import { Request, Response, NextFunction } from "express";
import { AuthorizationError, ErrorClass, ValidationError } from "../models/error.model";

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

            if (decodedToken.firebase.sign_in_provider !== "github.com") {
                throw new AuthorizationError("Only GitHub authenticated users are allowed");
            }

            // Add user data to response locals
            res.locals.user = decodedToken;
            res.locals.userId = decodedToken.uid;

            next();
        } catch (error) {
            if (error instanceof AuthorizationError) {
                return next(error);
            }

            next(new ErrorClass(
                "AUTHENTICATION_FAILED",
                error,
                getFieldFromUnknownObject<string>(error, "message") || "Failed to verify ID token",
                STATUS_CODES.UNAUTHENTICATED
            ));
        }
    } else {
        // No token provided
        next(new ErrorClass(
            "AUTHENTICATION_FAILED",
            null,
            "No authorization token sent",
            STATUS_CODES.UNAUTHENTICATED
        ));
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
            select: { id: true, status: true }
        });

        // Throw error if user is not part of the installation
        if (!installation) {
            throw new AuthorizationError("Only members of this installation are allowed access");
        }
        // Throw error if installation is archived
        if (installation.status === "ARCHIVED") {
            throw new ValidationError("This installation has been archived");
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
        return next(new AuthorizationError("Access denied. Admin privileges required."));
    }

    next();
};
