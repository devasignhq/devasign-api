import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import createError from "http-errors";
import { encrypt, decrypt } from "../../utilities/helper";
import { validateRequestParameters } from "../../middlewares/request.middleware";
import {
    createTestUserSchema,
    encryptionSchema,
    decryptionSchema
} from "./test.schema";

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
            const encrypted = encrypt(text);

            // Decrypt to verify
            const decrypted = decrypt(encrypted);

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

            const { text } = req.body;

            // Decrypt the text
            const decrypted = decrypt(text);

            // Eecrypt to verify
            const ecrypted = encrypt(decrypted);

            res.status(200).json({
                message: "Decryption test successful",
                data: {
                    original: text,
                    decrypted,
                    ecrypted,
                    verified: text === ecrypted
                }
            });
        } catch (error) {
            next(createError(500, "Decryption test failed", { cause: error }));
        }
    }) as RequestHandler
);

export const testRoutes = router;
