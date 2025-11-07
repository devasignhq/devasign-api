import { App } from "octokit";
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

const commentCTA = `${process.env.CONTRIBUTOR_APP_URL!  }/application`;

export class OctokitService {
    private static githubApp = new App({
        appId: process.env.GITHUB_APP_ID!,
        privateKey: process.env.GITHUB_APP_PRIVATE_KEY!
    });

    public static customBountyMessage = (bounty: string, taskId: string) => {
        return `\n\n\n## 💵 ${moneyFormat(bounty)} USDC Bounty\n\n
        ### Steps to solve:\n
        1. **Accept task**: Follow the CTA and apply to solve this issue.\n
        2. **Submit work**: If your application was accepted, you'll be required to submit the link to your pull request and an optional link to a reference that will give more credibility to the work done.\n
        3. **Receive payment**: When your pull request is approved, 100% of the bounty is instantly transferred to your wallet.\n\n
        **To work on this task, [Apply here](${commentCTA}?taskId=${taskId})**`;
    };

    /**
     * Get Octokit instance for a specific installation
     */
    public static async getOctokit(installationId: string): Promise<InstallationOctokit> {
        const octokit = await this.githubApp.getInstallationOctokit(Number(installationId));
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
        // Handle both URL format (https://github.com/owner/repo) and owner/repo format
        const parts = repoUrl.split("/");

        if (parts.length === 2) {
            // Direct owner/repo format
            return [parts[0], parts[1]];
        } else {
            // URL format - find owner and repo in the path
            // For URLs like: https://github.com/owner/repo or https://github.com/owner/repo/pull/123
            const githubIndex = parts.findIndex(part => part === "github.com");
            if (githubIndex !== -1 && githubIndex + 2 < parts.length) {
                return [parts[githubIndex + 1], parts[githubIndex + 2]];
            } else {
                // Fallback: take the last two non-empty parts
                const nonEmptyParts = parts.filter(part => part.length > 0);
                return [nonEmptyParts[nonEmptyParts.length - 2], nonEmptyParts[nonEmptyParts.length - 1]];
            }
        }
    }

    /**
     * Get repositories for an installation
     */
    static async getInstallationRepositories(installationId: string) {
        const octokit = await this.getOctokit(installationId);

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

        const response = await octokit.graphql(query) as {
            viewer : { repositories: { nodes: RepositoryDto[] } }
        };

        return response.viewer.repositories.nodes;
    }

    /**
     * Get installation details from GitHub with user verification
     */
    static async getInstallationDetails(installationId: string, githubUsername: string) {
        const octokit = await this.getOctokit(installationId);

        const response = await octokit.request(
            "GET /app/installations/{installation_id}",
            { installation_id: Number(installationId) }
        );

        const installation = response.data;

        // Check if user is authorized to access this installation
        if (installation.target_type === "User") {
            // For user installations, check if the requesting user is the account owner
            if (installation.account && "login" in installation.account &&
                installation.account.login !== githubUsername
            ) {
                throw new GitHubAPIError(
                    "Unauthorized: You can only access installations on your own account"
                );
            }
        } else if (installation.target_type === "Organization" &&
            installation.account && "name" in installation.account
        ) {
            // For organization installations, check if user is a member
            try {
                const membership = await octokit.request("GET /orgs/{org}/memberships/{username}", {
                    org: installation.account.name!,
                    username: githubUsername
                });

                // Ensure user is an active member
                if (membership.data.state === "pending") {
                    throw new GitHubAPIError(
                        "Unauthorized: You must be an active member of this organization to access its installation"
                    );
                }
            } catch (error) {
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");
                if (errorStatus === 404 || errorStatus === 403) {
                    throw new GitHubAPIError(
                        "Unauthorized: You must be a member of this organization to access its installation",
                        error
                    );
                }
                throw new GitHubAPIError(
                    "An error occured while verifying the installation",
                    error
                );
            }
        }

        return response.data;
    }

