import { body, param, query } from "express-validator";
import { RuleType, RuleSeverity } from "../../prisma_client";

export const getPRReviewRulesValidator = [
    param("installationId")
        .exists()
        .withMessage("Installation ID is required")
        .isString()
        .withMessage("Installation ID must be a string"),
    query("active")
        .optional()
        .isBoolean()
        .withMessage("Active must be a boolean"),
    query("ruleType")
        .optional()
        .isIn(Object.values(RuleType))
        .withMessage(`Rule type must be one of: ${Object.values(RuleType).join(", ")}`),
    query("severity")
        .optional()
        .isIn(Object.values(RuleSeverity))
        .withMessage(`Severity must be one of: ${Object.values(RuleSeverity).join(", ")}`)
];

export const createPRReviewRuleValidator = [
    param("installationId")
        .exists()
        .withMessage("Installation ID is required")
        .isString()
        .withMessage("Installation ID must be a string"),
    body("name")
        .exists()
        .withMessage("Rule name is required")
        .isString()
        .withMessage("Rule name must be a string")
        .isLength({ min: 1, max: 100 })
        .withMessage("Rule name must be between 1 and 100 characters"),
    body("description")
        .exists()
        .withMessage("Rule description is required")
        .isString()
        .withMessage("Rule description must be a string")
        .isLength({ min: 1, max: 500 })
        .withMessage("Rule description must be between 1 and 500 characters"),
    body("ruleType")
        .exists()
        .withMessage("Rule type is required")
        .isIn(Object.values(RuleType))
        .withMessage(`Rule type must be one of: ${Object.values(RuleType).join(", ")}`),
    body("severity")
        .exists()
        .withMessage("Rule severity is required")
        .isIn(Object.values(RuleSeverity))
        .withMessage(`Severity must be one of: ${Object.values(RuleSeverity).join(", ")}`),
    body("pattern")
        .optional()
        .isString()
        .withMessage("Pattern must be a string")
        .custom((value) => {
            if (value) {
                try {
                    new RegExp(value);
                    return true;
                } catch {
                    throw new Error("Pattern must be a valid regular expression");
                }
            }
            return true;
        }),
    body("config")
        .exists()
        .withMessage("Rule configuration is required")
        .isObject()
        .withMessage("Rule configuration must be an object")
        .custom((value) => {
            // Basic validation for config object
            if (typeof value !== "object" || value === null) {
                throw new Error("Config must be a valid object");
            }
            return true;
        }),
    body("active")
        .optional()
        .isBoolean()
        .withMessage("Active must be a boolean")
];

export const updatePRReviewRuleValidator = [
    param("installationId")
        .exists()
        .withMessage("Installation ID is required")
        .isString()
        .withMessage("Installation ID must be a string"),
    param("ruleId")
        .exists()
        .withMessage("Rule ID is required")
        .isString()
        .withMessage("Rule ID must be a string"),
    body("name")
        .optional()
        .isString()
        .withMessage("Rule name must be a string")
        .isLength({ min: 1, max: 100 })
        .withMessage("Rule name must be between 1 and 100 characters"),
    body("description")
        .optional()
        .isString()
        .withMessage("Rule description must be a string")
        .isLength({ min: 1, max: 500 })
        .withMessage("Rule description must be between 1 and 500 characters"),
    body("ruleType")
        .optional()
        .isIn(Object.values(RuleType))
        .withMessage(`Rule type must be one of: ${Object.values(RuleType).join(", ")}`),
    body("severity")
        .optional()
        .isIn(Object.values(RuleSeverity))
        .withMessage(`Severity must be one of: ${Object.values(RuleSeverity).join(", ")}`),
    body("pattern")
        .optional()
        .isString()
        .withMessage("Pattern must be a string")
        .custom((value) => {
            if (value) {
                try {
                    new RegExp(value);
                    return true;
                } catch {
                    throw new Error("Pattern must be a valid regular expression");
                }
            }
            return true;
        }),
    body("config")
        .optional()
        .isObject()
        .withMessage("Rule configuration must be an object")
        .custom((value) => {
            if (value && (typeof value !== "object" || value === null)) {
                throw new Error("Config must be a valid object");
            }
            return true;
        }),
    body("active")
        .optional()
        .isBoolean()
        .withMessage("Active must be a boolean")
];

export const deletePRReviewRuleValidator = [
    param("installationId")
        .exists()
        .withMessage("Installation ID is required")
        .isString()
        .withMessage("Installation ID must be a string"),
    param("ruleId")
        .exists()
        .withMessage("Rule ID is required")
        .isString()
        .withMessage("Rule ID must be a string")
];

export const getPRReviewRuleValidator = [
    param("installationId")
        .exists()
        .withMessage("Installation ID is required")
        .isString()
        .withMessage("Installation ID must be a string"),
    param("ruleId")
        .exists()
        .withMessage("Rule ID is required")
        .isString()
        .withMessage("Rule ID must be a string")
];
