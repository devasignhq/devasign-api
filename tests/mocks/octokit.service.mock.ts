import { IssueFilters } from "../../api/models";
import {
    IssueDto,
    IssueLabel,
    IssueMilestone,
    RepositoryDto
} from "../../api/models/github.model";

/**
 * Mock Octokit Service for testing
 * Provides comprehensive mocks for GitHub API operations
 */

/**
 * Mock GitHub data structures
 */
interface MockPullRequest {
    id: number;
    number: number;
    title: string;
    body: string;
    user: {
        login: string;
    };
    head: {
        sha: string;
        ref: string;
    };
    base: {
        sha: string;
        ref: string;
    };
    state: "open" | "closed";
    merged: boolean;
}

interface MockPullRequestFile {
    filename: string;
    status: "added" | "modified" | "removed";
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
}

/**
 * Mock repositories data
 */
const mockRepositories: RepositoryDto[] = [
    {
        id: "repo_1",
        databaseId: 123456,
        name: "test-repo",
        nameWithOwner: "test-org/test-repo",
        owner: {
            login: "test-org",
            id: "org_1",
            avatarUrl: "https://github.com/test-org.png",
            url: "https://github.com/test-org"
        },
        isPrivate: false,
        description: "A test repository for mocking",
        url: "https://github.com/test-org/test-repo",
        homepageUrl: "https://test-repo.com"
    }
];

/**
 * Mock issues data
 */
const mockIssues: IssueDto[] = [
    {
        id: "issue_1",
        number: 1,
        title: "Fix authentication bug",
        body: "There's a bug in the authentication flow that needs to be fixed",
        url: "https://github.com/test-org/test-repo/issues/1",
        locked: false,
        state: "OPEN",
        createdAt: "2024-01-01T00:00:00Z",
        updatedAt: "2024-01-01T00:00:00Z",
        labels: {
            nodes: [
                {
                    id: 2,
                    name: "bug",
                    color: "d73a4a",
                    description: "Something isn't working"
                }
            ]
        },
        repository: {
            url: "https://github.com/test-org/test-repo"
        }
    },
    {
        id: "issue_2",
        number: 2,
        title: "Add new feature",
        body: "Implement a new feature for user management",
        url: "https://github.com/test-org/test-repo/issues/2",
        locked: false,
        state: "OPEN",
        createdAt: "2024-01-02T00:00:00Z",
        updatedAt: "2024-01-02T00:00:00Z",
        labels: {
            nodes: [
                {
                    id: 3,
                    name: "enhancement",
                    color: "a2eeef",
                    description: "New feature or request"
                }
            ]
        },
        repository: {
            url: "https://github.com/test-org/test-repo"
        }
    }
];

/**
 * Mock labels data
 */
const mockLabels: IssueLabel[] = [
    {
        id: 1,
        name: "bug",
        color: "d73a4a",
        description: "Something isn't working"
    },
    {
        id: 2,
        name: "enhancement",
        color: "a2eeef",
        description: "New feature or request"
    },
    {
        id: 3,
        name: "💵 Bounty",
        color: "85BB65",
        description: "Issues with a monetary reward"
    }
];

/**
 * Mock milestones data
 */
const mockMilestones: IssueMilestone[] = [
    {
        id: "milestone_1",
        number: 1,
        title: "v1.0.0 Release"
    },
    {
        id: "milestone_2",
        number: 2,
        title: "v1.1.0 Release"
    }
];

/**
 * Mock Octokit Service class
 */
export class MockOctokitService {
    private static mockData = {
        repositories: [...mockRepositories],
        issues: [...mockIssues],
        labels: [...mockLabels],
        milestones: [...mockMilestones],
        pullRequests: new Map<string, MockPullRequest>(),
        prFiles: new Map<string, MockPullRequestFile[]>(),
        fileContents: new Map<string, string>()
    };

    private static shouldSimulateError = false;
    private static errorType: "network" | "not_found" | "unauthorized" | "rate_limit" | null = null;

