
import request from "supertest";
import express from "express";
import axios from "axios";
import { userRoutes } from "../../../../api/routes/user.route";
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

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock Stellar service
jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        getAccountInfo: jest.fn()
    }
}));

// Mock KMS service
jest.mock("../../../../api/services/kms.service", () => ({
    KMSService: {
        encryptWallet: jest.fn(),
        decryptWallet: jest.fn()
    }
}));

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

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

        jest.clearAllMocks();

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
