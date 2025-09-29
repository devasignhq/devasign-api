import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { ErrorClass, NotFoundErrorClass } from "../models/general.model";
import { RuleType, RuleSeverity, Prisma } from "../generated/client";
import { RuleEngineService } from "../services/rule-engine.service";

// Get all custom rules for an installation
export const getCustomRules = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { active, ruleType, severity } = req.query;
    const { userId } = req.body;

    try {
        // Verify user has access to this installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found or access denied");
        }

        // Build where clause based on filters
        const where: Prisma.AIReviewRuleWhereInput = {
            installationId
        };

        if (active !== undefined) {
            where.active = active === "true";
        }

        if (ruleType) {
            where.ruleType = ruleType as RuleType;
        }

        if (severity) {
            where.severity = severity as RuleSeverity;
        }

        const rules = await prisma.aIReviewRule.findMany({
            where,
            orderBy: [
                { active: "desc" },
                { severity: "desc" },
                { createdAt: "desc" }
            ]
        });

        res.status(200).json({
            success: true,
            data: rules,
            count: rules.length
        });
    } catch (error) {
        next(error);
    }
};

// Get a specific custom rule
export const getCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;
    const { userId } = req.body;

    try {
        // Verify user has access to this installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found or access denied");
        }

        const rule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!rule) {
            throw new NotFoundErrorClass("Custom rule not found");
        }

        res.status(200).json({
            success: true,
            data: rule
        });
    } catch (error) {
        next(error);
    }
};

// Create a new custom rule
export const createCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { name, description, ruleType, severity, pattern, config, active = true } = req.body;
    const { userId } = req.body;

    try {
        // Verify user has access to this installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found or access denied");
        }

        // Check if rule name already exists for this installation
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                installationId,
                name
            }
        });

        if (existingRule) {
            throw new ErrorClass("ValidationError", null, "A rule with this name already exists for this installation");
        }

        // Validate rule configuration based on type
        const validationResult = RuleEngineService.validateCustomRule({
            name, description, ruleType, severity, pattern, config, active
        });
        if (!validationResult.isValid) {
            throw new ErrorClass("ValidationError", null, validationResult.error || "");
        }

        const rule = await prisma.aIReviewRule.create({
            data: {
                installationId,
                name,
                description,
                ruleType: ruleType as RuleType,
                severity: severity as RuleSeverity,
                pattern,
                config,
                active
            }
        });

        res.status(201).json({
            success: true,
            data: rule,
            message: "Custom rule created successfully"
        });
    } catch (error) {
        next(error);
    }
};

// Update an existing custom rule
export const updateCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;
    const { name, description, ruleType, severity, pattern, config, active } = req.body;
    const { userId } = req.body;

    try {
        // Verify user has access to this installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found or access denied");
        }

        // Check if rule exists
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!existingRule) {
            throw new NotFoundErrorClass("Custom rule not found");
        }

        // Check if new name conflicts with existing rules (excluding current rule)
        if (name && name !== existingRule.name) {
            const nameConflict = await prisma.aIReviewRule.findFirst({
                where: {
                    installationId,
                    name,
                    id: { not: ruleId }
                }
            });

            if (nameConflict) {
                throw new ErrorClass("ValidationError", null, "A rule with this name already exists for this installation");
            }
        }

        // Validate rule configuration if provided
        if (ruleType || config || pattern || name || description || severity) {
            const finalRule = {
                name: name || existingRule.name,
                description: description || existingRule.description,
                ruleType: ruleType || existingRule.ruleType,
                severity: severity || existingRule.severity,
                pattern: pattern !== undefined ? pattern : existingRule.pattern,
                config: config || existingRule.config,
                active: active !== undefined ? active : existingRule.active
            };

            const validationResult = RuleEngineService.validateCustomRule(finalRule);
            if (!validationResult.isValid) {
                throw new ErrorClass("ValidationError", null, validationResult.error || "");
            }
        }

        // Build update data
        const updateData: Prisma.AIReviewRuleUpdateInput = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (ruleType !== undefined) updateData.ruleType = ruleType as RuleType;
        if (severity !== undefined) updateData.severity = severity as RuleSeverity;
        if (pattern !== undefined) updateData.pattern = pattern;
        if (config !== undefined) updateData.config = config;
        if (active !== undefined) updateData.active = active;

        const updatedRule = await prisma.aIReviewRule.update({
            where: { id: ruleId },
            data: updateData
        });

        res.status(200).json({
            success: true,
            data: updatedRule,
            message: "Custom rule updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

// Delete a custom rule
export const deleteCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;
    const { userId } = req.body;

    try {
        // Verify user has access to this installation
        const installation = await prisma.installation.findFirst({
            where: {
                id: installationId,
                users: {
                    some: { userId: userId as string }
                }
            }
        });

        if (!installation) {
            throw new NotFoundErrorClass("Installation not found or access denied");
        }

        // Check if rule exists
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!existingRule) {
            throw new NotFoundErrorClass("Custom rule not found");
        }

        await prisma.aIReviewRule.delete({
            where: { id: ruleId }
        });

        res.status(200).json({
            success: true,
            message: "Custom rule deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};


// Get default rules (available to all installations)
export const getDefaultRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const defaultRules = RuleEngineService.getDefaultRules();

        res.status(200).json({
            success: true,
            data: defaultRules,
            count: defaultRules.length
        });
    } catch (error) {
        next(error);
    }
};
