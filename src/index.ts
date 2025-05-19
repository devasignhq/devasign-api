import dotenv from 'dotenv';
dotenv.config();

import { EventSource } from 'eventsource'
import express, { Request, Response, NextFunction, RequestHandler } from 'express';
import createError from 'http-errors';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan'; 
import { prisma } from './config/database';
import { userRoutes } from './routes/userRoutes';
import { validateUser } from './config/firebase';
import { projectRoutes } from './routes/projectRoutes';
import { taskRoutes } from './routes/taskRoutes';
import { stellarRoutes } from './routes/stellarRoutes';
import { testRoutes } from './routes/testRoutes';
import { ErrorClass } from './types/general';
import { walletRoutes } from './routes/walletRoutes';
import { stellarService } from './config/stellar';

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

app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript Express Server!');
});

app.use("/users", validateUser as RequestHandler, userRoutes);
app.use("/projects", validateUser as RequestHandler, projectRoutes);
app.use("/tasks", validateUser as RequestHandler, taskRoutes);
app.use("/wallet", validateUser as RequestHandler, walletRoutes);
app.use("/stellar", stellarRoutes);
app.use("/test", testRoutes);

prisma.$connect();

app.listen(port, async () => {
    // const accountToWatch = "GD6LFE72VUGGPYDAWOEL5I34JODO746PSEFBUCDZECXTVWB6VFLOPFUM"
    // const accountSream = await stellarService.buildPaymentTransactionStream(accountToWatch);

    // // console.log('--- Transaction Stream ---');

    // // const es = new EventSource(
    // //     "https://horizon-testnet.stellar.org/accounts/GD6LFE72VUGGPYDAWOEL5I34JODO746PSEFBUCDZECXTVWB6VFLOPFUM/payments",
    // // );
    // // es.onmessage = function (message: any) {
    // //     console.log("start")
    // //     const result = message.data ? JSON.parse(message.data) : message;
    // //     console.log("New payment:");
    // //     console.log(result);
    // // };
    // // es.onerror = function (error: any) {
    // //     console.log("An error occurred!", error);
    // // };

    // // console.log('--- Transaction Ran ---');

    // const one = "91af86cd024af6b7e2e12d802d089f7fd07b1906dbe7b526b8decc65e6ef97e7";
    // const two = "91af86cd024af6b7e2e12d802d089f7fd07b1906dbe7b526b8decc65e6ef97e7";

    // if (one === two) console.log("The Same SHIT!!!!!!!")

    console.log(`Server is running on port ${port}`);
});