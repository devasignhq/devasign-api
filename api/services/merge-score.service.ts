import {
    CodeAnalysis,
    RuleEvaluation,
    QualityMetrics,
    ComplexityMetrics,
    TestCoverageMetrics
} from "../models/ai-review.model";
import { RuleSeverity } from "../generated/client";

/**
 * Merge Score Calculation System
 * Implements scoring algorithm that combines rule compliance and AI analysis
 */
export class MergeScoreService {
    // Scoring weights for different quality factors
    private static readonly SCORING_WEIGHTS = {
        ruleCompliance: 0.35,      // 35% - Rule violations and compliance
        codeQuality: 0.25,         // 25% - AI-analyzed code quality metrics
        testCoverage: 0.20,        // 20% - Test coverage and quality
        complexity: 0.15,          // 15% - Code complexity metrics
        documentation: 0.05        // 5% - Documentation completeness
    };

    // Quality factor thresholds for scoring
    private static readonly QUALITY_THRESHOLDS = {
        excellent: 90,
        good: 75,
        acceptable: 60,
        poor: 40
    };

    /**
     * Calculates comprehensive merge score combining all quality factors
     */
    static calculateMergeScore(analysis: CodeAnalysis, ruleEvaluation: RuleEvaluation): number {
        // Calculate individual component scores
        const ruleScore = this.calculateRuleComplianceScore(ruleEvaluation);
        const qualityScore = this.calculateCodeQualityScore(analysis.metrics);
        const testScore = this.calculateTestCoverageScore(analysis.testCoverage);
        const complexityScore = this.calculateComplexityScore(analysis.complexity);
        const docScore = this.calculateDocumentationScore(analysis.metrics.documentation);

        // Apply weighted scoring
        const weightedScore =
            (ruleScore * this.SCORING_WEIGHTS.ruleCompliance) +
            (qualityScore * this.SCORING_WEIGHTS.codeQuality) +
            (testScore * this.SCORING_WEIGHTS.testCoverage) +
            (complexityScore * this.SCORING_WEIGHTS.complexity) +
            (docScore * this.SCORING_WEIGHTS.documentation);

        // Normalize to 0-100 range and round
        const finalScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

        return finalScore;
    }

    /**
     * Calculates rule compliance score based on violations and severity
     */
    private static calculateRuleComplianceScore(ruleEvaluation: RuleEvaluation): number {
        const totalRules = ruleEvaluation.passed.length + ruleEvaluation.violated.length;

        if (totalRules === 0) {
            return 100; // No rules to evaluate
        }

        let totalWeight = 0;
        let violationWeight = 0;

        // Calculate weights for all rules
        [...ruleEvaluation.passed, ...ruleEvaluation.violated].forEach(rule => {
            const weight = this.getSeverityWeight(rule.severity);
            totalWeight += weight;
        });

        // Calculate violation weights with severity multipliers
        ruleEvaluation.violated.forEach(rule => {
            const weight = this.getSeverityWeight(rule.severity);
            violationWeight += weight;
        });

        // Calculate compliance score (higher violations = lower score)
        const complianceRatio = totalWeight > 0 ? 1 - (violationWeight / totalWeight) : 1;
        return Math.max(0, Math.round(complianceRatio * 100));
    }

    /**
     * Calculates code quality score from AI analysis metrics
     */
    private static calculateCodeQualityScore(metrics: QualityMetrics): number {
        // Weighted average of quality metrics
        const weights = {
            codeStyle: 0.20,
            security: 0.30,        // Security is most important
            performance: 0.25,     // Performance is critical
            maintainability: 0.25  // Maintainability affects long-term quality
        };

        const weightedScore =
            (metrics.codeStyle * weights.codeStyle) +
            (metrics.security * weights.security) +
            (metrics.performance * weights.performance) +
            (metrics.maintainability * weights.maintainability);

        return Math.round(Math.max(0, Math.min(100, weightedScore)));
    }

