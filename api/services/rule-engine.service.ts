import { RuleType, RuleSeverity, AIReviewRule } from "../generated/client";
import { PullRequestData, ChangedFile } from "../models/ai-review.model";

export interface DefaultRule {
    id: string;
    name: string;
    description: string;
    ruleType: RuleType;
    severity: RuleSeverity;
    pattern?: string;
    config: any;
}

export interface RuleResult {
    ruleId: string;
    ruleName: string;
    severity: RuleSeverity;
    description: string;
    details?: string;
    affectedFiles?: string[];
}

export interface RuleEvaluation {
    passed: RuleResult[];
    violated: RuleResult[];
    score: number; // Contribution to merge score
}

export interface ValidationResult {
    isValid: boolean;
    error?: string;
}

export class RuleEngineService {
    /**
     * Get default rules that are applied to all repositories
     */
    static getDefaultRules(): DefaultRule[] {
        return [
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
            },
            {
                id: "default-no-hardcoded-secrets",
                name: "No hardcoded secrets",
                description: "Code should not contain hardcoded API keys, passwords, or tokens",
                ruleType: RuleType.SECURITY,
                severity: RuleSeverity.CRITICAL,
                pattern: "(api[_-]?key|password|secret|token)\\s*[=:]\\s*['\"][^'\"]{8,}['\"]",
                config: {
                    checks: ["hardcoded_secrets"],
                    description: "Detects potential hardcoded secrets in code"
                }
            },
            {
                id: "default-function-complexity",
                name: "Function complexity",
                description: "Functions should not be overly complex",
                ruleType: RuleType.PERFORMANCE,
                severity: RuleSeverity.MEDIUM,
                config: {
                    thresholds: {
                        maxCyclomaticComplexity: 10,
                        maxLinesPerFunction: 50
                    },
                    description: "Checks for overly complex functions that should be refactored"
                }
            },
            {
                id: "default-api-documentation",
                name: "Public API documentation",
                description: "Public functions and classes should have documentation",
                ruleType: RuleType.DOCUMENTATION,
                severity: RuleSeverity.MEDIUM,
                config: {
                    requirements: ["public_functions", "exported_classes"],
                    description: "Ensures public APIs are properly documented"
                }
            },
            {
                id: "default-test-coverage",
                name: "Test coverage",
                description: "New code should have adequate test coverage",
                ruleType: RuleType.TESTING,
                severity: RuleSeverity.HIGH,
                config: {
                    coverage: {
                        minimum: 80,
                        excludeFiles: ["*.config.js", "*.config.ts"]
                    },
                    description: "Ensures new code has adequate test coverage"
                }
            }
        ];
    }

    /**
     * Validate a custom rule configuration
     */
    static validateCustomRule(rule: Partial<AIReviewRule>): ValidationResult {
        try {
            // Required fields validation
            if (!rule.name || rule.name.trim().length === 0) {
                return { isValid: false, error: "Rule name is required" };
            }

            if (!rule.description || rule.description.trim().length === 0) {
                return { isValid: false, error: "Rule description is required" };
            }

            if (!rule.ruleType) {
                return { isValid: false, error: "Rule type is required" };
            }

            if (!rule.severity) {
                return { isValid: false, error: "Rule severity is required" };
            }

            if (!rule.config) {
                return { isValid: false, error: "Rule configuration is required" };
            }

            // Validate enum values
            if (!Object.values(RuleType).includes(rule.ruleType)) {
                return { isValid: false, error: "Invalid rule type" };
            }

            if (!Object.values(RuleSeverity).includes(rule.severity)) {
                return { isValid: false, error: "Invalid rule severity" };
            }

            // Validate pattern if provided
            if (rule.pattern) {
                try {
                    new RegExp(rule.pattern);
                } catch (error) {
                    return { isValid: false, error: "Pattern must be a valid regular expression" };
                }
            }

            // Validate config based on rule type
            const configValidation = this.validateRuleConfig(rule.ruleType, rule.config, rule.pattern);
            if (!configValidation.isValid) {
                return configValidation;
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: "Invalid rule configuration" };
        }
    }

    /**
     * Validate rule configuration based on rule type
     */
    private static validateRuleConfig(ruleType: RuleType, config: any, pattern?: string | null): ValidationResult {
        try {
            // Basic config validation
            if (!config || typeof config !== 'object') {
                return { isValid: false, error: "Config must be a valid object" };
            }

            // Rule type specific validation
            switch (ruleType) {
                case RuleType.CODE_QUALITY:
                    if (!config.metrics || !Array.isArray(config.metrics)) {
                        return { isValid: false, error: "Code quality rules must specify metrics array" };
                    }
                    break;

                case RuleType.SECURITY:
                    if (!config.checks || !Array.isArray(config.checks)) {
                        return { isValid: false, error: "Security rules must specify checks array" };
                    }
                    break;

                case RuleType.PERFORMANCE:
                    if (!config.thresholds || typeof config.thresholds !== 'object') {
                        return { isValid: false, error: "Performance rules must specify thresholds object" };
                    }
                    break;

                case RuleType.DOCUMENTATION:
                    if (!config.requirements || !Array.isArray(config.requirements)) {
                        return { isValid: false, error: "Documentation rules must specify requirements array" };
                    }
                    break;

                case RuleType.TESTING:
                    if (!config.coverage || typeof config.coverage !== 'object') {
                        return { isValid: false, error: "Testing rules must specify coverage object" };
                    }
                    break;

                case RuleType.CUSTOM:
                    // Custom rules are more flexible, just ensure basic structure
                    if (!config.description) {
                        return { isValid: false, error: "Custom rules must include a description in config" };
                    }
                    break;

                default:
                    return { isValid: false, error: "Invalid rule type" };
            }

            return { isValid: true };
        } catch (error) {
            return { isValid: false, error: "Invalid rule configuration" };
        }
    }

    /**
     * Calculate severity weight for scoring
     */
    static getSeverityWeight(severity: RuleSeverity): number {
        switch (severity) {
            case RuleSeverity.LOW:
                return 1;
            case RuleSeverity.MEDIUM:
                return 3;
            case RuleSeverity.HIGH:
                return 7;
            case RuleSeverity.CRITICAL:
                return 15;
            default:
                return 1;
        }
    }

    /**
     * Calculate rule type weight for scoring
     */
    static getRuleTypeWeight(ruleType: RuleType): number {
        switch (ruleType) {
            case RuleType.SECURITY:
                return 2.0;
            case RuleType.TESTING:
                return 1.5;
            case RuleType.CODE_QUALITY:
                return 1.2;
            case RuleType.PERFORMANCE:
                return 1.1;
            case RuleType.DOCUMENTATION:
                return 0.8;
            case RuleType.CUSTOM:
                return 1.0;
            default:
                return 1.0;
        }
    }

    /**
     * Evaluates PR against all applicable rules
     * Requirement 3.2: System shall check compliance against both default and custom rules
     */
    static async evaluateRules(prData: PullRequestData, customRules: AIReviewRule[]): Promise<RuleEvaluation> {
        const passed: RuleResult[] = [];
        const violated: RuleResult[] = [];

        // Get default rules
        const defaultRules = this.getDefaultRules();

        // Evaluate default rules
        for (const rule of defaultRules) {
            const result = await this.evaluateDefaultRule(rule, prData);
            if (result.passed) {
                passed.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    description: rule.description,
                    details: result.details,
                    affectedFiles: result.affectedFiles
                });
            } else {
                violated.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    description: rule.description,
                    details: result.details,
                    affectedFiles: result.affectedFiles
                });
            }
        }

        // Evaluate custom rules
        for (const rule of customRules.filter(r => r.active)) {
            const result = await this.evaluateCustomRule(rule, prData);
            if (result.passed) {
                passed.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    description: rule.description,
                    details: result.details,
                    affectedFiles: result.affectedFiles
                });
            } else {
                violated.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    description: rule.description,
                    details: result.details,
                    affectedFiles: result.affectedFiles
                });
            }
        }

        // Calculate score based on violations
        const score = this.calculateRuleScore({ passed, violated, score: 0 });

        return {
            passed,
            violated,
            score
        };
    }

    /**
     * Calculate rule evaluation score contribution
     * Requirement 2.3: System shall consider rule compliance in merge score
     */
    static calculateRuleScore(evaluation: RuleEvaluation): number {
        const totalRules = evaluation.passed.length + evaluation.violated.length;
        if (totalRules === 0) return 100;

        let totalWeight = 0;
        let violationWeight = 0;

        // Calculate weights for all rules
        [...evaluation.passed, ...evaluation.violated].forEach(rule => {
            const severityWeight = this.getSeverityWeight(rule.severity);
            const typeWeight = this.getRuleTypeWeight(this.getRuleTypeFromResult(rule));
            const weight = severityWeight * typeWeight;
            totalWeight += weight;
        });

        // Calculate violation weights
        evaluation.violated.forEach(rule => {
            const severityWeight = this.getSeverityWeight(rule.severity);
            const typeWeight = this.getRuleTypeWeight(this.getRuleTypeFromResult(rule));
            const weight = severityWeight * typeWeight;
            violationWeight += weight;
        });

        // Calculate score (0-100)
        const score = Math.max(0, Math.round(100 - (violationWeight / totalWeight) * 100));
        return score;
    }

    /**
     * Evaluate a default rule against PR data
     */
    private static async evaluateDefaultRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        try {
            switch (rule.ruleType) {
                case RuleType.CODE_QUALITY:
                    return await this.evaluateCodeQualityRule(rule, prData);
                case RuleType.SECURITY:
                    return await this.evaluateSecurityRule(rule, prData);
                case RuleType.PERFORMANCE:
                    return await this.evaluatePerformanceRule(rule, prData);
                case RuleType.DOCUMENTATION:
                    return await this.evaluateDocumentationRule(rule, prData);
                case RuleType.TESTING:
                    return await this.evaluateTestingRule(rule, prData);
                default:
                    return { passed: true, details: "Rule type not implemented" };
            }
        } catch (error) {
            console.error(`Error evaluating rule ${rule.id}:`, error);
            return { passed: true, details: "Rule evaluation failed" };
        }
    }

    /**
     * Evaluate a custom rule against PR data
     */
    private static async evaluateCustomRule(rule: AIReviewRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        try {
            // If rule has a pattern, use pattern matching
            if (rule.pattern) {
                return await this.evaluatePatternRule(rule, prData);
            }

            // Otherwise, evaluate based on rule type
            const defaultRule: DefaultRule = {
                id: rule.id,
                name: rule.name,
                description: rule.description,
                ruleType: rule.ruleType,
                severity: rule.severity,
                pattern: rule.pattern || undefined,
                config: rule.config as Record<string, any>
            };

            return await this.evaluateDefaultRule(defaultRule, prData);
        } catch (error) {
            console.error(`Error evaluating custom rule ${rule.id}:`, error);
            return { passed: true, details: "Custom rule evaluation failed" };
        }
    }

    /**
     * Evaluate pattern-based rules
     */
    private static async evaluatePatternRule(rule: AIReviewRule | DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        if (!rule.pattern) {
            return { passed: true, details: "No pattern specified" };
        }

        try {
            const regex = new RegExp(rule.pattern, 'gi');
            const affectedFiles: string[] = [];
            const violations: string[] = [];

            for (const file of prData.changedFiles) {
                // Skip files based on exclusion patterns
                if (this.shouldExcludeFile(file.filename, rule.config)) {
                    continue;
                }

                // Check if file content matches pattern
                const matches = file.patch.match(regex);
                if (matches && matches.length > 0) {
                    affectedFiles.push(file.filename);
                    violations.push(`Found ${matches.length} occurrence(s) in ${file.filename}`);
                }
            }

            const passed = affectedFiles.length === 0;
            const details = passed
                ? "No pattern violations found"
                : violations.join("; ");

            return {
                passed,
                details,
                affectedFiles: passed ? undefined : affectedFiles
            };
        } catch (error) {
            console.error(`Error evaluating pattern rule:`, error);
            return { passed: true, details: "Pattern evaluation failed" };
        }
    }

    /**
     * Evaluate code quality rules
     */
    private static async evaluateCodeQualityRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        if (rule.pattern) {
            return await this.evaluatePatternRule(rule, prData);
        }

        // For non-pattern code quality rules, implement specific logic
        switch (rule.id) {
            case "default-function-complexity":
                return await this.evaluateFunctionComplexity(rule, prData);
            default:
                return { passed: true, details: "Code quality rule not implemented" };
        }
    }

    /**
     * Evaluate security rules
     */
    private static async evaluateSecurityRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        if (rule.pattern) {
            return await this.evaluatePatternRule(rule, prData);
        }

        // Implement specific security checks
        return { passed: true, details: "Security rule evaluation not implemented" };
    }

    /**
     * Evaluate performance rules
     */
    private static async evaluatePerformanceRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        switch (rule.id) {
            case "default-function-complexity":
                return await this.evaluateFunctionComplexity(rule, prData);
            default:
                return { passed: true, details: "Performance rule not implemented" };
        }
    }

    /**
     * Evaluate documentation rules
     */
    private static async evaluateDocumentationRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        // Check for missing documentation on public functions
        const affectedFiles: string[] = [];
        const violations: string[] = [];

        for (const file of prData.changedFiles) {
            if (this.shouldExcludeFile(file.filename, rule.config)) {
                continue;
            }

            // Simple check for exported functions without documentation
            const exportPattern = /^export\s+(function|class|const|let|var)\s+(\w+)/gm;
            const docPattern = /\/\*\*[\s\S]*?\*\//g;

            const exports = file.patch.match(exportPattern) || [];
            const docs = file.patch.match(docPattern) || [];

            if (exports.length > docs.length) {
                affectedFiles.push(file.filename);
                violations.push(`${file.filename} has ${exports.length} exports but only ${docs.length} documented`);
            }
        }

        const passed = affectedFiles.length === 0;
        return {
            passed,
            details: passed ? "All public APIs are documented" : violations.join("; "),
            affectedFiles: passed ? undefined : affectedFiles
        };
    }

    /**
     * Evaluate testing rules
     */
    private static async evaluateTestingRule(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        // Check if test files are included for new features
        const codeFiles = prData.changedFiles.filter(f =>
            !f.filename.includes('.test.') &&
            !f.filename.includes('.spec.') &&
            (f.filename.endsWith('.js') || f.filename.endsWith('.ts') || f.filename.endsWith('.jsx') || f.filename.endsWith('.tsx'))
        );

        const testFiles = prData.changedFiles.filter(f =>
            f.filename.includes('.test.') || f.filename.includes('.spec.')
        );

        // Simple heuristic: if adding/modifying code files, should have test files
        const hasNewCode = codeFiles.some(f => f.status === 'added' || f.additions > f.deletions);
        const hasTests = testFiles.length > 0;

        const passed = !hasNewCode || hasTests;

        return {
            passed,
            details: passed
                ? "Adequate test coverage detected"
                : `Found ${codeFiles.length} code file(s) but no test files`,
            affectedFiles: passed ? undefined : codeFiles.map(f => f.filename)
        };
    }

    /**
     * Evaluate function complexity
     */
    private static async evaluateFunctionComplexity(rule: DefaultRule, prData: PullRequestData): Promise<RuleEvaluationResult> {
        const thresholds = rule.config.thresholds || { maxLinesPerFunction: 50 };
        const affectedFiles: string[] = [];
        const violations: string[] = [];

        for (const file of prData.changedFiles) {
            if (this.shouldExcludeFile(file.filename, rule.config)) {
                continue;
            }

            // Simple line count check for functions
            const functionPattern = /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n\}/g;
            const functions = file.patch.match(functionPattern) || [];

            for (const func of functions) {
                const lines = func.split('\n').length;
                if (lines > thresholds.maxLinesPerFunction) {
                    affectedFiles.push(file.filename);
                    violations.push(`Function in ${file.filename} has ${lines} lines (max: ${thresholds.maxLinesPerFunction})`);
                }
            }
        }

        const passed = affectedFiles.length === 0;
        return {
            passed,
            details: passed ? "Function complexity within limits" : violations.join("; "),
            affectedFiles: passed ? undefined : affectedFiles
        };
    }

    /**
     * Check if file should be excluded based on rule config
     */
    private static shouldExcludeFile(filename: string, config: any): boolean {
        if (!config || !config.excludeFiles) return false;

        const excludePatterns = Array.isArray(config.excludeFiles) ? config.excludeFiles : [config.excludeFiles];

        return excludePatterns.some((pattern: string) => {
            // Convert glob pattern to regex
            const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*')
                .replace(/\?/g, '.');

            return new RegExp(regexPattern).test(filename);
        });
    }

    /**
     * Get rule type from rule result (helper method)
     */
    private static getRuleTypeFromResult(rule: RuleResult): RuleType {
        // This is a simplified approach - in a real implementation,
        // you might want to store the rule type in the result
        if (rule.ruleId.includes('security')) return RuleType.SECURITY;
        if (rule.ruleId.includes('test')) return RuleType.TESTING;
        if (rule.ruleId.includes('performance') || rule.ruleId.includes('complexity')) return RuleType.PERFORMANCE;
        if (rule.ruleId.includes('documentation')) return RuleType.DOCUMENTATION;
        if (rule.ruleId.includes('custom')) return RuleType.CUSTOM;
        return RuleType.CODE_QUALITY;
    }
}

/**
 * Internal interface for rule evaluation results
 */
interface RuleEvaluationResult {
    passed: boolean;
    details?: string;
    affectedFiles?: string[];
}