    /**
     * Check if GitHub user exists
     */
    static async checkGithubUser(username: string, installationId: string): Promise<boolean> {
        const octokit = await this.getOctokit(installationId);

        try {
            const response = await octokit.rest.users.getByUsername({
                username
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

        const response = await octokit.graphql(query, {
            owner,
            name: repo
        }) as { repository: RepositoryDto };

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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        let queryString = `repo:${owner}/${repo} is:issue is:open`;

        if (filters?.title) {
            queryString += ` "${filters.title}" in:title`;
        }

        if (filters?.labels?.length) {
            queryString += ` ${filters.labels.map(label => `label:"${label}"`).join(" ")}`;
        }

        if (filters?.milestone) {
            queryString += ` milestone:"${filters.milestone}"`;
        }

        if (filters?.sort && filters?.direction) {
            queryString += ` sort:"${filters.sort}-${filters.direction}"`;
        }

        queryString += " -label:\"💵 Bounty\"";

        const after = page > 1 ? `after: "${btoa(`cursor:${(page - 1) * perPage}`)}",` : "";

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

        const response = await octokit.graphql(query, { queryString }) as {
            search: {
                nodes: IssueDto[],
                pageInfo: { hasNextPage: boolean }
            }
        };

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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

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

        const response = await octokit.graphql(query, {
            owner,
            name: repo,
            number: issueNumber
        }) as { repository: { issue: IssueDto } };

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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Build the mutation dynamically based on what needs to be updated
        const mutations = [];
        const variables: Record<string, unknown> = { issueId };

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

        if (state !== undefined) {
            if (state === "closed") {
                mutations.push(`
                    closeIssue(input: {issueId: $issueId}) {
                        issue {
                            id
                            state
                        }
                    }
                `);
            } else {
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

        if (labels !== undefined && labels.length > 0) {
            // Get label IDs first
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

            const labelsResponse = await octokit.graphql(labelsQuery, {
                owner,
                name: repo
            }) as { repository: { labels: { nodes: IssueLabel[] } } };

            const allLabels = labelsResponse.repository.labels.nodes;
            const labelIds = labels.map(labelName => {
                const label = allLabels.find((l) => l.name === labelName);
                return label?.id;
            }).filter(Boolean);

            if (labelIds.length > 0) {
                mutations.push(`
                    addLabelsToLabelable(input: {labelableId: $issueId, labelIds: $labelIds}) {
                        clientMutationId
                    }
                `);
                variables.labelIds = labelIds;
            }
        }

        if (assignees !== undefined && assignees.length > 0) {
            mutations.push(`
                addAssigneesToAssignable(input: {assignableId: $issueId, assigneeIds: $assigneeIds}) {
                    clientMutationId
                }
            `);
            variables.assigneeIds = assignees;
        }

        if (mutations.length === 0) {
            throw new GitHubAPIError("No updates specified");
        }

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

        const response = await octokit.graphql(mutation, variables);

        return response;
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
            name: repo
        }) as {
            repository: {
                labels: { nodes: IssueLabel[] },
                milestones: { nodes: IssueMilestone[] }
            }
        };

        const allLabels = response.repository.labels.nodes;
        const filteredLabels = allLabels.filter(label => label.name !== "💵 Bounty");

        return {
            labels: filteredLabels,
            milestones: response.repository.milestones.nodes
        };
    }

    /**
     * Create bounty label
     */
    static async createBountyLabel(repositoryId: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);

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

        const response = await octokit.graphql(mutation, {
            repositoryId,
            name: "💵 Bounty",
            color: "85BB65",
            description: "Issues with a monetary reward"
        }) as { createLabel: { label: IssueLabel } };

        return response.createLabel.label;
    }

    /**
     * Get bounty label
     */
    static async getBountyLabel(repositoryId: string, installationId: string) {
        const octokit = await this.getOctokit(installationId);

        const query = `
            query GetBountyLabel($repositoryId: ID!) {
                node(id: $repositoryId) {
                    ... on Repository {
                        labels(first: 100, query: "💵 Bounty") {
                            nodes {
                                id
                                name
                                color
                                description
                            }
                        }
                    }
                }
            }
        `;

        const response = await octokit.graphql(query, {
            repositoryId
        }) as { node: { labels: { nodes: IssueLabel[] } } };

        const bountyLabel = response.node.labels.nodes.find(
            (label) => label.name === "💵 Bounty"
        );

        if (!bountyLabel) {
            throw new GitHubAPIError("Bounty label not found");
        }

        return bountyLabel;
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
        const octokit = await this.getOctokit(installationId);

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

        const response = await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabelId],
            body
        }) as { addComment: { commentEdge: { node: GitHubComment } } };

