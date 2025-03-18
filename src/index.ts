import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import { body, query, validationResult } from 'express-validator';
import createError from 'http-errors';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan'; 
import { prisma } from './config/database';
import { userRoutes } from './routes/userRoutes';
import { validateUser } from './config/firebase';

const app = express();
const port = process.env.PORT || 3000;

app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173' }));
app.use(morgan('dev'));
app.use(express.json());

app.get(
    '/clear-db',
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Delete all records from each table
            await prisma.comment.deleteMany();
            await prisma.task.deleteMany();
            await prisma.contributionSummary.deleteMany();
            await prisma.project.deleteMany();
            await prisma.user.deleteMany();

            res.status(201).json({ message: "Database cleared" });
        } catch (error) {
            next(createError(500, 'Error clearing database'));
        }
    }) as RequestHandler
);

app.post(
    '/api/users/:id',
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

app.post(
    '/api/users',
    [
        body('userId').notEmpty().withMessage('User ID is required'),
        body('username').notEmpty().withMessage('Username is required'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { userId, username } = req.body;

            // Check if user already exists
            const existingUser = await prisma.user.findUnique({
                where: { userId }
            });

            if (existingUser) {
                return next(createError(409, 'User already exists'));
            }

            // Create new user with contribution summary
            const newUser = await prisma.user.create({
                data: {
                    userId,
                    username,
                    contributionSummary: {
                        create: {
                            tasksTaken: 0,
                            tasksCompleted: 0,
                            averageRating: 0.0,
                            totalEarnings: 0.0
                        }
                    }
                },
                include: {
                    contributionSummary: true
                }
            });

            res.status(201).json({
                message: 'User created successfully',
                data: newUser
            });
        } catch (error) {
            next(createError(500, 'Internal server error'));
        }
    }) as RequestHandler
);

app.use((err: createError.HttpError, req: Request, res: Response, next: NextFunction) => {
    res.status(err.status || 500).json({
        error: {
            message: err.message,
            status: err.status || 500,
        },
    });
});

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript Express Server!');
});

app.use("/users", validateUser as RequestHandler, userRoutes);

prisma.$connect();

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});