import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { body, query, validationResult } from "express-validator";
import createError from "http-errors";
import { encrypt, decrypt } from "../../helper";

const router = Router();

// Create test user
router.post(
    "/users/:id",
    [
        query("id").notEmpty().withMessage("ID must be present"),
        body("email").isEmail().withMessage("Email must be valid"),
        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),
        body("name").notEmpty().withMessage("Name is required")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, name } = req.body;

        if (email === "test@example.com") {
            return next(createError(409, "Email already exists"));
        }

        res.status(201).json({ message: "User created", data: { email, name } });
    }) as RequestHandler
);

// Encrypt a text
router.post("/encryption",
    [
        body("text").notEmpty().withMessage("Text to encrypt is required")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

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
    [
        body("text").notEmpty().withMessage("Text to decrypt is required")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

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
