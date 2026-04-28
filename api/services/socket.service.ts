import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";
import { messageLogger } from "../config/logger.config.js";
import { Env } from "../utils/env.js";

/**
 * Represents an activity event in the application.
 * Activities can be related to a specific task, an installation, or a contributor.
 */
export type Activity = {
    userId: string;
    metadata?: unknown;
} & ({
    type: "task";
    taskId: string;
} | {
    type: "contributor"
} | {
    type: "installation";
    installationId: string;
    operation: string;
    issueUrl?: string;
    message?: string;
});

/**
 * Service for managing real-time WebSocket communication using Socket.io.
 */
export class SocketService {
    private static io: SocketIOServer;

    /**
     * Initializes the Socket.io server and binds it to the HTTP server.
     * Sets up CORS rules and default event listeners (connection, join, leave, disconnect).
     * 
     * @param httpServer - The Node.js HTTP server instance
     */
    static initialize(httpServer: HttpServer) {
        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin(origin, callback) {
                    if (!origin || Env.corsOrigins(true).includes(origin)) {
                        callback(null, true);
                    } else {
                        callback(new Error("Not allowed by CORS"));
                    }
                },
                methods: ["GET", "POST"]
            }
        });

        this.io.on("connection", (socket) => {
            messageLogger.info(`Client connected to WebSockets: ${socket.id}`);

            socket.on("join", (room: string) => {
                socket.join(room);
            });

            socket.on("leave", (room: string) => {
                socket.leave(room);
            });

            socket.on("disconnect", () => {
                messageLogger.info(`Client disconnected from WebSockets: ${socket.id}`);
            });
        });
    }

    /**
     * Retrieves the initialized Socket.io server instance.
     * 
     * @returns The Socket.io server instance
     * @throws Error if the socket server has not been initialized yet
     */
    static getIO(): SocketIOServer {
        if (!this.io) {
            throw new Error("Socket.io not initialized");
        }
        return this.io;
    }

    /**
     * Emits an activity update event to the appropriate WebSocket room.
     * Clients listening in the corresponding room will receive the "activity_update" event.
     * 
     * @param activity - The activity object to broadcast
     */
    static async updateAppActivity(activity: Activity) {
        if (!this.io) return;

        switch (activity.type) {
            case "task":
                this.io.to(`task_${activity.taskId}`).emit("activity_update", activity);
                break;
            case "installation":
                this.io.to(`installation_${activity.installationId}`).emit("activity_update", activity);
                break;
            case "contributor":
                this.io.to(`contributor_${activity.userId}`).emit("activity_update", activity);
                break;
        }
    }

    /**
     * Emits an activity deleted event to the appropriate WebSocket room.
     * Clients listening in the corresponding room will receive the "activity_deleted" event.
     * 
     * @param activity - Partial activity object containing type and relevant IDs
     */
    static async deleteAppActivity(activity: Partial<Activity>) {
        if (!this.io) return;

        switch (activity.type) {
            case "task":
                this.io.to(`task_${activity.taskId}`).emit("activity_deleted", activity);
                break;
            case "installation":
                this.io.to(`installation_${activity.installationId}`).emit("activity_deleted", activity);
                break;
            case "contributor":
                this.io.to(`contributor_${activity.userId}`).emit("activity_deleted", activity);
                break;
        }
    }
}
