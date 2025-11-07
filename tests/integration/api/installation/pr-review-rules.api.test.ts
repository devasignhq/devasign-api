import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { installationRoutes } from "../../../../api/routes/installation.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { validateUser } from "../../../../api/middlewares/auth.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";
import { RuleType, RuleSeverity } from "../../../../prisma_client";
import cuid from "cuid";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock Stellar service for wallet operations
jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn(),
        transferAssetViaSponsor: jest.fn()
    }
}));

describe("Installation PR Review Rules API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with installation routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.INSTALLATION.PREFIX, (req, res, next) => {
            req.body = {
                ...req.body,
                currentUser: {
                    uid: req.headers["x-test-user-id"] || "test-user-1",
                    admin: req.headers["x-test-admin"] === "true"
                },
                userId: req.headers["x-test-user-id"] || "test-user-1"
            };
            next();
        });

        app.use(ENDPOINTS.INSTALLATION.PREFIX, installationRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = await import("../../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: "test-user-1",
            admin: false
        });

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])} - Get PR Review Rules`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    }
                }
            });

            // Create test rules
            await prisma.aIReviewRule.createMany({
                data: [
                    {
                        installationId: "12345678",
                        name: "Code Quality Rule",
                        description: "Check code quality",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.HIGH,
                        config: { maxComplexity: 10 },
                        active: true
                    },
                    {
                        installationId: "12345678",
                        name: "Security Rule",
                        description: "Check security issues",
                        ruleType: RuleType.SECURITY,
                        severity: RuleSeverity.CRITICAL,
                        config: { checkDependencies: true },
                        active: true
                    },
                    {
                        installationId: "12345678",
                        name: "Inactive Rule",
                        description: "Inactive rule",
                        ruleType: RuleType.TESTING,
                        severity: RuleSeverity.LOW,
                        config: {},
                        active: false
                    }
                ]
            });
        });

        it("should get all PR review rules for installation", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({
                        name: "Code Quality Rule",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.HIGH
                    }),
                    expect.objectContaining({
                        name: "Security Rule",
                        ruleType: RuleType.SECURITY,
                        severity: RuleSeverity.CRITICAL
                    })
                ]),
                count: 3
            });
        });

        it("should filter rules by active status", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])
                    .replace(":installationId", "12345678")}?active=true`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.count).toBe(2);
            expect(response.body.data.every((rule: any) => rule.active === true)).toBe(true);
        });

        it("should filter rules by rule type", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])
                    .replace(":installationId", "12345678")}?ruleType=${RuleType.SECURITY}`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.count).toBe(1);
            expect(response.body.data[0].ruleType).toBe(RuleType.SECURITY);
        });

        it("should filter rules by severity", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])
                    .replace(":installationId", "12345678")}?severity=${RuleSeverity.CRITICAL}`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.count).toBe(1);
            expect(response.body.data[0].severity).toBe(RuleSeverity.CRITICAL);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_BY_ID"])} - Get PR Review Rule`, () => {
        let testInstallation: any;
        let testRule: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    }
                }
            });

            testRule = await prisma.aIReviewRule.create({
                data: {
                    installationId: "12345678",
                    name: "Test Rule",
                    description: "Test description",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    config: { maxLines: 500 },
                    active: true
                }
            });
        });

        it("should get PR review rule by ID successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_BY_ID"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", testRule.id))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    id: testRule.id,
                    name: "Test Rule",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM
                })
            });
        });

        it("should return 404 when rule not found", async () => {
            await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_BY_ID"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`POST ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "CREATE"])} - Create PR Review Rule`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    }
                }
            });
        });

        it("should create PR review rule successfully", async () => {
            const ruleData = {
                name: "New Code Quality Rule",
                description: "Check for code quality issues",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.HIGH,
                pattern: "^test.*",
                config: { maxComplexity: 15, metrics: ["check_naming_convention"] },
                active: true
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "CREATE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(ruleData)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    name: "New Code Quality Rule",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.HIGH,
                    active: true
                }),
                message: "Custom rule created successfully"
            });

            // Verify rule was created in database
            const createdRule = await prisma.aIReviewRule.findFirst({
                where: {
                    installationId: "12345678",
                    name: "New Code Quality Rule"
                }
            });
            expect(createdRule).toBeTruthy();
        });

        it("should return error when rule name already exists", async () => {
            await prisma.aIReviewRule.create({
                data: {
                    installationId: "12345678",
                    name: "Existing Rule",
                    description: "Existing rule",
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.MEDIUM,
                    config: {}
                }
            });

            const ruleData = {
                name: "Existing Rule",
                description: "Duplicate rule",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                config: {}
            };

            await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "CREATE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(ruleData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error for invalid rule configuration", async () => {
            const ruleData = {
                name: "Invalid Rule",
                description: "Invalid configuration",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.HIGH,
                pattern: "[invalid-regex",
                config: {}
            };

            await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "CREATE"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(ruleData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });
    });

    describe(`PUT ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "UPDATE"])} - Update PR Review Rule`, () => {
        let testInstallation: any;
        let testRule: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    }
                }
            });

            testRule = await prisma.aIReviewRule.create({
                data: {
                    installationId: "12345678",
                    name: "Original Rule",
                    description: "Original description",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    config: { maxComplexity: 10, metrics: ["proper_naming"] },
                    active: true
                }
            });
        });

        it("should update PR review rule successfully", async () => {
            const updateData = {
                name: "Updated Rule",
                description: "Updated description",
                severity: RuleSeverity.HIGH,
                config: { metrics: ["proper_naming", "no_todos"] },
                active: false
            };

            const response = await request(app)
                .put(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "UPDATE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", testRule.id))
                .set("x-test-user-id", "user-1")
                .send(updateData)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    name: "Updated Rule",
                    description: "Updated description",
                    severity: RuleSeverity.HIGH,
                    active: false
                }),
                message: "Custom rule updated successfully"
            });

            // Verify update in database
            const updatedRule = await prisma.aIReviewRule.findUnique({
                where: { id: testRule.id }
            });
            expect(updatedRule?.name).toBe("Updated Rule");
            expect(updatedRule?.active).toBe(false);
        });

        it("should return error when updating to existing rule name", async () => {
            await prisma.aIReviewRule.create({
                data: {
                    installationId: "12345678",
                    name: "Another Rule",
                    description: "Another rule",
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.LOW,
                    config: {}
                }
            });

            const updateData = {
                name: "Another Rule"
            };

            await request(app)
                .put(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "UPDATE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", testRule.id))
                .set("x-test-user-id", "user-1")
                .send(updateData)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return 404 when rule not found", async () => {
            const updateData = {
                name: "Updated Rule"
            };

            await request(app)
                .put(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "UPDATE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .set("x-test-user-id", "user-1")
                .send(updateData)
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`DELETE ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "DELETE"])} - Delete PR Review Rule`, () => {
        let testInstallation: any;
        let testRule: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    }
                }
            });

            testRule = await prisma.aIReviewRule.create({
                data: {
                    installationId: "12345678",
                    name: "Rule to Delete",
                    description: "This rule will be deleted",
                    ruleType: RuleType.TESTING,
                    severity: RuleSeverity.LOW,
                    config: {}
                }
            });
        });

        it("should delete PR review rule successfully", async () => {
            const response = await request(app)
                .delete(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "DELETE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", testRule.id))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                message: "Custom rule deleted successfully"
            });

            // Verify rule was deleted
            const deletedRule = await prisma.aIReviewRule.findUnique({
                where: { id: testRule.id }
            });
            expect(deletedRule).toBeNull();
        });

        it("should return 404 when rule not found", async () => {
            await request(app)
                .delete(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "DELETE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_DEFAULT"])} - Get Default Rules`, () => {
        it("should get default PR review rules", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_DEFAULT"]))
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.any(Array),
                count: expect.any(Number)
            });

            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0]).toHaveProperty("name");
            expect(response.body.data[0]).toHaveProperty("description");
            expect(response.body.data[0]).toHaveProperty("ruleType");
            expect(response.body.data[0]).toHaveProperty("severity");
        });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for PR review rules endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(
                ENDPOINTS.INSTALLATION.PREFIX, 
                validateUser as RequestHandler, 
                installationRoutes
            );
            appWithoutAuth.use(errorHandler);

            await request(appWithoutAuth)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_ALL"])
                    .replace(":installationId", "12345678"))
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "GET_BY_ID"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .post(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "CREATE"])
                    .replace(":installationId", "12345678"))
                .send({ name: "Test", description: "Test", ruleType: RuleType.CODE_QUALITY, severity: RuleSeverity.LOW, config: {} })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .put(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "UPDATE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .send({ name: "Test" })
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .delete(getEndpointWithPrefix(["INSTALLATION", "PR_REVIEW_RULES", "DELETE"])
                    .replace(":installationId", "12345678")
                    .replace(":ruleId", cuid()))
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });
});
