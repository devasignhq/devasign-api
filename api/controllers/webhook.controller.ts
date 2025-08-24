import { Request, Response, NextFunction } from 'express';
import {
    GitHubWebhookPayload,
    PullRequestData,
    APIResponse,
} from '../models/ai-review.model';
import {
    GitHubWebhookError,
    PRNotEligibleError,
    PRAnalysisError
} from '../models/ai-review.errors';
import { PRAnalysisService } from '../services/pr-analysis.service';
import { JobQueueService } from '../services/job-queue.service';
import { WorkflowIntegrationService } from '../services/workflow-integration.service';
import { LoggingService } from '../services/logging.service';
import { OctokitService } from '../services/octokit.service';

/**
 * Controller for handling GitHub webhook events for PR analysis
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

/**
 * Handles GitHub PR webhook events
 * Requirement 1.1: System SHALL trigger AI review process for qualifying PRs
 * Requirement 1.2: System SHALL have access to monitor pull requests
 * Requirement 1.3: System SHALL skip review for PRs that don't link to issues
 * 
 * Complete end-to-end workflow implementation:
 * 1. Validates webhook payload and extracts PR data
 * 2. Checks if PR is eligible for analysis
 * 3. Queues PR for background AI analysis
 * 4. Returns immediate response while analysis runs asynchronously
 */