    /**
     * Mock getOctokit method
     */
    static async getOctokit() {
        if (this.shouldSimulateError && this.errorType === "unauthorized") {
            throw new Error("Installation not found or unauthorized");
        }

        return {
            rest: {
                pulls: {
                    get: jest.fn().mockImplementation(this.mockGetPR.bind(this)),
                    listFiles: jest.fn().mockImplementation(this.mockListPRFiles.bind(this))
                },
                repos: {
                    getContent: jest.fn().mockImplementation(this.mockGetFileContent.bind(this))
                },
                users: {
                    getByUsername: jest.fn().mockImplementation(this.mockGetUser.bind(this))
                }
            },
            graphql: jest.fn().mockImplementation(this.mockGraphQL.bind(this))
        };
    }

    /**
     * Mock getOwnerAndRepo method
     */
    static getOwnerAndRepo(repoUrl: string): [string, string] {
        if (repoUrl.includes("/")) {
            const parts = repoUrl.split("/");
            if (parts.length >= 2) {
                return [parts[parts.length - 2], parts[parts.length - 1]];
            }
        }
        return ["test-org", "test-repo"];
    }

    /**
     * Mock getInstallationRepositories method
     */
    static async getInstallationRepositories(_installationId: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return this.mockData.repositories;
    }

    /**
     * Mock getInstallationDetails method
     */
    static async getInstallationDetails(installationId: string, githubUsername: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return {
            id: parseInt(installationId),
            target_type: "User",
            account: {
                login: githubUsername,
                id: 12345,
                avatar_url: `https://github.com/${githubUsername}.png`,
                html_url: `https://github.com/${githubUsername}`
            }
        };
    }

