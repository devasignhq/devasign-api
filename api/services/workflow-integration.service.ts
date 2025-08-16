import {
  PullRequestData,
  GitHubWebhookPayload,
  ReviewResult,
  ManualTriggerRequest
} from '../models/ai-review.model';
import { JobQueueService } from './job-queue.service';
import { AIReviewOrchestrationService } from './ai-review-orchestration.service';
import { PRAnalysisService } from './pr-analysis.service';
import { LoggingService } from './logging.service';
import { MonitoringService } from './monitoring.service';
import { ErrorHandlingIntegrationService } from './error-handling-integration.service';

/**
 * Workflow Integration Service
 * Coordinates the complete end-to-end PR analysis workflow
 * Requirements: 1.1, 2.1, 4.1, 6.1
 * 
 * This service provides the main integration points for:
 * - Webhook processing workflow
 * - Manual analysis workflow  
 * - Status monitoring workflow
 * - Error handling and recovery workflow
 */
export class WorkflowIntegrationService {
  private static instance: WorkflowIntegrationService;
  private jobQueue: JobQueueService;
  private orchestrationService: AIReviewOrchestrationService;
  private initialized = false;

  private constructor() {
    this.jobQueue = JobQueueService.getInstance();
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
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      LoggingService.logInfo("initialize", 'Initializing Workflow Integration Service');

      // Set up job queue event listeners for monitoring
      this.setupJobQueueEventListeners();

      // Initialize error handling integration
      ErrorHandlingIntegrationService.initializeCircuitBreakers();

      this.initialized = true;

      LoggingService.logInfo("initialize", 'Workflow Integration Service initialized successfully');

    } catch (error) {
      LoggingService.logError('Failed to initialize Workflow Integration Service', { error });
      throw error;
    }
  }

  /**
   * Complete webhook processing workflow
   * Requirement 1.1: System SHALL trigger AI review process for qualifying PRs
   * 
   * End-to-end workflow:
   * 1. Validate and extract PR data from webhook
   * 2. Check eligibility for analysis
   * 3. Queue for background processing
   * 4. Return immediate response
   * 5. Background: Execute full AI analysis
   * 6. Background: Post results to GitHub
   */
  public async processWebhookWorkflow(payload: GitHubWebhookPayload): Promise<{
    success: boolean;
    jobId?: string;
    prData?: PullRequestData;
    reason?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      LoggingService.logInfo("processWebhookWorkflow", 'Starting webhook workflow', {
        action: payload.action,
        prNumber: payload.pull_request.number,
        repository: payload.repository.full_name
      });

      // Step 1: Extract and validate PR data
      let prData: PullRequestData;
      try {
        prData = await PRAnalysisService.createCompletePRData(payload);
      } catch (error: any) {
        if (error.name === 'PRNotEligibleError') {
          LoggingService.logInfo("processWebhookWorkflow", 'PR not eligible for analysis', {
            prNumber: error.prNumber,
            repositoryName: error.repositoryName,
            reason: error.reason
          });

          return {
            success: true,
            reason: error.reason
          };
        }
        throw error;
      }

      // Step 2: Log analysis decision
      PRAnalysisService.logAnalysisDecision(prData, true);

      // Step 3: Queue for background analysis
      const jobId = await this.jobQueue.addPRAnalysisJob(prData);

      LoggingService.logInfo("processWebhookWorkflow", 'Webhook workflow completed successfully', {
        jobId,
        prNumber: prData.prNumber,
        repositoryName: prData.repositoryName,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        jobId,
        prData
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      LoggingService.logError('Webhook workflow failed', {
        error: errorMessage,
        processingTime
      });

      MonitoringService.recordError('webhook_workflow_failed', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Manual analysis workflow
   * Requirement 1.4: System SHALL provide manual trigger capability
   * 
   * Workflow:
   * 1. Validate manual trigger request
   * 2. Create PR data structure
   * 3. Queue for analysis
   * 4. Return job tracking information
   */
  public async processManualAnalysisWorkflow(request: ManualTriggerRequest): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      LoggingService.logInfo("processManualAnalysisWorkflow", 'Starting manual analysis workflow', {
        installationId: request.installationId,
        repositoryName: request.repositoryName,
        prNumber: request.prNumber,
        reason: request.reason
      });

      // Step 1: Create PR data for manual analysis
      const prData: PullRequestData = {
        installationId: request.installationId,
        repositoryName: request.repositoryName,
        prNumber: request.prNumber,
        prUrl: `https://github.com/${request.repositoryName}/pull/${request.prNumber}`,
        title: 'Manual Analysis Request',
        body: request.reason || 'Manually triggered analysis',
        changedFiles: [], // Would be fetched from GitHub API in full implementation
        linkedIssues: [], // Would be extracted from PR body
        author: request.userId,
        isDraft: false
      };

      // Step 2: Queue for analysis
      const jobId = await this.jobQueue.addPRAnalysisJob(prData);

      // Step 3: Update monitoring - manual analysis triggered

      LoggingService.logInfo("processManualAnalysisWorkflow", 'Manual analysis workflow completed', {
        jobId,
        processingTime: Date.now() - startTime
      });

      return {
        success: true,
        jobId
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      LoggingService.logError('Manual analysis workflow failed', {
        error: errorMessage,
        processingTime
      });

      MonitoringService.recordError('manual_analysis_workflow_failed', errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Direct analysis workflow (synchronous)
   * For cases where immediate analysis is needed
   * 
   * Workflow:
   * 1. Execute analysis directly without queueing
   * 2. Return complete results
   * 3. Handle errors with graceful degradation
   */
  public async processDirectAnalysisWorkflow(prData: PullRequestData): Promise<ReviewResult> {
    const startTime = Date.now();

    try {
      LoggingService.logInfo("processDirectAnalysisWorkflow", 'Starting direct analysis workflow', {
        prNumber: prData.prNumber,
        repositoryName: prData.repositoryName
      });

      // Execute analysis directly
      const result = await this.orchestrationService.analyzePR(prData);

      // Direct analysis completed successfully
      LoggingService.logInfo("processDirectAnalysisWorkflow", 'Direct analysis workflow completed', {
        prNumber: prData.prNumber,
        mergeScore: result.mergeScore,
        processingTime: Date.now() - startTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;

      LoggingService.logError('Direct analysis workflow failed', {
        prNumber: prData.prNumber,
        repositoryName: prData.repositoryName,
        error: error instanceof Error ? error.message : String(error),
        processingTime
      });

      MonitoringService.recordError('direct_analysis_workflow_failed', error instanceof Error ? error.message : String(error));

      throw error;
    }
  }

  /**
   * Status monitoring workflow
   * Provides comprehensive status information
   */
  public getWorkflowStatus(): {
    initialized: boolean;
    jobQueue: {
      stats: any;
      activeJobs: number;
    };
    services: {
      orchestration: boolean;
      jobQueue: boolean;
      errorHandling: boolean;
    };
    metrics: any;
  } {
    try {
      const queueStats = this.jobQueue.getQueueStats();
      const activeJobs = this.jobQueue.getActiveJobsCount();
      const metrics = MonitoringService.getMetrics();

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
        },
        metrics: {
          aiReviews: metrics.aiReviews || {},
          services: metrics.services || {},
          errors: metrics.errors ? Array.from(metrics.errors.entries()) : []
        }
      };

    } catch (error) {
      LoggingService.logError('Error getting workflow status', { error });
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
        },
        metrics: {}
      };
    }
  }

  /**
   * Graceful shutdown workflow
   * Ensures all processing completes before shutdown
   */
  public async shutdown(): Promise<void> {
    try {
      LoggingService.logInfo("shutdown", 'Starting workflow shutdown');

      // Stop accepting new jobs
      this.jobQueue.stop();

      // Wait for active jobs to complete (with timeout)
      const shutdownTimeout = 30000; // 30 seconds
      const startTime = Date.now();

      while (this.jobQueue.getActiveJobsCount() > 0 && (Date.now() - startTime) < shutdownTimeout) {
        LoggingService.logInfo("shutdown", 'Waiting for active jobs to complete', {
          activeJobs: this.jobQueue.getActiveJobsCount(),
          waitTime: Date.now() - startTime
        });

        await this.sleep(1000); // Wait 1 second
      }

      const remainingJobs = this.jobQueue.getActiveJobsCount();
      if (remainingJobs > 0) {
        LoggingService.logInfo("shutdown", 'Shutdown timeout reached with active jobs remaining', {
          remainingJobs
        });
      }

      this.initialized = false;
      LoggingService.logInfo("shutdown", 'Workflow shutdown completed');

    } catch (error) {
      LoggingService.logError('Error during workflow shutdown', { error });
    }
  }

  /**
   * Sets up event listeners for job queue monitoring
   */
  private setupJobQueueEventListeners(): void {
    this.jobQueue.on('jobAdded', (job) => {
      LoggingService.logInfo("setupJobQueueEventListeners", 'Job added to queue', {
        jobId: job.id,
        prNumber: job.data.prNumber,
        repositoryName: job.data.repositoryName
      });
      // Job added to queue - tracked by job queue service
    });

    this.jobQueue.on('jobStarted', (job) => {
      LoggingService.logInfo("setupJobQueueEventListeners", 'Job processing started', {
        jobId: job.id,
        prNumber: job.data.prNumber,
        repositoryName: job.data.repositoryName
      });
      // Job started - tracked by job queue service
    });

    this.jobQueue.on('jobCompleted', (job) => {
      LoggingService.logInfo("setupJobQueueEventListeners", 'Job completed successfully', {
        jobId: job.id,
        prNumber: job.data.prNumber,
        repositoryName: job.data.repositoryName,
        mergeScore: job.result?.mergeScore
      });
      // Job completed - tracked by job queue service
    });

    this.jobQueue.on('jobFailed', (job) => {
      LoggingService.logError("setupJobQueueEventListeners", 'Job failed permanently', {
        jobId: job.id,
        prNumber: job.data.prNumber,
        repositoryName: job.data.repositoryName,
        error: job.error,
        retryCount: job.retryCount
      });
      // Job failed - tracked by job queue service
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for the workflow integration
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    services: Record<string, boolean>;
    details?: any;
  }> {
    try {
      const services = {
        initialized: this.initialized,
        jobQueue: !!this.jobQueue,
        orchestration: !!this.orchestrationService,
        errorHandling: true // Error handling is always available
      };

      const allHealthy = Object.values(services).every(status => status);

      return {
        healthy: allHealthy,
        services,
        details: allHealthy ? undefined : {
          queueStats: this.jobQueue?.getQueueStats(),
          activeJobs: this.jobQueue?.getActiveJobsCount()
        }
      };

    } catch (error) {
      LoggingService.logError('Workflow health check failed', { error });
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