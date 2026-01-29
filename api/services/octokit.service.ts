import { App, Octokit } from "octokit";
import {
    GitHubComment,
    InstallationOctokit,
    IssueDto,
    IssueFilters,
    IssueLabel,
    IssueMilestone,
    RepositoryDto
} from "../models/github.model";
import { getFieldFromUnknownObject, moneyFormat } from "../utilities/helper";
import { GitHubAPIError } from "../models/error.model";
import { dataLogger, messageLogger } from "../config/logger.config";

const commentCTA = `${process.env.CONTRIBUTOR_APP_URL!}/application`;

export class OctokitService {
    private static githubApp = new App({
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!.toString().replace(/\\n/g, "\n")
    });

    private static systemOctokit = new Octokit({
        auth: process.env.GITHUB_ACCESS_TOKEN
    });

    /**
     * Generates a custom bounty message for GitHub issues.
     * 
     * @param bounty - The bounty amount as a string.
     * @param taskId - The ID of the task associated with the bounty.
     * @param accepted - Whether the task has already been accepted/assigned. Defaults to false.
     * @returns The formatted bounty message string.
     */
    public static customBountyMessage = (bounty: string, taskId: string, accepted = false) => {
        return `\n\n\n## 💵 ${moneyFormat(bounty)} USDC Bounty\n\n### Steps to solve:\n
1. **Accept task**: Follow the CTA and apply to solve this issue.\n
2. **Submit work**: If your application was accepted, you'll be required to submit the link to your pull request and an optional link to a reference that will give more credibility to the work done.\n
3. **Receive payment**: When your pull request is approved, 100% of the bounty is instantly transferred to your wallet.\n\n
${accepted ? "**This bounty has already been assigned.**" : `**To work on this task, [Apply here](${commentCTA}?taskId=${taskId})**`}`;
    };

    /**
     * Get Octokit instance for a specific installation
     */
    public static async getOctokit(installationId: string): Promise<InstallationOctokit> {
        // Get authenticated Octokit instance for the specific installation
        const octokit = await this.githubApp.getInstallationOctokit(Number(installationId));
        // Cast to our custom InstallationOctokit type for better type safety
        return octokit as unknown as InstallationOctokit;
    }

    /**
     * Extract owner and repo from GitHub URL or owner/repo format
     * Supports:
     * - URL format: "https://github.com/owner/repo"
     * - Direct format: "owner/repo"
     * - PR URL: "https://github.com/owner/repo/pull/123"
     * - Issue URL: "https://github.com/owner/repo/issues/456"
     */
    public static getOwnerAndRepo(repoUrl: string): [string, string] {
        // Split the URL/string by forward slashes to parse the structure
        const parts = repoUrl.split("/");

        // Check if it's the simple "owner/repo" format (only 2 parts)
        if (parts.length === 2) {
            // Direct owner/repo format - return as-is
            return [parts[0], parts[1]];
        } else {
            // Find the index where "github.com" appears in the URL
            const githubIndex = parts.findIndex(part => part === "github.com");

            // If found and there are at least 2 parts after it (owner and repo)
            if (githubIndex !== -1 && githubIndex + 2 < parts.length) {
                // Return the owner (githubIndex + 1) and repo (githubIndex + 2)
                return [parts[githubIndex + 1], parts[githubIndex + 2]];
            } else {
                // Fallback: filter out empty parts and take the last two
                const nonEmptyParts = parts.filter(part => part.length > 0);
                return [nonEmptyParts[nonEmptyParts.length - 2], nonEmptyParts[nonEmptyParts.length - 1]];
            }
        }
    }

    /**
     * Get repositories for an installation
     */
    static async getInstallationRepositories(installationId: string) {
        // Get authenticated Octokit instance for this installation
        const octokit = await this.getOctokit(installationId);

        // Build GraphQL query to fetch repositories the installation has access to
        const query = `
            query GetInstallationRepositories {
                viewer {
                    repositories(first: 100, affiliations: [OWNER, ORGANIZATION_MEMBER, COLLABORATOR]) {
                        nodes {
                            id
                            databaseId
                            name
                            nameWithOwner
                            owner {
                                login
                                id
                                avatarUrl
                                url
                            }
                            isPrivate
                            description
                            url
                            homepageUrl
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `;

        // Execute the GraphQL query and type the response
        const response = await octokit.graphql(query) as {
            viewer: { repositories: { nodes: RepositoryDto[] } }
        };

        // Return just the repository nodes array
        return response.viewer.repositories.nodes;
    }

