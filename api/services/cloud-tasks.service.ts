import { CloudTasksClient } from "@google-cloud/tasks";
import { Env } from "../utils/env.js";
import { GitHubWebhookPayload, LinkedIssue } from "../models/ai-review.model.js";
import { dataLogger } from "../config/logger.config.js";
import { CloudTasksError } from "../models/error.model.js";
import { ENDPOINTS } from "../utils/data.js";

/**
 * Types of background jobs supported by the Cloud Tasks integration.
 */
export type JobType = "pr-analysis"
    | "manual-pr-analysis"
    | "repository-indexing"
    | "repository-incremental-indexing"
    | "bounty-payout"
    | "clear-installation"
    | "clear-repo";

/**
 * Payload interface for clear installation jobs.
 */
export interface ClearInstallationData {
    installationId: string;
}

/**
 * Payload interface for clear repository jobs.
 */
export interface ClearRepoData {
    installationId: string;
    repositoryName: string;
}

/**
 * Payload interface for repository bulk indexing jobs.
 */
export interface RepositoryIndexingData {
    installationId: string;
    repositoryName: string;
}

/**
 * Payload interface for incremental repository indexing jobs.
 */
export interface IncrementalIndexingData {
    installationId: string;
    repositoryName: string;
    filesToIndex: string[];
    filesToRemove: string[];
}

/**
 * Payload interface for pull request AI analysis jobs.
 */
export interface PRAnalysisJobData {
    payload: GitHubWebhookPayload;
    isActualFollowUp: boolean;
    pendingCommentId?: number | string;
}

/**
 * Payload interface for manual pull request AI analysis jobs.
 */
export interface ManualPRAnalysisData {
    prUrl: string;
}

/**
 * Service for enqueueing background jobs to Google Cloud Tasks.
 */
export class CloudTasksService {
    // Google Cloud Tasks client instance
    private client: CloudTasksClient;

    // Service configuration mapping routing queues and target endpoints
    private readonly config = {
        project: Env.gcpProjectId(true)!,
        location: Env.gcpLocationId(true)!,
        cloudRunServiceUrl: Env.cloudRunServiceUrl(true)!,
        cloudRunPrivateServiceUrl: Env.cloudRunPrivateServiceUrl(true)!,
        cloudTasksServiceAccountEmail: (Env.cloudTasksServiceAccountEmail(true) || ""),
        queues: {
            "pr-analysis": Env.cloudTasksPrAnalysisQueue() || "",
            "manual-pr-analysis": Env.cloudTasksManualPrAnalysisQueue() || "",
            "repository-indexing": Env.cloudTasksRepoIndexingQueue() || "",
            "repository-incremental-indexing": Env.cloudTasksIncrementalIndexingQueue() || "",
            "bounty-payout": Env.cloudTasksBountyPayoutQueue() || "",
            "clear-installation": Env.cloudTasksClearInstallationQueue() || "",
            "clear-repo": Env.cloudTasksClearRepoQueue() || ""
        },
        endpoints: {
            "pr-analysis": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.PR_ANALYSIS,
            "manual-pr-analysis": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.MANUAL_PR_ANALYSIS,
            "repository-indexing": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.INDEXING.REPOSITORY,
            "repository-incremental-indexing": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.INDEXING.INCREMENTAL,
            "bounty-payout": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.BOUNTY_PAYOUT,
            "clear-installation": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.INDEXING.CLEAR_INSTALLATION,
            "clear-repo": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.INDEXING.CLEAR_REPO
        }
    };

    private isPrivateJob(jobType: JobType): boolean {
        const publicJobs: JobType[] = ["bounty-payout"];
        return !publicJobs.includes(jobType);
    }

    constructor() {
        const missing: string[] = [];
        if (!Env.gcpProjectId()) missing.push("GCP_PROJECT_ID");
        if (!Env.gcpLocationId()) missing.push("GCP_LOCATION_ID");
        if (!Env.cloudRunServiceUrl()) missing.push("CLOUD_RUN_SERVICE_URL");
        if (!Env.cloudRunPrivateServiceUrl()) missing.push("CLOUD_RUN_PRIVATE_SERVICE_URL");
        if (!((Env.cloudTasksServiceAccountEmail() || "") || "")) missing.push("CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL");
        if (!Env.cloudTasksPrAnalysisQueue()) missing.push("CLOUD_TASKS_PR_ANALYSIS_QUEUE");
        if (!Env.cloudTasksManualPrAnalysisQueue()) missing.push("CLOUD_TASKS_MANUAL_PR_ANALYSIS_QUEUE");
        if (!Env.cloudTasksRepoIndexingQueue()) missing.push("CLOUD_TASKS_REPO_INDEXING_QUEUE");
        if (!Env.cloudTasksIncrementalIndexingQueue()) missing.push("CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE");
        if (!Env.cloudTasksBountyPayoutQueue()) missing.push("CLOUD_TASKS_BOUNTY_PAYOUT_QUEUE");
        if (!Env.cloudTasksClearInstallationQueue()) missing.push("CLOUD_TASKS_CLEAR_INSTALLATION_QUEUE");
        if (!Env.cloudTasksClearRepoQueue()) missing.push("CLOUD_TASKS_CLEAR_REPO_QUEUE");
        if (missing.length > 0) {
            dataLogger.error(`Missing required environment variables for CloudTasksService: ${missing.join(", ")}`);
        }
        this.client = new CloudTasksClient();
    }