    /**
     * Mock checkGithubUser method
     */
    static async checkGithubUser(username: string, _installationId: string): Promise<boolean> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError && this.errorType === "not_found") {
            return false;
        }

        return username !== "nonexistent-user";
    }

    /**
     * Mock getRepoDetails method
     */
    static async getRepoDetails(_repoUrl: string, _installationId: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return this.mockData.repositories[0];
    }

    /**
     * Mock getRepoIssuesWithSearch method
     */
    static async getRepoIssuesWithSearch(
        _repoUrl: string,
        _installationId: string,
        filters?: IssueFilters,
        page = 1,
        perPage = 30
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        let filteredIssues = [...this.mockData.issues];

        // Apply filters
        if (filters?.title) {
            filteredIssues = filteredIssues.filter(issue =>
                issue.title.toLowerCase().includes(filters.title!.toLowerCase())
            );
        }

        if (filters?.labels?.length) {
            filteredIssues = filteredIssues.filter(issue =>
                filters.labels!.some(label =>
                    issue.labels.nodes.some(issueLabel => issueLabel.name === label)
                )
            );
        }

        // Pagination
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedIssues = filteredIssues.slice(startIndex, endIndex);

        return {
            issues: paginatedIssues,
            hasMore: endIndex < filteredIssues.length
        };
    }

    /**
     * Mock getRepoIssue method
     */
    static async getRepoIssue(_repoUrl: string, _installationId: string, issueNumber: number) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const issue = this.mockData.issues.find(i => i.number === issueNumber);
        if (!issue) {
            throw new Error("Issue not found");
        }

        return issue;
    }

    /**
     * Mock updateRepoIssue method
     */
    static async updateRepoIssue(
        _installationId: string,
        _repoUrl: string,
        _issueId: string | number,
        _body?: string,
        _labels?: string[],
        _assignees?: string[],
        _state?: "open" | "closed"
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return { success: true };
    }

    /**
     * Mock getRepoLabelsAndMilestones method
     */
    static async getRepoLabelsAndMilestones(_repoUrl: string, _installationId: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return {
            labels: this.mockData.labels.filter(label => label.name !== "💵 Bounty"),
            milestones: this.mockData.milestones
        };
    }

    /**
     * Mock createBountyLabel method
     */
    static async createBountyLabel(_repositoryId: string, _installationId: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const bountyLabel = this.mockData.labels.find(label => label.name === "💵 Bounty");
        return bountyLabel;
    }

    /**
     * Mock getBountyLabel method
     */
    static async getBountyLabel(_repositoryId: string, _installationId: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const bountyLabel = this.mockData.labels.find(label => label.name === "💵 Bounty");
        if (!bountyLabel) {
            throw new Error("Bounty label not found");
        }

        return bountyLabel;
    }

    /**
     * Mock addBountyLabelAndCreateBountyComment method
     */
    static async addBountyLabelAndCreateBountyComment(
        _installationId: string,
        _issueId: string,
        _bountyLabelId: string,
        body: string
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return {
            id: `comment_${Date.now()}`,
            body,
            createdAt: new Date().toISOString(),
            author: {
                login: "github-actions[bot]"
            }
        };
    }

    /**
     * Mock updateIssueComment method
     */
    static async updateIssueComment(_installationId: string, commentId: string, body: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return {
            id: commentId,
            body,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date().toISOString(),
            author: {
                login: "github-actions[bot]"
            }
        };
    }

    /**
     * Mock removeBountyLabelAndDeleteBountyComment method
     */
    static async removeBountyLabelAndDeleteBountyComment(
        _installationId: string,
        _issueId: string,
        _commentId: string
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return "SUCCESS";
    }

    /**
     * Mock getPRFiles method
     */
    static async getPRFiles(_installationId: string, repoUrl: string, prNumber: number) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const key = `${repoUrl}_${prNumber}`;
        return this.mockData.prFiles.get(key) || [
            {
                filename: "src/components/Button.tsx",
                status: "modified",
                additions: 15,
                deletions: 5,
                changes: 20,
                patch: "@@ -10,7 +10,7 @@ export const Button = ({ children, onClick }) => {\n-  const handleClick = () => {\n+  const handleButtonClick = () => {\n     onClick();\n   };"
            }
        ];
    }

    /**
     * Mock getPRDetails method
     */
    static async getPRDetails(_installationId: string, repoUrl: string, prNumber: number) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const key = `${repoUrl}_${prNumber}`;
        return this.mockData.pullRequests.get(key) || {
            id: prNumber,
            number: prNumber,
            title: "Add new feature",
            body: "This PR adds a new feature to the application",
            user: {
                login: "test-developer"
            },
            head: {
                sha: "abc123",
                ref: "feature-branch"
            },
            base: {
                sha: "def456",
                ref: "main"
            },
            state: "open",
            merged: false
        };
    }

    /**
     * Mock getFileContent method
     */
    static async getFileContent(
        _installationId: string,
        repoUrl: string,
        filePath: string,
        _ref?: string
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const key = `${repoUrl}_${filePath}`;
        return this.mockData.fileContents.get(key) || `// Mock content for ${filePath}\nexport default function() {\n  return 'Hello World';\n}`;
    }

    /**
     * Mock getAllFilePathsFromTree method
     */
    static async getAllFilePathsFromTree(
        _installationId: string,
        _repoUrl: string,
        _branch?: string
    ) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        // Return mock file tree
        return [
            "src/index.ts",
            "src/components/Button.tsx",
            "src/utils/helpers.ts",
            "src/services/api.ts",
            "tests/unit/button.test.ts",
            "README.md",
            "package.json"
        ];
    }

    /**
     * Mock getDefaultBranch method
     */
    static async getDefaultBranch(_installationId: string, _repoUrl: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return "main";
    }

    /**
     * Test utility methods
     */
    static simulateError(errorType: "network" | "not_found" | "unauthorized" | "rate_limit") {
        this.shouldSimulateError = true;
        this.errorType = errorType;
    }

    static clearErrorSimulation() {
        this.shouldSimulateError = false;
        this.errorType = null;
    }

    static setMockPR(repoUrl: string, prNumber: number, pr: MockPullRequest) {
        const key = `${repoUrl}_${prNumber}`;
        this.mockData.pullRequests.set(key, pr);
    }

    static setMockPRFiles(repoUrl: string, prNumber: number, files: MockPullRequestFile[]) {
        const key = `${repoUrl}_${prNumber}`;
        this.mockData.prFiles.set(key, files);
    }

    static setMockFileContent(repoUrl: string, filePath: string, content: string) {
        const key = `${repoUrl}_${filePath}`;
        this.mockData.fileContents.set(key, content);
    }

    static clearMockData() {
        this.mockData.repositories = [...mockRepositories];
        this.mockData.issues = [...mockIssues];
        this.mockData.labels = [...mockLabels];
        this.mockData.milestones = [...mockMilestones];
        this.mockData.pullRequests.clear();
        this.mockData.prFiles.clear();
        this.mockData.fileContents.clear();
    }

    /**
     * Private helper methods
     */
    private static async simulateNetworkDelay() {
        await new Promise(resolve => setTimeout(resolve, 10 + Math.random() * 50));
    }

    private static throwMockError() {
        switch (this.errorType) {
        case "network":
            throw new Error("Network request failed");

        case "not_found":
            const notFoundError = new Error("Not found");
            (notFoundError as any).status = 404;
            throw notFoundError;

        case "unauthorized":
            const unauthorizedError = new Error("Unauthorized");
            (unauthorizedError as any).status = 403;
            throw unauthorizedError;

        case "rate_limit":
            const rateLimitError = new Error("Rate limit exceeded");
            (rateLimitError as any).status = 429;
            throw rateLimitError;

        default:
            throw new Error("GitHub API error");
        }
    }

    private static async mockGetPR({ owner, repo, pull_number }: any) {
        const key = `${owner}/${repo}_${pull_number}`;
        return {
            data: this.mockData.pullRequests.get(key) || {
                id: pull_number,
                number: pull_number,
                title: "Mock PR",
                body: "Mock PR body",
                user: { login: "test-user" },
                head: { sha: "abc123", ref: "feature" },
                base: { sha: "def456", ref: "main" },
                state: "open",
                merged: false
            }
        };
    }

    private static async mockListPRFiles({ owner, repo, pull_number }: any) {
        const key = `${owner}/${repo}_${pull_number}`;
        return {
            data: this.mockData.prFiles.get(key) || []
        };
    }

    private static async mockGetFileContent({ owner, repo, path, _ref }: any) {
        const key = `${owner}/${repo}_${path}`;
        const content = this.mockData.fileContents.get(key) || `// Mock content for ${path}`;
        return {
            data: {
                content: Buffer.from(content).toString("base64"),
                encoding: "base64"
            }
        };
    }

    private static async mockGetUser({ username }: any) {
        if (username === "nonexistent-user") {
            const error = new Error("Not Found");
            (error as any).status = 404;
            throw error;
        }
        return { status: 200, data: { login: username } };
    }

    private static async mockGraphQL(query: string, _variables?: unknown) {
        // Simple GraphQL response mocking based on query content
        if (query.includes("GetInstallationRepositories")) {
            return {
                viewer: {
                    repositories: {
                        nodes: this.mockData.repositories,
                        pageInfo: { hasNextPage: false, endCursor: null }
                    }
                }
            };
        }

        if (query.includes("GetRepoDetails")) {
            return {
                repository: this.mockData.repositories[0]
            };
        }

        if (query.includes("search")) {
            return {
                search: {
                    nodes: this.mockData.issues,
                    pageInfo: { hasNextPage: false },
                    issueCount: this.mockData.issues.length
                }
            };
        }

        return {};
    }
}

