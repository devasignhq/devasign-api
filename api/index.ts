import dotenv from "dotenv";
dotenv.config();

import express, {
    Request,
    Response,
    NextFunction,
    RequestHandler,
} from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { prisma } from "./config/database.config";
import { validateUser } from "./middlewares/auth.middleware";
import { dynamicRoute, localhostOnly } from "./middlewares/general.middleware";
import { userRoutes } from "./routes/user.route";
import { installationRoutes } from "./routes/installation.route";
import { taskRoutes } from "./routes/task.route";
import { stellarRoutes } from "./routes/stellar.route";
import { testRoutes } from "./routes/test.route";
import { walletRoutes } from "./routes/wallet.route";
import { githubRoutes } from "./routes/github.route";
import { errorHandler } from "./middlewares/error.middleware";

const app = express();
const PORT = process.env.NODE_ENV === "development"
    ? 5000
    : (Number(process.env.PORT) || 8080);

app.use(helmet());
app.use(
    cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (like mobile apps or curl requests)
            if (!origin) return callback(null, true);

            // Allow localhost ports 3000 and 4000
            if (origin === "http://localhost:3000" || origin === "http://localhost:4000") {
                return callback(null, true);
            }

            // Allow devasign.com and its subdomains
            if (origin === "https://devasign.com" || origin.match(/^https:\/\/.*\.devasign\.com$/)) {
                return callback(null, true);
            }

            // Reject other origins
            callback(new Error("Not allowed by CORS"));
        },
    })
);
app.use(morgan("dev"));
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
    res.send("Hello, DevAsign Server!");
});

// Health check endpoint for Google Cloud Run
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.post(
    "/clear-db",
    validateUser as RequestHandler,
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Check if user has admin privileges
            const { currentUser } = req.body;

            if (!currentUser?.admin && !currentUser?.custom_claims?.admin) {
                return res.status(403).json({
                    error: "Access denied. Admin privileges required.",
                });
            }

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
            await prisma.permission.deleteMany();

            // await prisma.subscriptionPackage.deleteMany();

            res.status(201).json({ message: "Database cleared" });
        } catch (error) {
            res.status(400).json(error);
            console.log(error);
        }
    }) as RequestHandler
);

app.get("/get-packages", validateUser as RequestHandler, async (req, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany();

        res.status(201).json(packages);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch subscription packages" });
    }
});

app.use(
    "/users",
    dynamicRoute,
    validateUser as RequestHandler,
    userRoutes
);
app.use(
    "/installations",
    dynamicRoute,
    validateUser as RequestHandler,
    installationRoutes
);
app.use(
    "/tasks",
    dynamicRoute,
    validateUser as RequestHandler,
    taskRoutes
);
app.use(
    "/wallet",
    dynamicRoute,
    validateUser as RequestHandler,
    walletRoutes
);
app.use(
    "/github",
    dynamicRoute,
    validateUser as RequestHandler,
    githubRoutes
);
app.use("/stellar", dynamicRoute, localhostOnly, stellarRoutes);
app.use("/test", dynamicRoute, localhostOnly, testRoutes);

app.use(errorHandler);

prisma.$connect();

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});
