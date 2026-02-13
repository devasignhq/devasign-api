import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import createError from "http-errors";
import { validateRequestParameters } from "../../middlewares/request.middleware";
import {
    createTestUserSchema,
    encryptionSchema,
    decryptionSchema
} from "./test.schema";
import { KMSService } from "../../services/kms.service";
import { prisma } from "../../config/database.config";
import { STATUS_CODES } from "../../utilities/data";
import { responseWrapper } from "../../utilities/helper";
import { dataLogger } from "../../config/logger.config";

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

        res.status(201).json({ message: "User created", data: { email, name } });
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

            res.status(200).json({
                message: "Encryption test successful",
                data: {
                    original: text,
                    encrypted,
                    decrypted,
                    verified: text === decrypted
                }
            });
        } catch (error) {
            next(createError(500, "Encryption test failed", { cause: error }));
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

            res.status(200).json({
                message: "Decryption test successful",
                data: {
                    original: walletData,
                    decrypted,
                    ecrypted,
                    verified: decrypted === reDecrypted
                }
            });
        } catch (error) {
            next(createError(500, "Decryption test failed", { cause: error }));
        }
    }) as RequestHandler
);

router.post("/create-packages", async (_, res: Response, next: NextFunction) => {
    try {
        const packages = await prisma.subscriptionPackage.createMany({
            data: [
                {
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

        res.status(STATUS_CODES.SUCCESS).json(packages);
    } catch (error) {
        next(createError(500, "Failed to create packages", { cause: error }));
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
        await prisma.aIReviewResult.deleteMany();
        await prisma.codeFile.deleteMany();
        await prisma.codeChunk.deleteMany();
        await prisma.repositoryIndexingState.deleteMany();

        // await prisma.subscriptionPackage.deleteMany();

        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Database cleared"
        });
    } catch (error) {
        dataLogger.error("Database clear operation failed", { error });
        responseWrapper({
            res,
            status: STATUS_CODES.SERVER_ERROR,
            data: {},
            message: "Database clear operation failed"
        });
    }
});

export const testRoutes = router;
