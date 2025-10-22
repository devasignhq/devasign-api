import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/database.config";
import { RuleType, RuleSeverity, Prisma } from "../../prisma_client";
import { RuleEngineService } from "../services/ai-review/rule-engine.service";
import { NotFoundError, ValidationError } from "../models/error.model";
import { STATUS_CODES } from "../helper";

/** 
 * Get all custom rules for an installation 
 */ 
export const getCustomRules = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { active, ruleType, severity } = req.query;

    try {
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

        // Fetch rules with sorting
        const rules = await prisma.aIReviewRule.findMany({
            where,
            orderBy: [
                { active: "desc" },
                { severity: "desc" },
                { createdAt: "desc" }
            ]
        });

        // Return success response
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: rules,
            count: rules.length
        });
    } catch (error) {
        next(error);
    }
};

/** 
 * Get a specific custom rule
 */ 
export const getCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;

    try {
        // Fetch the rule and verify it belongs to the installation
        const rule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!rule) {
            throw new NotFoundError("Custom rule not found");
        }

        // Return success response
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: rule
        });
    } catch (error) {
        next(error);
    }
};

/** 
 * Create a new custom rule
 */ 
export const createCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const { name, description, ruleType, severity, pattern, config, active = true } = req.body;

    try {
        // Check if rule name already exists for this installation
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                installationId,
                name
            }
        });

        if (existingRule) {
            throw new ValidationError("A rule with this name already exists for this installation");
        }

        // Validate rule configuration based on type
        const validationResult = RuleEngineService.validateCustomRule({
            name, description, ruleType, severity, pattern, config, active
        });
        if (!validationResult.isValid) {
            throw new ValidationError(validationResult.error || "");
        }

        // Create the rule
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

        // Return success response
        res.status(STATUS_CODES.POST).json({
            success: true,
            data: rule,
            message: "Custom rule created successfully"
        });
    } catch (error) {
        next(error);
    }
};

/** 
 * Update an existing custom rule
 */
export const updateCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;
    const { name, description, ruleType, severity, pattern, config, active } = req.body;

    try {
        // Check if rule exists
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!existingRule) {
            throw new NotFoundError("Custom rule not found");
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
                throw new ValidationError("A rule with this name already exists for this installation");
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
                throw new ValidationError(validationResult.error || "");
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

        // Update the rule
        const updatedRule = await prisma.aIReviewRule.update({
            where: { id: ruleId },
            data: updateData
        });

        // Return success response
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: updatedRule,
            message: "Custom rule updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

/** 
 * Delete a custom rule
 */
export const deleteCustomRule = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, ruleId } = req.params;

    try {
        // Check if rule exists
        const existingRule = await prisma.aIReviewRule.findFirst({
            where: {
                id: ruleId,
                installationId
            }
        });

        if (!existingRule) {
            throw new NotFoundError("Custom rule not found");
        }

        // Delete the rule
        await prisma.aIReviewRule.delete({
            where: { id: ruleId }
        });

        // Return success response
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            message: "Custom rule deleted successfully"
        });
    } catch (error) {
        next(error);
    }
};

/** 
 * Get default rules (available to all installations)
 */
export const getDefaultRules = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const defaultRules = RuleEngineService.getDefaultRules();

        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: defaultRules,
            count: defaultRules.length
        });
    } catch (error) {
        next(error);
    }
};
