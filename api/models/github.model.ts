/* eslint-disable @typescript-eslint/no-explicit-any */
import { Octokit } from "@octokit/core";

export type InstallationOctokit = Octokit & {
    paginate: import("@octokit/plugin-paginate-rest").PaginateInterface;
} & {
    graphql: import("@octokit/graphql/dist-types/types.js").graphql & {
        paginate: (<ResponseType_1 extends object = any>(query: string, initialParameters?: Record<string, any>) => Promise<ResponseType_1>) & {
            iterator: <ResponseType_2 = any>(query: string, initialParameters?: Record<string, any>) => {
                [Symbol.asyncIterator]: () => {
                    next(): Promise<{
                        done: boolean;
                        value: ResponseType_2;
                    }>;
                };
            };
        };
    };
} & import("@octokit/plugin-rest-endpoint-methods").Api & {
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

/**
 * Filter criteria for querying GitHub issues
 */
export class IssueFilters {
    title?: string;
    labels?: string[];
    milestone?: string | "none" | "*";
    sort?: "created" | "updated" | "comments" = "created";
    direction?: "asc" | "desc" = "desc";
}

export type GitHubComment = {
    id: string;
    body: string;
    createdAt: string;
    updatedAt?: string;
    author: Partial<GitHubUser>;
}

export type GitHubUser = {
    login: string;
    id: string;
    avatarUrl: string;
    url: string;
    __typename?: string;
}

export type GitHubFile = {
    filename: string;
    status: "added" | "modified" | "removed" | "renamed" | "copied" | "changed" | "unchanged";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
    blob_url: string;
    sha: string;
    raw_url: string;
    contents_url: string;
    previous_filename?: string;
}