    /**
     * Helper method to map payloads and push HTTP tasks to GCP Cloud Tasks.
     * @param type - The specific job type configuration to use
     * @param payload - The typed payload object describing the task
     * @returns The ID of the enqueued cloud task
     */
    private async enqueueTask<T>(type: JobType, payload: T): Promise<string> {
        // Resolve the fully qualified GCP queue path
        const parent = this.client.queuePath(
            this.config.project,
            this.config.location,
            this.config.queues[type]
        );

        // Resolve the invocation target endpoint
        let baseUrl: string;
        let audience: string;

        // Check if the job is private
        if (this.isPrivateJob(type)) {
            // Ensure private Cloud Run service URL is configured
            if (!this.config.cloudRunPrivateServiceUrl) {
                throw new CloudTasksError("CLOUD_RUN_PRIVATE_SERVICE_URL is not configured");
            }
            baseUrl = this.config.cloudRunPrivateServiceUrl.replace(/\/$/, "");
            audience = this.config.cloudRunPrivateServiceUrl;
        } else {
            if (!this.config.cloudRunServiceUrl) {
                throw new CloudTasksError("CLOUD_RUN_SERVICE_URL is not configured");
            }
            baseUrl = this.config.cloudRunServiceUrl.replace(/\/$/, "");
            audience = this.config.cloudRunServiceUrl;
        }
        const url = `${baseUrl}${this.config.endpoints[type]}`;

        // Construct the HTTP request task definitions
        const task = {
            httpRequest: {
                httpMethod: "POST" as const,
                url,
                headers: {
                    "Content-Type": "application/json"
                },
                body: Buffer.from(JSON.stringify(payload)).toString("base64"),
                oidcToken: {
                    serviceAccountEmail: this.config.cloudTasksServiceAccountEmail,
                    audience
                }
            },
            // Set dispatch deadline based on job type
            dispatchDeadline: {
                seconds: (type === "pr-analysis" || type === "manual-pr-analysis") ? 600 // 10 minutes
                    : type === "bounty-payout"
                        || type === "clear-installation"
                        || type === "clear-repo"
                        ? 300 // 5 minutes
                        : 1800 // 30 minutes (indexing)
            }
        };

        try {
            // Submit the task to GCP Google Cloud Tasks API
            const [response] = await this.client.createTask({ parent, task });

            // Extract the generated task ID or use a fallback
            const taskId = response.name || "unknown-task-id";

            dataLogger.info(`[Cloud Tasks] Enqueued ${type} task`, { taskId, type, url });
            return taskId;
        } catch (error) {
            // Handle and wrap submission errors
            dataLogger.error(`[Cloud Tasks] Failed to enqueue ${type} job`, { error, type });
            throw new CloudTasksError(`Failed to enqueue ${type} job`, error);
        }
    }

    /**
     * Enqueues a task for PR analysis.
     * @param payload - The pull request webhook payload to analyze
     * @returns The ID of the enqueued task 
     */
    public async addPRAnalysisJob(payload: GitHubWebhookPayload): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("pr-analysis", payload);
    }

    /**
     * Enqueues a task for Manual PR analysis.
     * @param prUrl - The pull request url to analyze
     * @returns The ID of the enqueued task 
     */
    public async addManualPRAnalysisJob(prUrl: string): Promise<string> {
        return this.enqueueTask("manual-pr-analysis", { prUrl });
    }

    /**
     * Enqueues a task to index an entire repository.
     * @param installationId - The ID of the GitHub app installation
     * @param repositoryName - The name of the repository to index
     * @returns The ID of the enqueued task
     */
    public async addRepositoryIndexingJob(
        installationId: string,
        repositoryName: string
    ): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("repository-indexing", { installationId, repositoryName });
    }

    /**
     * Enqueues a task to incrementally index modified files in a repository.
     * @param installationId - The ID of the GitHub app installation
     * @param repositoryName - The name of the repository being updated
     * @param filesToIndex - List of active files to parse and embed
     * @param filesToRemove - List of deleted files to drop from vector storage
     * @returns The ID of the enqueued task
     */
    public async addIncrementalIndexingJob(
        installationId: string,
        repositoryName: string,
        filesToIndex: string[],
        filesToRemove: string[]
    ): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("repository-incremental-indexing", {
            installationId,
            repositoryName,
            filesToIndex,
            filesToRemove
        });
    }

    /**
     * Enqueues a task for PR merge bounty payout.
     * @param payload - The pull request webhook payload
     * @returns The ID of the enqueued task
     */
    public async addBountyPayoutJob(payload: {
        taskId: string;
        linkedIssues: LinkedIssue[];
        pull_request: Record<string, unknown>;
        repository: Record<string, unknown>;
        installation: Record<string, unknown>;
    }): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("bounty-payout", payload);
    }

    /**
     * Enqueues a task to clear installation indexed data.
     * @param installationId - The ID of the GitHub app installation
     * @returns The ID of the enqueued task
     */
    public async addClearInstallationJob(
        installationId: string
    ): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("clear-installation", { installationId });
    }

    /**
     * Enqueues a task to clear repository indexed data.
     * @param installationId - The ID of the GitHub app installation
     * @param repositoryName - The name of the repository being updated
     * @returns The ID of the enqueued task
     */
    public async addClearRepoJob(
        installationId: string,
        repositoryName: string
    ): Promise<string> {
        // Dispatch to Cloud Tasks
        return this.enqueueTask("clear-repo", { installationId, repositoryName });
    }
}

// Export the underlying initialized instance 
export const cloudTasksService = new CloudTasksService();
