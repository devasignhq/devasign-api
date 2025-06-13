import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import createError from 'http-errors';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan'; 
import { prisma } from './config/database';
import { userRoutes } from './routes/userRoutes';
import { validateUser } from './config/firebase';
import { installationRoutes } from './routes/installationRoutes';
import { taskRoutes } from './routes/taskRoutes';
import { stellarRoutes } from './routes/stellarRoutes';
import { testRoutes } from './routes/testRoutes';
import { ErrorClass } from './types/general';
import { walletRoutes } from './routes/walletRoutes';

const app = express();
const port = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Allow any localhost port
        if (origin.match(/^http:\/\/localhost:\d+$/)) {
            return callback(null, true);
        }
        
        // Reject other origins
        callback(new Error('Not allowed by CORS'));
    }
}));
app.use(morgan('dev'));
app.use(express.json());

app.get(
    '/clear-db',
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Delete all records from each table in correct order
            // due to foreign key constraints
            await prisma.transaction.deleteMany();
            await prisma.taskSubmission.deleteMany();
            await prisma.userInstallationPermission.deleteMany();
            await prisma.task.deleteMany();
            await prisma.contributionSummary.deleteMany();
            await prisma.installation.deleteMany();
            await prisma.user.deleteMany();
            await prisma.permission.deleteMany();
            // await prisma.subscriptionPackage.deleteMany();

            res.status(201).json({ message: "Database cleared" });
        } catch (error) {
            next(createError(500, 'Error clearing database'));
        }
    }) as RequestHandler
);

app.post('/get-packages', async (req, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany();

        res.status(201).json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription packages' });
    }
});

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript Express Server!');
});

app.use("/users", validateUser as RequestHandler, userRoutes);
app.use("/installations", validateUser as RequestHandler, installationRoutes);
app.use("/tasks", validateUser as RequestHandler, taskRoutes);
app.use("/wallet", validateUser as RequestHandler, walletRoutes);
app.use("/stellar", stellarRoutes);
app.use("/test", testRoutes);

app.use(((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', error);

    if (error instanceof ErrorClass) {
        return res.status(420).json({
            error: { ...error }
        });
    }

    if (error.name === 'ValidationError') {
        return res.status(404).json({
            error: {
                name: 'ValidationError',
                message: error.message,
                details: error.errors
            }
        });
    }

    res.status(error.status || 500).json({
        error: {
            message: "Internal Server Error",
            details: error || null
        }
    });
}) as express.ErrorRequestHandler);

prisma.$connect();

app.listen(port, async () => {
    console.log(`Server is running on port ${port}`);
});