import { RequestHandler, Router } from "express";
import {
    getCustomRules,
    getCustomRule,
    createCustomRule,
    updateCustomRule,
    deleteCustomRule,
    getDefaultRules
} from "../controllers/custom-rules.controller";
import {
    getCustomRulesValidator,
    getCustomRuleValidator,
    createCustomRuleValidator,
    updateCustomRuleValidator,
    deleteCustomRuleValidator
} from "../validators/custom-rules.validator";

export const customRulesRoutes = Router();

// Get all custom rules for an installation
customRulesRoutes.get('/:installationId', getCustomRulesValidator, getCustomRules as RequestHandler);

// Get a specific custom rule
customRulesRoutes.get('/:installationId/:ruleId', getCustomRuleValidator, getCustomRule as RequestHandler);

// Create a new custom rule
customRulesRoutes.post('/:installationId', createCustomRuleValidator, createCustomRule as RequestHandler);

// Update an existing custom rule
customRulesRoutes.put('/:installationId/:ruleId', updateCustomRuleValidator, updateCustomRule as RequestHandler);

// Delete a custom rule
customRulesRoutes.delete('/:installationId/:ruleId', deleteCustomRuleValidator, deleteCustomRule as RequestHandler);

// Get default rules (no installation ID needed)
customRulesRoutes.get('/default', getDefaultRules as RequestHandler);