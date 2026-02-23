import { PullRequestData, GitHubWebhookPayload } from "../../models/ai-review.model";
import { backgroundJobService, BackgroundJobService } from "../background-job.service";
import { AIReviewOrchestrationService } from "./orchestration.service";
import { AIReviewCommentService } from "./comment.service";
import { PRAnalysisService } from "./pr-analysis.service";
import { PRAnalysisError } from "../../models/error.model";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * Workflow Integration Service
 * Coordinates the complete end-to-end PR analysis workflow
 * 
 * This service provides the main integration points for:
 * - Webhook processing workflow
 * - Manual analysis workflow  
 * - Status monitoring workflow
 * - Error handling and recovery workflow
 */
export class WorkflowIntegrationService {
    private static instance: WorkflowIntegrationService;
    private jobQueue: BackgroundJobService;
    private orchestrationService: AIReviewOrchestrationService;
    private initialized = false;

    private constructor() {
        this.jobQueue = backgroundJobService;
        this.orchestrationService = new AIReviewOrchestrationService();
    }

    public static getInstance(): WorkflowIntegrationService {
        if (!WorkflowIntegrationService.instance) {
            WorkflowIntegrationService.instance = new WorkflowIntegrationService();
        }
        return WorkflowIntegrationService.instance;
    }