    /**
     * Calculates test coverage score
     */
    private static calculateTestCoverageScore(testCoverage: TestCoverageMetrics): number {
        if (!testCoverage || testCoverage.totalLines === 0) {
            return 50; // Neutral score when no coverage data available
        }

        const coveragePercentage = testCoverage.coveragePercentage;

        // Apply coverage thresholds with bonus/penalty
        if (coveragePercentage >= 90) {
            return 100; // Excellent coverage
        } else if (coveragePercentage >= 80) {
            return 85 + ((coveragePercentage - 80) * 1.5); // Good coverage with bonus
        } else if (coveragePercentage >= 70) {
            return 70 + ((coveragePercentage - 70) * 1.5); // Acceptable coverage
        } else if (coveragePercentage >= 50) {
            return 50 + ((coveragePercentage - 50) * 1.0); // Poor coverage
        } else {
            return Math.max(0, coveragePercentage * 1.0); // Very poor coverage
        }
    }

    /**
     * Calculates complexity score (lower complexity = higher score)
     */
    private static calculateComplexityScore(complexity: ComplexityMetrics): number {
        if (!complexity) {
            return 75; // Neutral score when no complexity data available
        }

        // Normalize complexity metrics to 0-100 scale (inverted - lower complexity is better)
        const cyclomaticScore = this.normalizeComplexityMetric(
            complexity.cyclomaticComplexity,
            { excellent: 5, good: 10, acceptable: 15, poor: 25 }
        );

        const cognitiveScore = this.normalizeComplexityMetric(
            complexity.cognitiveComplexity,
            { excellent: 10, good: 20, acceptable: 30, poor: 50 }
        );

        const maintainabilityScore = complexity.maintainabilityIndex || 75;

        // Weighted average of complexity metrics
        const complexityScore =
            (cyclomaticScore * 0.4) +
            (cognitiveScore * 0.4) +
            (maintainabilityScore * 0.2);

        return Math.round(Math.max(0, Math.min(100, complexityScore)));
    }

    /**
     * Calculates documentation score
     */
    private static calculateDocumentationScore(documentationMetric: number): number {
        // Documentation metric is already 0-100, just ensure bounds
        return Math.round(Math.max(0, Math.min(100, documentationMetric)));
    }

