import { Octokit } from "octokit";

export type RepositoryDto = {
    id: number;
    node_id: string;
    name: string;
    full_name: string;
    owner: GitHubUser;
    private: boolean;
    description: string | null;
    url: string;
    html_url: string;
}

export type IssueDto = {
    id: number;
    node_id: string;
    url: string;
    html_url: string;
    repository_url: string;
    number: number;
    state: string;
    state_reason?: "completed" | "reopened" | "not_planned" | null | undefined;
    title: string;
    body?: string | null;
    user: GitHubUser;
    labels: IssueLabel[];
    assignee: GitHubUser;
    assignees?: GitHubUser | null;
    milestone: unknown;
    locked: boolean;
    active_lock_reason?: string | null;
    comments: number;
    pull_request?: IssuePullRequest;
    repository?: RepositoryDto;
    closed_at: string | null;
    created_at: string;
    updated_at: string;
}

export type GraphqlIssueDto = {
    id: number;
    number: number;
    title: string;
    body?: string | null;
    url: string;
    state: string;
    labels: { nodes: IssueLabel[] };
    locked: boolean;
    repository: Pick<RepositoryDto, "url">;
    createdAt: string;
    updatedAt: string;
}

export type IssueLabel = {
    id: number;
    node_id: string;
    url: string;
    name: string;
    description: string | null;
    color: string;
    default: boolean;
}

export type IssuePullRequest = {
    merged_at?: string | null;
    diff_url: string | null;
    html_url: string | null;
    patch_url: string | null;
    url: string | null;
}

export type IssueMilestone = {
    url: string;
    html_url: string;
    labels_url: string;
    id: number;
    node_id: string;
    number: number;
    state: "open" | "closed";
    title: string;
    description: string | null;
    creator: GitHubUser;
    open_issues: number;
    closed_issues: number;
    created_at: string;
    updated_at: string;
    closed_at: string | null;
    due_on: string | null;
}

export type GitHubUser = {
    name?: string | null | undefined;
    email?: string | null | undefined;
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string | null;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
    starred_at?: string | undefined;
}

export class IssueFilters {
    labels?: string[];
    milestone?: string | "none" | "*";
    sort?: "created" | "updated" | "comments" = "created";
    direction?: "asc" | "desc" = "desc";
}

export type InstallationOctokit = Octokit & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
} & import("@octokit/plugin-paginate-graphql").paginateGraphQLInterface & import("@octokit/plugin-rest-endpoint-methods").Api & {
    retry: {
        retryRequest: (error: import("@octokit/request-error").RequestError, retries: number, retryAfter: number) => import("@octokit/request-error").RequestError;
    };
}