        return response.addComment.commentEdge.node;
    }

    /**
     * Update issue comment 
     */
    static async updateIssueComment(
        installationId: string,
        commentId: string,
        body: string
    ) {
        const octokit = await this.getOctokit(installationId);

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
        const response = await octokit.graphql(mutation, {
            commentId,
            body
        }) as { updateIssueComment: { issueComment: GitHubComment } };

        return response.updateIssueComment.issueComment;
    }

    /**
     * Remove bounty label and delete bounty comment
     */
    static async removeBountyLabelAndDeleteBountyComment(
        installationId: string,
        issueId: string,
        commentId: string
    ) {
        const octokit = await this.getOctokit(installationId);

        // First, get the issue and find the bounty label ID
        const issueQuery = `
            query GetIssueLabels($issueId: ID!) {
                node(id: $issueId) {
                    ... on Issue {
                        labels(first: 100) {
                            nodes {
                                id
                                name
                            }
                        }
                    }
                }
            }
        `;

        const issueResponse = await octokit.graphql(
            issueQuery, { issueId }
        ) as { node: { labels: { nodes: IssueLabel[] } } };
        const labels = issueResponse.node.labels.nodes;
        const bountyLabel = labels.find((label) => label.name === "💵 Bounty");

        if (!bountyLabel) {
            if (commentId && issueId) {
                const mutation = `
                    mutation RemoveLabelAndDeleteComment($issueId: ID!, $commentId: ID!) {
                        deleteIssueComment(input: {id: $commentId}) {
                            clientMutationId
                        }
                    }
                `;

                await octokit.graphql(mutation, {
                    issueId,
                    commentId
                });

                return "SUCCESS";
            }
            throw new GitHubAPIError("Bounty label not found on this issue");
        }

        // Then remove the label and delete the comment
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

        await octokit.graphql(mutation, {
            issueId,
            labelIds: [bountyLabel.id],
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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const { data: files } = await octokit.rest.pulls.listFiles({
            owner,
            repo,
            pull_number: prNumber,
            per_page: 100 // GitHub's max per page
        });

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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        try {
            const { data: pr } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            return pr;
        } catch (error) {
            if (getFieldFromUnknownObject<number>(error, "status") === 404) {
                return null; // PR not found
            }
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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        try {
            const { data } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: filePath,
                ref: ref || "HEAD"
            });

            // Handle file content (not directory)
            if ("content" in data && typeof data.content === "string") {
                // Decode base64 content
                return Buffer.from(data.content, "base64").toString("utf-8");
            } else {
                throw new Error(`Path ${filePath} is not a file or content not available`);
            }
        } catch (error) {
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");

            if (errorStatus === 404) {
                throw new GitHubAPIError(
                    `File ${filePath} not found in repository`,
                    error,
                    errorStatus
                );
            }
                
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
                recursive: "true" // This is key - gets the entire tree structure
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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        const query = `query($owner: String!, $repo: String!) {
            repository(owner: $owner, name: $repo) {
                defaultBranchRef {
                    name
                }
            }
        }`;

        try {
            const response = await octokit.graphql(
                query, { owner, repo }
            ) as { repository: { defaultBranchRef: { name: string } } };

            return response.repository.defaultBranchRef?.name || "main";
        } catch {
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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        for (const branch of branchCandidates) {
            try {
                const query = `query($owner: String!, $repo: String!, $expression: String!) {
                    repository(owner: $owner, name: $repo) {
                        object(expression: $expression) {
                            oid
                        }
                    }
                }`;

                const response = await octokit.graphql(query, {
                    owner,
                    repo,
                    expression: branch
                }) as { repository: { object: { oid: string } } };

                if (response.repository.object) {
                    return branch;
                }
            } catch {
                continue; // Try next branch
            }
        }

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
        const octokit = await this.getOctokit(installationId);
        const [owner, repo] = this.getOwnerAndRepo(repoUrl);

        // Auto-detect branch if not provided
        if (!branch) {
            try {
                branch = await this.getDefaultBranch(installationId, repoUrl);
            } catch {
                branch = await this.findValidBranch(installationId, repoUrl);
            }
        }

        // Limit the number of files per request to avoid GraphQL limits
        const maxFilesPerRequest = 50;
        const results: Record<string, { text: string; byteSize: number; isBinary: boolean; oid: string } | null> = {};

        for (let i = 0; i < filePaths.length; i += maxFilesPerRequest) {
            const batchPaths = filePaths.slice(i, i + maxFilesPerRequest);
            
            const fileQueries = batchPaths.map((path, index) => {
                return `file${index}: object(expression: "${branch}:${path}") { ...FileContent }`;
            }).join("\n");

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
                const response = await octokit.graphql(query, { owner, repo }) as {
                    repository: Record<string, { text: string; byteSize: number; isBinary: boolean; oid: string }>
                };
                
                batchPaths.forEach((path, index) => {
                    results[path] = response.repository[`file${index}`];
                });
            } catch (error) {
                dataLogger.error(`Error fetching file batch starting at index ${i}`, { error });
                // Mark failed files as null
                batchPaths.forEach(path => {
                    results[path] = null;
                });
            }
        }

        return results;
    }
}