    /**
     * Initializes the workflow integration service
     * Sets up event listeners and monitoring
     * @returns A promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        if (this.initialized) return;

        try {
            messageLogger.info("Initializing Workflow Integration Service");

            // Set up job queue event listeners for monitoring
            this.setupJobQueueEventListeners();

            this.initialized = true;

            messageLogger.info("Workflow Integration Service initialized successfully");

        } catch (error) {
            dataLogger.error("Failed to initialize Workflow Integration Service", { error });
            throw error;
        }
    }

    /**
     * Complete webhook processing workflow
     * 
     * End-to-end workflow:
     * 1. Validate and extract PR data from webhook
     * 2. Check eligibility for analysis
     * 3. Queue for background processing
     * 4. Return immediate response
     * 5. Background: Execute full AI analysis
     * 6. Background: Post results to GitHub
     * 
     * @param payload - The GitHub webhook payload
     * @returns An object containing success status, job ID, PR data, and potential errors
     */
    public async processWebhookWorkflow(payload: GitHubWebhookPayload): Promise<{
        success: boolean;
        jobId?: string;
        prData?: PullRequestData;
        error?: string;
        reason?: string;
    }> {
        const startTime = Date.now();
        let prData: PullRequestData = {} as PullRequestData;

        try {
            dataLogger.info(
                "Starting webhook workflow",
                {
                    action: payload.action,
                    prNumber: payload.pull_request.number,
                    repository: payload.repository.full_name
                }
            );

            // Determine whether this is a follow-up (synchronize) or initial review.
            // Manual triggers ("review" comment) always queue as an initial review.
            const isFollowUp = !payload.manualTrigger && payload.action === "synchronize";
            const { pull_request, repository, installation } = payload;

            let isActualFollowUp = false;
            if (isFollowUp) {
                // Check whether a completed initial review already exists for this PR
                isActualFollowUp = await this.orchestrationService.hasCompletedReview(
                    installation.id.toString(),
                    pull_request.number,
                    repository.full_name
                );
            }

            // Post an "in progress" comment so contributors know a review is underway
            try {
                const commentResult = isActualFollowUp
                    ? await AIReviewCommentService.postFollowUpInProgressComment(
                        installation.id.toString(),
                        repository.full_name,
                        pull_request.number
                    )
                    : await AIReviewCommentService.postInProgressComment(
                        installation.id.toString(),
                        repository.full_name,
                        pull_request.number
                    );

                if (commentResult.success && commentResult.commentId) {
                    prData.pendingCommentId = commentResult.commentId;
                }
            } catch (inProgressError) {
                dataLogger.error("Failed to post in-progress comment", { inProgressError });
            }

            // Extract and validate PR data
            try {
                const pendingCommentId = prData.pendingCommentId;
                prData = await PRAnalysisService.createCompletePRData(payload);
                prData.pendingCommentId = pendingCommentId;
            } catch (error) {
                // If the PR is not eligible for analysis, post an error comment and return
                if (error instanceof PRAnalysisError && error.code === "PR_NOT_ELIGIBLE_ERROR") {
                    dataLogger.info(
                        error.message,
                        { prNumber: error.prNumber, repositoryName: error.repositoryName }
                    );

                    if (prData.pendingCommentId) {
                        await AIReviewCommentService.postErrorComment(
                            installation.id.toString(),
                            repository.full_name,
                            pull_request.number,
                            error.message,
                            prData.pendingCommentId
                        );
                    }

                    return { success: true, reason: error.message };
                }
                throw error;
            }

            // Log analysis decision
            PRAnalysisService.logAnalysisDecision(prData, true);

            let jobId: string;
            if (isActualFollowUp) {
                // Queue as a follow-up job
                jobId = await this.jobQueue.addPRAnalysisJob(prData, true);
                dataLogger.info("Queued follow-up review job", { jobId, prNumber: prData.prNumber });
            } else {
                // No prior review exists yet, or it's an opened/ready_for_review event — treat this like an initial review
                jobId = await this.jobQueue.addPRAnalysisJob(prData, false);
                if (isFollowUp) {
                    dataLogger.info("No prior review found; queued as initial review", { jobId, prNumber: prData.prNumber });
                } else {
                    dataLogger.info("Queued initial review job", { jobId, prNumber: prData.prNumber });
                }
            }

            dataLogger.info(
                "Webhook workflow completed successfully",
                {
                    jobId,
                    prNumber: prData.prNumber,
                    repositoryName: prData.repositoryName,
                    processingTime: Date.now() - startTime
                }
            );

            return {
                success: true,
                jobId,
                prData
            };

        } catch (error) {
            const processingTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            dataLogger.error(
                "Failed to process webhook",
                {
                    error,
                    prNumber: payload.pull_request.number,
                    repositoryName: payload.repository.full_name,
                    processingTime
                }
            );

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    /**
     * Gets the current status of the workflow integration
     * @returns Complete workflow integration status object
     */
    public getWorkflowStatus() {
        try {
            const queueStats = this.jobQueue.getQueueStats();
            const activeJobs = this.jobQueue.getActiveJobsCount();

            return {
                initialized: this.initialized,
                jobQueue: {
                    stats: queueStats,
                    activeJobs
                },
                services: {
                    orchestration: !!this.orchestrationService,
                    jobQueue: !!this.jobQueue,
                    errorHandling: true // Error handling is always available
                }
            };

        } catch (error) {
            dataLogger.error("Error getting workflow status", { error });
            // Return default status if error
            return {
                initialized: this.initialized,
                jobQueue: {
                    stats: { total: 0, pending: 0, processing: 0, completed: 0, failed: 0 },
                    activeJobs: 0
                },
                services: {
                    orchestration: false,
                    jobQueue: false,
                    errorHandling: false
                }
            };
        }
    }

    /**
     * Graceful shutdown workflow
     * Ensures all processing completes before shutdown
     * @returns A promise that resolves when shutdown is complete
     */
    public async shutdown(): Promise<void> {
        try {
            messageLogger.info("Starting workflow shutdown");

            // Stop accepting new jobs
            this.jobQueue.stop();

            // Wait for active jobs to complete (with timeout)
            const shutdownTimeout = 30000; // 30 seconds
            const startTime = Date.now();

            // Wait for active jobs to complete
            while (this.jobQueue.getActiveJobsCount() > 0 && (Date.now() - startTime) < shutdownTimeout) {
                dataLogger.info(
                    "Waiting for active jobs to complete",
                    {
                        activeJobs: this.jobQueue.getActiveJobsCount(),
                        waitTime: Date.now() - startTime
                    }
                );

                await this.sleep(1000); // Wait 1 second
            }

            // Check for remaining active jobs
            const remainingJobs = this.jobQueue.getActiveJobsCount();
            if (remainingJobs > 0) {
                dataLogger.info("Shutdown timeout reached with active jobs remaining", { remainingJobs });
            }

            // Reset initialized flag
            this.initialized = false;
            messageLogger.info("Workflow shutdown completed");

        } catch (error) {
            dataLogger.error("Error during workflow shutdown", { error });
        }
    }

    /**
     * Sets up event listeners for job queue monitoring
     */
    private setupJobQueueEventListeners(): void {
        this.jobQueue.on("jobAdded", (job) => {
            if (job.type === "pr-analysis") {
                dataLogger.info("Job added to queue", {
                    jobId: job.id,
                    prNumber: job.data.prNumber,
                    repositoryName: job.data.repositoryName
                });
            }
        });

        this.jobQueue.on("jobStarted", (job) => {
            if (job.type === "pr-analysis") {
                dataLogger.info("Job processing started", {
                    jobId: job.id,
                    prNumber: job.data.prNumber,
                    repositoryName: job.data.repositoryName
                });
            }
        });

        this.jobQueue.on("jobCompleted", (job) => {
            if (job.type === "pr-analysis") {
                dataLogger.info("Job completed successfully", {
                    jobId: job.id,
                    prNumber: job.data.prNumber,
                    repositoryName: job.data.repositoryName,
                    mergeScore: job.result?.mergeScore
                });
            }
        });

        this.jobQueue.on("jobFailed", (job) => {
            if (job.type === "pr-analysis") {
                dataLogger.error("Job failed permanently", {
                    jobId: job.id,
                    prNumber: job.data.prNumber,
                    repositoryName: job.data.repositoryName,
                    error: job.error,
                    retryCount: job.retryCount
                });
            }
        });
    }

    /**
     * Sleep utility
     * @param ms - The duration to sleep in milliseconds
     * @returns A promise that resolves after the specified duration
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Health check for the workflow integration
     * @returns An object containing health status and service details
     */
    public async healthCheck() {
        try {
            // Check service availability
            const services = {
                initialized: this.initialized,
                jobQueue: !!this.jobQueue,
                orchestration: !!this.orchestrationService,
                errorHandling: true // Error handling is always available
            };

            // Check if all services are healthy
            const allHealthy = Object.values(services).every(status => status);

            // Return health check result
            return {
                healthy: allHealthy,
                services,
                details: allHealthy ? undefined : {
                    queueStats: this.jobQueue?.getQueueStats(),
                    activeJobs: this.jobQueue?.getActiveJobsCount()
                }
            };

        } catch (error) {
            dataLogger.error("Workflow health check failed", { error });
            // Return error details
            return {
                healthy: false,
                services: {
                    initialized: false,
                    jobQueue: false,
                    orchestration: false,
                    errorHandling: false
                },
                details: { error: error instanceof Error ? error.message : String(error) }
            };
        }
    }
}
