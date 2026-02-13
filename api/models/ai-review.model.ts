import { ReviewStatus } from "../../prisma_client";
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
    formattedPullRequest: string;
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
// AI Context Analysis Types
// ============================================================================

export interface ReviewContext {
    prData: PullRequestData;
    filesStructure: string[];
    styleGuide: string | null;
    readme: string | null;
    relevantChunks: CodeChunkResult[];
}

export interface CodeChunkResult {
    filePath: string;
    content: string;
    similarity: number;
    chunkIndex: number;
}

// ============================================================================
// Review Result Types
// ============================================================================

export interface ReviewResult {
    installationId: string;
    prNumber: number;
    repositoryName: string;
    mergeScore: number;
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
