import { Request, Response, NextFunction } from 'express';
import {
    getInstallationRepositories,
    getRepositoryIssues,
    getRepositoryResources,
    getOrCreateBountyLabel,
    triggerManualPRAnalysis
} from '../../../api/controllers/github.controller';
import { OctokitService } from '../../../api/services/octokit.service';
import { PRAnalysisService } from '../../../api/services/pr-analysis.service';
import { validateUserInstallation } from '../../../api/middlewares/auth.middleware';
import {
    PRNotEligibleError,
    PRAnalysisError,
    GitHubAPIError
} from '../../../api/models/ai-review.errors';
import { TestDataFactory } from '../../helpers/test-data-factory';
import { createMockRequest, createMockResponse, createMockNext } from '../../helpers/test-utils';
import { IssueDto, IssueLabel, IssueMilestone, RepositoryDto } from '@/models/github.model';

// Mock dependencies
jest.mock('../../../api/services/octokit.service');
jest.mock('../../../api/services/pr-analysis.service');
jest.mock('../../../api/middlewares/auth.middleware');

describe('GitHubController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    const mockOctokitService = OctokitService as jest.Mocked<typeof OctokitService>;
    const mockPRAnalysisService = PRAnalysisService as jest.Mocked<typeof PRAnalysisService>;
    const mockValidateUserInstallation = validateUserInstallation as jest.MockedFunction<typeof validateUserInstallation>;

    beforeEach(() => {
        mockRequest = createMockRequest();
        mockResponse = createMockResponse();
        mockNext = createMockNext();

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('getInstallationRepositories', () => {
        it('should return repositories for valid installation', async () => {
            const installationId = 'test-installation-1';
            const userId = 'test-user-1';
            const mockRepositories = [
                { id: 1, name: 'repo1', full_name: 'owner/repo1' } as unknown as RepositoryDto,
                { id: 2, name: 'repo2', full_name: 'owner/repo2' } as unknown as RepositoryDto
            ];

            mockRequest.params = { installationId };
            mockRequest.body = { userId };
            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getInstallationRepositories.mockResolvedValue(mockRepositories);

            await getInstallationRepositories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockValidateUserInstallation).toHaveBeenCalledWith(installationId, userId);
            expect(mockOctokitService.getInstallationRepositories).toHaveBeenCalledWith(installationId);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockRepositories);
        });

        it('should handle validation errors', async () => {
            const error = new Error('Access denied');
            mockValidateUserInstallation.mockRejectedValue(error);

            await getInstallationRepositories(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(error);
        });
    });

    describe('getRepositoryIssues', () => {
        it('should return filtered issues with pagination', async () => {
            const installationId = 'test-installation-1';
            const userId = 'test-user-1';
            const repoUrl = 'https://github.com/owner/repo';
            const mockResult = {
                issues: [{ id: 1, title: 'Test Issue' } as unknown as IssueDto],
                hasMore: false
            };

            mockRequest.params = { installationId };
            mockRequest.body = { userId };
            mockRequest.query = {
                repoUrl,
                title: 'test',
                sort: 'created',
                direction: 'desc',
                page: '1',
                perPage: '30'
            };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getRepoIssuesWithSearch.mockResolvedValue(mockResult);

            await getRepositoryIssues(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockOctokitService.getRepoIssuesWithSearch).toHaveBeenCalledWith(
                repoUrl,
                installationId,
                {
                    title: 'test',
                    labels: undefined,
                    milestone: undefined,
                    sort: 'created',
                    direction: 'desc'
                },
                1,
                30
            );
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({
                issues: mockResult.issues,
                hasMore: mockResult.hasMore,
                pagination: { page: 1, perPage: 30 }
            });
        });
    });

    describe('getRepositoryResources', () => {
        it('should return repository labels and milestones', async () => {
            const installationId = 'test-installation-1';
            const userId = 'test-user-1';
            const repoUrl = 'https://github.com/owner/repo';
            const mockResources = {
                labels: [{ name: 'bug', color: 'ff0000' } as unknown as IssueLabel],
                milestones: [{ title: 'v1.0', number: 1 } as unknown as IssueMilestone]
            };

            mockRequest.params = { installationId };
            mockRequest.body = { userId };
            mockRequest.query = { repoUrl };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getRepoLabelsAndMilestones.mockResolvedValue(mockResources);

            await getRepositoryResources(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockOctokitService.getRepoLabelsAndMilestones).toHaveBeenCalledWith(repoUrl, installationId);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(mockResources);
        });
    });

    describe('getOrCreateBountyLabel', () => {
        it('should return existing bounty label', async () => {
            const installationId = 'test-installation-1';
            const userId = 'test-user-1';
            const repositoryId = 'repo-123';
            const mockLabel = { name: 'bounty', color: '00ff00' } as unknown as IssueLabel;

            mockRequest.params = { installationId };
            mockRequest.body = { userId };
            mockRequest.query = { repositoryId };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getBountyLabel.mockResolvedValue(mockLabel);

            await getOrCreateBountyLabel(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockOctokitService.getBountyLabel).toHaveBeenCalledWith(repositoryId, installationId);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ valid: true, bountyLabel: mockLabel });
        });

        it('should create bounty label if not exists', async () => {
            const installationId = 'test-installation-1';
            const userId = 'test-user-1';
            const repositoryId = 'repo-123';
            const mockLabel = { name: 'bounty', color: '00ff00' };

            mockRequest.params = { installationId };
            mockRequest.body = { userId };
            mockRequest.query = { repositoryId };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getBountyLabel.mockRejectedValue(new Error('Not found'));
            mockOctokitService.createBountyLabel.mockResolvedValue(mockLabel);

            await getOrCreateBountyLabel(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockOctokitService.createBountyLabel).toHaveBeenCalledWith(repositoryId, installationId);
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith({ valid: true, bountyLabel: mockLabel });
        });
    });

    describe('triggerManualPRAnalysis', () => {
        const installationId = 'test-installation-1';
        const userId = 'test-user-1';
        const repositoryName = 'owner/repo';
        const prNumber = 123;

        beforeEach(() => {
            mockRequest.params = { installationId };
            mockRequest.body = { userId, repositoryName, prNumber };
        });

        it('should successfully trigger PR analysis', async () => {
            const mockPRDetails = {
                html_url: 'https://github.com/owner/repo/pull/123',
                title: 'Test PR',
                body: 'Fixes #456',
                user: { login: 'testuser' },
                draft: false
            };

            const mockChangedFiles = [
                { filename: 'src/test.ts', status: 'modified', additions: 10, deletions: 5, patch: 5 }
            ];

            const mockPRData = {
                installationId,
                repositoryName,
                prNumber,
                prUrl: mockPRDetails.html_url,
                title: mockPRDetails.title,
                body: mockPRDetails.body,
                changedFiles: mockChangedFiles,
                linkedIssues: [{ number: 456, url: 'https://github.com/owner/repo/issues/456', linkType: 'fixes' }],
                author: mockPRDetails.user.login,
                isDraft: false
            };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getPRDetails.mockResolvedValue(mockPRDetails as any);
            mockPRAnalysisService.extractLinkedIssues.mockReturnValue([
                { title: "fix bug", body: "bug fixes", number: 456, url: '#456', linkType: 'fixes' }
            ]);
            mockPRAnalysisService.fetchChangedFiles.mockResolvedValue(mockChangedFiles as any[]);
            mockPRAnalysisService.validatePRData.mockReturnValue(undefined);
            mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(true);
            mockPRAnalysisService.calculatePRComplexity.mockReturnValue({
                totalFiles: 15,
                totalAdditions: 500,
                totalDeletions: 200,
                totalChanges: 700,
                averageChangesPerFile: 46.67,
                fileTypes: ['.ts', '.tsx', '.js', '.json', '.css'],
            });

            await triggerManualPRAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockValidateUserInstallation).toHaveBeenCalledWith(installationId, userId);
            expect(mockOctokitService.getPRDetails).toHaveBeenCalledWith(installationId, repositoryName, prNumber);
            expect(mockPRAnalysisService.fetchChangedFiles).toHaveBeenCalledWith(installationId, repositoryName, prNumber);
            expect(mockPRAnalysisService.shouldAnalyzePR).toHaveBeenCalledWith(expect.objectContaining(mockPRData));
            expect(mockResponse.status).toHaveBeenCalledWith(200);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
                message: 'PR analysis triggered successfully',
                data: expect.objectContaining({
                    installationId,
                    repositoryName,
                    prNumber,
                    eligibleForAnalysis: true,
                    triggerType: 'manual',
                    triggeredBy: userId
                })
            }));
        });

        it('should handle PR not found error', async () => {
            const error = { status: 404 };
            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getPRDetails.mockRejectedValue(error);

            await triggerManualPRAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: `PR #${prNumber} not found in repository ${repositoryName}`
            }));
        });

        it('should handle draft PR rejection', async () => {
            const mockPRDetails = {
                html_url: 'https://github.com/owner/repo/pull/123',
                title: 'Test PR',
                body: 'Fixes #456',
                user: { login: 'testuser' },
                draft: true
            };

            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getPRDetails.mockResolvedValue(mockPRDetails as any);
            mockPRAnalysisService.extractLinkedIssues.mockReturnValue([]);
            mockPRAnalysisService.fetchChangedFiles.mockResolvedValue([]);
            mockPRAnalysisService.validatePRData.mockReturnValue(undefined);
            mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(false);

            await triggerManualPRAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: 'PR not eligible for analysis: PR is in draft status'
            }));
        });

        it('should handle PR analysis errors', async () => {
            const error = new PRAnalysisError(123, 'owner/repo', 'ANALYSIS_ERROR');
            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getPRDetails.mockRejectedValue(error);

            await triggerManualPRAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(400);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: error.message,
                code: error.code
            }));
        });

        it('should handle GitHub API errors', async () => {
            const error = new GitHubAPIError('API Error', 500);
            mockValidateUserInstallation.mockResolvedValue(undefined);
            mockOctokitService.getPRDetails.mockRejectedValue(error);

            await triggerManualPRAnalysis(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                error: error.message,
                code: error.code
            }));
        });
    });
});