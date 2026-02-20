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
    /** Raw concatenated git diff from the *previous* review cycle, used for follow-up prompts. */
    previousDiff?: string;
    /** ID of the in-progress comment already posted before queueing the job */
    pendingCommentId?: string;
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
    file: string | null;
    lineNumber?: number;
    type: "improvement" | "fix" | "optimization" | "style";
    severity: "low" | "medium" | "high";
    description: string;
    suggestedCode?: string;
    language?: string;
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
    styleGuide: string | null;
    readme: string | null;
    relevantChunks: CodeChunkResult[];
}

/**
 * Context used specifically for follow-up reviews (triggered by a `synchronize` event).
 * Carries the previous cycle's git diff and the AI review summary so that
 * the model can compare before/after and give a meaningful incremental review.
 */
export interface FollowUpReviewContext extends ReviewContext {
    /** Raw git diff that was reviewed in the *previous* cycle. */
    previousDiff: string;
    /** Human-readable summary produced by the previous AI review. */
    previousReviewSummary: string;
    /** The merge score from the previous AI review (0-100). */
    previousMergeScore: number;
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
    id?: string; // Database record ID
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
    /** True when this is a follow-up review triggered by a new push to the PR. */
    isFollowUp?: boolean;
    /** The summary from the previous review, included for follow-up context in comments. */
    previousSummary?: string;
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
    /** When true, this review was triggered manually (e.g. via a "review" comment) and
     * should bypass the linked-issues eligibility check. */
    manualTrigger?: boolean;
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
