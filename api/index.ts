import dotenv from "dotenv";
dotenv.config();

import express, { RequestHandler } from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import { prisma } from "./config/database.config.js";
import { validateUser, validateCloudTasksRequest } from "./middlewares/auth.middleware.js";
import { dynamicRoute, localhostOnly } from "./middlewares/request.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { apiLimiter, webhookLimiter } from "./middlewares/rate-limit.middleware.js";
import {
    userRoutes,
    installationRoutes,
    taskRoutes,
    walletRoutes,
    webhookRoutes,
    stellarRoutes,
    testRoutes,
    contractTestRoutes,
    octokitTestRoutes,
    publicTaskRoutes,
    internalRoutes,
    agentRoutes
} from "./routes/index.js";
import { ErrorHandlerService } from "./services/error-handler.service.js";
import { dataLogger, messageLogger } from "./config/logger.config.js";
import { ENDPOINTS, STATUS_CODES } from "./utils/data.js";
import { ErrorClass } from "./models/error.model.js";
import { statsigService } from "./services/statsig.service.js";
import { SocketService } from "./services/socket.service.js";
import { Env } from "./utils/env.js";

// Create HTTP server
const app = express();
const httpServer = createServer(app);

// Initialize socket service
SocketService.initialize(httpServer);

// Define port
const PORT = Env.port() || 8080;

// Get allowed origins for CORS
const allowedOrigins = Env.corsOrigins(true);

// Security middleware
app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            callback(new ErrorClass(
                "CORS_ERROR",
                null,
                "Not allowed by CORS",
                STATUS_CODES.FORBIDDEN
            ));
        },
        exposedHeaders: ["Payment-Required", "Payment-Response"]
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
app.use(express.json({ limit: "10mb" }));

// User routes
app.use(
    ENDPOINTS.USER.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    userRoutes
);
// Installation routes
app.use(
    ENDPOINTS.INSTALLATION.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    installationRoutes
);
// Public task routes
app.use(
    ENDPOINTS.TASK.PREFIX + ENDPOINTS.PUBLIC_PREFIX,
    dynamicRoute,
    publicTaskRoutes
);
// Task routes
app.use(
    ENDPOINTS.TASK.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    taskRoutes
);
// Wallet routes
app.use(
    ENDPOINTS.WALLET.PREFIX,
    dynamicRoute,
    validateUser as RequestHandler,
    walletRoutes
);
// Webhook routes
app.use(
    ENDPOINTS.WEBHOOK.PREFIX,
    dynamicRoute,
    webhookRoutes
);
// Internal Cloud Tasks routes
app.use(
    ENDPOINTS.INTERNAL.PREFIX,
    dynamicRoute,
    validateCloudTasksRequest,
    internalRoutes
);
// Agent routes
app.use(
    ENDPOINTS.AGENT.PREFIX,
    dynamicRoute,
    agentRoutes
);

/**
 * Internal/Test Routes
 * Only mounted in development or local testing environments
 */
if (Env.nodeEnv() !== "production") {
    messageLogger.warn("⚠️ Mounting internal test routes. Ensure this is not production.");

    const internalMiddlware = [dynamicRoute, localhostOnly];

    app.use("/stellar", internalMiddlware, stellarRoutes);
    app.use("/test", internalMiddlware, testRoutes);
    app.use("/contract", internalMiddlware, contractTestRoutes);
    app.use("/octokit", internalMiddlware, octokitTestRoutes);
}

// Error handling middleware
app.use(errorHandler);

// Database connection
prisma.$connect();

async function main() {
    try {
        // Await all service initializations sequentially to prevent race conditions
        await ErrorHandlerService.initialize().catch(error => {
            dataLogger.error("Failed to initialize error handling system", { error });
        });

        await statsigService.initialize().catch(error => {
            dataLogger.error("Failed to initialize Statsig Service", { error });
        });

        // Start the server
        const server = httpServer.listen(PORT, "0.0.0.0", () => {
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

    } catch (error) {
        dataLogger.error("Failed to initialize services. Server is shutting down.", { error });
        process.exit(1);
    }
}

// Run the server
main();
