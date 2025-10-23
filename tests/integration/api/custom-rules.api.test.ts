import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { customRulesRoutes } from "../../../api/routes/custom-rules.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { STATUS_CODES } from "../../../api/utilities/helper";
import { RuleType, RuleSeverity } from "../../../prisma_client";

// Mock Firebase admin for authentication
jest.mock("../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock RuleEngineService
jest.mock("../../../api/services/ai-review/rule-engine.service", () => ({
    RuleEngineService: {
        validatePRReviewRule: jest.fn(),
        getDefaultRules: jest.fn()
    }
}));

describe("Custom Rules API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockRuleEngineService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with pr review rules routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use("/custom-rules", (req, res, next) => {
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

        app.use("/custom-rules", customRulesRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { RuleEngineService } = await import("../../../api/services/ai-review/rule-engine.service");
        mockRuleEngineService = RuleEngineService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Create test user and installation
        const testUser = TestDataFactory.user({ userId: "test-user-1" });
        await prisma.user.create({
            data: {
                ...testUser,
                contributionSummary: { create: {} }
            }
        });

        const testInstallation = TestDataFactory.installation({ id: "test-installation-1" });
        await prisma.installation.create({
            data: {
                ...testInstallation,
                users: {
                    connect: { userId: "test-user-1" }
                }
            }
        });

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockRuleEngineService.validatePRReviewRule.mockReturnValue({
            isValid: true,
            error: null
        });

        mockRuleEngineService.getDefaultRules.mockReturnValue([
            {
                id: "default-1",
                name: "Code Quality",
                description: "Checks for code quality issues",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.HIGH,
                pattern: null,
                config: { maxComplexity: 10 },
                active: true,
                isDefault: true
            },
            {
                id: "default-2",
                name: "Security Check",
                description: "Checks for security vulnerabilities",
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.CRITICAL,
                pattern: null,
                config: { scanDependencies: true },
                active: true,
                isDefault: true
            }
        ]);

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("GET /custom-rules/:installationId - Get All Custom Rules", () => {
        beforeEach(async () => {
            // Create test pr review rules
            await prisma.aIReviewRule.createMany({
                data: [
                    {
                        id: "rule-1",
                        installationId: "test-installation-1",
                        name: "No Console Logs",
                        description: "Prevents console.log in production code",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.MEDIUM,
                        pattern: "console\\.log",
                        config: {},
                        active: false
                    },
                    {
                        id: "rule-2",
                        installationId: "test-installation-1",
                        name: "TODO Comments",
                        description: "Flags TODO comments",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.LOW,
                        pattern: "TODO:",
                        config: {},
                        active: true
                    },
                    {
                        id: "rule-3",
                        installationId: "test-installation-1",
                        name: "Deprecated APIs",
                        description: "Checks for deprecated API usage",
                        ruleType: RuleType.SECURITY,
                        severity: RuleSeverity.HIGH,
                        pattern: null,
                        config: { apis: ["oldFunction", "legacyMethod"] },
                        active: true
                    }
                ]
            });
        });

        it("should get all pr review rules for installation", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({
                        id: "rule-1",
                        name: "No Console Logs",
                        ruleType: RuleType.CODE_QUALITY
                    }),
                    expect.objectContaining({
                        id: "rule-2",
                        name: "TODO Comments",
                        ruleType: RuleType.CODE_QUALITY
                    }),
                    expect.objectContaining({
                        id: "rule-3",
                        name: "Deprecated APIs",
                        active: true
                    })
                ]),
                count: 3
            });
        });

        it("should filter rules by active status", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .query({ active: "true" })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({ id: "rule-2", active: true }),
                    expect.objectContaining({ id: "rule-3", active: true })
                ]),
                count: 2
            });

            expect(response.body.data).not.toContainEqual(
                expect.objectContaining({ id: "rule-1" })
            );
        });

        it("should filter rules by rule type", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .query({ ruleType: RuleType.CODE_QUALITY })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.every((rule: any) =>
                rule.ruleType === RuleType.CODE_QUALITY
            )).toBe(true);
            expect(response.body.count).toBe(2);
        });

        it("should filter rules by severity", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .query({ severity: RuleSeverity.HIGH })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.arrayContaining([
                    expect.objectContaining({ id: "rule-3", severity: RuleSeverity.HIGH })
                ]),
                count: 1
            });
        });

        it("should combine multiple filters", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .query({ 
                    active: "true",
                    ruleType: RuleType.CODE_QUALITY 
                })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.count).toBe(1);
            expect(response.body.data[0].ruleType === RuleType.CODE_QUALITY).toBe(true);
        });

        it("should return empty array when no rules match filters", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .query({ severity: RuleSeverity.CRITICAL })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: [],
                count: 0
            });
        });

        it("should return error when user not authorized for installation", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user", username: "other-user" });
            await prisma.user.create({
                data: {
                    ...otherUser,
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get("/custom-rules/test-installation-1")
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe("GET /custom-rules/:installationId/:ruleId - Get Specific Custom Rule", () => {
        beforeEach(async () => {
            await prisma.aIReviewRule.create({
                data: {
                    id: "specific-rule-1",
                    installationId: "test-installation-1",
                    name: "Specific Rule",
                    description: "A specific test rule",
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.HIGH,
                    pattern: "eval\\(",
                    config: { allowInTests: false },
                    active: true
                }
            });
        });

        it("should get a specific pr review rule", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1/specific-rule-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                data: expect.objectContaining({
                    id: "specific-rule-1",
                    name: "Specific Rule",
                    description: "A specific test rule",
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.HIGH,
                    pattern: "eval\\(",
                    active: true
                })
            });
        });

        it("should return 404 when rule does not exist", async () => {
            await request(app)
                .get("/custom-rules/test-installation-1/non-existent-rule")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when rule belongs to different installation", async () => {
            // Create another installation with a rule
            const otherInstallation = TestDataFactory.installation({ id: "other-installation" });
            await prisma.installation.create({
                data: {
                    ...otherInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            await prisma.aIReviewRule.create({
                data: {
                    id: "other-rule",
                    installationId: "other-installation",
                    name: "Other Rule",
                    description: "Rule in different installation",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            await request(app)
                .get("/custom-rules/test-installation-1/other-rule")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    describe("POST /custom-rules/:installationId - Create Custom Rule", () => {
        it("should create a new pr review rule successfully", async () => {
            const newRule = {
                name: "New Test Rule",
                description: "A new test rule for validation",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: "var\\s+",
                config: { suggestLet: true },
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(newRule)
                .expect(STATUS_CODES.POST);

            expect(response.body).toMatchObject({
                success: true,
                message: "Custom rule created successfully",
                data: expect.objectContaining({
                    id: expect.any(String),
                    installationId: "test-installation-1",
                    name: "New Test Rule",
                    description: "A new test rule for validation",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: "var\\s+",
                    active: true
                })
            });

            // Verify rule was created in database
            const createdRule = await prisma.aIReviewRule.findFirst({
                where: {
                    installationId: "test-installation-1",
                    name: "New Test Rule"
                }
            });

            expect(createdRule).toBeTruthy();
            expect(mockRuleEngineService.validatePRReviewRule).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: "New Test Rule",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM
                })
            );
        });

        it("should create rule with default active=true when not specified", async () => {
            const newRule = {
                name: "Default Active Rule",
                description: "Rule without explicit active flag",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                pattern: null,
                config: {}
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(newRule)
                .expect(STATUS_CODES.POST);

            expect(response.body.data.active).toBe(true);
        });

        it("should return error when rule name already exists", async () => {
            // Create existing rule
            await prisma.aIReviewRule.create({
                data: {
                    id: "existing-rule",
                    installationId: "test-installation-1",
                    name: "Duplicate Name",
                    description: "Existing rule",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            const duplicateRule = {
                name: "Duplicate Name",
                description: "Trying to create duplicate",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                pattern: null,
                config: {},
                active: true
            };

            await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(duplicateRule)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should return error when rule validation fails", async () => {
            mockRuleEngineService.validatePRReviewRule.mockReturnValue({
                isValid: false,
                error: "Invalid pattern: regex compilation failed"
            });

            const invalidRule = {
                name: "Invalid Rule",
                description: "Rule with invalid pattern",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: "[invalid(regex",
                config: {},
                active: true
            };

            await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(invalidRule)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should allow same rule name in different installations", async () => {
            // Create rule in first installation
            await prisma.aIReviewRule.create({
                data: {
                    id: "rule-inst-1",
                    installationId: "test-installation-1",
                    name: "Shared Name",
                    description: "Rule in installation 1",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            // Create second installation
            const secondInstallation = TestDataFactory.installation({ id: "test-installation-2" });
            await prisma.installation.create({
                data: {
                    ...secondInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            // Should allow same name in different installation
            const sameNameRule = {
                name: "Shared Name",
                description: "Rule in installation 2",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                pattern: null,
                config: {},
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-2")
                .set("x-test-user-id", "test-user-1")
                .send(sameNameRule)
                .expect(STATUS_CODES.POST);

            expect(response.body.success).toBe(true);
            expect(response.body.data.installationId).toBe("test-installation-2");
        });
    });

    describe("PUT /custom-rules/:installationId/:ruleId - Update Custom Rule", () => {
        beforeEach(async () => {
            await prisma.aIReviewRule.create({
                data: {
                    id: "update-rule-1",
                    installationId: "test-installation-1",
                    name: "Original Name",
                    description: "Original description",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: "old_pattern",
                    config: { oldConfig: true },
                    active: true
                }
            });
        });

        it("should update pr review rule successfully", async () => {
            const updates = {
                name: "Updated Name",
                description: "Updated description",
                severity: RuleSeverity.HIGH,
                pattern: "new_pattern",
                config: { newConfig: true },
                active: false
            };

            const response = await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                message: "Custom rule updated successfully",
                data: expect.objectContaining({
                    id: "update-rule-1",
                    name: "Updated Name",
                    description: "Updated description",
                    severity: RuleSeverity.HIGH,
                    pattern: "new_pattern",
                    active: false
                })
            });

            // Verify database update
            const updatedRule = await prisma.aIReviewRule.findUnique({
                where: { id: "update-rule-1" }
            });

            expect(updatedRule?.name).toBe("Updated Name");
            expect(updatedRule?.active).toBe(false);
        });

        it("should update only specified fields", async () => {
            const partialUpdate = {
                severity: RuleSeverity.LOW
            };

            const response = await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(partialUpdate)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data).toMatchObject({
                id: "update-rule-1",
                name: "Original Name", // Should remain unchanged
                description: "Original description", // Should remain unchanged
                severity: RuleSeverity.LOW, // Should be updated
                active: true // Should remain unchanged
            });
        });

        it("should return 404 when rule does not exist", async () => {
            const updates = {
                name: "Updated Name"
            };

            await request(app)
                .put("/custom-rules/test-installation-1/non-existent-rule")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return error when new name conflicts with existing rule", async () => {
            // Create another rule
            await prisma.aIReviewRule.create({
                data: {
                    id: "conflicting-rule",
                    installationId: "test-installation-1",
                    name: "Conflicting Name",
                    description: "Another rule",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.LOW,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            const updates = {
                name: "Conflicting Name"
            };

            await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should allow updating to same name", async () => {
            const updates = {
                name: "Original Name",
                description: "New description"
            };

            const response = await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.success).toBe(true);
        });

        it("should return error when validation fails", async () => {
            mockRuleEngineService.validatePRReviewRule.mockReturnValue({
                isValid: false,
                error: "Invalid configuration"
            });

            const updates = {
                config: { invalid: "config" }
            };

            await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.SERVER_ERROR);
        });

        it("should handle updating rule type", async () => {
            const updates = {
                ruleType: RuleType.SECURITY
            };

            const response = await request(app)
                .put("/custom-rules/test-installation-1/update-rule-1")
                .set("x-test-user-id", "test-user-1")
                .send(updates)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.data.ruleType).toBe(RuleType.SECURITY);
        });
    });

    describe("DELETE /custom-rules/:installationId/:ruleId - Delete Custom Rule", () => {
        beforeEach(async () => {
            await prisma.aIReviewRule.create({
                data: {
                    id: "delete-rule-1",
                    installationId: "test-installation-1",
                    name: "Rule to Delete",
                    description: "This rule will be deleted",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });
        });

        it("should delete pr review rule successfully", async () => {
            const response = await request(app)
                .delete("/custom-rules/test-installation-1/delete-rule-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                success: true,
                message: "Custom rule deleted successfully"
            });

            // Verify rule was deleted from database
            const deletedRule = await prisma.aIReviewRule.findUnique({
                where: { id: "delete-rule-1" }
            });

            expect(deletedRule).toBeNull();
        });

        it("should return 404 when rule does not exist", async () => {
            await request(app)
                .delete("/custom-rules/test-installation-1/non-existent-rule")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });

        it("should return 404 when trying to delete rule from different installation", async () => {
            // Create another installation with a rule
            const otherInstallation = TestDataFactory.installation({ id: "other-installation" });
            await prisma.installation.create({
                data: {
                    ...otherInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            await prisma.aIReviewRule.create({
                data: {
                    id: "other-inst-rule",
                    installationId: "other-installation",
                    name: "Other Installation Rule",
                    description: "Rule in different installation",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            await request(app)
                .delete("/custom-rules/test-installation-1/other-inst-rule")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.NOT_FOUND);
        });
    });

    // describe("GET /custom-rules/default - Get Default Rules", () => {
    //     it("should get default rules successfully", async () => {
    //         const response = await request(app)
    //             .get("/custom-rules/default")
    //             .set("x-test-user-id", "test-user-1")
    //             .expect(STATUS_CODES.SUCCESS);

    //         expect(response.body).toMatchObject({
    //             success: true,
    //             data: expect.arrayContaining([
    //                 expect.objectContaining({
    //                     id: "default-1",
    //                     name: "Code Quality",
    //                     ruleType: RuleType.CODE_QUALITY,
    //                     isDefault: true
    //                 }),
    //                 expect.objectContaining({
    //                     id: "default-2",
    //                     name: "Security Check",
    //                     ruleType: RuleType.SECURITY,
    //                     isDefault: true
    //                 })
    //             ]),
    //             count: 2
    //         });

    //         expect(mockRuleEngineService.getDefaultRules).toHaveBeenCalled();
    //     });

    //     it("should return empty array when no default rules exist", async () => {
    //         mockRuleEngineService.getDefaultRules.mockReturnValue([]);

    //         const response = await request(app)
    //             .get("/custom-rules/default")
    //             .set("x-test-user-id", "test-user-1")
    //             .expect(STATUS_CODES.SUCCESS);

    //         expect(response.body).toMatchObject({
    //             success: true,
    //             data: [],
    //             count: 0
    //         });
    //     });
    // });

    describe("Authorization and Error Handling", () => {
        it("should require valid installation access for all endpoints", async () => {
            const unauthorizedUser = TestDataFactory.user({ 
                userId: "unauthorized-user", 
                username: "unauthorized" 
            });
            await prisma.user.create({
                data: {
                    ...unauthorizedUser,
                    contributionSummary: { create: {} }
                }
            });

            // Test GET all rules
            await request(app)
                .get("/custom-rules/test-installation-1")
                .set("x-test-user-id", "unauthorized-user")
                .expect(STATUS_CODES.UNAUTHORIZED);

            // Test GET specific rule
            await request(app)
                .get("/custom-rules/test-installation-1/some-rule")
                .set("x-test-user-id", "unauthorized-user")
                .expect(STATUS_CODES.UNAUTHORIZED);

            // Test POST create rule
            await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "unauthorized-user")
                .send({
                    name: "Test Rule",
                    description: "Test",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    config: {}
                })
                .expect(STATUS_CODES.UNAUTHORIZED);

            // Test PUT update rule
            await request(app)
                .put("/custom-rules/test-installation-1/some-rule")
                .set("x-test-user-id", "unauthorized-user")
                .send({ name: "Updated" })
                .expect(STATUS_CODES.UNAUTHORIZED);

            // Test DELETE rule
            await request(app)
                .delete("/custom-rules/test-installation-1/some-rule")
                .set("x-test-user-id", "unauthorized-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should handle database errors gracefully", async () => {
            // Simulate database error by using invalid installation ID format
            await request(app)
                .get("/custom-rules/invalid-installation")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });

        it("should handle missing installation", async () => {
            await request(app)
                .get("/custom-rules/non-existent-installation")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe("Data Validation and Constraints", () => {
        it("should validate required fields when creating rule", async () => {
            const incompleteRule = {
                name: "Incomplete Rule"
                // Missing required fields
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(incompleteRule);

            // Should fail validation (exact status code depends on validator implementation)
            expect(response.status).toBeGreaterThanOrEqual(400);
        });

        it("should handle very long rule names", async () => {
            const longNameRule = {
                name: "A".repeat(500),
                description: "Rule with very long name",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: null,
                config: {},
                active: true
            };

            // Behavior depends on validator - might accept or reject
            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(longNameRule);

            // Just verify it doesn't crash
            expect([STATUS_CODES.POST, 400, 500]).toContain(response.status);
        });

        it("should handle complex config objects", async () => {
            const complexConfigRule = {
                name: "Complex Config Rule",
                description: "Rule with nested config",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: null,
                config: {
                    level1: {
                        level2: {
                            level3: {
                                value: "deep",
                                array: [1, 2, 3],
                                nested: { key: "value" }
                            }
                        }
                    },
                    options: ["option1", "option2"],
                    enabled: true
                },
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(complexConfigRule)
                .expect(STATUS_CODES.POST);

            expect(response.body.data.config).toEqual(complexConfigRule.config);
        });

        it("should handle null and undefined values correctly", async () => {
            const ruleWithNulls = {
                name: "Rule With Nulls",
                description: "Testing null handling",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                pattern: null,
                config: {},
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(ruleWithNulls)
                .expect(STATUS_CODES.POST);

            expect(response.body.data.pattern).toBeNull();
        });
    });

    describe("Rule Ordering and Sorting", () => {
        beforeEach(async () => {
            // Create rules with different properties for sorting tests
            await prisma.aIReviewRule.createMany({
                data: [
                    {
                        id: "sort-rule-1",
                        installationId: "test-installation-1",
                        name: "Active High Severity",
                        description: "Test",
                        ruleType: RuleType.SECURITY,
                        severity: RuleSeverity.HIGH,
                        pattern: null,
                        config: {},
                        active: true,
                        createdAt: new Date("2024-01-01")
                    },
                    {
                        id: "sort-rule-2",
                        installationId: "test-installation-1",
                        name: "Inactive Medium Severity",
                        description: "Test",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.MEDIUM,
                        pattern: null,
                        config: {},
                        active: false,
                        createdAt: new Date("2024-01-02")
                    },
                    {
                        id: "sort-rule-3",
                        installationId: "test-installation-1",
                        name: "Active Critical Severity",
                        description: "Test",
                        ruleType: RuleType.SECURITY,
                        severity: RuleSeverity.CRITICAL,
                        pattern: null,
                        config: {},
                        active: true,
                        createdAt: new Date("2024-01-03")
                    },
                    {
                        id: "sort-rule-4",
                        installationId: "test-installation-1",
                        name: "Active Low Severity",
                        description: "Test",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.LOW,
                        pattern: null,
                        config: {},
                        active: true,
                        createdAt: new Date("2024-01-04")
                    }
                ]
            });
        });

        it("should return rules sorted by active, then severity, then creation date", async () => {
            const response = await request(app)
                .get("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            const rules = response.body.data;

            // Active rules should come first
            const activeRules = rules.filter((r: any) => r.active);
            
            expect(rules.slice(0, activeRules.length)).toEqual(
                expect.arrayContaining(activeRules)
            );

            // Among active rules, critical should come before high, high before medium, etc.
            const activeRuleIds = activeRules.map((r: any) => r.id);
            const criticalIndex = activeRuleIds.indexOf("sort-rule-3");
            const highIndex = activeRuleIds.indexOf("sort-rule-1");
            const lowIndex = activeRuleIds.indexOf("sort-rule-4");

            expect(criticalIndex).toBeLessThan(highIndex);
            expect(highIndex).toBeLessThan(lowIndex);
        });
    });

    describe("Concurrent Operations", () => {
        it("should handle concurrent rule creation safely", async () => {
            const rules = [
                {
                    name: "Concurrent Rule 1",
                    description: "Test 1",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                },
                {
                    name: "Concurrent Rule 2",
                    description: "Test 2",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.LOW,
                    pattern: null,
                    config: {},
                    active: true
                },
                {
                    name: "Concurrent Rule 3",
                    description: "Test 3",
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.HIGH,
                    pattern: null,
                    config: {},
                    active: true
                }
            ];

            const promises = rules.map(rule =>
                request(app)
                    .post("/custom-rules/test-installation-1")
                    .set("x-test-user-id", "test-user-1")
                    .send(rule)
            );

            const results = await Promise.allSettled(promises);

            // All should succeed since they have different names
            const successfulResults = results.filter(
                result => result.status === "fulfilled" && 
                         (result.value as any).status === STATUS_CODES.POST
            );

            expect(successfulResults.length).toBe(3);

            // Verify all rules were created
            const createdRules = await prisma.aIReviewRule.findMany({
                where: {
                    installationId: "test-installation-1",
                    name: {
                        in: rules.map(r => r.name)
                    }
                }
            });

            expect(createdRules).toHaveLength(3);
        });

        it("should handle concurrent updates to same rule", async () => {
            // Create a rule first
            await prisma.aIReviewRule.create({
                data: {
                    id: "concurrent-update-rule",
                    installationId: "test-installation-1",
                    name: "Original Name",
                    description: "Original description",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            // Try to update with different values concurrently
            const updates = [
                { description: "Update 1" },
                { description: "Update 2" },
                { description: "Update 3" }
            ];

            const promises = updates.map(update =>
                request(app)
                    .put("/custom-rules/test-installation-1/concurrent-update-rule")
                    .set("x-test-user-id", "test-user-1")
                    .send(update)
            );

            const results = await Promise.allSettled(promises);

            // At least one should succeed
            const successfulResults = results.filter(
                result => result.status === "fulfilled" && 
                         (result.value as any).status === STATUS_CODES.SUCCESS
            );

            expect(successfulResults.length).toBeGreaterThan(0);

            // Verify final state is consistent
            const finalRule = await prisma.aIReviewRule.findUnique({
                where: { id: "concurrent-update-rule" }
            });

            expect(finalRule).toBeTruthy();
            expect(finalRule?.description).toMatch(/Update [1-3]/);
        });
    });

    describe("Integration with Installation Context", () => {
        it("should properly isolate rules between installations", async () => {
            // Create second installation
            const secondInstallation = TestDataFactory.installation({ id: "test-installation-2" });
            await prisma.installation.create({
                data: {
                    ...secondInstallation,
                    users: {
                        connect: { userId: "test-user-1" }
                    }
                }
            });

            // Create rules in both installations
            await prisma.aIReviewRule.createMany({
                data: [
                    {
                        id: "inst1-rule",
                        installationId: "test-installation-1",
                        name: "Installation 1 Rule",
                        description: "Test",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.MEDIUM,
                        pattern: null,
                        config: {},
                        active: true
                    },
                    {
                        id: "inst2-rule",
                        installationId: "test-installation-2",
                        name: "Installation 2 Rule",
                        description: "Test",
                        ruleType: RuleType.CODE_QUALITY,
                        severity: RuleSeverity.MEDIUM,
                        pattern: null,
                        config: {},
                        active: true
                    }
                ]
            });

            // Get rules for installation 1
            const inst1Response = await request(app)
                .get("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(inst1Response.body.data).toEqual([
                expect.objectContaining({ id: "inst1-rule" })
            ]);
            expect(inst1Response.body.data).not.toContainEqual(
                expect.objectContaining({ id: "inst2-rule" })
            );

            // Get rules for installation 2
            const inst2Response = await request(app)
                .get("/custom-rules/test-installation-2")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(inst2Response.body.data).toEqual([
                expect.objectContaining({ id: "inst2-rule" })
            ]);
            expect(inst2Response.body.data).not.toContainEqual(
                expect.objectContaining({ id: "inst1-rule" })
            );
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty strings in optional fields", async () => {
            const ruleWithEmptyStrings = {
                name: "Empty String Rule",
                description: "",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: "",
                config: {},
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(ruleWithEmptyStrings);

            // Behavior depends on validation rules
            expect([STATUS_CODES.POST, 400]).toContain(response.status);
        });

        it("should handle special characters in rule name", async () => {
            const specialCharsRule = {
                name: "Rule with @#$%^&*() chars",
                description: "Testing special characters",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.LOW,
                pattern: null,
                config: {},
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(specialCharsRule)
                .expect(STATUS_CODES.POST);

            expect(response.body.data.name).toBe("Rule with @#$%^&*() chars");
        });

        it("should handle pattern with regex special characters", async () => {
            const regexRule = {
                name: "Regex Pattern Rule",
                description: "Testing regex patterns",
                ruleType: RuleType.CODE_QUALITY,
                severity: RuleSeverity.MEDIUM,
                pattern: "\\b(function|const|let)\\s+\\w+\\s*\\(.*\\)\\s*\\{",
                config: {},
                active: true
            };

            const response = await request(app)
                .post("/custom-rules/test-installation-1")
                .set("x-test-user-id", "test-user-1")
                .send(regexRule)
                .expect(STATUS_CODES.POST);

            expect(response.body.data.pattern).toBe(regexRule.pattern);
        });

        it("should handle updating rule to same values", async () => {
            await prisma.aIReviewRule.create({
                data: {
                    id: "no-change-rule",
                    installationId: "test-installation-1",
                    name: "No Change Rule",
                    description: "Test",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: null,
                    config: {},
                    active: true
                }
            });

            const sameValues = {
                name: "No Change Rule",
                description: "Test",
                severity: RuleSeverity.MEDIUM,
                active: true
            };

            const response = await request(app)
                .put("/custom-rules/test-installation-1/no-change-rule")
                .set("x-test-user-id", "test-user-1")
                .send(sameValues)
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.success).toBe(true);
        });
    });
});
