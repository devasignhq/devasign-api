import {
    PullRequestData,
    LinkedIssue,
    ChangedFile,
    GitHubWebhookPayload,
    ReviewResult,
    FollowUpReviewContext
} from "../../models/ai-review.model";
import { PRAnalysisError, GitHubAPIError, ErrorClass } from "../../models/error.model";
import { OctokitService } from "../octokit.service";
import { GitHubComment, GitHubFile, IssueDto, IssueLabel } from "../../models/github.model";
import { PullRequestContextAnalyzerService } from "./context-analyzer.service";
import { GeminiAIService } from "./gemini-ai.service";
import { getFieldFromUnknownObject } from "../../utilities/helper";
import { dataLogger, messageLogger } from "../../config/logger.config";
import { prisma } from "../../config/database.config";

/**
 * Service for analyzing PR events and determining eligibility for AI review
 */
export class PRAnalysisService {
    private static contextAnalyzer = new PullRequestContextAnalyzerService();
    private static geminiService = new GeminiAIService();

    /**
     * Determines if a PR should be analyzed
     */
    public static shouldAnalyzePR(prData: PullRequestData): boolean {
        // Skip draft PRs
        if (prData.isDraft) {
            return false;
        }

        // Must link to at least one issue
        if (prData.linkedIssues.length === 0) {
            return false;
        }

        return true;
    }

    /**
     * Extracts PR data from GitHub webhook payload
     */
    public static async extractPRDataFromWebhook(payload: GitHubWebhookPayload): Promise<PullRequestData> {
        const { pull_request, repository, installation } = payload;

        if (!pull_request || !repository || !installation) {
            throw new PRAnalysisError(
                pull_request?.number || 0,
                repository?.full_name || "unknown",
                "Invalid webhook payload: missing required fields",
                { payload }
            );
        }

        const linkedIssues = await this.extractLinkedIssues(
            pull_request.body || "",
            installation.id.toString(),
            repository.full_name
        );

        // Fix relative issue URLs to use current repository
        const fixedLinkedIssues = linkedIssues.map(issue => ({
            ...issue,
            url: issue.url.startsWith("#")
                ? `https://github.com/${repository.full_name}/issues/${issue.number}`
                : issue.url
        }));

        return {
            installationId: installation.id.toString(),
            repositoryName: repository.full_name,
            prNumber: pull_request.number,
            prUrl: pull_request.html_url,
            title: pull_request.title,
            body: pull_request.body || "",
            changedFiles: [], // Will be populated by fetchChangedFiles
            linkedIssues: fixedLinkedIssues,
            author: pull_request.user.login,
            isDraft: pull_request.draft,
            formattedPullRequest: ""
        };
    }

