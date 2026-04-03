import { IssueLabel, GitHubComment } from "./github.model";

// ============================================================================
// Core Data Transfer Objects for PR Analysis Workflow
// ============================================================================

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
// Webhook and GitHub Integration Types
// ============================================================================

export interface GitHubWebhookPayload {
    action: string;
    number: number;
    pull_request: GitHubPullRequest;
    repository: GitHubRepository;
    installation: GitHubInstallation;
    /** When true, this review was triggered manually (e.g. via a "review" comment). */
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
