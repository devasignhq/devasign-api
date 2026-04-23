import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import createError from "http-errors";
import { validateRequestParameters } from "../../middlewares/request.middleware.js";
import {
    createTestUserSchema,
    encryptionSchema,
    decryptionSchema
} from "./test.schema.js";
import { KMSService } from "../../services/kms.service.js";
import { prisma } from "../../config/database.config.js";
import { STATUS_CODES } from "../../utils/data.js";
import { responseWrapper } from "../../utils/helper.js";
import { dataLogger } from "../../config/logger.config.js";

const router = Router();

// Create test user
router.post(
    "/users/:id",
    validateRequestParameters(createTestUserSchema),
    (async (req: Request, res: Response, next: NextFunction) => {

        const { email, name } = req.body;

        if (email === "test@example.com") {
            return next(createError(409, "Email already exists"));
        }

        res.status(STATUS_CODES.CREATED).json({ message: "User created", data: { email, name } });
    }) as RequestHandler
);

// Encrypt a text
router.post("/encryption",
    validateRequestParameters(encryptionSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { text } = req.body;

            // Encrypt the text
            const encrypted = await KMSService.encryptWallet(text);

            // Decrypt to verify
            const decrypted = await KMSService.decryptWallet(encrypted as any);

            res.status(STATUS_CODES.OK).json({
                message: "Encryption test successful",
                data: {
                    original: text,
                    encrypted,
                    decrypted,
                    verified: text === decrypted
                }
            });
        } catch (error) {
            next(error);
        }
    }) as RequestHandler
);

// Decrypt a text
router.post("/decryption",
    validateRequestParameters(decryptionSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { encryptedDEK, encryptedSecret, iv, authTag } = req.body;
            const walletData = { encryptedDEK, encryptedSecret, iv, authTag };

            // Decrypt the text
            const decrypted = await KMSService.decryptWallet(walletData as any);

            // Encrypt to verify
            const ecrypted = await KMSService.encryptWallet(decrypted);

            // Decrypt again to verify the re-encryption works and matches
            const reDecrypted = await KMSService.decryptWallet(ecrypted as any);

            res.status(STATUS_CODES.OK).json({
                message: "Decryption test successful",
                data: {
                    original: walletData,
                    decrypted,
                    ecrypted,
                    verified: decrypted === reDecrypted
                }
            });
        } catch (error) {
            next(error);
        }
    }) as RequestHandler
);

router.post("/create-packages", async (_, res: Response, next: NextFunction) => {
    try {
        const packages = await prisma.subscriptionPackage.createMany({
            data: [
                {
                    id: process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID || "cml9shfp300001jfka71z28ay",
                    name: "Free",
                    description: "Basic plan for personal use",
                    maxTasks: 5,
                    maxUsers: 1,
                    paid: false,
                    price: 0,
                    active: true
                },
                {
                    name: "Professional",
                    description: "Standard plan for small teams",
                    maxTasks: 50,
                    maxUsers: 5,
                    paid: true,
                    price: 49,
                    active: true
                },
                {
                    name: "Enterprise",
                    description: "Custom plan for large organizations",
                    maxTasks: 500,
                    maxUsers: 20,
                    paid: true,
                    price: 199,
                    active: true
                }
            ]
        });

        res.status(STATUS_CODES.OK).json(packages);
    } catch (error) {
        next(error);
    }
});



// To be removed. Used from development only.
router.post("/reset-db", async (req: Request, res: Response) => {
    try {
        // Delete all records from each table in correct order
        // due to foreign key constraints
        await prisma.transaction.deleteMany();
        await prisma.taskSubmission.deleteMany();
        await prisma.taskActivity.deleteMany();
        await prisma.userInstallationPermission.deleteMany();
        await prisma.task.deleteMany();
        await prisma.contributionSummary.deleteMany();
        await prisma.installation.deleteMany();
        await prisma.user.deleteMany();
        await prisma.wallet.deleteMany();
        await prisma.permission.deleteMany();

        // await prisma.subscriptionPackage.deleteMany();

        responseWrapper({
            res,
            status: STATUS_CODES.OK,
            data: {},
            message: "Database cleared"
        });
    } catch (error) {
        dataLogger.error("Database clear operation failed", { error });
        responseWrapper({
            res,
            status: STATUS_CODES.INTERNAL_SERVER_ERROR,
            data: {},
            message: "Database clear operation failed"
        });
    }
});

export const testRoutes = router;
