import { Octokit } from "@octokit/core";

export type InstallationOctokit = Octokit & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
} & import("@octokit/plugin-paginate-graphql").paginateGraphQLInterface & import("@octokit/plugin-rest-endpoint-methods").Api & {
    retry: {
        retryRequest: (error: import("@octokit/request-error").RequestError, retries: number, retryAfter: number) => import("@octokit/request-error").RequestError;
    };
}

export type RepositoryDto = {
    id: string;
    databaseId: number;
    name: string;
    nameWithOwner: string;
    owner: GitHubUser;
    isPrivate: boolean;
    description: string | null;
    url: string;
    homepageUrl: string;
}

export type IssueDto = {
    id: string;
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
    name: string;
    color: string;
    description: string | null;
}

export type IssueMilestone = {
    id: string;
    number: number;
    title: string;
}

export type GitHubUser = {
    login: string;
    id: string;
    avatarUrl: string;
    url: string;
}