import { prisma } from "../config/database.config";
import { firebaseAdmin } from "../config/firebase.config";
import { OAuth2Client } from "google-auth-library";
import { STATUS_CODES } from "../utilities/data";
import { getFieldFromUnknownObject } from "../utilities/helper";
import { Request, Response, NextFunction } from "express";
import { AuthorizationError, ErrorClass, ValidationError } from "../models/error.model";
import { dataLogger } from "../config/logger.config";

// Google OAuth2 client used to verify OIDC tokens.
const authClient = new OAuth2Client();

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
 * Middleware to validate OIDC tokens sent by Google Cloud Tasks.
 */
export const validateCloudTasksRequest = async (req: Request, _res: Response, next: NextFunction) => {
    // Skip OIDC validation in development/test to allow local testing
    if (process.env.NODE_ENV !== "production") {
        return next();
    }

    // The service account email that Cloud Tasks uses to sign OIDC tokens.
    // This must match the `oidcToken.serviceAccountEmail` configured in the Cloud Tasks service.
    const CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;

    try {
        // Extract the Bearer token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AuthorizationError("Missing or invalid authorization header on internal route");
        }

        const token = authHeader.split("Bearer ")[1];

        if (!process.env.CLOUD_RUN_SERVICE_URL) {
            throw new ErrorClass(
                "SERVER_MISCONFIGURATION",
                null,
                "Server misconfiguration: CLOUD_RUN_SERVICE_URL is missing",
                STATUS_CODES.SERVER_ERROR
            );
        }

        // Verify the OIDC token
        const ticket = await authClient.verifyIdToken({
            idToken: token,
            audience: process.env.CLOUD_RUN_SERVICE_URL
        });

        const payload = ticket.getPayload();
        if (!payload) {
            throw new AuthorizationError("Invalid OIDC token: no payload");
        }

        // Verify the token was issued for the expected Cloud Tasks service account
        if (payload.email !== CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL) {
            dataLogger.warn("OIDC token email mismatch on internal route", {
                expected: CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL,
                received: payload.email,
                path: req.path
            });
            throw new AuthorizationError("OIDC token email does not match expected service account");
        }

        // Verify the email is verified (should always be true for service accounts)
        if (!payload.email_verified) {
            throw new AuthorizationError("OIDC token email is not verified");
        }

        next();
    } catch (error) {
        if (error instanceof AuthorizationError) {
            return next(error);
        }

        dataLogger.error("Failed to verify Cloud Tasks OIDC token", {
            error,
            path: req.path,
            ip: req.ip
        });

        next(new AuthorizationError(
            "Unauthorized: invalid Cloud Tasks OIDC token"
        ));
    }
};
