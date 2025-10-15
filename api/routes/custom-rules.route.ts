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
import { validateUserInstallation } from "../middlewares/auth.middleware";

export const customRulesRoutes = Router();

// Get all custom rules for an installation
customRulesRoutes.get(
    "/:installationId", 
    getCustomRulesValidator, 
    validateUserInstallation as RequestHandler,
    getCustomRules as RequestHandler
);

// Get a specific custom rule
customRulesRoutes.get(
    "/:installationId/:ruleId", 
    getCustomRuleValidator, 
    validateUserInstallation as RequestHandler,
    getCustomRule as RequestHandler
);

// Create a new custom rule
customRulesRoutes.post(
    "/:installationId", 
    createCustomRuleValidator, 
    validateUserInstallation as RequestHandler,
    createCustomRule as RequestHandler
);

// Update an existing custom rule
customRulesRoutes.put(
    "/:installationId/:ruleId", 
    updateCustomRuleValidator, 
    validateUserInstallation as RequestHandler,
    updateCustomRule as RequestHandler
);

// Delete a custom rule
customRulesRoutes.delete(
    "/:installationId/:ruleId", 
    deleteCustomRuleValidator, 
    validateUserInstallation as RequestHandler,
    deleteCustomRule as RequestHandler
);

// Get default rules (no installation ID needed)
customRulesRoutes.get("/default", getDefaultRules as RequestHandler);
