import { ReviewResult, FormattedReview, CodeSuggestion } from "../models/ai-review.model";
import { RuleSeverity } from "../generated/client";

/**
 * Review Formatter Service
 * Creates structured comment formatter for AI review results
 */
export class ReviewFormatterService {

    /**
     * Formats a complete review result into a structured GitHub comment
     */
    public static formatReview(result: ReviewResult): FormattedReview {
        const header = this.createHeader(result);
        const mergeScoreSection = this.createMergeScoreSection(result);
        const rulesSection = this.createRulesSection(result);
        const suggestionsSection = this.createSuggestionsSection(result);
        const footer = this.createFooter(result);

        const fullComment = [
            header,
            mergeScoreSection,
            rulesSection,
            suggestionsSection,
            footer
        ].join("\n\n");

        return {
            header,
            mergeScoreSection,
            rulesSection,
            suggestionsSection,
            footer,
            fullComment
        };
    }

    /**
     * Creates the header section with AI review branding
     */
    private static createHeader(result: ReviewResult): string {
        const emoji = this.getMergeScoreEmoji(result.mergeScore);
        const status = this.getMergeScoreStatus(result.mergeScore);

        return `## ${emoji} AI Code Review Results

**Status:** ${status}  
**Confidence:** ${Math.round(result.confidence * 100)}%

---`;
    }

    /**
     * Creates the merge score section with visual indicators
     */
    private static createMergeScoreSection(result: ReviewResult): string {
        const scoreBar = this.createScoreBar(result.mergeScore);
        const recommendation = this.getMergeRecommendation(result.mergeScore);
        const emoji = this.getMergeScoreEmoji(result.mergeScore);

        return `### ${emoji} Merge Score: ${result.mergeScore}/100

${scoreBar}

**Recommendation:** ${recommendation}

${result.summary}`;
    }

    /**
     * Creates the rules compliance section
     */
    private static createRulesSection(result: ReviewResult): string {
        const totalRules = result.rulesPassed.length + result.rulesViolated.length;
        const passedCount = result.rulesPassed.length;
        const violatedCount = result.rulesViolated.length;

        let section = `### 📋 Rules Compliance (${passedCount}/${totalRules} passed)

`;

        if (result.rulesViolated.length > 0) {
            section += `#### ❌ Rules Violated (${violatedCount})

`;
            result.rulesViolated.forEach((rule, index) => {
                const severityEmoji = this.getSeverityEmoji(rule.severity);
                const severityBadge = this.getSeverityBadge(rule.severity);

                section += `${index + 1}. **${rule.ruleName}** ${severityBadge}
   ${severityEmoji} ${rule.description}`;

                if (rule.details) {
                    section += `
   📝 ${rule.details}`;
                }

                if (rule.affectedFiles && rule.affectedFiles.length > 0) {
                    section += `
   📁 Files: ${rule.affectedFiles.join(", ")}`;
                }

                section += "\n\n";
            });
        }

        if (result.rulesPassed.length > 0) {
            section += `#### ✅ Rules Passed (${passedCount})

<details>
<summary>Click to view passed rules</summary>

`;
            result.rulesPassed.forEach((rule, index) => {
                section += `${index + 1}. **${rule.ruleName}** - ${rule.description}\n`;
            });

            section += "\n</details>";
        }

        return section;
    }