export const handlePRWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const payload: GitHubWebhookPayload = req.body;

        // Use the integrated workflow service for complete end-to-end processing
        const workflowService = WorkflowIntegrationService.getInstance();
        const result = await workflowService.processWebhookWorkflow(payload);

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Handle case where PR is not eligible for analysis
        if (result.reason && !result.jobId) {
            return res.status(200).json({
                success: true,
                message: `PR not eligible for analysis: ${result.reason}`,
                data: {
                    prNumber: payload.pull_request.number,
                    repositoryName: payload.repository.full_name,
                    reason: result.reason
                },
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        // Return success response with job information
        res.status(202).json({
            success: true,
            message: 'PR webhook processed successfully - analysis queued',
            data: {
                jobId: result.jobId,
                installationId: result.prData?.installationId,
                repositoryName: result.prData?.repositoryName,
                prNumber: result.prData?.prNumber,
                prUrl: result.prData?.prUrl,
                linkedIssuesCount: result.prData?.linkedIssues.length || 0,
                changedFilesCount: result.prData?.changedFiles.length || 0,
                eligibleForAnalysis: true,
                status: 'queued'
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('PR webhook processing failed', {
            error: error instanceof Error ? error.message : String(error)
        });

        if (error instanceof PRAnalysisError) {
            return res.status(400).json({
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
            return res.status(400).json({
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
        const workflowService = WorkflowIntegrationService.getInstance();
        const healthCheck = await workflowService.healthCheck();
        const workflowStatus = workflowService.getWorkflowStatus();

        const statusCode = healthCheck.healthy ? 200 : 503;

        res.status(statusCode).json({
            success: healthCheck.healthy,
            message: healthCheck.healthy ? 'Webhook service is healthy' : 'Webhook service has issues',
            data: {
                health: healthCheck,
                workflow: workflowStatus
            },
            timestamp: new Date().toISOString(),
            service: 'ai-pr-review-webhook'
        } as APIResponse);

    } catch (error) {
        res.status(503).json({
            success: false,
            message: 'Health check failed',
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString(),
            service: 'ai-pr-review-webhook'
        } as APIResponse);
    }
};

/**
 * Gets job status for a specific job ID
 * Requirement 6.1: System SHALL provide status updates for analysis jobs
 */
export const getJobStatus = (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        if (!jobId) {
            return res.status(400).json({
                success: false,
                error: 'Job ID is required'
            });
        }

        const jobQueue = JobQueueService.getInstance();
        const job = jobQueue.getJobStatus(jobId);

        if (!job) {
            return res.status(404).json({
                success: false,
                error: 'Job not found'
            });
        }

        res.status(200).json({
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
        LoggingService.logError('Error getting job status', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Gets queue statistics
 * Requirement 6.1: System SHALL provide queue monitoring capabilities
 */
export const getQueueStats = (req: Request, res: Response) => {
    try {
        const jobQueue = JobQueueService.getInstance();
        const stats = jobQueue.getQueueStats();

        res.status(200).json({
            success: true,
            data: {
                queue: stats,
                activeJobs: jobQueue.getActiveJobsCount(),
                timestamp: new Date().toISOString()
            }
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('Error getting queue stats', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};

/**
 * Gets comprehensive workflow status
 * Requirement 6.1: System SHALL provide comprehensive workflow monitoring
 */
export const getWorkflowStatus = (req: Request, res: Response) => {
    try {
        const workflowService = WorkflowIntegrationService.getInstance();
        const status = workflowService.getWorkflowStatus();

        res.status(200).json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('Error getting workflow status', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Manually triggers PR analysis
 * Requirement 1.4: System SHALL provide manual trigger capability
 */
export const triggerManualAnalysis = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { installationId, repositoryName, prNumber, reason, userId } = req.body;

        if (!installationId || !repositoryName || !prNumber) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: installationId, repositoryName, prNumber'
            });
        }

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
            'GET /repos/{owner}/{repo}', 
            { owner, repo }
        );

        // Use the integrated workflow service for manual analysis
        const workflowService = WorkflowIntegrationService.getInstance();
        const result = await workflowService.processWebhookWorkflow({
            action: "opened",
            number: prNumber,
            pull_request: pull_request as any,
            repository: repository as any,
            installation: installation as any,
        });
        
        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error,
                timestamp: new Date().toISOString()
            } as APIResponse);
        }

        res.status(202).json({
            success: true,
            message: 'Manual analysis queued successfully',
            data: {
                jobId: result.jobId,
                installationId,
                repositoryName,
                prNumber,
                status: 'queued',
                reason: reason || 'Manual trigger'
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('Error in manual analysis trigger', { error });
        next(error);
    }
};

/**
 * Gets intelligent context configuration
 * Requirement 6.1: System SHALL provide configuration management for intelligent context features
 */
export const getIntelligentContextConfig = (req: Request, res: Response) => {
    try {
        const configService = PRAnalysisService.getConfigService();
        const config = configService.getConfig();
        const featureFlags = configService.getFeatureFlags();
        const configSummary = configService.getConfigSummary();

        res.status(200).json({
            success: true,
            data: {
                configuration: config,
                featureFlags,
                summary: configSummary,
                environmentVariables: {
                    INTELLIGENT_CONTEXT_ENABLED: process.env.INTELLIGENT_CONTEXT_ENABLED,
                    MAX_INTELLIGENT_CONTEXT_TIME: process.env.MAX_INTELLIGENT_CONTEXT_TIME,
                    FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR: process.env.FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR,
                    ENABLE_INTELLIGENT_CONTEXT_METRICS: process.env.ENABLE_INTELLIGENT_CONTEXT_METRICS
                }
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('Error getting intelligent context config', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

/**
 * Updates intelligent context configuration
 * Requirement 6.1: System SHALL provide configuration management for intelligent context features
 */
export const updateIntelligentContextConfig = (req: Request, res: Response) => {
    try {
        const { configuration, featureFlags } = req.body;

        if (!configuration && !featureFlags) {
            return res.status(400).json({
                success: false,
                error: 'Either configuration or featureFlags must be provided',
                timestamp: new Date().toISOString()
            });
        }

        const configService = PRAnalysisService.getConfigService();

        // Update configuration if provided
        if (configuration) {
            // Validate configuration before updating
            const tempService = configService;
            tempService.updateConfig(configuration);
            const validation = tempService.validateConfig();

            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid configuration',
                    details: validation.errors,
                    timestamp: new Date().toISOString()
                });
            }
        }

        // Update feature flags if provided
        if (featureFlags) {
            configService.updateFeatureFlags(featureFlags);
        }

        // Get updated configuration
        const updatedConfig = configService.getConfig();
        const updatedFeatureFlags = configService.getFeatureFlags();
        const configSummary = configService.getConfigSummary();

        LoggingService.logInfo('updateIntelligentContextConfig', 'Intelligent context configuration updated', {
            configuration: updatedConfig,
            featureFlags: updatedFeatureFlags
        });

        res.status(200).json({
            success: true,
            message: 'Configuration updated successfully',
            data: {
                configuration: updatedConfig,
                featureFlags: updatedFeatureFlags,
                summary: configSummary
            },
            timestamp: new Date().toISOString()
        } as APIResponse);

    } catch (error) {
        LoggingService.logError('Error updating intelligent context config', { error });
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};