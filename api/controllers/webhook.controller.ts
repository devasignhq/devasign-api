import { Request, Response, NextFunction } from "express";
import {
    GitHubWebhookPayload,
    APIResponse,
    GitHubInstallation,
    GitHubPullRequest
} from "../models/ai-review.model";
import { GitHubWebhookError, PRAnalysisError } from "../models/error.model";
import { JobQueueService } from "../services/job-queue.service";
import { WorkflowIntegrationService } from "../services/workflow-integration.service";
import { OctokitService } from "../services/octokit.service";
import { STATUS_CODES } from "../helper";
import { dataLogger } from "../config/logger.config";

/**
 * Handles GitHub PR webhook events
 */
export const handlePRWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload: GitHubWebhookPayload = req.body;

        // Use the integrated workflow service for complete end-to-end processing
        const workflowService = WorkflowIntegrationService.getInstance();
        const result = await workflowService.processWebhookWorkflow(payload);

        if (!result.success) {
            return res.status(STATUS_CODES.UNKNOWN).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Handle case where PR is not eligible for analysis
        if (result.reason && !result.jobId) {
            return res.status(STATUS_CODES.SUCCESS).json({
                success: true,
                message: result.reason,
                data: {
                    prNumber: payload.pull_request.number,
                    repositoryName: payload.repository.full_name,
                    reason: result.reason
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Return success response with job information
        res.status(STATUS_CODES.BACKGROUND_JOB).json({
            success: true,
            message: "PR webhook processed successfully - analysis queued",
            data: {
                jobId: result.jobId,
                installationId: result.prData?.installationId,
                repositoryName: result.prData?.repositoryName,
                prNumber: result.prData?.prNumber,
                prUrl: result.prData?.prUrl,
                linkedIssuesCount: result.prData?.linkedIssues.length || 0,
                changedFilesCount: result.prData?.changedFiles.length || 0,
                eligibleForAnalysis: true,
                status: "queued"
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        dataLogger.error("PR webhook processing failed", { error });

        // Handle specific PR analysis errors
        if (error instanceof PRAnalysisError) {
            return res.status(error.status).json({
                success: false,
                error: error.message,
                code: error.code,
                data: {
                    prNumber: error.prNumber,
                    repositoryName: error.repositoryName
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        if (error instanceof GitHubWebhookError) {
            return res.status(error.status).json({
                success: false,
                error: error.message,
                code: error.code,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Pass unexpected errors to error middleware
        next(error);
    }
};

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
    try {
        const { jobId } = req.params;

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
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: "Internal server error"
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
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: "Internal server error"
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
        res.status(STATUS_CODES.UNKNOWN).json({
            success: false,
            error: "Internal server error",
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Manually triggers PR analysis
 */
export const triggerManualAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { installationId, repositoryName, prNumber, reason } = req.body;

        if (!installationId || !repositoryName || !prNumber) {
            // Missing required fields
            return res.status(STATUS_CODES.SERVER_ERROR).json({
                success: false,
                error: "Missing required fields: installationId, repositoryName, prNumber"
            });
        }

        // Fetch PR details using Octokit
        const octokit = await OctokitService.getOctokit(installationId);
        const [owner, repo] = OctokitService.getOwnerAndRepo(repositoryName);

        const { data: pull_request } = await octokit.rest.pulls.get({
            owner,
            repo,
            pull_number: prNumber
        });

        const { data: installation } = await octokit.request(
            "GET /app/installations/{installation_id}",
            { installation_id: Number(installationId) }
        );

        const { data: repository } = await octokit.request(
            "GET /repos/{owner}/{repo}", 
            { owner, repo }
        );

        // Use the integrated workflow service for manual analysis
        const workflowService = WorkflowIntegrationService.getInstance();
        const result = await workflowService.processWebhookWorkflow({
            action: "opened",
            number: prNumber,
            pull_request: pull_request as GitHubPullRequest,
            repository,
            installation: installation as GitHubInstallation
        });
        
        if (!result.success) {
            // Analysis could not be queued
            return res.status(STATUS_CODES.UNKNOWN).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Return success response
        res.status(STATUS_CODES.BACKGROUND_JOB).json({
            success: true,
            message: "Manual analysis queued successfully",
            data: {
                jobId: result.jobId,
                installationId,
                repositoryName,
                prNumber,
                status: "queued",
                reason: reason || "Manual trigger"
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        // Log and pass error to middleware
        dataLogger.error("Error in manual analysis trigger", { error });
        next(error);
    }
};