    /**
     * Creates the code suggestions section
     */
    private static createSuggestionsSection(result: ReviewResult): string {
        if (result.suggestions.length === 0) {
            return `### 💡 Code Suggestions

✨ Great job! No specific suggestions at this time.`;
        }

        let section = `### 💡 Code Suggestions (${result.suggestions.length})

`;

        // Group suggestions by severity
        const groupedSuggestions = this.groupSuggestionsBySeverity(result.suggestions);

        ["high", "medium", "low"].forEach(severity => {
            const suggestions = groupedSuggestions[severity as keyof typeof groupedSuggestions];
            if (suggestions.length > 0) {
                const severityEmoji = this.getSuggestionSeverityEmoji(severity as "high" | "medium" | "low");
                const severityLabel = severity.charAt(0).toUpperCase() + severity.slice(1);

                section += `#### ${severityEmoji} ${severityLabel} Priority (${suggestions.length})

`;

                suggestions.forEach((suggestion, index) => {
                    const typeEmoji = this.getSuggestionTypeEmoji(suggestion.type);

                    section += `${index + 1}. **${suggestion.file}**${suggestion.lineNumber ? ` (Line ${suggestion.lineNumber})` : ""}
   ${typeEmoji} ${suggestion.description}
   
   💭 **Reasoning:** ${suggestion.reasoning}`;

                    if (suggestion.suggestedCode) {
                        section += `
   
   **Suggested Code:**
   \`\`\`
   ${suggestion.suggestedCode}
   \`\`\``;
                    }

                    section += "\n\n";
                });
            }
        });

        return section;
    }

    /**
     * Creates the footer with metadata and actions
     */
    private static createFooter(result: ReviewResult): string {
        const processingTime = result.processingTime ? `${Math.round(result.processingTime / 1000)}s` : "N/A";
        const timestamp = result.createdAt.toISOString();

        return `

<details>
<summary>📊 Review Metadata</summary>

- **Processing Time:** ${processingTime}
- **Analysis Date:** ${new Date(result.createdAt).toLocaleString()}

</details>

> 🤖 This review was generated by AI. While we strive for accuracy, please use your judgment when applying suggestions.
> 
> 💬 Questions about this review? [Open an issue](https://github.com/devasignhq/devasign-api/issues) or contact support.

<!-- AI-REVIEW-MARKER:${result.installationId}:${result.prNumber}:${timestamp} -->`;
    }

    /**
     * Creates a visual score bar for the merge score
     */
    private static createScoreBar(score: number): string {
        const barLength = 20;
        const filledLength = Math.round((score / 100) * barLength);
        const emptyLength = barLength - filledLength;

        const filled = "█".repeat(filledLength);
        const empty = "░".repeat(emptyLength);

        let color = "🔴"; // Red for low scores
        if (score >= 70) color = "🟡"; // Yellow for medium scores
        if (score >= 85) color = "🟢"; // Green for high scores

        return `${color} \`${filled}${empty}\` ${score}%`;
    }

    /**
     * Gets emoji based on merge score
     */
    private static getMergeScoreEmoji(score: number): string {
        if (score >= 85) return "🟢";
        if (score >= 70) return "🟡";
        if (score >= 50) return "🟠";
        return "🔴";
    }

    /**
     * Gets status text based on merge score
     */
    private static getMergeScoreStatus(score: number): string {
        if (score >= 85) return "Ready to Merge";
        if (score >= 70) return "Review Recommended";
        if (score >= 50) return "Changes Needed";
        return "Major Issues Found";
    }

    /**
     * Gets merge recommendation based on score
     */
    private static getMergeRecommendation(score: number): string {
        if (score >= 85) {
            return "✅ This PR looks great and is ready for merge!";
        } else if (score >= 70) {
            return "⚠️ This PR is mostly good but could benefit from some improvements before merging.";
        } else if (score >= 50) {
            return "❌ This PR needs significant improvements before it should be merged.";
        } else {
            return "🚫 This PR has major issues that must be addressed before merging.";
        }
    }

    /**
     * Gets emoji for rule severity
     */
    private static getSeverityEmoji(severity: RuleSeverity): string {
        switch (severity) {
        case "CRITICAL": return "🚨";
        case "HIGH": return "🔴";
        case "MEDIUM": return "🟡";
        case "LOW": return "🔵";
        default: return "⚪";
        }
    }