    /**
     * Gets severity weight for rule violations
     */
    private static getSeverityWeight(severity: RuleSeverity): number {
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
     * Normalizes complexity metrics to 0-100 scale (inverted)
     */
    private static normalizeComplexityMetric(
        value: number,
        thresholds: { excellent: number; good: number; acceptable: number; poor: number }
    ): number {
        if (value <= thresholds.excellent) {
            return 100;
        } else if (value <= thresholds.good) {
            return 85 - ((value - thresholds.excellent) / (thresholds.good - thresholds.excellent)) * 15;
        } else if (value <= thresholds.acceptable) {
            return 70 - ((value - thresholds.good) / (thresholds.acceptable - thresholds.good)) * 15;
        } else if (value <= thresholds.poor) {
            return 40 - ((value - thresholds.acceptable) / (thresholds.poor - thresholds.acceptable)) * 30;
        } else {
            return Math.max(0, 40 - ((value - thresholds.poor) * 0.5));
        }
    }

    /**
     * Provides merge recommendation based on score
     */
    static getMergeRecommendation(mergeScore: number): {
        recommendation: "ready" | "review_needed" | "not_ready";
        message: string;
        color: "green" | "yellow" | "red";
    } {
        if (mergeScore >= 85) {
            return {
                recommendation: "ready",
                message: "✅ Ready for merge - Excellent quality!",
                color: "green"
            };
        } else if (mergeScore >= 70) {
            return {
                recommendation: "review_needed",
                message: "⚠️ Review recommended - Good quality with minor issues",
                color: "yellow"
            };
        } else {
            return {
                recommendation: "not_ready",
                message: "❌ Not ready for merge - Significant issues need attention",
                color: "red"
            };
        }
    }

    /**
     * Provides detailed score breakdown for transparency
     */
    static getScoreBreakdown(analysis: CodeAnalysis, ruleEvaluation: RuleEvaluation): {
        totalScore: number;
        components: {
            ruleCompliance: { score: number; weight: number; contribution: number };
            codeQuality: { score: number; weight: number; contribution: number };
            testCoverage: { score: number; weight: number; contribution: number };
            complexity: { score: number; weight: number; contribution: number };
            documentation: { score: number; weight: number; contribution: number };
        };
        recommendation: ReturnType<typeof MergeScoreService.getMergeRecommendation>;
    } {
        const ruleScore = this.calculateRuleComplianceScore(ruleEvaluation);
        const qualityScore = this.calculateCodeQualityScore(analysis.metrics);
        const testScore = this.calculateTestCoverageScore(analysis.testCoverage);
        const complexityScore = this.calculateComplexityScore(analysis.complexity);
        const docScore = this.calculateDocumentationScore(analysis.metrics.documentation);

        const totalScore = this.calculateMergeScore(analysis, ruleEvaluation);

        return {
            totalScore,
            components: {
                ruleCompliance: {
                    score: ruleScore,
                    weight: this.SCORING_WEIGHTS.ruleCompliance,
                    contribution: Math.round(ruleScore * this.SCORING_WEIGHTS.ruleCompliance)
                },
                codeQuality: {
                    score: qualityScore,
                    weight: this.SCORING_WEIGHTS.codeQuality,
                    contribution: Math.round(qualityScore * this.SCORING_WEIGHTS.codeQuality)
                },
                testCoverage: {
                    score: testScore,
                    weight: this.SCORING_WEIGHTS.testCoverage,
                    contribution: Math.round(testScore * this.SCORING_WEIGHTS.testCoverage)
                },
                complexity: {
                    score: complexityScore,
                    weight: this.SCORING_WEIGHTS.complexity,
                    contribution: Math.round(complexityScore * this.SCORING_WEIGHTS.complexity)
                },
                documentation: {
                    score: docScore,
                    weight: this.SCORING_WEIGHTS.documentation,
                    contribution: Math.round(docScore * this.SCORING_WEIGHTS.documentation)
                }
            },
            recommendation: this.getMergeRecommendation(totalScore)
        };
    }

    /**
     * Validates score calculation inputs
     */
    static validateInputs(analysis: CodeAnalysis, ruleEvaluation: RuleEvaluation): {
        isValid: boolean;
        errors: string[];
    } {
        const errors: string[] = [];

        // Validate analysis object
        if (!analysis) {
            errors.push("CodeAnalysis is required");
        } else {
            if (!analysis.metrics) {
                errors.push("QualityMetrics are required in CodeAnalysis");
            } else {
                // Validate quality metrics are in valid range
                const metrics = analysis.metrics;
                const metricNames = ["codeStyle", "testCoverage", "documentation", "security", "performance", "maintainability"];

                for (const metricName of metricNames) {
                    const value = metrics[metricName as keyof QualityMetrics];
                    if (typeof value !== "number" || value < 0 || value > 100) {
                        errors.push(`${metricName} must be a number between 0 and 100`);
                    }
                }
            }

            if (!analysis.complexity) {
                errors.push("ComplexityMetrics are required in CodeAnalysis");
            }

            if (!analysis.testCoverage) {
                errors.push("TestCoverageMetrics are required in CodeAnalysis");
            }
        }

        // Validate rule evaluation object
        if (!ruleEvaluation) {
            errors.push("RuleEvaluation is required");
        } else {
            if (!Array.isArray(ruleEvaluation.passed)) {
                errors.push("RuleEvaluation.passed must be an array");
            }
            if (!Array.isArray(ruleEvaluation.violated)) {
                errors.push("RuleEvaluation.violated must be an array");
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Comprehensive merge score calculation with full result object
     * Useful for orchestration services that need complete analysis results
     */
    static calculateComprehensiveMergeScore(
        analysis: CodeAnalysis,
        ruleEvaluation: RuleEvaluation
    ): {
        mergeScore: number;
        recommendation: ReturnType<typeof MergeScoreService.getMergeRecommendation>;
        breakdown: ReturnType<typeof MergeScoreService.getScoreBreakdown>;
        validation: ReturnType<typeof MergeScoreService.validateInputs>;
        metadata: {
            calculatedAt: Date;
            processingTimeMs: number;
            version: string;
        };
    } {
        const startTime = Date.now();

        // Validate inputs first
        const validation = this.validateInputs(analysis, ruleEvaluation);
        if (!validation.isValid) {
            throw new Error(`Invalid inputs for merge score calculation: ${validation.errors.join(", ")}`);
        }

        // Calculate merge score and get all related data
        const mergeScore = this.calculateMergeScore(analysis, ruleEvaluation);
        const recommendation = this.getMergeRecommendation(mergeScore);
        const breakdown = this.getScoreBreakdown(analysis, ruleEvaluation);

        const processingTime = Date.now() - startTime;

        return {
            mergeScore,
            recommendation,
            breakdown,
            validation,
            metadata: {
                calculatedAt: new Date(),
                processingTimeMs: processingTime,
                version: "1.0.0" // Version of the scoring algorithm
            }
        };
    }

    /**
     * Creates a summary object suitable for logging and monitoring
     */
    static createScoringSummary(
        analysis: CodeAnalysis,
        ruleEvaluation: RuleEvaluation,
        prContext?: {
            installationId: string;
            repositoryName: string;
            prNumber: number;
            prUrl: string;
        }
    ): {
        context?: typeof prContext;
        score: number;
        recommendation: string;
        components: {
            ruleCompliance: number;
            codeQuality: number;
            testCoverage: number;
            complexity: number;
            documentation: number;
        };
        rulesSummary: {
            totalRules: number;
            passedRules: number;
            violatedRules: number;
            criticalViolations: number;
            highViolations: number;
        };
        qualityFlags: {
            hasSecurityIssues: boolean;
            hasPerformanceIssues: boolean;
            hasComplexityIssues: boolean;
            hasTestCoverageIssues: boolean;
            hasDocumentationIssues: boolean;
        };
        timestamp: string;
    } {
        const result = this.calculateComprehensiveMergeScore(analysis, ruleEvaluation);

        // Count rule violations by severity
        const criticalViolations = ruleEvaluation.violated.filter(r => r.severity === RuleSeverity.CRITICAL).length;
        const highViolations = ruleEvaluation.violated.filter(r => r.severity === RuleSeverity.HIGH).length;

        // Determine quality flags based on thresholds
        const qualityFlags = {
            hasSecurityIssues: analysis.metrics.security < 70,
            hasPerformanceIssues: analysis.metrics.performance < 70,
            hasComplexityIssues: analysis.complexity.cyclomaticComplexity > 15 || analysis.complexity.cognitiveComplexity > 30,
            hasTestCoverageIssues: analysis.testCoverage.coveragePercentage < 70,
            hasDocumentationIssues: analysis.metrics.documentation < 60
        };

        return {
            context: prContext,
            score: result.mergeScore,
            recommendation: result.recommendation.recommendation,
            components: {
                ruleCompliance: result.breakdown.components.ruleCompliance.score,
                codeQuality: result.breakdown.components.codeQuality.score,
                testCoverage: result.breakdown.components.testCoverage.score,
                complexity: result.breakdown.components.complexity.score,
                documentation: result.breakdown.components.documentation.score
            },
            rulesSummary: {
                totalRules: ruleEvaluation.passed.length + ruleEvaluation.violated.length,
                passedRules: ruleEvaluation.passed.length,
                violatedRules: ruleEvaluation.violated.length,
                criticalViolations,
                highViolations
            },
            qualityFlags,
            timestamp: new Date().toISOString()
        };
    }
}
