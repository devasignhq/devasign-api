import { Request, Response } from "express";
import { dataLogger } from "../../config/logger.config";
import { responseWrapper, getFieldFromUnknownObject } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { backgroundJobService } from "../../services/background-job.service";
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

        responseWrapper({
            res,
            status: statusCode,
            data: {
                health: healthCheck,
                workflow: workflowStatus,
                timestamp: new Date().toISOString(),
                service: "ai-pr-review-webhook"
            },
            message: healthCheck.healthy ? "Webhook service is healthy" : "Webhook service has issues"
        });

    } catch (error) {
        // Log and return error response
        dataLogger.error("Webhook health check failed", { error });
        responseWrapper({
            res,
            status: STATUS_CODES.UNKNOWN,
            data: {
                timestamp: new Date().toISOString(),
                service: "ai-pr-review-webhook"
            },
            message: "Health check failed",
            warning: error instanceof Error ? error.message : String(error)
        });
    }
};

/**
 * Gets job data for a specific job ID
 */
export const getJobData = (req: Request, res: Response) => {
    const { jobId } = req.params;
    dataLogger.info("getJobData", { jobId });

    try {
        // Validate job ID is provided
        if (!jobId) {
            return responseWrapper({
                res,
                status: STATUS_CODES.SERVER_ERROR,
                data: {},
                message: "Job ID is required"
            });
        }

        // Fetch job data from the job queue
        const job = backgroundJobService.getJobData(jobId);

        if (!job) {
            // Job not found
            return responseWrapper({
                res,
                status: STATUS_CODES.NOT_FOUND,
                data: {},
                message: "Job not found"
            });
        }

        // Return job data
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {
                jobId: job.id,
                type: job.type,
                status: job.status,
                data: job.data,
                createdAt: job.createdAt,
                startedAt: job.startedAt,
                completedAt: job.completedAt,
                retryCount: job.retryCount,
                maxRetries: job.maxRetries,
                error: job.error,
                result: job.result,
                timestamp: new Date().toISOString()
            },
            message: "Job data retrieved successfully"
        });

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting job data", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        responseWrapper({
            res,
            status: STATUS_CODES.UNKNOWN,
            data: {},
            message: "Failed to get job data",
            warning: errorMessage
        });
    }
};

/**
 * Gets queue statistics
 */
export const getQueueStats = (req: Request, res: Response) => {
    try {
        // Fetch queue statistics from the job queue
        const stats = backgroundJobService.getQueueStats();

        // Return queue statistics
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {
                queue: stats,
                activeJobs: backgroundJobService.getActiveJobsCount(),
                timestamp: new Date().toISOString()
            },
            message: "Queue statistics retrieved successfully"
        });

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting queue stats", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        responseWrapper({
            res,
            status: STATUS_CODES.UNKNOWN,
            data: {},
            message: "Failed to fetch queue stats",
            warning: errorMessage
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
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {
                ...status,
                timestamp: new Date().toISOString()
            },
            message: "Workflow status retrieved successfully"
        });

    } catch (error) {
        // Log and return error response
        dataLogger.error("Error getting workflow status", { error });

        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        responseWrapper({
            res,
            status: STATUS_CODES.UNKNOWN,
            data: { timestamp: new Date().toISOString() },
            message: "Failed to get workflow status",
            warning: errorMessage
        });
    }
};
