import dotenv from "dotenv";
dotenv.config();

import express, {
    Request,
    Response,
    RequestHandler
} from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { prisma } from "./config/database.config";
import { validateUser } from "./middlewares/auth.middleware";
import { dynamicRoute, localhostOnly } from "./middlewares";
import { userRoutes } from "./routes/user.route";
import { installationRoutes } from "./routes/installation.route";
import { taskRoutes } from "./routes/task.route";
import { stellarRoutes } from "./routes/test_routes/stellar.test.route";
import { testRoutes } from "./routes/test_routes/general.test.route";
import { walletRoutes } from "./routes/wallet.route";
import { githubRoutes } from "./routes/github.route";
import { webhookRoutes } from "./routes/webhook.route";
import { customRulesRoutes } from "./routes/custom-rules.route";
import { aiReviewTestRoutes } from "./routes/test_routes/ai-review.test.route";
import { aiServicesRoutes } from "./routes/test_routes/ai-services.test.route";
import { errorHandler } from "./middlewares/error.middleware";
import { ErrorHandlerService } from "./services/error-handler.service";
import { healthRoutes } from "./routes/health.route";

const app = express();
const PORT = process.env.NODE_ENV === "development"
    ? 5000
    : (Number(process.env.PORT) || 8080);

app.use(helmet());
app.use(
    cors({
        origin (origin, callback) {
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
        }
    })
);
app.use(morgan("dev"));

// Raw body parser for webhook signature validation
app.use("/webhook/github/pr-review", express.raw({ type: "application/json" }));

// JSON parser for all other routes
app.use(express.json());

// To be removed
app.post(
    "/clear-db",
    validateUser as RequestHandler,
    (async (req: Request, res: Response) => {
        try {
            // Check if user has admin privileges
            const { currentUser } = req.body;

            if (!currentUser?.admin && !currentUser?.custom_claims?.admin) {
                return res.status(403).json({
                    error: "Access denied. Admin privileges required."
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

app.get("/get-packages", validateUser as RequestHandler, async (_, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany();

        res.status(201).json(packages);
    } catch (error) {
        res.status(500).json({ error, message: "Failed to fetch subscription packages" });
    }
});

app.use("/health", healthRoutes);

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
app.use(
    "/ai-rules",
    dynamicRoute,
    validateUser as RequestHandler,
    customRulesRoutes
);

// Webhook routes (no auth required for GitHub webhooks)
app.use("/webhook", webhookRoutes);

// Local host routes for testing purposes
app.use("/stellar", dynamicRoute, localhostOnly, stellarRoutes);
app.use("/test", dynamicRoute, localhostOnly, testRoutes);
app.use("/ai-review-test", dynamicRoute, localhostOnly, aiReviewTestRoutes);
app.use("/ai-services", dynamicRoute, localhostOnly, aiServicesRoutes);

app.use(errorHandler);

prisma.$connect();

// Initialize AI Review system (disabled until environment variables are configured)
if (process.env.GROQ_API_KEY && process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY) {
    // Initialize error handling system
    ErrorHandlerService.initialize().catch(error => {
        console.error("Failed to initialize error handling system:", error);
        // Continue startup even if error handling initialization fails
    });

    // Initialize workflow integration service
    (async () => {
        try {
            const { WorkflowIntegrationService } = await import("./services/workflow-integration.service");
            const workflowService = WorkflowIntegrationService.getInstance();
            await workflowService.initialize();
            console.log("Workflow Integration Service initialized successfully");
        } catch (error) {
            console.error("Failed to initialize Workflow Integration Service:", error);
            // Continue startup even if workflow initialization fails
        }
    })();
} else {
    console.log("AI Review system disabled - missing required environment variables (GROQ_API_KEY, GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY)");
}

const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown handling
process.on("SIGTERM", async () => {
    console.log("SIGTERM received, starting graceful shutdown...");

    try {
        // Stop accepting new connections
        server.close(() => {
            console.log("HTTP server closed");
        });

        // Shutdown workflow integration service
        const { WorkflowIntegrationService } = await import("./services/workflow-integration.service");
        const workflowService = WorkflowIntegrationService.getInstance();
        await workflowService.shutdown();

        // Close database connection
        await prisma.$disconnect();
        console.log("Database connection closed");

        console.log("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
});

process.on("SIGINT", async () => {
    console.log("SIGINT received, starting graceful shutdown...");

    try {
        // Stop accepting new connections
        server.close(() => {
            console.log("HTTP server closed");
        });

        // Shutdown workflow integration service
        const { WorkflowIntegrationService } = await import("./services/workflow-integration.service");
        const workflowService = WorkflowIntegrationService.getInstance();
        await workflowService.shutdown();

        // Close database connection
        await prisma.$disconnect();
        console.log("Database connection closed");

        console.log("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
});
