import request from "supertest";
import express from "express";
import { adminRoutes } from "../../../../api/routes/admin.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock Error Recovery Service
jest.mock("../../../../api/services/error-recovery.service", () => ({
    ErrorRecoveryService: {
        attemptSystemRecovery: jest.fn()
    }
}));

describe("Admin API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockErrorRecoveryService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with admin routes
        app = express();
        app.use(express.json());
        app.use(ENDPOINTS.ADMIN.PREFIX, adminRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { ErrorRecoveryService } = await import("../../../../api/services/error-recovery.service");
        mockErrorRecoveryService = ErrorRecoveryService;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        // Setup default mock implementations
        mockErrorRecoveryService.attemptSystemRecovery.mockResolvedValue({
            success: true,
            message: "System recovery completed successfully",
            recoveredComponents: ["database", "queue"],
            timestamp: new Date().toISOString()
        });
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"])} - System Recovery`, () => {

        it("should perform complete system recovery successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "System recovery completed",
                data: {
                    recovery: expect.objectContaining({
                        success: true,
                        message: "System recovery completed successfully",
                        recoveredComponents: expect.arrayContaining(["database", "queue"])
                    }),
                    timestamp: expect.any(String)
                }
            });

            expect(mockErrorRecoveryService.attemptSystemRecovery).toHaveBeenCalledWith("complete", undefined);
        });

        it("should perform partial system recovery with specific type", async () => {
            mockErrorRecoveryService.attemptSystemRecovery.mockResolvedValue({
                success: true,
                message: "Database recovery completed",
                recoveredComponents: ["database"],
                timestamp: new Date().toISOString()
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .send({ type: "database" })
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.recovery).toMatchObject({
                success: true,
                message: "Database recovery completed",
                recoveredComponents: ["database"]
            });

            expect(mockErrorRecoveryService.attemptSystemRecovery).toHaveBeenCalledWith("database", undefined);
        });

        it("should handle recovery with context information", async () => {
            const context = {
                component: "queue",
                errorDetails: "Job processing failed"
            };

            await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .send({ type: "queue", context })
                .expect(STATUS_CODES.SUCCESS);

            expect(mockErrorRecoveryService.attemptSystemRecovery).toHaveBeenCalledWith("queue", context);
        });

        it("should return error status when recovery fails", async () => {
            mockErrorRecoveryService.attemptSystemRecovery.mockResolvedValue({
                success: false,
                message: "Recovery failed: Unable to connect to database",
                recoveredComponents: [],
                failedComponents: ["database"],
                timestamp: new Date().toISOString()
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body.data.recovery).toMatchObject({
                success: false,
                message: expect.stringContaining("Recovery failed")
            });
        });

        it("should handle unexpected errors during recovery", async () => {
            mockErrorRecoveryService.attemptSystemRecovery.mockRejectedValue(
                new Error("Unexpected recovery error")
            );

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Recovery attempt failed",
                warning: "Error: Unexpected recovery error",
                data: {
                    timestamp: expect.any(String)
                }
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle service unavailability", async () => {
            mockErrorRecoveryService.attemptSystemRecovery.mockRejectedValue(
                new Error("Service temporarily unavailable")
            );

            const response = await request(app)
                .get(getEndpointWithPrefix(["ADMIN", "RECOVER_SYSTEM"]))
                .expect(STATUS_CODES.UNKNOWN);

            expect(response.body).toMatchObject({
                message: "Recovery attempt failed",
                warning: expect.stringContaining("Service temporarily unavailable")
            });
        });
    });
});
