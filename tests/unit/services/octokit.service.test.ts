import { OctokitService } from '../../../api/services/octokit.service';
import { ErrorClass } from '../../../api/models/general.model';

// Mock Octokit App
const mockInstallationOctokit = {
    rest: {
        users: {
            getByUsername: jest.fn()
        },
        repos: {
            getContent: jest.fn(),
            get: jest.fn()
        },
        pulls: {
            listFiles: jest.fn(),
            get: jest.fn()
        },
        git: {
            getRef: jest.fn(),
            getTree: jest.fn()
        }
    },
    graphql: jest.fn(),
    request: jest.fn()
};

const mockApp = {
    getInstallationOctokit: jest.fn().mockResolvedValue(mockInstallationOctokit)
};

jest.mock('octokit', () => ({
    App: jest.fn().mockImplementation(() => mockApp)
}));

// Mock environment variables
const originalEnv = process.env;

describe('OctokitService', () => {
    beforeEach(() => {
        // Set up environment variables
        process.env = {
            ...originalEnv,
            GITHUB_APP_ID: 'test_app_id',
            GITHUB_APP_PRIVATE_KEY: 'test_private_key',
            CONTRIBUTOR_APP_URL: 'https://test-app.com'
        };

        // Reset all mocks
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getOctokit', () => {
        it('should get Octokit instance for installation', async () => {
            // Arrange
            const installationId = '12345';

            // Act
            const result = await OctokitService.getOctokit(installationId);

            // Assert
            expect(result).toBe(mockInstallationOctokit);
            expect(mockApp.getInstallationOctokit).toHaveBeenCalledWith(12345);
        });
    });

    describe('getOwnerAndRepo', () => {
        it('should extract owner and repo from direct format', () => {
            // Arrange
            const repoUrl = 'owner/repo';

            // Act
            const [owner, repo] = OctokitService.getOwnerAndRepo(repoUrl);

            // Assert
            expect(owner).toBe('owner');
            expect(repo).toBe('repo');
        });

        it('should extract owner and repo from GitHub URL', () => {
            // Arrange
            const repoUrl = 'https://github.com/owner/repo';

            // Act
            const [owner, repo] = OctokitService.getOwnerAndRepo(repoUrl);

            // Assert
            expect(owner).toBe('owner');
            expect(repo).toBe('repo');
        });

        it('should extract owner and repo from PR URL', () => {
            // Arrange
            const repoUrl = 'https://github.com/owner/repo/pull/123';

            // Act
            const [owner, repo] = OctokitService.getOwnerAndRepo(repoUrl);

            // Assert
            expect(owner).toBe('owner');
            expect(repo).toBe('repo');
        });

        it('should extract owner and repo from issue URL', () => {
            // Arrange
            const repoUrl = 'https://github.com/owner/repo/issues/456';

            // Act
            const [owner, repo] = OctokitService.getOwnerAndRepo(repoUrl);

            // Assert
            expect(owner).toBe('owner');
            expect(repo).toBe('repo');
        });
    });

    describe('checkGithubUser', () => {
        it('should return true when user exists', async () => {
            // Arrange
            const username = 'testuser';
            const installationId = '12345';
            mockInstallationOctokit.rest.users.getByUsername.mockResolvedValue({ status: 200 });

            // Act
            const result = await OctokitService.checkGithubUser(username, installationId);

            // Assert
            expect(result).toBe(true);
            expect(mockInstallationOctokit.rest.users.getByUsername).toHaveBeenCalledWith({ username });
        });

        it('should return false when user does not exist', async () => {
            // Arrange
            const username = 'nonexistentuser';
            const installationId = '12345';
            mockInstallationOctokit.rest.users.getByUsername.mockRejectedValue(new Error('User not found'));

            // Act
            const result = await OctokitService.checkGithubUser(username, installationId);

            // Assert
            expect(result).toBe(false);
        });
    }); 
    describe('getInstallationDetails', () => {
        it('should get installation details for user installation', async () => {
            // Arrange
            const installationId = '12345';
            const githubUsername = 'testuser';
            const mockInstallation = {
                id: 12345,
                target_type: 'User',
                account: { login: 'testuser' }
            };

            mockInstallationOctokit.request.mockResolvedValue({ data: mockInstallation });

            // Act
            const result = await OctokitService.getInstallationDetails(installationId, githubUsername);

            // Assert
            expect(result).toEqual(mockInstallation);
            expect(mockInstallationOctokit.request).toHaveBeenCalledWith(
                'GET /app/installations/{installation_id}',
                { installation_id: 12345 }
            );
        });

        it('should throw error for unauthorized user installation access', async () => {
            // Arrange
            const installationId = '12345';
            const githubUsername = 'unauthorizeduser';
            const mockInstallation = {
                id: 12345,
                target_type: 'User',
                account: { login: 'testuser' }
            };

            mockInstallationOctokit.request.mockResolvedValue({ data: mockInstallation });

            // Act & Assert
            await expect(OctokitService.getInstallationDetails(installationId, githubUsername))
                .rejects.toThrow(ErrorClass);
        });

        it('should handle organization installation with valid membership', async () => {
            // Arrange
            const installationId = '12345';
            const githubUsername = 'testuser';
            const mockInstallation = {
                id: 12345,
                target_type: 'Organization',
                account: { name: 'testorg' }
            };

            mockInstallationOctokit.request
                .mockResolvedValueOnce({ data: mockInstallation })
                .mockResolvedValueOnce({ data: { state: 'active' } });

            // Act
            const result = await OctokitService.getInstallationDetails(installationId, githubUsername);

            // Assert
            expect(result).toEqual(mockInstallation);
            expect(mockInstallationOctokit.request).toHaveBeenCalledWith(
                'GET /orgs/{org}/memberships/{username}',
                { org: 'testorg', username: githubUsername }
            );
        });

        it('should throw error for pending organization membership', async () => {
            // Arrange
            const installationId = '12345';
            const githubUsername = 'testuser';
            const mockInstallation = {
                id: 12345,
                target_type: 'Organization',
                account: { name: 'testorg' }
            };

            mockInstallationOctokit.request
                .mockResolvedValueOnce({ data: mockInstallation })
                .mockResolvedValueOnce({ data: { state: 'pending' } });

            // Act & Assert
            await expect(OctokitService.getInstallationDetails(installationId, githubUsername))
                .rejects.toThrow(ErrorClass);
        });
    });

    describe('getRepoDetails', () => {
        it('should get repository details successfully', async () => {
            // Arrange
            const repoUrl = 'owner/repo';
            const installationId = '12345';
            const mockRepoData = {
                id: 'repo_id',
                name: 'repo',
                nameWithOwner: 'owner/repo',
                owner: { login: 'owner' },
                isPrivate: false,
                description: 'Test repository'
            };

            mockInstallationOctokit.graphql.mockResolvedValue({ repository: mockRepoData });

            // Act
            const result = await OctokitService.getRepoDetails(repoUrl, installationId);

            // Assert
            expect(result).toEqual(mockRepoData);
            expect(mockInstallationOctokit.graphql).toHaveBeenCalledWith(
                expect.stringContaining('query GetRepoDetails'),
                { owner: 'owner', name: 'repo' }
            );
        });
    });

    describe('getRepoIssue', () => {
        it('should get single repository issue', async () => {
            // Arrange
            const repoUrl = 'owner/repo';
            const installationId = '12345';
            const issueNumber = 123;
            const mockIssue = {
                id: 'issue_id',
                number: 123,
                title: 'Test Issue',
                body: 'Issue description',
                state: 'open'
            };

            mockInstallationOctokit.graphql.mockResolvedValue({ repository: { issue: mockIssue } });

            // Act
            const result = await OctokitService.getRepoIssue(repoUrl, installationId, issueNumber);

            // Assert
            expect(result).toEqual(mockIssue);
            expect(mockInstallationOctokit.graphql).toHaveBeenCalledWith(
                expect.stringContaining('query GetRepoIssue'),
                { owner: 'owner', name: 'repo', number: issueNumber }
            );
        });
    });

    describe('getPRFiles', () => {
        it('should get pull request files', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const prNumber = 123;
            const mockFiles = [
                { filename: 'file1.js', status: 'modified', additions: 10, deletions: 5 },
                { filename: 'file2.js', status: 'added', additions: 20, deletions: 0 }
            ];

            mockInstallationOctokit.rest.pulls.listFiles.mockResolvedValue({ data: mockFiles });

            // Act
            const result = await OctokitService.getPRFiles(installationId, repoUrl, prNumber);

            // Assert
            expect(result).toEqual(mockFiles);
            expect(mockInstallationOctokit.rest.pulls.listFiles).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                pull_number: prNumber,
                per_page: 100
            });
        });
    });

    describe('getPRDetails', () => {
        it('should get pull request details', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const prNumber = 123;
            const mockPR = {
                id: 123,
                number: 123,
                title: 'Test PR',
                body: 'PR description',
                state: 'open'
            };

            mockInstallationOctokit.rest.pulls.get.mockResolvedValue({ data: mockPR });

            // Act
            const result = await OctokitService.getPRDetails(installationId, repoUrl, prNumber);

            // Assert
            expect(result).toEqual(mockPR);
            expect(mockInstallationOctokit.rest.pulls.get).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                pull_number: prNumber
            });
        });

        it('should return null when PR not found', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const prNumber = 999;
            const error = new Error('Not found');
            (error as any).status = 404;

            mockInstallationOctokit.rest.pulls.get.mockRejectedValue(error);

            // Act
            const result = await OctokitService.getPRDetails(installationId, repoUrl, prNumber);

            // Assert
            expect(result).toBeNull();
        });

        it('should throw ErrorClass for other errors', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const prNumber = 123;
            const error = new Error('API Error');
            (error as any).status = 500;

            mockInstallationOctokit.rest.pulls.get.mockRejectedValue(error);

            // Act & Assert
            await expect(OctokitService.getPRDetails(installationId, repoUrl, prNumber))
                .rejects.toThrow(ErrorClass);
        });
    });

    describe('getFileContent', () => {
        it('should get file content successfully', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const filePath = 'src/index.js';
            const fileContent = 'console.log("Hello World");';
            const encodedContent = Buffer.from(fileContent).toString('base64');

            mockInstallationOctokit.rest.repos.getContent.mockResolvedValue({
                data: {
                    content: encodedContent,
                    encoding: 'base64'
                }
            });

            // Act
            const result = await OctokitService.getFileContent(installationId, repoUrl, filePath);

            // Assert
            expect(result).toBe(fileContent);
            expect(mockInstallationOctokit.rest.repos.getContent).toHaveBeenCalledWith({
                owner: 'owner',
                repo: 'repo',
                path: filePath,
                ref: 'HEAD'
            });
        });

        it('should handle file not found error', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const filePath = 'nonexistent.js';
            const error = new Error('Not found');
            (error as any).status = 404;

            mockInstallationOctokit.rest.repos.getContent.mockRejectedValue(error);

            // Act & Assert
            await expect(OctokitService.getFileContent(installationId, repoUrl, filePath))
                .rejects.toThrow(ErrorClass);
        });

        it('should handle directory instead of file', async () => {
            // Arrange
            const installationId = '12345';
            const repoUrl = 'owner/repo';
            const filePath = 'src';

            mockInstallationOctokit.rest.repos.getContent.mockResolvedValue({
                data: [] // Directory returns array
            });

            // Act & Assert
            await expect(OctokitService.getFileContent(installationId, repoUrl, filePath))
                .rejects.toThrow('Path src is not a file or content not available');
        });
    });

    describe('customBountyMessage', () => {
        it('should generate correct bounty message', () => {
            // Arrange
            const bounty = '100';
            const taskId = 'task123';

            // Act
            const result = OctokitService.customBountyMessage(bounty, taskId);

            // Assert
            expect(result).toContain('$100.00 USDC Bounty');
            expect(result).toContain('Apply here');
            expect(result).toContain(`taskId=${taskId}`);
            expect(result).toContain(process.env.CONTRIBUTOR_APP_URL);
        });
    });

    describe('Error Handling', () => {
        it('should handle GraphQL errors', async () => {
            // Arrange
            const repoUrl = 'owner/repo';
            const installationId = '12345';
            mockInstallationOctokit.graphql.mockRejectedValue(new Error('GraphQL Error'));

            // Act & Assert
            await expect(OctokitService.getRepoDetails(repoUrl, installationId))
                .rejects.toThrow('GraphQL Error');
        });

        it('should handle REST API errors', async () => {
            // Arrange
            const username = 'testuser';
            const installationId = '12345';
            mockInstallationOctokit.rest.users.getByUsername.mockRejectedValue(new Error('API Error'));

            // Act
            const result = await OctokitService.checkGithubUser(username, installationId);

            // Assert
            expect(result).toBe(false);
        });

        it('should handle installation access errors', async () => {
            // Arrange
            const installationId = '12345';
            mockApp.getInstallationOctokit.mockRejectedValue(new Error('Installation not found'));

            // Act & Assert
            await expect(OctokitService.getOctokit(installationId))
                .rejects.toThrow('Installation not found');
        });
    });
});