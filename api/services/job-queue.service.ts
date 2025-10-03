import { EventEmitter } from "events";
import { PullRequestData, ReviewResult } from "../models/ai-review.model";
import { AIReviewOrchestrationService } from "./ai-review-orchestration.service";
import { LoggingService } from "./logging.service";
import { getFieldFromUnknownObject } from "../helper";

/**
 * Simple in-memory job queue for AI review processing
 * Provides async background processing for PR analysis
 */

export interface Job {
    id: string;
    type: "pr-analysis";
    data: PullRequestData;
    status: "pending" | "processing" | "completed" | "failed";
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    result?: ReviewResult;
    error?: string;
    retryCount: number;
    maxRetries: number;
}

export class JobQueueService extends EventEmitter {
    private static instance: JobQueueService;
    private jobs: Map<string, Job> = new Map();
    private processing = false;
    private orchestrationService: AIReviewOrchestrationService;

    // Configuration
    private readonly config = {
        maxConcurrentJobs: parseInt(process.env.JOB_QUEUE_MAX_CONCURRENT || "3"),
        maxRetries: parseInt(process.env.JOB_QUEUE_MAX_RETRIES || "2"),
        retryDelayMs: parseInt(process.env.JOB_QUEUE_RETRY_DELAY || "30000"), // 30 seconds
        jobTimeoutMs: parseInt(process.env.JOB_QUEUE_TIMEOUT || "600000"), // 10 minutes
        cleanupIntervalMs: parseInt(process.env.JOB_QUEUE_CLEANUP_INTERVAL || "3600000") // 1 hour
    };

    private constructor() {
        super();
        this.orchestrationService = new AIReviewOrchestrationService();
        this.startProcessing();
        this.startCleanup();
    }

    public static getInstance(): JobQueueService {
        if (!JobQueueService.instance) {
            JobQueueService.instance = new JobQueueService();
        }
        return JobQueueService.instance;
    }

    /**
     * Adds a PR analysis job to the queue
     */
    public async addPRAnalysisJob(prData: PullRequestData): Promise<string> {
        const jobId = this.generateJobId(prData);

        // Check if job already exists
        const existingJob = this.jobs.get(jobId);
        if (existingJob && (existingJob.status === "pending" || existingJob.status === "processing")) {
            LoggingService.logInfo("addPRAnalysisJob", "Job already exists and is pending/processing", {
                jobId,
                prNumber: prData.prNumber,
                repositoryName: prData.repositoryName
            });
            return jobId;
        }

        const job: Job = {
            id: jobId,
            type: "pr-analysis",
            data: prData,
            status: "pending",
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: this.config.maxRetries
        };

        this.jobs.set(jobId, job);

        LoggingService.logInfo("addPRAnalysisJob", "PR analysis job added to queue", {
            jobId,
            prNumber: prData.prNumber,
            repositoryName: prData.repositoryName,
            queueSize: this.jobs.size
        });

        // Emit event for monitoring
        this.emit("jobAdded", job);

        return jobId;
    }

    /**
     * Gets job status by ID
     */
    public getJobStatus(jobId: string): Job | null {
        return this.jobs.get(jobId) || null;
    }

