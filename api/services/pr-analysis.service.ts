import {
    PullRequestData,
    LinkedIssue,
    ChangedFile,
    GitHubWebhookPayload
} from '../models/ai-review.model';
import {
    PRNotEligibleError,
    PRAnalysisError,
    GitHubAPIError
} from '../models/ai-review.errors';
import { OctokitService } from './octokit.service';
import { GitHubFile } from '../models/github.model';

/**
 * Service for analyzing PR events and determining eligibility for AI review
 * Requirements: 1.1, 1.3, 1.4
 */
export class PRAnalysisService {

    /**
     * Determines if a PR should be analyzed based on requirements
     * Requirement 1.1: System SHALL trigger AI review for PRs that link to issues
     * Requirement 1.3: System SHALL skip review for PRs that don't link to issues
     * Requirement 1.4: System SHALL not perform AI review for draft PRs
     */
    public static shouldAnalyzePR(prData: PullRequestData): boolean {
        // Skip draft PRs (Requirement 1.4)
        if (prData.isDraft) {
            return false;
        }

        // Must link to at least one issue (Requirement 1.1, 1.3)
        if (prData.linkedIssues.length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Extracts PR data from GitHub webhook payload
     * Requirement 1.1: System SHALL trigger AI review process for qualifying PRs
     */
    public static extractPRDataFromWebhook(payload: GitHubWebhookPayload): PullRequestData {
        const { pull_request, repository, installation } = payload;

        if (!pull_request || !repository || !installation) {
            throw new PRAnalysisError(
                pull_request?.number || 0,
                repository?.full_name || 'unknown',
                'Invalid webhook payload: missing required fields',
                { payload }
            );
        }

        const linkedIssues = this.extractLinkedIssues(pull_request.body || '');

        // Fix relative issue URLs to use current repository
        const fixedLinkedIssues = linkedIssues.map(issue => ({
            ...issue,
            url: issue.url.startsWith('#')
                ? `https://github.com/${repository.full_name}/issues/${issue.number}`
                : issue.url
        }));

        return {
            installationId: installation.id.toString(),
            repositoryName: repository.full_name,
            prNumber: pull_request.number,
            prUrl: pull_request.html_url,
            title: pull_request.title,
            body: pull_request.body || '',
            changedFiles: [], // Will be populated by fetchChangedFiles
            linkedIssues: fixedLinkedIssues,
            author: pull_request.user.login,
            isDraft: pull_request.draft
        };
    }

    /**
     * Extracts linked issues from PR body using keywords
     * Requirement 1.1: System SHALL detect issue linking keywords (closes, resolves, fixes)
     */
    public static extractLinkedIssues(prBody: string): LinkedIssue[] {
        const linkedIssues: LinkedIssue[] = [];

        // Keywords that indicate issue linking
        const linkingKeywords = ['closes', 'resolves', 'fixes', 'close', 'resolve', 'fix'];

        // Regex patterns to match issue references
        const patterns = [
            // "closes #123", "fixes #456"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+#(\d+)/gi,
            // "closes https://github.com/owner/repo/issues/123"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/gi,
            // "closes owner/repo#123"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+([^\/\s]+)\/([^\/\s#]+)#(\d+)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(prBody)) !== null) {
                let issueNumber: number;
                let repositoryPath = '';

                if (match.length === 2) {
                    // Pattern: "closes #123"
                    issueNumber = parseInt(match[1]);
                } else if (match.length === 4) {
                    // Pattern: "closes https://github.com/owner/repo/issues/123" or "closes owner/repo#123"
                    issueNumber = parseInt(match[3]);
                    repositoryPath = `${match[1]}/${match[2]}`;
                } else {
                    continue;
                }

                const linkTypeRaw = match[0].toLowerCase().split(/\s+/)[0];

                // Normalize link type
                const normalizedLinkType = linkTypeRaw === 'close' ? 'closes' :
                    linkTypeRaw === 'resolve' ? 'resolves' :
                        linkTypeRaw === 'fix' ? 'fixes' :
                            linkTypeRaw as 'closes' | 'resolves' | 'fixes';

                // Build issue URL
                let issueUrl: string;
                if (repositoryPath) {
                    issueUrl = `https://github.com/${repositoryPath}/issues/${issueNumber}`;
                } else {
                    // Use placeholder for current repository (will be filled in by caller)
                    issueUrl = `#${issueNumber}`;
                }

                // Avoid duplicates
                if (!linkedIssues.some(issue => issue.number === issueNumber && issue.url === issueUrl)) {
                    linkedIssues.push({
                        number: issueNumber,
                        title: '', // Will be populated by fetchIssueDetails if needed
                        body: '',
                        url: issueUrl,
                        linkType: normalizedLinkType
                    });
                }
            }
        }

        return linkedIssues;
    }

    /**
     * Fetches changed files from GitHub API
     * Requirement 1.1: System SHALL have access to PR details and changed files
     */
    public static async fetchChangedFiles(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<ChangedFile[]> {
        try {
            // Use OctokitService to get PR files
            const files = await OctokitService.getPRFiles(installationId, repositoryName, prNumber);

            return files.map((file: GitHubFile) => ({
                filename: file.filename,
                status: this.normalizeFileStatus(file.status),
                additions: file.additions,
                deletions: file.deletions,
                patch: file.patch || ''
            }));

        } catch (error: any) {
            throw new GitHubAPIError(
                `Failed to fetch changed files for PR #${prNumber}`,
                error.status,
                undefined,
                { installationId, repositoryName, prNumber, originalError: error.message }
            );
        }
    }

    /**
     * Validates PR data completeness
     * Ensures all required data is present for analysis
     */
    public static validatePRData(prData: PullRequestData): void {
        const requiredFields = [
            'installationId',
            'repositoryName',
            'prNumber',
            'prUrl',
            'title',
            'author'
        ];

        const missingFields = requiredFields.filter(field =>
            !prData[field as keyof PullRequestData]
        );

        if (missingFields.length > 0) {
            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                `Missing required PR data fields: ${missingFields.join(', ')}`,
                { missingFields },
                false
            );
        }

        if (prData.linkedIssues.length === 0) {
            throw new PRNotEligibleError(
                prData.prNumber,
                prData.repositoryName,
                'No linked issues found',
                { prBody: prData.body }
            );
        }
    }

    /**
     * Creates a complete PR data object with all required information
     * Combines webhook data with additional API calls
     */
    public static async createCompletePRData(payload: GitHubWebhookPayload): Promise<PullRequestData> {
        const prData = this.extractPRDataFromWebhook(payload);

        // Validate basic data
        this.validatePRData(prData);

        // Check if PR should be analyzed
        if (!this.shouldAnalyzePR(prData)) {
            if (prData.isDraft) {
                throw new PRNotEligibleError(
                    prData.prNumber,
                    prData.repositoryName,
                    'PR is in draft status'
                );
            } else {
                throw new PRNotEligibleError(
                    prData.prNumber,
                    prData.repositoryName,
                    'PR does not link to any issues'
                );
            }
        }

        // Fetch additional data
        try {
            prData.changedFiles = await this.fetchChangedFiles(
                prData.installationId,
                prData.repositoryName,
                prData.prNumber
            );

            return prData;
        } catch (error) {
            if (error instanceof PRNotEligibleError) {
                throw error;
            }

            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                'Failed to create complete PR data',
                { originalError: error instanceof Error ? error.message : String(error) }
            );
        }
    }

