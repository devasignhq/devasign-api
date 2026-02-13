import { EventEmitter } from "events";
import { PullRequestData } from "../models/ai-review.model";
import { AIReviewOrchestrationService } from "./ai-review/orchestration.service";
import { IndexingService } from "./ai-review/indexing.service";
import { getFieldFromUnknownObject } from "../utilities/helper";
import { dataLogger, messageLogger } from "../config/logger.config";

/**
 * Generic in-memory job queue for background processing
 * Supports PR analysis and repository indexing
 */

export type JobType = "pr-analysis" | "repository-indexing";

export interface RepositoryIndexingData {
    installationId: string;
    repositoryName: string;
}

export interface Job<T = unknown> {
    id: string;
    type: JobType;
    data: T;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: unknown;
    error?: string;
    retryCount: number;
    maxRetries: number;
}

export class BackgroundJobService extends EventEmitter {
    private static instance: BackgroundJobService;
    private jobs: Map<string, Job> = new Map();
    private processing = false;
    private orchestrationService: AIReviewOrchestrationService;
    private indexingService: IndexingService;

    // Configuration
    private readonly config = {
        "pr-analysis": {
            maxConcurrentJobs: parseInt(process.env.PR_ANALYSIS_MAX_CONCURRENT || process.env.JOB_QUEUE_MAX_CONCURRENT || "3"),
            maxRetries: parseInt(process.env.PR_ANALYSIS_MAX_RETRIES || process.env.JOB_QUEUE_MAX_RETRIES || "0"),
            retryDelayMs: parseInt(process.env.PR_ANALYSIS_RETRY_DELAY || process.env.JOB_QUEUE_RETRY_DELAY || "30000"), // 30 seconds
            timeoutMs: parseInt(process.env.PR_ANALYSIS_TIMEOUT || process.env.JOB_QUEUE_TIMEOUT || "600000") // 10 minutes
        },
        "repository-indexing": {
            maxConcurrentJobs: parseInt(process.env.INDEXING_MAX_CONCURRENT || "1"),
            maxRetries: parseInt(process.env.INDEXING_MAX_RETRIES || "3"),
            retryDelayMs: parseInt(process.env.INDEXING_RETRY_DELAY || "60000"), // 1 minute
            timeoutMs: parseInt(process.env.INDEXING_JOB_TIMEOUT || "21600000") // 6 hours
        },
        cleanupIntervalMs: parseInt(process.env.JOB_QUEUE_CLEANUP_INTERVAL || "3600000") // 1 hour
    };

    private constructor() {
        super();
        this.orchestrationService = new AIReviewOrchestrationService();
        this.indexingService = new IndexingService();
        this.startProcessing();
        this.startCleanup();
    }

    public static getInstance(): BackgroundJobService {
        if (!BackgroundJobService.instance) {
            BackgroundJobService.instance = new BackgroundJobService();
        }
        return BackgroundJobService.instance;
    }

    /**
     * Adds a PR analysis job to the queue
     */
    public async addPRAnalysisJob(prData: PullRequestData): Promise<string> {
        return this.addJob({
            type: "pr-analysis",
            data: prData,
            idGenerator: () => `pr-analysis-${prData.installationId}-${prData.repositoryName.replace("/", "~")}-${prData.prNumber}`
        });
    }

    public async addRepositoryIndexingJob(installationId: string, repositoryName: string): Promise<string> {
        return this.addJob({
            type: "repository-indexing",
            data: { installationId, repositoryName },
            idGenerator: () => `repo-indexing-${installationId}-${repositoryName.replace("/", "~")}`
        });
    }

    private async addJob<T>(options: { type: JobType, data: T, idGenerator: () => string }): Promise<string> {
        const jobId = options.idGenerator();

        // Check if job already exists and is not finished
        const existingJob = this.jobs.get(jobId);
        if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
            dataLogger.info(
                "Job already exists in queue, skipping add",
                { jobId, type: options.type, status: existingJob.status }
            );
            return jobId;
        }

        const job: Job<T> = {
            id: jobId,
            type: options.type,
            data: options.data,
            status: "pending",
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: this.config[options.type].maxRetries
        };