/**
 * Jest mock factory for OctokitService
 */
export const createOctokitServiceMock = () => {
    return {
        getOctokit: jest.fn().mockImplementation(MockOctokitService.getOctokit),
        getOwnerAndRepo: jest.fn().mockImplementation(MockOctokitService.getOwnerAndRepo),
        getInstallationRepositories: jest.fn().mockImplementation(MockOctokitService.getInstallationRepositories),
        getInstallationDetails: jest.fn().mockImplementation(MockOctokitService.getInstallationDetails),
        checkGithubUser: jest.fn().mockImplementation(MockOctokitService.checkGithubUser),
        getRepoDetails: jest.fn().mockImplementation(MockOctokitService.getRepoDetails),
        getRepoIssuesWithSearch: jest.fn().mockImplementation(MockOctokitService.getRepoIssuesWithSearch),
        getRepoIssue: jest.fn().mockImplementation(MockOctokitService.getRepoIssue),
        updateRepoIssue: jest.fn().mockImplementation(MockOctokitService.updateRepoIssue),
        getRepoLabelsAndMilestones: jest.fn().mockImplementation(MockOctokitService.getRepoLabelsAndMilestones),
        createBountyLabel: jest.fn().mockImplementation(MockOctokitService.createBountyLabel),
        getBountyLabel: jest.fn().mockImplementation(MockOctokitService.getBountyLabel),
        addBountyLabelAndCreateBountyComment: jest.fn().mockImplementation(MockOctokitService.addBountyLabelAndCreateBountyComment),
        updateIssueComment: jest.fn().mockImplementation(MockOctokitService.updateIssueComment),
        removeBountyLabelAndDeleteBountyComment: jest.fn().mockImplementation(MockOctokitService.removeBountyLabelAndDeleteBountyComment),
        getPRFiles: jest.fn().mockImplementation(MockOctokitService.getPRFiles),
        getPRDetails: jest.fn().mockImplementation(MockOctokitService.getPRDetails),
        getFileContent: jest.fn().mockImplementation(MockOctokitService.getFileContent),
        getAllFilePathsFromTree: jest.fn().mockImplementation(MockOctokitService.getAllFilePathsFromTree),
        getDefaultBranch: jest.fn().mockImplementation(MockOctokitService.getDefaultBranch)
    };
};

