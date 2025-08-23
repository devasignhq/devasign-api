// ============================================================================
// AI Review System - Type Exports
// Centralized export file for all AI review related types and interfaces
// ============================================================================

// Core Data Models and DTOs
export * from './ai-review.model';

// Intelligent Context Fetching Models
export * from './intelligent-context.model';

// Error Classes
export * from './ai-review.errors';

// Prisma Generated Types (re-export for convenience)
export type {
    AIReviewRule,
    AIReviewResult,
    RuleType,
    RuleSeverity,
    ReviewStatus
} from '../generated/client';

// ============================================================================
// Type Guards and Utility Types
// ============================================================================

/**
 * Type guard to check if an error is an AI review error
 */
export function isAIReviewError(error: any): error is import('./ai-review.errors').AIReviewError {
    return error && typeof error === 'object' && 'code' in error && 'retryable' in error;
}

/**
 * Type guard to check if a PR should be analyzed
 */
export function isPRAnalyzable(prData: import('./ai-review.model').PullRequestData): boolean {
    return !prData.isDraft && prData.linkedIssues.length > 0;
}

/**
 * Utility type for partial updates
 */
export type PartialUpdate<T> = Partial<T> & { id: string };

/**
 * Utility type for creating new entities (without generated fields)
 */
export type CreateEntity<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Utility type for API responses with metadata
 */
export type APIResponseWithMeta<T> = {
    data: T;
    meta: {
        requestId: string;
        timestamp: string;
        processingTime: number;
    };
};

/**
 * Configuration types for services
 */
export interface AIReviewConfig {
    groq: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
        maxRetries: number;
    };
    pinecone: {
        apiKey: string;
        environment: string;
        indexName: string;
        dimension: number;
    };
    github: {
        appId: string;
        privateKey: string;
        webhookSecret: string;
    };
    analysis: {
        maxFileSize: number;
        maxFilesPerPR: number;
        contextLimit: number;
        scoreThresholds: {
            excellent: number;
            good: number;
            needsWork: number;
        };
    };
    cache: {
        ttl: number;
        maxSize: number;
    };
}

/**
 * Service health status type
 */
export interface ServiceHealth {
    service: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    lastCheck: string;
    responseTime?: number;
    error?: string;
    details?: Record<string, any>;
}

/**
 * Batch operation types
 */
export interface BatchOperation<T> {
    operation: 'create' | 'update' | 'delete';
    data: T;
    id?: string;
}

export interface BatchResult<T> {
    successful: T[];
    failed: Array<{
        data: T;
        error: string;
    }>;
    summary: {
        total: number;
        successful: number;
        failed: number;
    };
}

/**
 * Webhook event types
 */
export type WebhookEventType =
    | 'pull_request.opened'
    | 'pull_request.synchronize'
    | 'pull_request.ready_for_review'
    | 'pull_request.closed';

/**
 * Analysis trigger types
 */
export type AnalysisTrigger = 'webhook' | 'manual' | 'scheduled' | 'retry';

/**
 * Review comment template types
 */
export interface ReviewTemplate {
    header: string;
    mergeScoreGood: string;
    mergeScorePoor: string;
    rulesSection: string;
    suggestionsSection: string;
    footer: string;
    errorMessage: string;
}

/**
 * Metrics and monitoring types
 */
export interface AnalysisMetrics {
    totalAnalyses: number;
    successfulAnalyses: number;
    failedAnalyses: number;
    averageProcessingTime: number;
    averageMergeScore: number;
    ruleViolationCounts: Record<string, number>;
    errorCounts: Record<string, number>;
}

/**
 * Rate limiting types
 */
export interface RateLimitInfo {
    limit: number;
    remaining: number;
    resetTime: Date;
    retryAfter?: number;
}

/**
 * Context window management types
 */
export interface ContextWindow {
    maxTokens: number;
    currentTokens: number;
    priority: Array<{
        type: 'pr_data' | 'similar_prs' | 'relevant_files' | 'rules';
        content: string;
        tokens: number;
        priority: number;
    }>;
}

/**
 * File analysis types
 */
export interface FileAnalysis {
    filename: string;
    language: string;
    complexity: number;
    issues: Array<{
        line: number;
        severity: 'low' | 'medium' | 'high';
        message: string;
        rule?: string;
    }>;
    suggestions: Array<{
        line: number;
        type: string;
        description: string;
        suggestedCode?: string;
    }>;
}

/**
 * Performance monitoring types
 */
export interface PerformanceMetrics {
    operation: string;
    startTime: Date;
    endTime: Date;
    duration: number;
    success: boolean;
    error?: string;
    metadata?: Record<string, any>;
}