        this.jobs.set(jobId, job);

        dataLogger.info(
            `${options.type} job added to queue`,
            {
                jobId,
                data: options.data,
                queueSize: this.jobs.size
            }
        );

        // Emit event for monitoring
        this.emit("jobAdded", job);

        return jobId;
    }

    /**
     * Gets job data by ID
     */
    public getJobData(jobId: string): Job | null {
        return this.jobs.get(jobId) || null;
    }

    /**
     * Gets queue statistics
     */
    public getQueueStats() {
        const stats = {
            total: this.jobs.size,
            pending: 0,
            processing: 0,
            completed: 0,
            failed: 0
        };

        for (const job of this.jobs.values()) {
            stats[job.status]++;
        }

        return stats;
    }

    /**
     * Starts the job processing loop
     */
    private startProcessing(): void {
        if (this.processing) return;

        this.processing = true;
        this.processJobs();
    }

    /**
     * Main job processing loop
     */
    private async processJobs(): Promise<void> {
        while (this.processing) {
            try {
                const pendingJobs = Array.from(this.jobs.values())
                    .filter(job => job.status === "pending")
                    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

                const processingJobs = Array.from(this.jobs.values())
                    .filter(job => job.status === "processing");

                // Group processing jobs by type
                const processingByType = new Map<JobType, number>();
                processingJobs.forEach(job => {
                    processingByType.set(job.type, (processingByType.get(job.type) || 0) + 1);
                });

                // Check capacity for each job type and collect jobs to process
                const jobsToProcess: Job[] = [];
                const jobsToProcessByType = new Map<JobType, number>(); // Track what we are about to add to processing

                for (const job of pendingJobs) {
                    const currentProcessingCount = (processingByType.get(job.type) || 0) + (jobsToProcessByType.get(job.type) || 0);
                    const maxConcurrent = this.config[job.type]?.maxConcurrentJobs ?? 1;

                    if (currentProcessingCount < maxConcurrent) {
                        jobsToProcess.push(job);
                        jobsToProcessByType.set(job.type, (jobsToProcessByType.get(job.type) || 0) + 1);
                    }
                }

                if (jobsToProcess.length > 0) {
                    // Process jobs concurrently
                    const processingPromises = jobsToProcess.map(job => this.processJob(job));

                    // Don't await all - let them run in background
                    Promise.allSettled(processingPromises).then(results => {
                        results.forEach((result, index) => {
                            if (result.status === "rejected") {
                                dataLogger.error(
                                    "Job processing promise rejected",
                                    {
                                        jobId: jobsToProcess[index].id,
                                        error: result.reason
                                    }
                                );
                            }
                        });
                    });
                }

                // Wait before next iteration
                await this.sleep(5000); // 5 seconds

            } catch (error) {
                dataLogger.error("Error in job processing loop", { error });
                await this.sleep(10000); // Wait longer on error
            }
        }
    }

    /**
     * Processes a single job
     */
    private async processJob(job: Job): Promise<void> {
        const startTime = Date.now();
        const config = this.config[job.type];
        const timeoutMs = config.timeoutMs;

        try {
            // Update job status
            job.status = "processing";
            job.startedAt = new Date();

            dataLogger.info(
                "Starting job processing",
                {
                    jobId: job.id,
                    type: job.type,
                    retryCount: job.retryCount
                }
            );

            // Emit event for monitoring
            this.emit("jobStarted", job);

            // Execute job logic based on type
            // Create a promise for the actual work
            const workPromise = (async () => {
                switch (job.type) {
                case "pr-analysis":
                    return await this.orchestrationService.analyzePullRequest(job.data as PullRequestData);
                case "repository-indexing":
                    const { installationId, repositoryName } = job.data as RepositoryIndexingData;
                    await this.indexingService.indexRepository(installationId, repositoryName);
                    return { success: true }; // Indexing returns void
                default:
                    throw new Error(`Unknown job type: ${job.type}`);
                }
            })();

            // Process with timeout
            const result = await Promise.race([
                workPromise,
                this.createTimeoutPromise(job.id, timeoutMs)
            ]);

            // Job completed successfully
            job.status = "completed";
            job.completedAt = new Date();
            job.result = result;

            const processingTime = Date.now() - startTime;

            dataLogger.info(
                "Job completed successfully",
                {
                    jobId: job.id,
                    type: job.type,
                    processingTime
                }
            );

            // Emit event for monitoring
            this.emit("jobCompleted", job);

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            dataLogger.error(
                "Job processing failed",
                {
                    jobId: job.id,
                    type: job.type,
                    error: errorMessage,
                    retryCount: job.retryCount,
                    processingTime
                }
            );

            // Check if we should retry
            if (job.retryCount < job.maxRetries && this.shouldRetry(error, job.type)) {
                job.retryCount++;
                job.status = "pending";
                job.error = `Retry ${job.retryCount}/${job.maxRetries}: ${errorMessage}`;

                dataLogger.info(
                    "Job scheduled for retry",
                    {
                        jobId: job.id,
                        retryCount: job.retryCount,
                        maxRetries: job.maxRetries
                    }
                );

                // Schedule retry with delay
                setTimeout(() => {
                    // Job will be picked up in next processing cycle
                }, this.config[job.type].retryDelayMs);
            } else {
                // Job failed permanently
                job.status = "failed";
                job.completedAt = new Date();
                job.error = errorMessage;

                dataLogger.error(
                    "Job failed permanently",
                    {
                        jobId: job.id,
                        finalError: errorMessage,
                        totalRetries: job.retryCount
                    }
                );

                this.emit("jobFailed", job);
            }
        }
    }

    /**
     * Creates a timeout promise for job processing
     */
    private createTimeoutPromise(jobId: string, timeoutMs: number): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        });
    }

    /**
     * Determines if an error is retryable
     */
    private shouldRetry(error: unknown, jobType: JobType): boolean {
        if (!error) return false;

        const errorMessage = getFieldFromUnknownObject<string>(error, "message") || String(error);

        // General non-retryable errors
        const commonNonRetryableErrors = [
            "Authentication failed",
            "Repository not found",
            "Validation failed"
        ];

        if (commonNonRetryableErrors.some(err => errorMessage.toLowerCase().includes(err.toLowerCase()))) {
            return false;
        }

        if (jobType === "pr-analysis") {
            const prNonRetryableErrors = [
                "PR not eligible",
                "Invalid webhook payload",
                "PR not found"
            ];
            if (prNonRetryableErrors.some(err => errorMessage.toLowerCase().includes(err.toLowerCase()))) {
                return false;
            }
        }

        return true;
    }

    /**
     * Starts periodic cleanup of old jobs
     */
    private startCleanup(): void {
        setInterval(() => {
            this.cleanupOldJobs();
        }, this.config.cleanupIntervalMs);
    }

    /**
     * Removes old completed/failed jobs to prevent memory leaks
     */
    private cleanupOldJobs(): void {
        const cutoffTime = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours ago
        let cleanedCount = 0;

        for (const [jobId, job] of this.jobs.entries()) {
            if ((job.status === "completed" || job.status === "failed") &&
                job.completedAt && job.completedAt < cutoffTime) {
                this.jobs.delete(jobId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            dataLogger.info(
                "Cleaned up old jobs",
                { cleanedCount, remainingJobs: this.jobs.size }
            );
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Stops the job processing (for graceful shutdown)
     */
    public stop(): void {
        this.processing = false;
        messageLogger.info("Job queue processing stopped");
    }

    /**
     * Gets active processing jobs count
     */
    public getActiveJobsCount(): number {
        return Array.from(this.jobs.values()).filter(job => job.status === "processing").length;
    }

    /**
     * Cancels a pending job
     */
    public cancelJob(jobId: string): boolean {
        const job = this.jobs.get(jobId);
        if (job && job.status === "pending") {
            job.status = "failed";
            job.error = "Job cancelled";
            job.completedAt = new Date();

            dataLogger.info("Job cancelled", { jobId });
            return true;
        }
        return false;
    }
}

export const backgroundJobService = BackgroundJobService.getInstance();