/**
 * Test helper functions for Octokit mocking
 */
export const OctokitTestHelpers = {
    /**
     * Creates mock issue data for testing
     */
    createMockIssue: (overrides: Partial<IssueDto> = {}): IssueDto => ({
        id: "mock_issue_123",
        number: 123,
        title: "Test issue",
        body: "This is a test issue",
        url: "https://github.com/test-org/test-repo/issues/123",
        locked: false,
        state: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        labels: {
            nodes: []
        },
        repository: {
            url: "https://github.com/test-org/test-repo"
        },
        ...overrides
    }),

    /**
     * Creates mock repository data for testing
     */
    createMockRepository: (overrides: Partial<RepositoryDto> = {}): RepositoryDto => ({
        id: "mock_repo_123",
        databaseId: 123456,
        name: "test-repo",
        nameWithOwner: "test-org/test-repo",
        owner: {
            login: "test-org",
            id: "org_123",
            avatarUrl: "https://github.com/test-org.png",
            url: "https://github.com/test-org"
        },
        isPrivate: false,
        description: "A test repository",
        url: "https://github.com/test-org/test-repo",
        homepageUrl: "https://github.com/test-org/test-repo",
        ...overrides
    }),

    /**
     * Sets up Octokit mocks for testing
     */
    setupOctokitMocks: () => {
        MockOctokitService.clearMockData();
        MockOctokitService.clearErrorSimulation();

        return {
            mockService: MockOctokitService,
            mockRepositories,
            mockIssues,
            mockLabels,
            mockMilestones
        };
    },

    /**
     * Resets all Octokit mocks
     */
    resetOctokitMocks: () => {
        MockOctokitService.clearMockData();
        MockOctokitService.clearErrorSimulation();
        jest.clearAllMocks();
    }
};
