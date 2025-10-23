import { Request, Response } from "express";
import { dataLogger } from "../../config/logger.config";
import { STATUS_CODES } from "../../utilities/data";
import { getFieldFromUnknownObject } from "../../utilities/helper";
import { APIResponse } from "../../models/ai-review.model";
import { JobQueueService } from "../../services/ai-review/job-queue.service";
import { WorkflowIntegrationService } from "../../services/ai-review/workflow-integration.service";

/**
 * Health check endpoint for webhook service
 */
export const webhookHealthCheck = async (req: Request, res: Response) => {
    try {
        // Get workflow service status
        const workflowService = WorkflowIntegrationService.getInstance();
        const healthCheck = await workflowService.healthCheck();
        const workflowStatus = workflowService.getWorkflowStatus();

        // Return health check response
        const statusCode = healthCheck.healthy ? STATUS_CODES.SUCCESS : STATUS_CODES.SERVER_ERROR;

        res.status(statusCode).json({
            success: healthCheck.healthy,
            message: healthCheck.healthy ? "Webhook service is healthy" : "Webhook service has issues",
            data: {
                health: healthCheck,
                workflow: workflowStatus
            },
            timestamp: new Date().toISOString(),
            service: "ai-pr-review-webhook"
        } as APIResponse);

    } catch (error) {
        // Log and return error response
        dataLogger.error("Webhook health check failed", { error });
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            message: "Health check failed",
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            service: "ai-pr-review-webhook"
        } as APIResponse);
    }
};

/**
 * Gets job data for a specific job ID
 */
export const getJobData = (req: Request, res: Response) => {
    const { jobId } = req.params;

    try {
        // Validate job ID is provided
        if (!jobId) {
            return res.status(STATUS_CODES.SERVER_ERROR).json({
                success: false,
                error: "Job ID is required"
            });
        }

        // Fetch job data from the job queue
        const jobQueue = JobQueueService.getInstance();
        const job = jobQueue.getJobData(jobId);

        if (!job) {
            // Job not found
            return res.status(STATUS_CODES.NOT_FOUND).json({
                success: false,
                error: "Job not found"
            });
        }

        // Return job data
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: {
                jobId: job.id,
                status: job.status,
                prNumber: job.data.prNumber,
                repositoryName: job.data.repositoryName,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                retryCount: job.retryCount,
                maxRetries: job.maxRetries,
                error: job.error,
                result: job.result ? {
                    mergeScore: job.result.mergeScore,
                    reviewStatus: job.result.reviewStatus,
                    suggestionsCount: job.result.suggestions.length,
                    rulesViolatedCount: job.result.rulesViolated.length,
                    summary: job.result.summary
                } : null
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting job data", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: errorMessage || "Failed to get job data"
        });
    }
};

/**
 * Gets queue statistics
 */
export const getQueueStats = (req: Request, res: Response) => {
    try {
        // Fetch queue statistics from the job queue
        const jobQueue = JobQueueService.getInstance();
        const stats = jobQueue.getQueueStats();

        // Return queue statistics
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: {
                queue: stats,
                activeJobs: jobQueue.getActiveJobsCount(),
                timestamp: new Date().toISOString()
            }
        } as APIResponse);

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting queue stats", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: errorMessage || "Failed to fetch queue stats"
        });
    }
};

/**
 * Gets comprehensive workflow status
 */
export const getWorkflowStatus = (req: Request, res: Response) => {
    try {
        // Fetch workflow status from the integration service
        const workflowService = WorkflowIntegrationService.getInstance();
        const status = workflowService.getWorkflowStatus();

        // Return workflow status
        res.status(STATUS_CODES.SUCCESS).json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting workflow status", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: errorMessage || "Failed to get workflow status",
            timestamp: new Date().toISOString()
        });
    }
};
