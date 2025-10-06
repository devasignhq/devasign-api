import { RuleType, RuleSeverity, ReviewStatus } from "../generated/client";
import { IssueLabel, GitHubComment } from "./github.model";

// ============================================================================
// Core Data Transfer Objects for PR Analysis Workflow
// ============================================================================

export interface PullRequestData {
    installationId: string;
    repositoryName: string;
    prNumber: number;
    prUrl: string;
    title: string;
    body: string;
    changedFiles: ChangedFile[];
    linkedIssues: LinkedIssue[];
    author: string;
    isDraft: boolean;
    formattedLinkedIssues?: string[];
    formattedPullRequest?: string;
}

export interface ChangedFile {
    filename: string;
    status: "added" | "modified" | "removed";
    additions: number;
    deletions: number;
    patch: string;
    previousFilename?: string;
}

export interface LinkedIssue {
    number: number;
    title: string;
    body: string;
    url: string;
    linkType: "closes" | "resolves" | "fixes";
    labels: IssueLabel[];
    comments: GitHubComment[];
}


// ============================================================================
// AI Review Service Types
// ============================================================================

export interface AIReview {
    mergeScore: number;
    codeQuality: QualityMetrics;
    suggestions: CodeSuggestion[];
    summary: string;
    confidence: number;
}

export interface QualityMetrics {
    codeStyle: number;
    testCoverage: number;
    documentation: number;
    security: number;
    performance: number;
    maintainability: number;
}

export interface CodeSuggestion {
    file: string;
    lineNumber?: number;
    type: "improvement" | "fix" | "optimization" | "style";
    severity: "low" | "medium" | "high";
    description: string;
    suggestedCode?: string;
    reasoning: string;
}

export interface CodeAnalysis {
    issues: CodeIssue[];
    metrics: QualityMetrics;
    complexity: ComplexityMetrics;
    testCoverage: TestCoverageMetrics;
}

export interface CodeIssue {
    file: string;
    line: number;
    column?: number;
    type: string;
    severity: "low" | "medium" | "high" | "critical";
    message: string;
    rule?: string;
}

export interface ComplexityMetrics {
    cyclomaticComplexity: number;
    cognitiveComplexity: number;
    linesOfCode: number;
    maintainabilityIndex: number;
}

export interface TestCoverageMetrics {
    linesCovered: number;
    totalLines: number;
    branchesCovered: number;
    totalBranches: number;
    coveragePercentage: number;
}

// ============================================================================
// Rule Engine Types
// ============================================================================

export interface RuleEvaluation {
    passed: RuleResult[];
    violated: RuleResult[];
    score: number; // Contribution to merge score
}

export interface RuleResult {
    ruleId: string;
    ruleName: string;
    severity: RuleSeverity;
    description: string;
    details?: string;
    affectedFiles?: string[];
}

export interface DefaultRule {
    id: string;
    name: string;
    description: string;
    type: RuleType;
    severity: RuleSeverity;
    pattern?: string;
    config: Record<string, unknown>;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Review Result Types
// ============================================================================

export interface ReviewResult {
    installationId: string;
    prNumber: number;
    repositoryName: string;
    mergeScore: number;
    rulesViolated: RuleResult[];
    rulesPassed: RuleResult[];
    suggestions: CodeSuggestion[];
    reviewStatus: ReviewStatus;
    summary: string;
    confidence: number;
    processingTime: number;
    createdAt: Date;
}

export interface FormattedReview {
    header: string;
    mergeScoreSection: string;
    rulesSection: string;
    suggestionsSection: string;
    footer: string;
    fullComment: string;
}

// ============================================================================
// Webhook and GitHub Integration Types
// ============================================================================

export interface GitHubWebhookPayload {
    action: string;
    number: number;
    pull_request: GitHubPullRequest;
    repository: GitHubRepository;
    installation: GitHubInstallation;
}

export interface GitHubPullRequest {
    id: number;
    number: number;
    title: string;
    body: string;
    html_url: string;
    draft: boolean;
    user: GitHubUser;
    head: GitHubBranch;
    base: GitHubBranch;
    changed_files: number;
    additions: number;
    deletions: number;
}

export interface GitHubRepository {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    owner: GitHubUser;
}

export interface GitHubInstallation {
    id: number;
    account: GitHubUser;
}

export interface GitHubUser {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
}

export interface GitHubBranch {
    ref: string;
    sha: string;
    repo: GitHubRepository;
}

export interface GitHubFile {
    filename: string;
    status: "added" | "modified" | "removed" | "renamed";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface APIResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    timestamp: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

export interface AnalysisRequest {
    installationId: string;
    repositoryName: string;
    prNumber: number;
    force?: boolean; // Force re-analysis even if already analyzed
}

export interface ManualTriggerRequest extends AnalysisRequest {
    userId: string; // Change to username
    reason?: string;
}