    /**
     * Gets all jobs for a specific PR
     */
    public getJobsForPR(installationId: string, prNumber: number, repositoryName: string): Job[] {
        const jobs: Job[] = [];
        for (const job of this.jobs.values()) {
            if (job.data.installationId === installationId &&
                job.data.prNumber === prNumber &&
                job.data.repositoryName === repositoryName) {
                jobs.push(job);
            }
        }
        return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * Gets queue statistics
     */
    public getQueueStats(): {
        total: number;
        pending: number;
        processing: number;
        completed: number;
        failed: number;
        } {
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

                // Check if we can process more jobs
                const availableSlots = this.config.maxConcurrentJobs - processingJobs.length;

                if (availableSlots > 0 && pendingJobs.length > 0) {
                    const jobsToProcess = pendingJobs.slice(0, availableSlots);

                    // Process jobs concurrently
                    const processingPromises = jobsToProcess.map(job => this.processJob(job));

                    // Don't await all - let them run in background
                    Promise.allSettled(processingPromises).then(results => {
                        results.forEach((result, index) => {
                            if (result.status === "rejected") {
                                LoggingService.logError("Job processing promise rejected", {
                                    jobId: jobsToProcess[index].id,
                                    error: result.reason
                                });
                            }
                        });
                    });
                }

                // Wait before next iteration
                await this.sleep(5000); // 5 seconds

            } catch (error) {
                LoggingService.logError("Error in job processing loop", { error });
                await this.sleep(10000); // Wait longer on error
            }
        }
    }

    /**
     * Processes a single job
     */
    private async processJob(job: Job): Promise<void> {
        const startTime = Date.now();

        try {
            // Update job status
            job.status = "processing";
            job.startedAt = new Date();

            LoggingService.logInfo("processJob", "Starting job processing", {
                jobId: job.id,
                prNumber: job.data.prNumber,
                repositoryName: job.data.repositoryName,
                retryCount: job.retryCount
            });

            // Emit event for monitoring
            this.emit("jobStarted", job);

            // Process with timeout using review context analysis
            const result = await Promise.race([
                this.orchestrationService.analyzeWithReviewContext(job.data),
                this.createTimeoutPromise(job.id)
            ]);

            // Job completed successfully
            job.status = "completed";
            job.completedAt = new Date();
            job.result = result;

            const processingTime = Date.now() - startTime;

            LoggingService.logInfo("processJob", "Job completed successfully", {
                jobId: job.id,
                prNumber: job.data.prNumber,
                repositoryName: job.data.repositoryName,
                processingTime,
                mergeScore: result.mergeScore
            });

            // Emit event for monitoring
            this.emit("jobCompleted", job);

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            LoggingService.logError("Job processing failed", {
                jobId: job.id,
                prNumber: job.data.prNumber,
                repositoryName: job.data.repositoryName,
                error: errorMessage,
                retryCount: job.retryCount,
                processingTime
            });

            // Check if we should retry
            if (job.retryCount < job.maxRetries && this.shouldRetry(error)) {
                job.retryCount++;
                job.status = "pending";
                job.error = `Retry ${job.retryCount}/${job.maxRetries}: ${errorMessage}`;

                LoggingService.logInfo("processJob", "Job scheduled for retry", {
                    jobId: job.id,
                    retryCount: job.retryCount,
                    maxRetries: job.maxRetries
                });

                // Schedule retry with delay
                setTimeout(() => {
                    // Job will be picked up in next processing cycle
                }, this.config.retryDelayMs);
            } else {
                // Job failed permanently
                job.status = "failed";
                job.completedAt = new Date();
                job.error = errorMessage;

                LoggingService.logError("Job failed permanently", {
                    jobId: job.id,
                    prNumber: job.data.prNumber,
                    repositoryName: job.data.repositoryName,
                    finalError: errorMessage,
                    totalRetries: job.retryCount
                });

                this.emit("jobFailed", job);
            }
        }
    }

    /**
     * Creates a timeout promise for job processing
     */
    private createTimeoutPromise(jobId: string): Promise<never> {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Job ${jobId} timed out after ${this.config.jobTimeoutMs}ms`));
            }, this.config.jobTimeoutMs);
        });
    }

    /**
     * Determines if an error is retryable
     */
    private shouldRetry(error: unknown): boolean {
        if (!error) return false;

        const errorMessage = getFieldFromUnknownObject<string>(error, "message") || String(error);

        // Don't retry certain types of errors
        const nonRetryableErrors = [
            "PR not eligible",
            "Invalid webhook payload",
            "Authentication failed",
            "Repository not found",
            "PR not found"
        ];

        return !nonRetryableErrors.some(nonRetryable =>
            errorMessage.toLowerCase().includes(nonRetryable.toLowerCase())
        );
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
            LoggingService.logInfo("cleanupOldJobs", "Cleaned up old jobs", {
                cleanedCount,
                remainingJobs: this.jobs.size
            });
        }
    }

    /**
     * Generates a unique job ID for a PR
     */
    private generateJobId(prData: PullRequestData): string {
        return `pr-analysis-${prData.installationId}-${prData.repositoryName}-${prData.prNumber}-${Date.now()}`;
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
        LoggingService.logInfo("stop", "Job queue processing stopped");
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

            LoggingService.logInfo("cancelJob", "Job cancelled", { jobId });
            return true;
        }
        return false;
    }
}
