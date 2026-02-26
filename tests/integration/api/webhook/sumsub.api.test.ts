
import request from "supertest";
import express from "express";
import crypto from "crypto";
import { webhookRoutes } from "../../../../api/routes/webhook.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock logger
jest.mock("../../../../api/config/logger.config", () => ({
    dataLogger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

// Mock Firebase admin
jest.mock("../../../../api/config/firebase.config", () => ({
    firebaseAdmin: { auth: () => ({ verifyIdToken: jest.fn() }) }
}));

// Mock Stellar service and KMS
jest.mock("../../../../api/services/stellar.service", () => ({ stellarService: {} }));
jest.mock("../../../../api/services/kms.service", () => ({ KMSService: {} }));

// Mock OctokitService (used in webhook controller)
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        getDefaultBranch: jest.fn()
    }
}));

// Mock external services that might be imported by webhook routes
jest.mock("../../../../api/services/pr-review/workflow-integration.service", () => ({
    WorkflowIntegrationService: {
        getInstance: jest.fn()
    }
}));

jest.mock("../../../../api/services/pr-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        extractLinkedIssues: jest.fn()
    }
}));

// Mock Firebase service for task messaging
jest.mock("../../../../api/services/firebase.service", () => ({
    FirebaseService: {
        updateTaskStatus: jest.fn().mockResolvedValue(true)
    }
}));

// Mock Contract service
jest.mock("../../../../api/services/contract.service", () => ({
    ContractService: {
        approveCompletion: jest.fn(),
        refund: jest.fn()
    }
}));

describe("Sumsub Webhook API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    const SUMSUB_SECRET = "test-sumsub-secret";
    const TEST_USER_ID = "test-user-id";

    // Helper to sign payloads
    const signPayload = (payload: any) => {
        const strPayload = JSON.stringify(payload);
        return crypto
            .createHmac("sha256", SUMSUB_SECRET)
            .update(strPayload)
            .digest("hex");
    };

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();
        app = express();

        // Setup raw body parsing for webhook route ONLY, matching production config
        app.use(
            ENDPOINTS.WEBHOOK.PREFIX + ENDPOINTS.WEBHOOK.SUMSUB,
            express.raw({ type: "application/json" })
        );

        app.use(ENDPOINTS.WEBHOOK.PREFIX, webhookRoutes);
        app.use(errorHandler);
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        process.env.SUMSUB_WEBHOOK_SECRET = SUMSUB_SECRET;
        jest.clearAllMocks();
    });

    afterAll(async () => {
        await prisma.$disconnect();
        delete process.env.SUMSUB_WEBHOOK_SECRET;
    });

    const createTestUser = async (verified: boolean) => {
        return await prisma.user.create({
            data: {
                ...TestDataFactory.user({ userId: TEST_USER_ID }),
                verified
            }
        });
    };

    describe(`POST ${getEndpointWithPrefix(["WEBHOOK", "SUMSUB"])}`, () => {
        it("should verify user when reviewResult is GREEN", async () => {
            await createTestUser(false);

            const payload = {
                type: "applicantReviewed",
                externalUserId: TEST_USER_ID,
                reviewResult: { reviewAnswer: "GREEN" }
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);

            const updatedUser = await prisma.user.findUnique({ where: { userId: TEST_USER_ID } });
            expect(updatedUser?.verified).toBe(true);
        });

        it("should reject user when reviewResult is RED", async () => {
            await createTestUser(true);

            const payload = {
                type: "applicantReviewed",
                externalUserId: TEST_USER_ID,
                reviewResult: { reviewAnswer: "RED" },
                reviewRejectType: "FINAL"
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);

            const updatedUser = await prisma.user.findUnique({ where: { userId: TEST_USER_ID } });
            expect(updatedUser?.verified).toBe(false);
        });

        it("should not change status when reviewResult is RED with RETRY type", async () => {
            await createTestUser(false);

            const payload = {
                type: "applicantReviewed",
                externalUserId: TEST_USER_ID,
                reviewResult: { reviewAnswer: "RED" },
                reviewRejectType: "RETRY"
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);

            const updatedUser = await prisma.user.findUnique({ where: { userId: TEST_USER_ID } });
            expect(updatedUser?.verified).toBe(false); // Should remain false
        });

        it("should verify user when applicantActivated", async () => {
            await createTestUser(false);

            const payload = {
                type: "applicantActivated",
                externalUserId: TEST_USER_ID
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);

            const updatedUser = await prisma.user.findUnique({ where: { userId: TEST_USER_ID } });
            expect(updatedUser?.verified).toBe(true);
        });

        it("should unverify user when applicantReset", async () => {
            await createTestUser(true);

            const payload = {
                type: "applicantReset",
                externalUserId: TEST_USER_ID
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);

            const updatedUser = await prisma.user.findUnique({ where: { userId: TEST_USER_ID } });
            expect(updatedUser?.verified).toBe(false);
        });

        it("should handle missing externalUserId gracefully", async () => {
            const payload = {
                type: "applicantReviewed",
                reviewResult: { reviewAnswer: "GREEN" }
                // No externalUserId
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", signPayload(payload))
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect(STATUS_CODES.SUCCESS);
        });

        it("should reject request with invalid signature", async () => {
            const payload = {
                type: "applicantReviewed",
                externalUserId: TEST_USER_ID
            };

            await request(app)
                .post(getEndpointWithPrefix(["WEBHOOK", "SUMSUB"]))
                .set("x-payload-digest", "invalid-signature")
                .set("Content-Type", "application/json")
                .send(JSON.stringify(payload))
                .expect((res) => {
                    const expected = [STATUS_CODES.SERVER_ERROR, STATUS_CODES.UNKNOWN];
                    if (!expected.includes(res.status)) {
                        throw new Error(`Expected status ${expected.join(" or ")}, but got ${res.status}. Body: ${JSON.stringify(res.body)}`);
                    }
                });
        });
    });
});