    /**
     * Get installation details from GitHub with user verification
     */
    static async getInstallationDetails(installationId: string, githubUsername: string) {
        // Get authenticated Octokit instance for this installation
        const octokit = await this.getOctokit(installationId);

        // Fetch installation details from GitHub API
        const response = await octokit.request(
            "GET /app/installations/{installation_id}",
            { installation_id: Number(installationId) }
        );

        const installation = response.data;

        // Verify user authorization to access this installation
        if (installation.target_type === "User") {
            // For user installations, verify the requesting user owns the account
            if (installation.account && "login" in installation.account &&
                installation.account.login !== githubUsername
            ) {
                // User is trying to access someone else's installation
                throw new GitHubAPIError(
                    "Unauthorized: User can only access installations on their own account"
                );
            }
        } else if (installation.target_type === "Organization" &&
            installation.account && "name" in installation.account
        ) {
            // For organization installations, verify user is an active member
            try {
                // Check organization membership for the user
                const membership = await octokit.request("GET /orgs/{org}/memberships/{username}", {
                    org: installation.account.name!,
                    username: githubUsername
                });

                // Reject if membership is still pending (not yet accepted)
                if (membership.data.state === "pending") {
                    throw new GitHubAPIError(
                        "Unauthorized: User must be an active member of this organization to access its installation"
                    );
                }
            } catch (error) {
                // Handle membership check errors
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");

                // 404 = not a member, 403 = forbidden
                if (errorStatus === 404 || errorStatus === 403) {
                    throw new GitHubAPIError(
                        "Unauthorized: User must be a member of this organization to access its installation",
                        error
                    );
                }
                // Re-throw other errors with context
                throw new GitHubAPIError(
                    "An error occured while verifying the installation",
                    error
                );
            }
        }

        // User is authorized, return installation details
        return response.data;
    }

    /**
     * Check if GitHub user exists
     */
    static async checkGithubUser(username: string, installationId: string): Promise<boolean> {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);