    /**
     * Fetches additional PR details from GitHub API
     * Requirement 5.1: System SHALL retrieve relevant context from codebase
     */
    public static async fetchPRDetails(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<Partial<PullRequestData>> {
        try {
            // This can be extended to fetch additional PR details like:
            // - PR reviews and review comments
            // - PR timeline events
            // - Commit details and messages
            // - Branch comparison data

            // For now, return empty object as the basic webhook data is sufficient
            return {};
        } catch (error: any) {
            throw new GitHubAPIError(
                `Failed to fetch PR details for PR #${prNumber}`,
                error.status,
                undefined,
                { installationId, repositoryName, prNumber, originalError: error.message }
            );
        }
    }

    /**
     * Normalizes GitHub file status to our expected format
     */
    private static normalizeFileStatus(status: string): 'added' | 'modified' | 'removed' {
        switch (status) {
            case 'added':
                return 'added';
            case 'removed':
                return 'removed';
            case 'modified':
            case 'renamed':
            case 'copied':
            case 'changed':
            case 'unchanged':
            default:
                return 'modified';
        }
    }

    /**
     * Extracts file extensions from changed files for analysis
     */
    public static getFileExtensions(changedFiles: ChangedFile[]): string[] {
        const extensions = new Set<string>();

        changedFiles.forEach(file => {
            const extension = file.filename.split('.').pop()?.toLowerCase();
            if (extension) {
                extensions.add(extension);
            }
        });

        return Array.from(extensions);
    }

    /**
     * Calculates PR complexity metrics based on changed files
     */
    public static calculatePRComplexity(changedFiles: ChangedFile[]): {
        totalFiles: number;
        totalAdditions: number;
        totalDeletions: number;
        totalChanges: number;
        averageChangesPerFile: number;
        fileTypes: string[];
    } {
        const totalFiles = changedFiles.length;
        const totalAdditions = changedFiles.reduce((sum, file) => sum + file.additions, 0);
        const totalDeletions = changedFiles.reduce((sum, file) => sum + file.deletions, 0);
        const totalChanges = totalAdditions + totalDeletions;
        const averageChangesPerFile = totalFiles > 0 ? totalChanges / totalFiles : 0;
        const fileTypes = this.getFileExtensions(changedFiles);

        return {
            totalFiles,
            totalAdditions,
            totalDeletions,
            totalChanges,
            averageChangesPerFile: Math.round(averageChangesPerFile * 100) / 100,
            fileTypes
        };
    }

    /**
     * Logs PR analysis decision for monitoring
     */
    public static logAnalysisDecision(
        prData: PullRequestData,
        shouldAnalyze: boolean,
        reason?: string
    ): void {
        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            prUrl: prData.prUrl,
            author: prData.author,
            isDraft: prData.isDraft,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            shouldAnalyze,
            reason,
            timestamp: new Date().toISOString()
        };

        if (shouldAnalyze) {
            console.log('PR eligible for AI review:', JSON.stringify(logData, null, 2));
        } else {
            console.log('PR not eligible for AI review:', JSON.stringify(logData, null, 2));
        }
    }

    /**
     * Logs PR data extraction results for monitoring and debugging
     */
    public static logExtractionResult(
        prData: PullRequestData,
        extractionTime: number,
        success: boolean = true,
        error?: Error
    ): void {
        const logData = {
            installationId: prData.installationId,
            repositoryName: prData.repositoryName,
            prNumber: prData.prNumber,
            prUrl: prData.prUrl,
            author: prData.author,
            isDraft: prData.isDraft,
            linkedIssuesCount: prData.linkedIssues.length,
            changedFilesCount: prData.changedFiles.length,
            extractionTimeMs: extractionTime,
            success,
            error: error?.message,
            timestamp: new Date().toISOString()
        };

        if (success) {
            console.log('PR data extraction successful:', JSON.stringify(logData, null, 2));
        } else {
            console.error('PR data extraction failed:', JSON.stringify(logData, null, 2));
        }
    }
}