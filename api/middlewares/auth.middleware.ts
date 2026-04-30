import { prisma } from "../config/database.config.js";
import { firebaseAdmin } from "../config/firebase.config.js";
import { OAuth2Client } from "google-auth-library";
import { STATUS_CODES } from "../utils/data.js";
import { getFieldFromUnknownObject } from "../utils/helper.js";
import { Request, Response, NextFunction } from "express";
import { AuthorizationError, ErrorClass, ValidationError } from "../models/error.model.js";
import { dataLogger } from "../config/logger.config.js";
import { Env } from "../utils/env.js";

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
                STATUS_CODES.UNAUTHORIZED
            ));
        }
    } else {
        // No token provided
        next(new ErrorClass(
            "AUTHENTICATION_FAILED",
            null,
            "No authorization token sent",
            STATUS_CODES.UNAUTHORIZED
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
    if (Env.nodeEnv() !== "production") {
        return next();
    }

    // The service account email that Cloud Tasks uses to sign OIDC tokens.
    // This must match the `oidcToken.serviceAccountEmail` configured in the Cloud Tasks service.
    const cloudTasksServiceAccountEmail = Env.cloudTasksServiceAccountEmail(true);
    // The URL where this application is hosted
    const cloudRunServiceUrl = Env.cloudRunServiceUrl(true);

    try {
        // Extract the Bearer token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new AuthorizationError("Missing or invalid authorization header on internal route");
        }

        const token = authHeader.split("Bearer ")[1];

        // Verify the OIDC token
        const ticket = await authClient.verifyIdToken({
            idToken: token,
            audience: cloudRunServiceUrl
        });

        const payload = ticket.getPayload();
        if (!payload) {
            throw new AuthorizationError("Invalid OIDC token: no payload");
        }

        // Verify the token was issued for the expected Cloud Tasks service account
        if (payload.email !== cloudTasksServiceAccountEmail) {
            dataLogger.warn("OIDC token email mismatch on internal route", {
                expected: cloudTasksServiceAccountEmail,
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
