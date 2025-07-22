import { App } from "octokit";
import { IssueFilters } from "../types/general";
import { InstallationOctokit, GraphqlIssueDto } from "../types/github";

export class GitHubService {
    private static githubApp = new App({
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!
    });

    /**
     * Get Octokit instance for a specific installation
     */
    private static async getOctokit(installationId: string): Promise<InstallationOctokit> {
        return await this.githubApp.getInstallationOctokit(Number(installationId));
    }

    /**
     * Extract owner and repo from GitHub URL
     */
    private static getOwnerAndRepo(repoUrl: string): [string, string] {
        const [owner, repo] = repoUrl.split("/").slice(-2);
        return [owner, repo];
    }

    /**
     * Get repositories for an installation
     */
    static async getInstallationRepositories(installationId: string) {
        const octokit = await this.getOctokit(installationId);

        const response = await octokit.request("GET /installation/repositories");
        return response.data.repositories;
    }

    /**
     * Get installation details from GitHub
     */
    static async getInstallationDetails(installationId: string) {
        const octokit = await this.getOctokit(installationId);

        const response = await octokit.request(
            "GET /app/installations/{installation_id}",
            { installation_id: Number(installationId) }
        );

        return response.data;
    }

    /**
     * Check if GitHub user exists
     */
    static async checkGithubUser(username: string, installationId: string): Promise<boolean> {
        const octokit = await this.getOctokit(installationId);

        try {
            const response = await octokit.rest.users.getByUsername({
                username,
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    /**
     * Get repository details
     */
    static async getRepoDetails(repoUrl: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.repos.get({
            owner,
            repo,
        });

        return response.data;
    }

    /**
     * Get repository issues with search functionality
     */
    static async getRepoIssuesWithSearch(
        repoUrl: string,
        installationId: string,
        filters?: IssueFilters,
        page = 1,
        perPage = 30,
    ) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        let queryString = `repo:${owner}/${repo} is:issue is:open`;

        if (filters?.title) {
            queryString += ` "${filters.title}" in:title`;
        }

        if (filters?.labels?.length) {
            queryString += ` ${filters.labels.map(label => `label:"${label}"`).join(' ')}`;
        }

        if (filters?.milestone) {
            queryString += ` milestone:"${filters.milestone}"`;
        }

        if (filters?.sort && filters?.direction) {
            queryString += ` sort:"${filters.sort}-${filters.direction}"`;
        }

        queryString += ` -label:"💵 Bounty"`;

        const after = page > 1 ? `after: "${btoa(`cursor:${(page - 1) * perPage}`)}",` : '';

        const query = `
            query($queryString: String!) {
                search(
                    query: $queryString,
                    type: ISSUE,
                    first: ${perPage},
                    ${after}
                ) {
                    nodes {
                        ... on Issue {
                            id
                            number
                            title
                            body
                            url
                            locked
                            state
                            createdAt
                            updatedAt
                            labels(first: 20) {
                                nodes {
                                    id
                                    name
                                    color
                                    description
                                }
                            }
                            repository {
                                url
                            }
                        }
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        startCursor
                        endCursor
                    }
                    issueCount
                }
            }
        `;

        const response = await octokit.graphql(query, { queryString });
        return {
            issues: (response as any)?.search?.nodes as GraphqlIssueDto[],
            hasMore: (response as any)?.search?.pageInfo?.hasNextPage as boolean
        };
    }

    /**
     * Get single repository issue
     */
    static async getRepoIssue(
        repoUrl: string,
        installationId: string,
        issueNumber: number
    ) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
        });

        return response.data;
    }

    /**
     * Update repository issue
     */
    static async updateRepoIssue(
        repoUrl: string,
        installationId: string,
        issueNumber: number,
        body?: string,
        labels?: string[],
        assignees?: string[],
        state?: "open" | "closed",
    ) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.issues.update({
            owner,
            repo,
            issue_number: issueNumber,
            body,
            state,
            labels,
            assignees
        });

        return response.data;
    }

    /**
     * Get repository labels and milestones
     */
    static async getRepoLabelsAndMilestones(repoUrl: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const query = `
            query GetRepoLabelsAndMilestones($owner: String!, $name: String!) {
                repository(owner: $owner, name: $name) {
                    labels(first: 100) {
                        nodes {
                            id
                            name
                            color
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                    milestones(first: 100, states: [OPEN], orderBy: {field: DUE_DATE, direction: ASC}) {
                        nodes {
                            id
                            number
                            title
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `;

        const response = await octokit.graphql(query, {
            owner,
            name: repo,
        });

        return {
            labels: (response as any).repository.labels.nodes,
            milestones: (response as any).repository.milestones.nodes,
        };
    }

    /**
     * Create bounty label
     */
    static async createBountyLabel(repoUrl: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.issues.createLabel({
            owner,
            repo,
            name: "💵 Bounty",
            color: "85BB65",
            description: "Issues with a monetary reward"
        });

        return response.data;
    }

    /**
     * Get bounty label
     */
    static async getBountyLabel(repoUrl: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.issues.getLabel({
            owner,
            repo,
            name: "💵 Bounty",
        });

        return response.data;
    }

    /**
     * Add bounty label and create bounty comment
     */
    static async addBountyLabelAndCreateComment(
        installationId: string,
        issueId: number,
        bountyLabelId: number,
        body: string
    ) {
        const octokit = await this.getOctokit(installationId);

        const mutation = `
            mutation AddLabelAndCreateComment($issueId: ID!, $labelIds: [ID!]!, $body: String!) {
                addLabelsToLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                    labelable {
                        ... on Issue {
                            id
                            labels(first: 100) {
                                nodes {
                                    id
                                    name
                                    color
                                }
                            }
                        }
                    }
                }
                addComment(input: {subjectId: $issueId, body: $body}) {
                    commentEdge {
                        node {
                            id
                            body
                            createdAt
                            author {
                                login
                            }
                        }
                    }
                }
            }
        `;

        const response = await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabelId],
            body,
        });

        return {
            labels: (response as any).addLabelsToLabelable.labelable.labels.nodes,
            comment: (response as any).addComment.commentEdge.node,
        };
    }

    /**
     * Update issue comment
     */
    static async updateIssueComment(
        repoUrl: string,
        installationId: string,
        commentId: number,
        body: string
    ) {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const response = await octokit.rest.issues.updateComment({
            owner,
            repo,
            comment_id: commentId,
            body,
        });

        return response.data;
    }

    /**
     * Remove bounty label and delete bounty comment
     */
    static async removeBountyLabelAndDeleteComment(
        installationId: string,
        issueId: number,
        bountyLabelId: number,
        commentId: string
    ) {
        const octokit = await this.getOctokit(installationId);
    
        const mutation = `
            mutation RemoveLabelAndDeleteComment($issueId: ID!, $labelIds: [ID!]!, $commentId: ID!) {
                removeLabelsFromLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                    labelable {
                        ... on Issue {
                            id
                            labels(first: 100) {
                                nodes {
                                    id
                                    name
                                    color
                                }
                            }
                        }
                    }
                }
                deleteIssueComment(input: {id: $commentId}) {
                    clientMutationId
                }
            }
        `;
    
        await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabelId],
            commentId,
        });
    
        return "SUCCESS";
    }
}