    /**
     * Gets badge for rule severity
     */
    private static getSeverityBadge(severity: RuleSeverity): string {
        switch (severity) {
        case "CRITICAL": return "![Critical](https://img.shields.io/badge/Critical-red)";
        case "HIGH": return "![High](https://img.shields.io/badge/High-orange)";
        case "MEDIUM": return "![Medium](https://img.shields.io/badge/Medium-yellow)";
        case "LOW": return "![Low](https://img.shields.io/badge/Low-blue)";
        default: return "![Unknown](https://img.shields.io/badge/Unknown-gray)";
        }
    }

    /**
     * Gets emoji for suggestion severity
     */
    private static getSuggestionSeverityEmoji(severity: "high" | "medium" | "low"): string {
        switch (severity) {
        case "high": return "🔴";
        case "medium": return "🟡";
        case "low": return "🔵";
        default: return "⚪";
        }
    }

    /**
     * Gets emoji for suggestion type
     */
    private static getSuggestionTypeEmoji(type: string): string {
        switch (type) {
        case "fix": return "🔧";
        case "improvement": return "✨";
        case "optimization": return "⚡";
        case "style": return "🎨";
        default: return "💡";
        }
    }

    /**
     * Groups suggestions by severity for better organization
     */
    private static groupSuggestionsBySeverity(suggestions: CodeSuggestion[]): {
        high: CodeSuggestion[];
        medium: CodeSuggestion[];
        low: CodeSuggestion[];
    } {
        return suggestions.reduce((groups, suggestion) => {
            groups[suggestion.severity].push(suggestion);
            return groups;
        }, { high: [] as CodeSuggestion[], medium: [] as CodeSuggestion[], low: [] as CodeSuggestion[] });
    }

    /**
     * Creates a compact summary format for notifications
     */
    public static formatCompactSummary(result: ReviewResult): string {
        const emoji = this.getMergeScoreEmoji(result.mergeScore);
        const violatedCount = result.rulesViolated.length;
        const suggestionsCount = result.suggestions.length;

        return `${emoji} Score: ${result.mergeScore}/100 | ${violatedCount} rule violations | ${suggestionsCount} suggestions`;
    }

    /**
     * Extracts the AI review marker from a comment to identify existing reviews
     */
    public static extractReviewMarker(commentBody: string): {
        installationId: string;
        prNumber: number;
        timestamp: string;
    } | null {
        const markerRegex = /<!-- AI-REVIEW-MARKER:([^:]+):(\d+):([^:]+) -->/;
        const match = commentBody.match(markerRegex);

        if (match) {
            return {
                installationId: match[1],
                prNumber: parseInt(match[2]),
                timestamp: match[3]
            };
        }

        return null;
    }

    /**
     * Checks if a comment is an AI review comment
     */
    public static isAIReviewComment(commentBody: string): boolean {
        return commentBody.includes("<!-- AI-REVIEW-MARKER:") &&
            commentBody.includes("## 🤖 AI Code Review Results") ||
            commentBody.includes("## 🟢 AI Code Review Results") ||
            commentBody.includes("## 🟡 AI Code Review Results") ||
            commentBody.includes("## 🟠 AI Code Review Results") ||
            commentBody.includes("## 🔴 AI Code Review Results");
    }

    /**
     * Creates an error comment when AI review fails
     */
    public static formatErrorComment(
        installationId: string,
        prNumber: number,
        repositoryName: string,
        error: string
    ): string {
        const timestamp = new Date().toISOString();

        return `## ❌ AI Code Review Failed

**Pull Request:** #${prNumber}  
**Repository:** ${repositoryName}  
**Status:** Analysis Failed

---

### Error Details

The AI review system encountered an error while analyzing this pull request:

\`\`\`
${error}
\`\`\`

### What to do next

1. **Manual Review:** Please proceed with manual code review
2. **Retry:** You can manually trigger a new analysis if the issue was temporary
3. **Support:** If this error persists, please contact support

---

> 🤖 This is an automated error message from the AI review system.
> 
> 💬 Need help? [Open an issue](https://github.com/devasign/issues) or contact support.

<!-- AI-REVIEW-MARKER:${installationId}:${prNumber}:${timestamp} -->`;
    }
}
