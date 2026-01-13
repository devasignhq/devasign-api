import dotenv from "dotenv";
dotenv.config();

import express, { RequestHandler } from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { prisma } from "./config/database.config";
import { validateAdmin, validateUser } from "./middlewares/auth.middleware";
import { dynamicRoute, localhostOnly } from "./middlewares/request.middleware";
import { errorHandler } from "./middlewares/error.middleware";
import {
    adminRoutes,
    userRoutes,
    installationRoutes,
    taskRoutes,
    walletRoutes,
    webhookRoutes,
    stellarRoutes,
    testRoutes,
    aiServicesRoutes,
    contractRoutes
} from "./routes";
import { ErrorHandlerService } from "./services/error-handler.service";
import { dataLogger, messageLogger } from "./config/logger.config";
import { ENDPOINTS, STATUS_CODES } from "./utilities/data";

const app = express();
const PORT = process.env.NODE_ENV === "development"
    ? 5000
    : (Number(process.env.PORT) || 8080);

app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
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
app.set("trust proxy", true);

// Raw body parser for webhook signature validation
app.use(
    ENDPOINTS.WEBHOOK.PREFIX + ENDPOINTS.WEBHOOK.GITHUB,
    express.raw({ type: "application/json" })
);

// JSON parser for all other routes
app.use(express.json());

app.get("/get-packages", validateUser as RequestHandler, async (_, res) => {
    try {
        const packages = await prisma.subscriptionPackage.findMany();

        res.status(STATUS_CODES.SUCCESS).json(packages);
    } catch (error) {
        dataLogger.error("Failed to fetch subscription packages", { error });
        res.status(STATUS_CODES.SERVER_ERROR).json({
            message: "Failed to fetch subscription packages"
        });
    }
});

app.use(
    ENDPOINTS.ADMIN.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    validateAdmin as RequestHandler,
    adminRoutes
);

app.use(
    ENDPOINTS.USER.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    userRoutes
);
app.use(
    ENDPOINTS.INSTALLATION.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    installationRoutes
);
app.use(
    ENDPOINTS.TASK.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    taskRoutes
);
app.use(
    ENDPOINTS.WALLET.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    walletRoutes
);
// Webhook routes (no auth required for GitHub webhooks)
app.use(ENDPOINTS.WEBHOOK.PREFIX, webhookRoutes);

// Local host routes for testing purposes
app.use("/stellar", dynamicRoute, localhostOnly, stellarRoutes);
app.use("/test", dynamicRoute, localhostOnly, testRoutes);
app.use("/ai-services", dynamicRoute, localhostOnly, aiServicesRoutes);
app.use("/contract", dynamicRoute, localhostOnly, contractRoutes);

app.use(errorHandler);

prisma.$connect();

// Initialize error handling system
ErrorHandlerService.initialize().catch(error => {
    dataLogger.error("Failed to initialize error handling system", { error });
    // Continue startup even if error handling initialization fails
});

// Initialize workflow integration service
(async () => {
    try {
        const { WorkflowIntegrationService } = await import("./services/ai-review/workflow-integration.service");
        const workflowService = WorkflowIntegrationService.getInstance();
        await workflowService.initialize();
        messageLogger.info("Workflow Integration Service initialized successfully");
    } catch (error) {
        dataLogger.error("Failed to initialize Workflow Integration Service", { error });
        // Continue startup even if workflow initialization fails
    }
})();

const server = app.listen(PORT, "0.0.0.0", () => {
    messageLogger.info(`Server is running on port ${PORT}`);
});

// Graceful shutdown handling
process.on("SIGTERM", async () => {
    messageLogger.info("SIGTERM received, starting graceful shutdown...");

    try {
        // Stop accepting new connections
        server.close(() => {
            messageLogger.info("HTTP server closed");
        });

        // Shutdown workflow integration service
        const { WorkflowIntegrationService } = await import("./services/ai-review/workflow-integration.service");
        const workflowService = WorkflowIntegrationService.getInstance();
        await workflowService.shutdown();

        // Close database connection
        await prisma.$disconnect();
        messageLogger.info("Database connection closed");

        messageLogger.info("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        dataLogger.error("Error during graceful shutdown", { error });
        process.exit(1);
    }
});

process.on("SIGINT", async () => {
    messageLogger.info("SIGINT received, starting graceful shutdown...");

    try {
        // Stop accepting new connections
        server.close(() => {
            messageLogger.info("HTTP server closed");
        });

        // Shutdown workflow integration service
        const { WorkflowIntegrationService } = await import("./services/ai-review/workflow-integration.service");
        const workflowService = WorkflowIntegrationService.getInstance();
        await workflowService.shutdown();

        // Close database connection
        await prisma.$disconnect();
        messageLogger.info("Database connection closed");

        messageLogger.info("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        dataLogger.error("Error during graceful shutdown", { error });
        process.exit(1);
    }
});
