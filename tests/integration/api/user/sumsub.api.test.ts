import { vi, describe, it, expect, beforeAll, beforeEach, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import axios from "axios";
import { statsigService } from "../../../../api/services/statsig.service.js";
import { userRoutes } from "../../../../api/routes/user.route.js";
import { errorHandler } from "../../../../api/middlewares/error.middleware.js";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper.js";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utils/data.js";
import { TestDataFactory } from "../../../helpers/test-data-factory.js";
import { getEndpointWithPrefix } from "../../../helpers/test-utils.js";

// Mock logger
vi.mock("../../../../api/config/logger.config", () => ({
    dataLogger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Mock Statsig service
vi.mock("../../../../api/services/statsig.service", () => ({
    statsigService: {
        checkGate: vi.fn().mockResolvedValue(true)
    }
}));

// Mock Firebase admin for authentication
vi.mock("../../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: vi.fn()
        })
    }
}));

// Mock Stellar service
vi.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: vi.fn()
    }
}));

// Mock KMS service
vi.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        encryptWallet: vi.fn(),
        decryptWallet: vi.fn()
    }
}));

// Mock axios
vi.mock("axios");
const mockedAxios = axios as any;

describe("User Sumsub API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    const TEST_USER_ID = "test-user-id";

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app
        app = express();
        app.use(express.json());

        // Mock auth middleware to inject user
        app.use(ENDPOINTS.USER.PREFIX, (req, res, next) => {
            res.locals.user = { uid: TEST_USER_ID };
            res.locals.userId = TEST_USER_ID;
            next();
        });

        app.use(ENDPOINTS.USER.PREFIX, userRoutes);
        app.use(errorHandler);
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await prisma.user.create({
            data: TestDataFactory.user({ userId: TEST_USER_ID })
        });

        vi.clearAllMocks();

        // Setup default env vars for Sumsub
        process.env.SUMSUB_APP_TOKEN = "test-app-token";
        process.env.SUMSUB_SECRET_KEY = "test-secret-key";
        process.env.SUMSUB_LEVEL_NAME = "test-level-name";
        process.env.SUMSUB_BASE_URL = "https://api.sumsub.com";
    });

    afterAll(async () => {
        await prisma.$disconnect();
        delete process.env.SUMSUB_APP_TOKEN;
        delete process.env.SUMSUB_SECRET_KEY;
        delete process.env.SUMSUB_LEVEL_NAME;
        delete process.env.SUMSUB_BASE_URL;
    });

    describe(`GET ${getEndpointWithPrefix(["USER", "SUMSUB_TOKEN"])}`, () => {
        it("should return early with success if require_kyc gate is disabled", async () => {
            (statsigService.checkGate as any).mockResolvedValueOnce(false);

            const response = await request(app)
                .get(getEndpointWithPrefix(["USER", "SUMSUB_TOKEN"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                data: null,
                message: "KYC is currently disabled"
            });
            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it("should generate Sumsub SDK token successfully", async () => {
            const mockSumsubResponse = {
                token: "mock-sumsub-token",
                userId: TEST_USER_ID
            };

            mockedAxios.post.mockResolvedValue({
                status: 200,
                data: mockSumsubResponse
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["USER", "SUMSUB_TOKEN"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toEqual(mockSumsubResponse);

            // Verify Axios call
            expect(mockedAxios.post).toHaveBeenCalledTimes(1);
            const [url, body, config] = mockedAxios.post.mock.calls[0];

            expect(url).toBe("https://api.sumsub.com/resources/accessTokens/sdk");
            expect(body).toEqual(expect.objectContaining({
                userId: TEST_USER_ID,
                levelName: "test-level-name",
                ttlInSecs: 600
            }));

            // Verify signature headers
            expect(config?.headers).toMatchObject({
                "X-App-Token": "test-app-token",
                "Content-Type": "application/json"
            });
            expect(config?.headers?.["X-App-Access-Ts"]).toBeDefined();
            expect(config?.headers?.["X-App-Access-Sig"]).toBeDefined();
        });

        it("should handle Sumsub API errors", async () => {
            mockedAxios.post.mockResolvedValue({
                status: 401,
                data: { description: "Invalid app token" }
            });

            const response = await request(app)
                .get(getEndpointWithPrefix(["USER", "SUMSUB_TOKEN"]))
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                message: "Sumsub SDK token generation failed"
            });
        });

        it("should handle network errors", async () => {
            mockedAxios.post.mockRejectedValue(new Error("Network Error"));

            await request(app)
                .get(getEndpointWithPrefix(["USER", "SUMSUB_TOKEN"]))
                .expect(STATUS_CODES.UNKNOWN);
        });
    });
});