        try {
            // Attempt to fetch user by username from GitHub API
            const response = await octokit.rest.users.getByUsername({
                username
            });
            // If successful (200 status), user exists
            return response.status === 200;
        } catch {
            // If request fails (404 or other error), user doesn't exist or is inaccessible
            return false;
        }
    }

    /**
     * Get user's top languages from GitHub
     */
    public static async getUserTopLanguages(username: string): Promise<string[]> {
        const octokit = this.systemOctokit;

        const query = `
            query($username: String!, $cursor: String) {
                user(login: $username) {
                    repositories(
                        first: 100, 
                        isFork: false, 
                        orderBy: {field: UPDATED_AT, direction: DESC},
                        after: $cursor
                    ) {
                        nodes {
                            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                                edges {
                                    size
                                    node {
                                        name
                                    }
                                }
                            }
                        }
                        pageInfo {
                            hasNextPage
                            endCursor
                        }
                    }
                }
            }
        `;

        try {
            const languageBytes: Record<string, number> = {};
            let hasNextPage = true;
            let cursor: string | null = null;
            let repoCount = 0;
            const maxRepos = 100; // Limit to avoid excessive API calls

            while (hasNextPage && repoCount < maxRepos) {
                const response = await octokit.graphql(query, { username, cursor }) as {
                    user: {
                        repositories: {
                            nodes: {
                                languages: {
                                    edges: {
                                        size: number;
                                        node: {
                                            name: string;
                                        };
                                    }[];
                                } | null;
                            }[];
                            pageInfo: {
                                hasNextPage: boolean;
                                endCursor: string | null;
                            };
                        } | null;
                    } | null;
                };

                const repos = response.user?.repositories?.nodes || [];
                repoCount += repos.length;

                repos.forEach((repo) => {
                    repo.languages?.edges?.forEach((edge) => {
                        const langName = edge.node.name;
                        languageBytes[langName] = (languageBytes[langName] || 0) + edge.size;
                    });
                });

                hasNextPage = response.user?.repositories?.pageInfo.hasNextPage ?? false;
                cursor = response.user?.repositories?.pageInfo.endCursor ?? null;
            }

            // Sort by total bytes and return top 10
            return Object.entries(languageBytes)
                .sort(([, a], [, b]) => b - a)
                .map(([name]) => name)
                .slice(0, 10);
        } catch (error) {
            dataLogger.error("Error fetching user languages from GitHub", { username, error });
            return [];
        }
    }

    /**
     * Get repository details
     */
    static async getRepoDetails(repoUrl: string, installationId: string) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build comprehensive GraphQL query to fetch all repository details
        const query = `
            query GetRepoDetails($owner: String!, $name: String!) {
                repository(owner: $owner, name: $name) {
                    id
                    databaseId
                    name
                    nameWithOwner
                    owner {
                        login
                        id
                        avatarUrl
                        url
                    }
                    isPrivate
                    description
                    url
                    homepageUrl
                    createdAt
                    updatedAt
                    pushedAt
                    stargazerCount
                    watcherCount
                    forkCount
                    defaultBranchRef {
                        name
                    }
                    languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
                        nodes {
                            name
                            color
                        }
                    }
                    licenseInfo {
                        name
                        spdxId
                    }
                    isArchived
                    isFork
                    isTemplate
                    hasIssuesEnabled
                    hasProjectsEnabled
                    hasWikiEnabled
                    hasDiscussionsEnabled
                }
            }
        `;

        // Execute GraphQL query with owner and repo variables
        const response = await octokit.graphql(query, {
            owner,
            name: repo
        }) as { repository: RepositoryDto };

        // Return the repository object with all details
        return response.repository;
    }

    /**
     * Get repository issues with search functionality
     */
    static async getRepoIssuesWithSearch(
        repoUrl: string,
        installationId: string,
        filters?: IssueFilters,
        page = 1,
        perPage = 30
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build GitHub search query string starting with repo scope and issue type
        let queryString = `repo:${owner}/${repo} is:issue is:open`;

        // Add title filter if provided (search in title field)
        if (filters?.title) {
            // strip quotes
            const sanitizedTitle = filters.title.replace(/"/g, "");
            queryString += ` "${sanitizedTitle}" in:title`;
        }

        // Add label filters if provided (can filter by multiple labels)
        if (filters?.labels?.length) {
            queryString += ` ${filters.labels.map(label => `label:"${label}"`).join(" ")}`;
        }

        // Add milestone filter if provided
        if (filters?.milestone) {
            queryString += ` milestone:"${filters.milestone}"`;
        }

        // Add sort and direction if both are provided
        if (filters?.sort && filters?.direction) {
            queryString += ` sort:"${filters.sort}-${filters.direction}"`;
        }

        // Exclude issues with the "💵 Bounty" label (already managed by our system)
        queryString += " -label:\"💵 Bounty\"";

        // Calculate pagination cursor for pages beyond the first
        const after = page > 1 ? `after: "${btoa(`cursor:${(page - 1) * perPage}`)}",` : "";

        // Build GraphQL query with search parameters
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

        // Execute the search query
        const response = await octokit.graphql(query, { queryString }) as {
            search: {
                nodes: IssueDto[],
                pageInfo: { hasNextPage: boolean }
            }
        };

        // Return issues array and pagination info
        return {
            issues: response.search.nodes,
            hasMore: response.search.pageInfo.hasNextPage
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
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build GraphQL query to fetch a single issue by number
        const query = `
            query GetRepoIssue($owner: String!, $name: String!, $number: Int!) {
                repository(owner: $owner, name: $name) {
                    issue(number: $number) {
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
            }
        `;

        // Execute query with variables
        const response = await octokit.graphql(query, {
            owner,
            name: repo,
            number: issueNumber
        }) as { repository: { issue: IssueDto } };

        // Return the issue object
        return response.repository.issue;
    }

    /**
     * Update repository issue
     */
    static async updateRepoIssue(
        installationId: string,
        repoUrl: string,
        issueId: string | number,
        body?: string,
        labels?: string[],
        assignees?: string[],
        state?: "open" | "closed"
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build the mutation dynamically based on what needs to be updated
        const mutations = [];
        const variables: Record<string, unknown> = { issueId };

        // Add body update mutation if body is provided
        if (body !== undefined) {
            mutations.push(`
                updateIssue(input: {id: $issueId, body: $body}) {
                    issue {
                        id
                        body
                    }
                }
            `);
            variables.body = body;
        }

        // Add state change mutation if state is provided
        if (state !== undefined) {
            if (state === "closed") {
                // Use closeIssue mutation for closing
                mutations.push(`
                    closeIssue(input: {issueId: $issueId}) {
                        issue {
                            id
                            state
                        }
                    }
                `);
            } else {
                // Use reopenIssue mutation for reopening
                mutations.push(`
                    reopenIssue(input: {issueId: $issueId}) {
                        issue {
                            id
                            state
                        }
                    }
                `);
            }
        }

        // Add labels if provided
        if (labels !== undefined && labels.length > 0) {
            // First, fetch all repository labels to get their IDs
            const labelsQuery = `
                query GetLabelIds($owner: String!, $name: String!) {
                    repository(owner: $owner, name: $name) {
                        labels(first: 100) {
                            nodes {
                                id
                                name
                            }
                        }
                    }
                }
            `;

            // Execute query to get label IDs
            const labelsResponse = await octokit.graphql(labelsQuery, {
                owner,
                name: repo
            }) as { repository: { labels: { nodes: IssueLabel[] } } };

            const allLabels = labelsResponse.repository.labels.nodes;

            // Map label names to their IDs, filtering out any that don't exist
            const labelIds = labels.map(labelName => {
                const label = allLabels.find((l) => l.name === labelName);
                return label?.id;
            }).filter(Boolean);

            // Only add the mutation if we found valid label IDs
            if (labelIds.length > 0) {
                mutations.push(`
                    addLabelsToLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                        clientMutationId
                    }
                `);
                variables.labelIds = labelIds;
            }
        }

        // Add assignees if provided
        if (assignees !== undefined && assignees.length > 0) {
            mutations.push(`
                addAssigneesToAssignable(input: {assignableId: $issueId, assigneeIds: $assigneeIds}) {
                    clientMutationId
                }
            `);
            variables.assigneeIds = assignees;
        }

        // Ensure at least one update was specified
        if (mutations.length === 0) {
            throw new GitHubAPIError("No updates specified");
        }

        // Build the final mutation with dynamic variable types based on what's included
        const mutation = `
        mutation UpdateIssue(${Object.keys(variables).map(key => {
        if (key === "issueId") return "$issueId: ID!";
        if (key === "body") return "$body: String!";
        if (key === "labelIds") return "$labelIds: [ID!]!";
        if (key === "assigneeIds") return "$assigneeIds: [String!]!";
        return "";
    }).filter(Boolean).join(", ")}) {
                ${mutations.join("\n")}
            }
        `;

        // Execute the mutation with all variables
        const response = await octokit.graphql(mutation, variables);

        return response;
    }

    /**
     * Get repository labels and milestones
     */
    static async getRepoLabelsAndMilestones(repoUrl: string, installationId: string) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build GraphQL query to fetch both labels and milestones in one request
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

        // Execute the query
        const response = await octokit.graphql(query, {
            owner,
            name: repo
        }) as {
            repository: {
                labels: { nodes: IssueLabel[] },
                milestones: { nodes: IssueMilestone[] }
            }
        };

        // Get all labels from response
        const allLabels = response.repository.labels.nodes;
        // Filter out the "💵 Bounty" label
        const filteredLabels = allLabels.filter(label => label.name !== "💵 Bounty");

        // Return filtered labels and all milestones
        return {
            labels: filteredLabels,
            milestones: response.repository.milestones.nodes
        };
    }

    /**
     * Create a label in the repository
     */
    static async createLabel(
        repositoryId: string,
        installationId: string,
        name: string,
        color: string,
        description: string
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);

        // Build GraphQL mutation to create the label
        const mutation = `
            mutation CreateLabel($repositoryId: ID!, $name: String!, $color: String!, $description: String!) {
                createLabel(input: {repositoryId: $repositoryId, name: $name, color: $color, description: $description}) {
                    label {
                        id
                        name
                        color
                        description
                    }
                }
            }
        `;

        // Execute mutation with label details
        const response = await octokit.graphql(mutation, {
            repositoryId,
            name,
            color,
            description
        }) as { createLabel: { label: IssueLabel } };

        // Return the created label object
        return response.createLabel.label;
    }

    static async createBountyLabels(repositoryId: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);

        const labels = [
            {
                name: "💵 Bounty",
                color: "85BB65",
                description: "Issues with a monetary reward"
            },
            {
                name: "Bounty Paid ✅",
                color: "9C53E0",
                description: "Bounty has been successfully paid"
            }
        ];

        // Build mutation string using aliases
        const mutationFields = labels.map((_, index) => `
            label${index}: createLabel(input: $input${index}) {
                label {
                    id
                    name
                    color
                    description
                }
            }
        `).join("\n");

        const mutation = `
            mutation CreateMultipleLabels(${labels.map((_, index) => `$input${index}: CreateLabelInput!`).join(", ")}) {
                ${mutationFields}
            }
        `;

        // Map the label data to the numbered input variables
        const variables = labels.reduce((acc, label, index) => {
            acc[`input${index}`] = {
                repositoryId,
                name: label.name,
                color: label.color,
                description: label.description || ""
            };
            return acc;
        }, {} as Record<string, unknown>);

        // Execute request
        const response = await octokit.graphql(mutation, variables) as Record<string, { label: IssueLabel }>;

        // Return created labels
        return Object.values(response).map(res => res.label);
    }

    /**
     * Get a label from the repository by name
     */
    static async getLabel(
        repositoryId: string,
        installationId: string,
        name: string
    ) {
        const octokit = await this.getOctokit(installationId);

        // Use the direct 'label' field instead of 'labels' search
        const query = `
            query GetLabel($repositoryId: ID!, $name: String!) {
                node(id: $repositoryId) {
                    ... on Repository {
                        label(name: $name) {
                            id
                            name
                            color
                            description
                        }
                    }
                }
            }
        `;

        const response = await octokit.graphql(query, {
            repositoryId,
            name
        }) as { node: { label: IssueLabel | null } };

        const label = response.node.label;

        if (!label) {
            throw new GitHubAPIError(`Label "${name}" not found`);
        }

        return label;
    }

    /**
     * Get bounty label
     */
    static async getBountyLabel(repositoryId: string, installationId: string) {
        return this.getLabel(repositoryId, installationId, "💵 Bounty");
    }

    /**
     * Get bounty paid label
     */
    static async getBountyPaidLabel(repositoryId: string, installationId: string) {
        return this.getLabel(repositoryId, installationId, "Bounty Paid ✅");
    }

    /**
     * Add bounty label and create bounty comment
     */
    static async addBountyLabelAndCreateBountyComment(
        installationId: string,
        issueId: string,
        bountyLabelId: string,
        body: string
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);

        // Build GraphQL mutation to add label and create comment in a single request
        const mutation = `
            mutation AddLabelAndCreateComment($issueId: ID!, $labelIds: [ID!]!, $body: String!) {
                addLabelsToLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                    clientMutationId
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

        // Execute mutation with issue ID, bounty label ID, and comment body
        const response = await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabelId],
            body
        }) as { addComment: { commentEdge: { node: GitHubComment } } };

        // Return the created comment object
        return response.addComment.commentEdge.node;
    }

    /**
     * Add bounty paid label to the issue
     */
    static async addBountyPaidLabel(installationId: string, issueId: string) {
        const octokit = await this.getOctokit(installationId);

        // Get the specific label ID
        const bountyPaidLabel = await this.getBountyPaidLabel(issueId, installationId);

        const mutation = `
            mutation AddLabel($issueId: ID!, $labelIds: [ID!]!) {
                addLabelsToLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                    clientMutationId
                }
            }
        `;

        await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyPaidLabel.id]
        });
    }

    /**
     * Update issue comment 
     */
    static async updateIssueComment(
        installationId: string,
        commentId: string,
        body: string
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);

        // Build GraphQL mutation to update the comment body
        const mutation = `
            mutation UpdateIssueComment($commentId: ID!, $body: String!) {
                updateIssueComment(input: {id: $commentId, body: $body}) {
                    issueComment {
                        id
                        body
                        createdAt
                        updatedAt
                        author {
                            login
                        }
                    }
                }
            }
        `;

        // Execute mutation with comment ID and new body
        const response = await octokit.graphql(mutation, {
            commentId,
            body
        }) as { updateIssueComment: { issueComment: GitHubComment } };

        // Return the updated comment object
        return response.updateIssueComment.issueComment;
    }

    /**
     * Remove bounty label and delete bounty comment
     */
    static async removeBountyLabelAndDeleteBountyComment(
        installationId: string,
        issueId: string,
        commentId: string,
        bountyLabelId: string
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);

        // Build mutation to remove label and delete comment in one request
        const mutation = `
            mutation RemoveLabelAndDeleteComment($issueId: ID!, $labelIds: [ID!]!, $commentId: ID!) {
                removeLabelsFromLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                    clientMutationId
                }
                deleteIssueComment(input: {id: $commentId}) {
                    clientMutationId
                }
            }
        `;

        // Execute mutation to remove label and delete comment
        await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabelId],
            commentId
        });

        return "SUCCESS";
    }

    /**
     * Get pull request files for AI review analysis
     */
    static async getPRFiles(
        installationId: string,
        repoUrl: string,
        prNumber: number
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Fetch all files changed in the pull request (up to 100 files)
        const { data: files } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100 // GitHub's max per page
        });

        // Return the array of file objects with changes
        return files;
    }

    /**
     * Get pull request details for AI review analysis
     */
    static async getPRDetails(
        installationId: string,
        repoUrl: string,
        prNumber: number
    ) {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        try {
            // Fetch pull request details from GitHub API
            const { data: pr } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            // Return the PR object
            return pr;
        } catch (error) {
            // Check if PR was not found (404 error)
            if (getFieldFromUnknownObject<number>(error, "status") === 404) {
                return null;
            }
            // Re-throw other errors with context
            throw new GitHubAPIError(
                "Failed to fetch pull request details",
                error
            );
        }
    }

    /**
     * Get file content from repository
     */
    static async getFileContent(
        installationId: string,
        repoUrl: string,
        filePath: string,
        ref?: string
    ): Promise<string> {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        try {
            // Fetch file content from repository (defaults to HEAD if no ref specified)
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: filePath,
                ref: ref || "HEAD"
            });

            // Ensure we got file content (not a directory)
            if ("content" in data && typeof data.content === "string") {
                // Decode base64 content to UTF-8 string
                return Buffer.from(data.content, "base64").toString("utf-8");
            } else {
                // Path points to a directory or content is unavailable
                throw new Error(`Path ${filePath} is not a file or content not available`);
            }
        } catch (error) {
            // Extract error status code
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");

            // Handle file not found error
            if (errorStatus === 404) {
                throw new GitHubAPIError(
                    `File ${filePath} not found in repository`,
                    error,
                    errorStatus
                );
            }

            // Re-throw other errors with context
            throw new GitHubAPIError(
                `Failed to fetch file content: ${getFieldFromUnknownObject<number>(error, "message")}`,
                error
            );
        }
    }

    /**
     * Get all file paths from repository tree
     * Enhanced version of your getAllFilePathsFromTree function
     */
    static async getAllFilePathsFromTree(
        installationId: string,
        repoUrl: string,
        branch?: string
    ): Promise<string[]> {
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        try {
            // First get the default branch if not specified
            if (!branch) {
                branch = await this.getDefaultBranch(installationId, repoUrl);
            }

            // Get the commit SHA for the branch
            const branchRef = await octokit.rest.git.getRef({
                owner,
                repo,
                ref: `heads/${branch}`
            });
            const commitSha = branchRef.data.object.sha;

            // Get the tree recursively (this gets ALL files at once)
            const tree = await octokit.rest.git.getTree({
                owner,
                repo,
                tree_sha: commitSha,
                recursive: "true" // This gets the entire tree structure
            });

            // Filter to only get file paths (not directories)
            const filePaths = tree.data.tree
                .filter(item => item.type === "blob") // "blob" = file, "tree" = directory
                .map(item => item.path!)
                .filter(path => path); // Remove any undefined paths

            return filePaths;
        } catch (error) {
            if (getFieldFromUnknownObject<number>(error, "status") === 409) {
                messageLogger.info(`Repository ${owner}/${repo} is empty`);
                return [];
            }
            throw new GitHubAPIError(
                `Failed to get file paths: ${getFieldFromUnknownObject<string>(error, "message")}`,
                error
            );
        }
    }

    /**
     * Get the default branch of a repository
     */
    static async getDefaultBranch(installationId: string, repoUrl: string): Promise<string> {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build GraphQL query to fetch the default branch name
        const query = `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                defaultBranchRef {
                    name
                }
            }
        }`;

        try {
            // Execute query to get default branch
            const response = await octokit.graphql(
                query, { owner, repo }
            ) as { repository: { defaultBranchRef: { name: string } } };

            // Return the default branch name, fallback to "main" if not found
            return response.repository.defaultBranchRef?.name || "main";
        } catch {
            // If query fails, log warning and default to "main"
            messageLogger.warn(`Could not get default branch for ${owner}/${repo}, using 'main'`);
            return "main";
        }
    }

    /**
     * Find valid branch from candidates
     */
    static async findValidBranch(
        installationId: string,
        repoUrl: string,
        branchCandidates: string[] = ["main", "master"]
    ): Promise<string> {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Try each branch candidate in order until we find one that exists
        for (const branch of branchCandidates) {
            try {
                // Build GraphQL query to check if branch exists
                const query = `query($owner: String!, $repo: String!, $expression: String!) {
                    repository(owner: $owner, name: $repo) {
                        object(expression: $expression) {
                            oid
                        }
                    }
                }`;

                // Execute query with current branch candidate
                const response = await octokit.graphql(query, {
                    owner,
                    repo,
                    expression: branch
                }) as { repository: { object: { oid: string } } };

                // If object exists, this branch is valid - return it
                if (response.repository.object) {
                    return branch;
                }
            } catch {
                continue; // Try next branch
            }
        }

        // None of the branch candidates were found - throw error
        throw new GitHubAPIError(
            `No valid branch found among: ${branchCandidates.join(", ")}`
        );
    }

    /**
     * Get multiple files with fragments for efficient fetching
     * Enhanced version of your getMultipleFilesWithFragments function
     */
    static async getMultipleFilesWithFragments(
        installationId: string,
        repoUrl: string,
        filePaths: string[],
        branch?: string
    ): Promise<Record<string, { text: string; byteSize: number; isBinary: boolean; oid: string } | null>> {
        // Get authenticated Octokit instance
        const octokit = await this.getOctokit(installationId);
        // Extract owner and repo name from URL
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Auto-detect branch if not provided
        if (!branch) {
            try {
                // Try to get the default branch first
                branch = await this.getDefaultBranch(installationId, repoUrl);
            } catch {
                // If that fails, find a valid branch from common candidates
                branch = await this.findValidBranch(installationId, repoUrl);
            }
        }

        // Limit the number of files per request to avoid GraphQL limits
        const maxFilesPerRequest = 50;
        const results: Record<string, { text: string; byteSize: number; isBinary: boolean; oid: string } | null> = {};

        // Process files in batches to stay within API limits
        for (let i = 0; i < filePaths.length; i += maxFilesPerRequest) {
            // Get the current batch of file paths
            const batchPaths = filePaths.slice(i, i + maxFilesPerRequest);

            // Build individual file queries for this batch using GraphQL fragments
            const fileQueries = batchPaths.map((path, index) => {
                return `file${index}: object(expression: "${branch}:${path}") { ...FileContent }`;
            }).join("\n");

            // Build complete GraphQL query with fragment for file content
            const query = `
                fragment FileContent on Blob {
                    text
                    byteSize
                    isBinary
                    oid
                }
                query($owner: String!, $repo: String!) {
                    repository(owner: $owner, name: $repo) {
                        ${fileQueries}
                    }
                }
            `;

            try {
                // Execute query to fetch all files in this batch
                const response = await octokit.graphql(query, { owner, repo }) as {
                    repository: Record<string, { text: string; byteSize: number; isBinary: boolean; oid: string }>
                };

                // Map the results back to the original file paths
                batchPaths.forEach((path, index) => {
                    results[path] = response.repository[`file${index}`];
                });
            } catch (error) {
                // Log error for this batch
                dataLogger.error(`Error fetching file batch starting at index ${i}`, { error });
                // Mark failed files as null so caller knows they failed
                batchPaths.forEach(path => {
                    results[path] = null;
                });
            }
        }

        // Return the complete results object with all file contents or nulls
        return results;
    }
}
