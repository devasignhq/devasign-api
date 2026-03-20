import { CloudTasksClient } from "@google-cloud/tasks";
import { GitHubWebhookPayload } from "../models/ai-review.model";
import { dataLogger } from "../config/logger.config";
import { CloudTasksError } from "../models/error.model";
import { ENDPOINTS } from "../utilities/data";

/**
 * Types of background jobs supported by the Cloud Tasks integration.
 */
export type JobType = "pr-analysis" | "repository-indexing" | "repository-incremental-indexing";

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
 * Service for enqueueing background jobs to Google Cloud Tasks.
 */
export class CloudTasksService {
    // Google Cloud Tasks client instance
    private client: CloudTasksClient;

    // Service configuration mapping routing queues and target endpoints
    private readonly config = {
        project: process.env.GCP_PROJECT_ID!,
        location: process.env.GCP_LOCATION_ID!,
        cloudRunUrl: process.env.CLOUD_RUN_SERVICE_URL!,
        cloudTasksServiceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL!,
        queues: {
            "pr-analysis": process.env.CLOUD_TASKS_PR_ANALYSIS_QUEUE || "",
            "repository-indexing": process.env.CLOUD_TASKS_REPO_INDEXING_QUEUE || "",
            "repository-incremental-indexing": process.env.CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE || ""
        },
        endpoints: {
            "pr-analysis": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.JOBS.PR_ANALYSIS,
            "repository-indexing": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.JOBS.REPOSITORY_INDEXING,
            "repository-incremental-indexing": ENDPOINTS.INTERNAL.PREFIX + ENDPOINTS.INTERNAL.JOBS.INCREMENTAL_INDEXING
        }
    };

    constructor() {
        const requiredVars = [
            "GCP_PROJECT_ID",
            "GCP_LOCATION_ID",
            "CLOUD_RUN_SERVICE_URL",
            "CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL",
            "CLOUD_TASKS_PR_ANALYSIS_QUEUE",
            "CLOUD_TASKS_REPO_INDEXING_QUEUE",
            "CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE"
        ];
        const missing = requiredVars.filter(v => !process.env[v]);
        if (missing.length > 0) {
            dataLogger.error(`Missing required environment variables for CloudTasksService: ${missing.join(", ")}`);
        }
        this.client = new CloudTasksClient();
    }

    /**
     * Enqueues a task for PR analysis.
     * @param payload - The pull request webhook payload to analyze
     * @param isActualFollowUp - Flag indicating if this is a follow-up review
     * @param pendingCommentId - The ID of the pending comment if posted
     * @returns The ID of the enqueued task 
     */
    public async addPRAnalysisJob(
        payload: GitHubWebhookPayload,
        isActualFollowUp: boolean,
        pendingCommentId?: number | string
    ): Promise<string> {
        // Construct task payload
        const jobPayload: PRAnalysisJobData = { payload, isActualFollowUp, pendingCommentId };

        // Dispatch to Cloud Tasks
        return this.enqueueTask("pr-analysis", jobPayload);
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
        const baseUrl = this.config.cloudRunUrl.replace(/\/$/, "");
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
                    serviceAccountEmail: this.config.cloudTasksServiceAccountEmail
                }
            },
            // Set dispatch deadline based on job type
            dispatchDeadline: {
                seconds: type === "pr-analysis" ? 600 // 10 minutes
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
}

// Export the underlying initialized instance 
export const cloudTasksService = new CloudTasksService();
