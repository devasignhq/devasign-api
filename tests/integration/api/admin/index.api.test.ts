import request from "supertest";
import express from "express";
import { adminRoutes } from "../../../../api/routes/admin.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { TestDataFactory } from "../../../helpers/test-data-factory";
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
                recovery: expect.objectContaining({
                    success: true,
                    message: "System recovery completed successfully",
                    recoveredComponents: expect.arrayContaining(["database", "queue"])
                }),
                timestamp: expect.any(String)
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

            expect(response.body.recovery).toMatchObject({
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

            expect(response.body.recovery).toMatchObject({
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
                error: "Recovery attempt failed",
                details: "Error: Unexpected recovery error",
                timestamp: expect.any(String)
            });
        });
    });

    describe(`POST ${getEndpointWithPrefix(["ADMIN", "RESET_DATABASE"])} - Reset Database`, () => {
        it("should reset database successfully", async () => {
            // Create some test data first
            const user = await prisma.user.create({
                data: {
                    userId: "test-user-reset",
                    username: "testuser",
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });

            const installation = await prisma.installation.create({
                data: {
                    id: "reset-test-install",
                    htmlUrl: "https://github.com/test",
                    targetId: 123,
                    targetType: "Organization",
                    account: { login: "test" },
                    wallet: TestDataFactory.createWalletRelation()
                }
            });

            // Verify data exists
            expect(user).toBeTruthy();
            expect(installation).toBeTruthy();

            // Reset database
            const response = await request(app)
                .post(getEndpointWithPrefix(["ADMIN", "RESET_DATABASE"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                message: "Database cleared"
            });

            // Verify data was deleted
            const userCount = await prisma.user.count();
            const installationCount = await prisma.installation.count();
            const taskCount = await prisma.task.count();
            const transactionCount = await prisma.transaction.count();

            expect(userCount).toBe(0);
            expect(installationCount).toBe(0);
            expect(taskCount).toBe(0);
            expect(transactionCount).toBe(0);
        });

        it("should clear all tables in correct order", async () => {
            // Create interconnected data
            const user = await prisma.user.create({
                data: {
                    userId: "test-user-order",
                    username: "ordertest",
                    wallet: TestDataFactory.createWalletRelation(),
                    contributionSummary: { create: {} }
                }
            });

            const installation = await prisma.installation.create({
                data: {
                    id: "order-test-install",
                    htmlUrl: "https://github.com/test",
                    targetId: 456,
                    targetType: "Organization",
                    account: { login: "test" },
                    wallet: TestDataFactory.createWalletRelation(),
                    users: {
                        connect: { userId: user.userId }
                    }
                }
            });

            const task = await prisma.task.create({
                data: {
                    issue: { number: 1, title: "Test" },
                    bounty: 100,
                    creatorId: user.userId,
                    installationId: installation.id
                }
            });

            await prisma.transaction.create({
                data: {
                    txHash: "test-hash",
                    category: "BOUNTY",
                    amount: 100,
                    taskId: task.id,
                    userId: user.userId,
                    installationId: installation.id
                }
            });

            // Reset database
            await request(app)
                .post(getEndpointWithPrefix(["ADMIN", "RESET_DATABASE"]))
                .expect(STATUS_CODES.SUCCESS);

            // Verify all data cleared
            const counts = await Promise.all([
                prisma.transaction.count(),
                prisma.task.count(),
                prisma.installation.count(),
                prisma.user.count()
            ]);

            expect(counts.every(count => count === 0)).toBe(true);
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
                error: "Recovery attempt failed",
                details: expect.stringContaining("Service temporarily unavailable")
            });
        });
    });
});
