import { Request, Response, NextFunction } from "express";
import {
    getCustomRules,
    getCustomRule,
    createCustomRule,
    updateCustomRule,
    deleteCustomRule,
    getDefaultRules
} from "../../../api/controllers/custom-rules.controller";
import { prisma } from "../../../api/config/database.config";
import { RuleEngineService } from "../../../api/services/rule-engine.service";
import { NotFoundErrorClass } from "../../../api/models/general.model";
import { RuleType, RuleSeverity } from "../../../api/generated/client";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { createMockRequest, createMockResponse, createMockNext } from "../../helpers/test-utils";

// Mock dependencies
jest.mock("../../../api/config/database.config", () => ({
    prisma: {
        installation: {
            findFirst: jest.fn()
        },
        aIReviewRule: {
            findMany: jest.fn(),
            findFirst: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn()
        }
    }
}));

jest.mock("../../../api/services/rule-engine.service");

describe("CustomRulesController", () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockPrisma = prisma as any;
    const mockRuleEngineService = RuleEngineService as jest.Mocked<typeof RuleEngineService>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe("getCustomRules", () => {
        const installationId = "test-installation-1";
        const userId = "test-user-1";

        beforeEach(() => {
            mockRequest.params = { installationId };
            mockRequest.body = { userId };
        });

        it("should return all custom rules for installation", async () => {
            const mockInstallation = { id: installationId };
            const mockRules = [
                TestDataFactory.aiReviewRule({ installationId, active: true }),
                TestDataFactory.aiReviewRule({ installationId, active: false })
            ];

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findMany.mockResolvedValue(mockRules);

            await getCustomRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.installation.findFirst).toHaveBeenCalledWith({
                where: {
                    id: installationId,
                    users: {
                        some: { userId }
                    }
                }
            });
            expect(mockPrisma.aIReviewRule.findMany).toHaveBeenCalledWith({
                where: { installationId },
                orderBy: [
                    { active: "desc" },
                    { severity: "desc" },
                    { createdAt: "desc" }
                ]
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockRules,
                count: mockRules.length
            });
        });

        it("should filter rules by active status", async () => {
            const mockInstallation = { id: installationId };
            const mockRules = [TestDataFactory.aiReviewRule({ installationId, active: true })];

            mockRequest.query = { active: "true" };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findMany.mockResolvedValue(mockRules);

            await getCustomRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.aIReviewRule.findMany).toHaveBeenCalledWith({
                where: { installationId, active: true },
                orderBy: [
                    { active: "desc" },
                    { severity: "desc" },
                    { createdAt: "desc" }
                ]
            });
        });

        it("should filter rules by type and severity", async () => {
            const mockInstallation = { id: installationId };
            const mockRules = [TestDataFactory.aiReviewRule({
                installationId,
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.HIGH
            })];

            mockRequest.query = {
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.HIGH
            };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findMany.mockResolvedValue(mockRules);

            await getCustomRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.aIReviewRule.findMany).toHaveBeenCalledWith({
                where: {
                    installationId,
                    ruleType: RuleType.SECURITY,
                    severity: RuleSeverity.HIGH
                },
                orderBy: [
                    { active: "desc" },
                    { severity: "desc" },
                    { createdAt: "desc" }
                ]
            });
        });

        it("should handle installation not found", async () => {
            mockPrisma.installation.findFirst.mockResolvedValue(null);

            await getCustomRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.any(NotFoundErrorClass)
            );
        });
    });

    describe("getCustomRule", () => {
        const installationId = "test-installation-1";
        const ruleId = "test-rule-1";
        const userId = "test-user-1";

        beforeEach(() => {
            mockRequest.params = { installationId, ruleId };
            mockRequest.body = { userId };
        });

        it("should return specific custom rule", async () => {
            const mockInstallation = { id: installationId };
            const mockRule = TestDataFactory.aiReviewRule({ id: ruleId, installationId });

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(mockRule);

            await getCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.aIReviewRule.findFirst).toHaveBeenCalledWith({
                where: { id: ruleId, installationId }
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockRule
            });
        });

        it("should handle rule not found", async () => {
            const mockInstallation = { id: installationId };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(null);

            await getCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.any(NotFoundErrorClass)
            );
        });
    });

    describe("createCustomRule", () => {
        const installationId = "test-installation-1";
        const userId = "test-user-1";

        beforeEach(() => {
            mockRequest.params = { installationId };
            mockRequest.body = { userId };
        });

        it("should create new custom rule successfully", async () => {
            const ruleData = {
                name: "Test Security Rule",
                description: "Test rule description",
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.HIGH,
                pattern: "console\\.log",
                config: { excludeFiles: ["*.test.ts"] },
                active: true
            };

            const mockInstallation = { id: installationId };
            const mockCreatedRule = TestDataFactory.aiReviewRule({
                installationId,
                ...ruleData
            });

            mockRequest.body = { ...mockRequest.body, ...ruleData };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(null); // No existing rule
            mockRuleEngineService.validateCustomRule.mockReturnValue({
                isValid: true,
                error: undefined
            });
            mockPrisma.aIReviewRule.create.mockResolvedValue(mockCreatedRule);

            await createCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRuleEngineService.validateCustomRule).toHaveBeenCalledWith(ruleData);
            expect(mockPrisma.aIReviewRule.create).toHaveBeenCalledWith({
                data: {
                    installationId,
                    name: ruleData.name,
                    description: ruleData.description,
                    ruleType: ruleData.ruleType,
                    severity: ruleData.severity,
                    pattern: ruleData.pattern,
                    config: ruleData.config,
                    active: ruleData.active
                }
            });
            expect(mockResponse.status).toHaveBeenCalledWith(201);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockCreatedRule,
                message: "Custom rule created successfully"
            });
        });

        it("should handle duplicate rule name", async () => {
            const ruleData = {
                name: "Existing Rule",
                description: "Test rule description",
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.HIGH
            };

            const mockInstallation = { id: installationId };
            const existingRule = TestDataFactory.aiReviewRule({
                installationId,
                name: ruleData.name
            });

            mockRequest.body = { ...mockRequest.body, ...ruleData };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(existingRule);

            await createCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "A rule with this name already exists for this installation"
                })
            );
        });

        it("should handle validation errors", async () => {
            const ruleData = {
                name: "Invalid Rule",
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.HIGH
            };

            const mockInstallation = { id: installationId };
            mockRequest.body = { ...mockRequest.body, ...ruleData };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(null);
            mockRuleEngineService.validateCustomRule.mockReturnValue({
                isValid: false,
                error: "Pattern is required for security rules"
            });

            await createCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Pattern is required for security rules"
                })
            );
        });
    });

    describe("updateCustomRule", () => {
        const installationId = "test-installation-1";
        const ruleId = "test-rule-1";
        const userId = "test-user-1";

        beforeEach(() => {
            mockRequest.params = { installationId, ruleId };
            mockRequest.body = { userId };
        });

        it("should update custom rule successfully", async () => {
            const updateData = {
                name: "Updated Rule Name",
                description: "Updated description",
                active: false
            };

            const mockInstallation = { id: installationId };
            const existingRule = TestDataFactory.aiReviewRule({
                id: ruleId,
                installationId,
                name: "Original Name"
            });
            const updatedRule = { ...existingRule, ...updateData };

            mockRequest.body = { ...mockRequest.body, ...updateData };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst
                .mockResolvedValueOnce(existingRule) // First call for existence check
                .mockResolvedValueOnce(null); // Second call for name conflict check
            mockRuleEngineService.validateCustomRule.mockReturnValue({
                isValid: true,
                error: undefined
            });
            mockPrisma.aIReviewRule.update.mockResolvedValue(updatedRule);

            await updateCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.aIReviewRule.update).toHaveBeenCalledWith({
                where: { id: ruleId },
                data: updateData
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: updatedRule,
                message: "Custom rule updated successfully"
            });
        });

        it("should handle rule not found", async () => {
            const mockInstallation = { id: installationId };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(null);

            await updateCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.any(NotFoundErrorClass)
            );
        });

        it("should handle name conflicts", async () => {
            const updateData = { name: "Conflicting Name" };
            const mockInstallation = { id: installationId };
            const existingRule = TestDataFactory.aiReviewRule({
                id: ruleId,
                installationId,
                name: "Original Name"
            });
            const conflictingRule = TestDataFactory.aiReviewRule({
                id: "other-rule",
                installationId,
                name: "Conflicting Name"
            });

            mockRequest.body = { ...mockRequest.body, ...updateData };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst
                .mockResolvedValueOnce(existingRule) // First call for existence check
                .mockResolvedValueOnce(conflictingRule); // Second call for name conflict check

            await updateCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "A rule with this name already exists for this installation"
                })
            );
        });
    });

    describe("deleteCustomRule", () => {
        const installationId = "test-installation-1";
        const ruleId = "test-rule-1";
        const userId = "test-user-1";

        beforeEach(() => {
            mockRequest.params = { installationId, ruleId };
            mockRequest.body = { userId };
        });

        it("should delete custom rule successfully", async () => {
            const mockInstallation = { id: installationId };
            const existingRule = TestDataFactory.aiReviewRule({
                id: ruleId,
                installationId
            });

            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(existingRule);
            mockPrisma.aIReviewRule.delete.mockResolvedValue(existingRule);

            await deleteCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockPrisma.aIReviewRule.delete).toHaveBeenCalledWith({
                where: { id: ruleId }
            });
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                message: "Custom rule deleted successfully"
            });
        });

        it("should handle rule not found", async () => {
            const mockInstallation = { id: installationId };
            mockPrisma.installation.findFirst.mockResolvedValue(mockInstallation);
            mockPrisma.aIReviewRule.findFirst.mockResolvedValue(null);

            await deleteCustomRule(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(
                expect.any(NotFoundErrorClass)
            );
        });
    });

    describe("getDefaultRules", () => {
        it("should return default rules", async () => {
            const mockDefaultRules = [
                {
                    id: "default-no-console-log",
                    name: "No console.log statements",
                    description: "Code should not contain console.log statements in production",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.MEDIUM,
                    pattern: "console\\.log\\s*\\(",
                    config: {
                        metrics: ["code_cleanliness"],
                        excludeFiles: ["*.test.js", "*.test.ts", "*.spec.js", "*.spec.ts"],
                        description: "Detects console.log statements that should be removed before production"
                    }
                },
                {
                    id: "default-no-todo-comments",
                    name: "No TODO comments",
                    description: "TODO comments should be resolved before merging",
                    ruleType: RuleType.CODE_QUALITY,
                    severity: RuleSeverity.LOW,
                    pattern: "//\\s*TODO|#\\s*TODO",
                    config: {
                        metrics: ["code_completeness"],
                        description: "Detects TODO comments that indicate incomplete work"
                    }
                }
            ];

            mockRuleEngineService.getDefaultRules.mockReturnValue(mockDefaultRules);

            await getDefaultRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockRuleEngineService.getDefaultRules).toHaveBeenCalled();
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: true,
                data: mockDefaultRules,
                count: mockDefaultRules.length
            });
        });

        it("should handle service errors", async () => {
            const error = new Error("Service unavailable");
            mockRuleEngineService.getDefaultRules.mockImplementation(() => {
                throw error;
            });

            await getDefaultRules(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });
});