    /**
     * Extracts linked issues from PR body using keywords
     */
    public static async extractLinkedIssues(
        prBody: string,
        installationId: string,
        repositoryName: string
    ): Promise<LinkedIssue[]> {
        const linkedIssues: LinkedIssue[] = [];

        const fetchIssueDetails = async (issueNumber: number) => {
            const octokit = await OctokitService.getOctokit(installationId);
            const [owner, repo] = OctokitService.getOwnerAndRepo(repositoryName);

            const query = `
                query($owner: String!, $repo: String!, $issueNumber: Int!) {
                    repository(owner: $owner, name: $repo) {
                        issue(number: $issueNumber) {
                            title
                            body
                            url
                            author {
                                login
                            }
                            labels(first: 100) {
                                nodes {
                                    name
                                    description
                                }
                            }
                            comments(first: 100) {
                                nodes {
                                    author {
                                        login
                                        ... on Bot {
                                            __typename
                                        }
                                    }
                                    body
                                    updatedAt
                                }
                            }
                        }
                    }
                }
            `;

            const variables = {
                owner,
                repo,
                issueNumber
            };

            try {
                const response = await octokit.graphql(query, variables);
                const issue = (response as {
                    repository: {
                        issue: IssueDto & {
                            labels: { nodes: IssueLabel[] };
                            comments: { nodes: GitHubComment[] };
                        }
                    }
                }).repository.issue;

                // Filter out bot comments
                const nonBotComments = issue.comments.nodes.filter(
                    comment => comment.author?.__typename !== "Bot"
                );

                return {
                    title: issue.title,
                    body: issue.body,
                    url: issue.url,
                    labels: issue.labels.nodes,
                    comments: nonBotComments
                };
            } catch {
                return false;
            }
        };

        // Regex patterns to match issue references
        const patterns = [
            // "closes #123", "fixes #456"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+#(\d+)/gi,
            // "closes https://github.com/owner/repo/issues/123"
            /(?:closes|resolves|fixes|close|resolve|fix)\s+https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/issues\/(\d+)/gi
        ];

        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(prBody)) !== null) {
                let issueNumber: number;
                let repositoryPath = "";

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
                const normalizedLinkType = linkTypeRaw === "close" ? "closes" :
                    linkTypeRaw === "resolve" ? "resolves" :
                        linkTypeRaw === "fix" ? "fixes" :
                            linkTypeRaw as "closes" | "resolves" | "fixes";

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
                    const issueDetails = await fetchIssueDetails(issueNumber);

                    if (!issueDetails) {
                        linkedIssues.push({
                            number: issueNumber,
                            title: "",
                            body: "",
                            url: issueUrl,
                            linkType: normalizedLinkType,
                            labels: [],
                            comments: []
                        });
                    } else {
                        linkedIssues.push({
                            number: issueNumber,
                            title: issueDetails.title,
                            body: issueDetails.body || "",
                            url: issueDetails.url,
                            linkType: normalizedLinkType,
                            labels: issueDetails.labels,
                            comments: issueDetails.comments
                        });
                    }
                }
            }
        }

        return linkedIssues;
    }

    /**
     * Fetches changed files from GitHub API
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
                patch: file.patch || "",
                previousFilename: file.previous_filename
            }));

        } catch (error) {
            throw new GitHubAPIError(
                `Failed to fetch changed files for PR #${prNumber}`,
                { installationId, repositoryName, prNumber, originalError: getFieldFromUnknownObject<string>(error, "message") },
                getFieldFromUnknownObject<number>(error, "status"),
                undefined
            );
        }
    }

    /**
     * Creates a complete PR data object with all required information
     * Combines webhook data with additional API calls
     */
    public static async createCompletePRData(payload: GitHubWebhookPayload): Promise<PullRequestData> {
        const prData = await this.extractPRDataFromWebhook(payload);

        // Check if PR should be analyzed
        if (!this.shouldAnalyzePR(prData)) {
            if (prData.isDraft) {
                throw new PRAnalysisError(
                    prData.prNumber,
                    prData.repositoryName,
                    `PR #${prData.prNumber} is not eligible for analysis: PR is in draft status`,
                    null,
                    "PR_NOT_ELIGIBLE_ERROR"
                );
            } else {
                throw new PRAnalysisError(
                    prData.prNumber,
                    prData.repositoryName,
                    `PR #${prData.prNumber} is not eligible for analysis: PR does not link to any issues`,
                    null,
                    "PR_NOT_ELIGIBLE_ERROR"
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

            const changedFilesInfo = prData.changedFiles.map(file =>
                `${file.filename} (${file.status}, +${file.additions}/-${file.deletions})${file.previousFilename ? ` (renamed from ${file.previousFilename})` : ""}`
            ).join("\n");

            const codeChangesPreview = prData.changedFiles.map((file) => {
                return `\n--- ${file.filename} (${file.status}) ---\n${file.patch}`;
            }).join("\n");

            // Format linked issues
            const linkedIssuesInfo = prData.linkedIssues.map(issue => `- #${issue.number}:\n
                title: ${issue.title}\n
                body: ${issue.body}\n
                labels: ${issue.labels.map(label => `${label.name} (${label.description}), `)}`).join("\n\n");

            prData.formattedPullRequest = `Here's the pull request summary:

PULL REQUEST CHANGES:
Repository: ${prData.repositoryName}
PR #${prData.prNumber}: ${prData.title}
Author: ${prData.author}

Body:
${prData.body || "No body provided"}

Linked Issue(s): 
${linkedIssuesInfo}

CHANGED FILES:
${changedFilesInfo}

CODE CHANGES PREVIEW:
${codeChangesPreview}`;

            return prData;
        } catch (error) {
            if (error instanceof PRAnalysisError) {
                throw error;
            }

            throw new PRAnalysisError(
                prData.prNumber,
                prData.repositoryName,
                "Failed to create complete PR data",
                { originalError: error instanceof Error ? error.message : String(error) }
            );
        }
    }

    /**
     * Normalizes GitHub file status to our expected format
     */
    private static normalizeFileStatus(status: string): "added" | "modified" | "removed" {
        switch (status) {
            case "added":
                return "added";
            case "removed":
                return "removed";
            case "modified":
            case "renamed":
            case "copied":
            case "changed":
            case "unchanged":
            default:
                return "modified";
        }
    }

    /**
     * Extracts file extensions from changed files for analysis
     */
    public static getFileExtensions(changedFiles: ChangedFile[]): string[] {
        const extensions = new Set<string>();

        changedFiles.forEach(file => {
            const extension = file.filename.split(".").pop()?.toLowerCase();
            if (extension) {
                extensions.add(extension);
            }
        });

        return Array.from(extensions);
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
            dataLogger.info("PR eligible for AI review", logData);
        } else {
            dataLogger.info("PR not eligible for AI review", logData);
        }
    }

    /**
     * Logs PR data extraction results for monitoring and debugging
     */
    public static logExtractionResult(
        prData: PullRequestData,
        extractionTime: number,
        success: boolean = true,
        error?: ErrorClass
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
            dataLogger.info("PR data extraction successful", logData);
        } else {
            dataLogger.error("PR data extraction failed", logData);
        }
    }

    /**
     * Analyzes PR with context fetching workflow
     */
    public static async analyzePullRequest(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        messageLogger.info(`Starting analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        try {
            // Execute workflow with timeout
            const review = await this.executeWithTimeout(
                async () => {
                    // Build review context
                    const reviewContext = await this.contextAnalyzer.buildReviewContext(prData);

                    // Generate AI review with enhanced context
                    const aiReview = await this.geminiService.generateReview(reviewContext);

                    return {
                        installationId: prData.installationId,
                        prNumber: prData.prNumber,
                        repositoryName: prData.repositoryName,
                        mergeScore: aiReview.mergeScore,
                        suggestions: aiReview.suggestions,
                        reviewStatus: "COMPLETED",
                        summary: aiReview.summary,
                        confidence: aiReview.confidence,
                        processingTime: 0, // Will be set by caller
                        createdAt: new Date()
                    } as ReviewResult;
                },
                300000, // 5 minutes
                "Pull request context analysis"
            );

            const processingTime = Date.now() - startTime;
            messageLogger.info(`Pull request context analysis completed in ${processingTime}ms for PR #${prData.prNumber}`);

            return review;

        } catch (error) {
            dataLogger.error("Pull request context analysis failed", { error });

            throw error;
        }
    }

    /**
     * Performs a follow-up review for a PR that already has a completed initial review.
     * Retrieves the previous diff + review summary from the database, then asks
     * Gemini to incrementally evaluate only the new changes.
     */
    public static async analyzePullRequestFollowUp(prData: PullRequestData): Promise<ReviewResult> {
        const startTime = Date.now();
        messageLogger.info(`Starting follow-up analysis for PR #${prData.prNumber} in ${prData.repositoryName}`);

        // Fetch the stored previous review from the database.
        // We look for the most recent COMPLETED review for this PR.
        const existingResult = await prisma.aIReviewResult.findFirst({
            where: {
                installationId: prData.installationId,
                prNumber: prData.prNumber,
                repositoryName: prData.repositoryName,
                reviewStatus: "COMPLETED"
            },
            orderBy: { createdAt: "desc" },
            select: {
                mergeScore: true,
                suggestions: true,
                contextMetrics: true
            }
        });

        // Extract what we need from the stored result
        const previousMergeScore = existingResult?.mergeScore ?? 0;
        const previousReviewSummary = (() => {
            const meta = existingResult?.contextMetrics as Record<string, unknown> | null;
            return (typeof meta?.lastReviewSummary === "string" ? meta.lastReviewSummary : "");
        })();
        const previousDiff = (() => {
            const meta = existingResult?.contextMetrics as Record<string, unknown> | null;
            return (typeof meta?.lastReviewDiff === "string" ? meta.lastReviewDiff : "");
        })();

        try {
            const review = await this.executeWithTimeout(
                async () => {
                    const reviewContext = await this.contextAnalyzer.buildReviewContext(prData);

                    const followUpContext: FollowUpReviewContext = {
                        ...reviewContext,
                        previousDiff,
                        previousReviewSummary,
                        previousMergeScore
                    };

                    const aiReview = await this.geminiService.generateFollowUpReview(followUpContext);

                    return {
                        installationId: prData.installationId,
                        prNumber: prData.prNumber,
                        repositoryName: prData.repositoryName,
                        mergeScore: aiReview.mergeScore,
                        suggestions: aiReview.suggestions,
                        reviewStatus: "COMPLETED",
                        summary: aiReview.summary,
                        confidence: aiReview.confidence,
                        processingTime: 0,
                        createdAt: new Date(),
                        isFollowUp: true,
                        previousSummary: previousReviewSummary
                    } as ReviewResult;
                },
                300000, // 5 minutes
                "Pull request follow-up analysis"
            );

            const processingTime = Date.now() - startTime;
            messageLogger.info(`Follow-up analysis completed in ${processingTime}ms for PR #${prData.prNumber}`);

            return review;

        } catch (error) {
            dataLogger.error("Pull request follow-up analysis failed", { error });
            throw error;
        }
    }

    /**
     * Executes operation with timeout
     */
    private static async executeWithTimeout<T>(
        operation: () => Promise<T>,
        timeoutMs: number,
        operationName: string
    ): Promise<T> {
        return Promise.race([
            operation(),
            new Promise<never>((_, reject) => {

                setTimeout(() => {
                    reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
                }, timeoutMs);
            })
        ]);
    }
}
