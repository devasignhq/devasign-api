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
import { apiLimiter, webhookLimiter } from "./middlewares/rate-limit.middleware";
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
    contractRoutes,
    octokitTestRoutes
} from "./routes";
import { ErrorHandlerService } from "./services/error-handler.service";
import { dataLogger, messageLogger } from "./config/logger.config";
import { ALLOWED_ORIGINS, ENDPOINTS, STATUS_CODES } from "./utilities/data";
import { ErrorClass } from "./models/error.model";

const app = express();
const PORT = process.env.NODE_ENV === "development"
    ? 5000
    : (Number(process.env.PORT) || 8080);

app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            // Allowed origins
            if (!origin || ALLOWED_ORIGINS.includes(origin)) {
                return callback(null, true);
            }
            callback(new ErrorClass(
                "CORS_ERROR",
                null,
                "Not allowed by CORS",
                STATUS_CODES.UNAUTHORIZED
            ));
        }
    })
);
app.use(morgan("dev"));
app.set("trust proxy", 1);

// Specific Webhook Handling
app.use(ENDPOINTS.WEBHOOK.PREFIX, webhookLimiter);
app.use(
    [
        ENDPOINTS.WEBHOOK.PREFIX + ENDPOINTS.WEBHOOK.GITHUB,
        ENDPOINTS.WEBHOOK.PREFIX + ENDPOINTS.WEBHOOK.SUMSUB
    ],
    express.raw({ type: "application/json" })
);

// General API Middleware
app.use(apiLimiter);
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
// Webhook routes
app.use(ENDPOINTS.WEBHOOK.PREFIX, webhookRoutes);

/**
 * Internal/Test Routes
 * Only mounted in development or local testing environments
 */
if (process.env.NODE_ENV !== "production") {
    messageLogger.warn("⚠️ Mounting internal test routes. Ensure this is not production.");
    
    const internalMiddlware = [dynamicRoute, localhostOnly];
    
    app.use("/stellar", internalMiddlware, stellarRoutes);
    app.use("/test", internalMiddlware, testRoutes);
    app.use("/ai-services", internalMiddlware, aiServicesRoutes);
    app.use("/contract", internalMiddlware, contractRoutes);
    app.use("/octokit", internalMiddlware, octokitTestRoutes);
}

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
const gracefulShutdown = async (signal: string) => {
    messageLogger.info(`${signal} received, starting graceful shutdown...`);

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
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
