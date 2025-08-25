import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import createError from 'http-errors';
import { encrypt, decrypt } from '../../helper';

const router = Router();

router.post(
    '/users/:id',
    [
        query('id').notEmpty().withMessage('ID must be present'),
        body('email').isEmail().withMessage('Email must be valid'),
        body('password')
            .isLength({ min: 6 })
            .withMessage('Password must be at least 6 characters long'),
        body('name').notEmpty().withMessage('Name is required'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password, name } = req.body;

        if (email === 'test@example.com') {
            return next(createError(409, 'Email already exists'));
        }

        res.status(201).json({ message: 'User created', data: { email, name } });
    }) as RequestHandler
);

router.post('/encryption',
    [
        body('text').notEmpty().withMessage('Text to encrypt is required'),
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
                message: 'Encryption test successful',
                data: {
                    original: text,
                    encrypted: encrypted,
                    decrypted: decrypted,
                    verified: text === decrypted
                }
            });
        } catch (error) {
            next(createError(500, 'Encryption test failed', { cause: error }));
        }
    }) as RequestHandler
);

router.get('/select',
    [
        body('select').isObject().withMessage('Text to encrypt is required'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { select } = req.body;

            res.status(200).json({
                message: 'Successful',
                data: select
            });
        } catch (error) {
            next(createError(500, 'Select test failed', { cause: error }));
        }
    }) as RequestHandler
);

// router.get('/github', 
//     // [
//     //     body('username').isString().withMessage('Text to encrypt is required'),
//     // ],
//     (async (req: Request, res: Response, next: NextFunction) => {
//         try {
//             const errors = validationResult(req);
//             if (!errors.isEmpty()) {
//                 return res.status(400).json({ errors: errors.array() });
//             }

//             // const { username } = req.body;

//             const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

//             const response = await octokit.rest.issues.get({
//                 owner: "calcom",
//                 repo: "cal.com",
//                 issue_number: 21050,
//             });

//             // const repoDetails = await getRepoDetails(repoUrl, process.env.GITHUB_ACCESS_TOKEN!);
//             // if (!repoDetails.permissions || !repoDetails.permissions.admin) {
//             //     res.status(200).json({
//             //         message: 'Not an admin',
//             //         data: repoDetails
//             //     });
//             // }

//             // res.status(200).json({
//             //     message: 'Successful',
//             //     data: repoDetails
//             // });
//             res.status(200).json({
//                 message: 'Successful',
//                 data: response
//             });
//         } catch (error) {
//             console.log(error)
//             next(error);
//         }
//     }) as RequestHandler
// );

export const testRoutes = router;