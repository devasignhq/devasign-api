import { LinkedIssue, ReviewResult } from "./ai-review.model";

// ============================================================================
// Raw Code Changes Extraction Types
// ============================================================================

export interface RawCodeChanges {
    prNumber: number;
    repositoryName: string;
    totalChanges: {
        additions: number;
        deletions: number;
        filesChanged: number;
    };
    fileChanges: FileChange[];
    rawDiff: string; // Complete diff content
}

export interface FileChange {
    filename: string;
    status: "added" | "modified" | "removed" | "renamed";
    additions: number;
    deletions: number;
    patch: string; // Raw patch content
    language?: string;
    previousFilename?: string; // For renamed files
}

// ============================================================================
// Repository Structure Analysis Types
// ============================================================================

export interface RepositoryStructure {
    totalFiles: number;
    filePaths: string[];
    filesByLanguage: Record<string, string[]>;
    directoryStructure: DirectoryNode[];
}

export interface DirectoryNode {
    name: string;
    path: string;
    type: "file" | "directory";
    children?: DirectoryNode[];
    language?: string;
}

// ============================================================================
// AI Context Analysis Types
// ============================================================================

export interface ContextAnalysisRequest {
    codeChanges: RawCodeChanges;
    repositoryStructure: RepositoryStructure;
    prMetadata: {
        title: string;
        description: string;
        linkedIssues: LinkedIssue[];
        author: string;
    };
}

export interface ContextAnalysisResponse {
    relevantFiles: RelevantFileRecommendation[];
    reasoning: string;
    confidence: number;
    analysisType: "comprehensive" | "focused" | "minimal";
    estimatedReviewQuality: number; // 0-100
}

export interface RelevantFileRecommendation {
    filePath: string;
    relevanceScore: number; // 0-1
    reason: string;
    category: "dependency" | "interface" | "test" | "config" | "documentation" | "related_logic";
    priority: "high" | "medium" | "low";
}

// ============================================================================
// File Fetching Types
// ============================================================================

export interface FetchedFile {
    filePath: string;
    content: string;
    language: string;
    size: number;
    lastModified: string;
    fetchSuccess: boolean;
    error?: string;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ContextMetrics {
    totalFilesInRepo: number;
    filesAnalyzedByAI: number;
    filesRecommended: number;
    filesFetched: number;
    fetchSuccessRate: number;
    contextQualityScore?: number; // 0-100 quality assessment score
    optimizationTime?: number; // Time spent optimizing context in ms
    processingTime: {
        codeExtraction: number;
        pathRetrieval: number;
        aiAnalysis: number;
        fileFetching: number;
        total: number;
    };
}

// ============================================================================
// Error Handling Types
// ============================================================================

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
}

export interface ErrorTrackingMetrics {
    serviceName: string;
    errorCount: number;
    lastError?: {
        message: string;
        timestamp: Date;
        errorType: string;
    };
    retryAttempts: number;
    circuitBreakerTrips: number;
    fallbackUsageCount: number;
}

export interface WorkflowExecutionResult<T> {
    success: boolean;
    result?: T;
    errors: string[];
    warnings: string[];
    fallbacksUsed: string[];
    processingTimes: Record<string, number>;
    errorMetrics: ErrorTrackingMetrics[];
}

// ============================================================================
// Performance and Monitoring Types
// ============================================================================

export interface ContextAnalysisMetrics {
    id: string;
    installationId: string;
    repositoryName: string;
    prNumber: number;
    
    totalFilesInRepo: number;
    filesRecommended: number;
    filesFetched: number;
    fetchSuccessRate: number;
    
    processingTimes: ProcessingTimes;
    aiConfidence: number;
    reviewQualityScore: number; // 0-100
    
    createdAt: Date;
}

export interface ProcessingTimes {
    codeExtraction: number;
    pathRetrieval: number;
    aiAnalysis: number;
    fileFetching: number;
    total: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ContextValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// ============================================================================
// Batch Processing Types
// ============================================================================

export interface BatchProcessingConfig {
    batchSize: number;
    maxConcurrency: number;
    retryConfig: RetryConfig;
}

// ============================================================================
// Type Guards and Utility Functions
// ============================================================================

export function isValidRawCodeChanges(obj: RawCodeChanges): obj is RawCodeChanges {
    return obj &&
        typeof obj.prNumber === "number" &&
        typeof obj.repositoryName === "string" &&
        obj.totalChanges &&
        Array.isArray(obj.fileChanges) &&
        typeof obj.rawDiff === "string";
}

export function isValidRepositoryStructure(obj: RepositoryStructure): obj is RepositoryStructure {
    return obj &&
        typeof obj.totalFiles === "number" &&
        Array.isArray(obj.filePaths) &&
        obj.filesByLanguage &&
        Array.isArray(obj.directoryStructure);
}

export function isValidContextAnalysisResponse(obj: ContextAnalysisResponse): obj is ContextAnalysisResponse {
    return obj &&
        Array.isArray(obj.relevantFiles) &&
        typeof obj.reasoning === "string" &&
        typeof obj.confidence === "number" &&
        ["comprehensive", "focused", "minimal"].includes(obj.analysisType as string) &&
        typeof obj.estimatedReviewQuality === "number";
}

export function isValidFetchedFile(obj: FetchedFile): obj is FetchedFile {
    return obj &&
        typeof obj.filePath === "string" &&
        typeof obj.content === "string" &&
        typeof obj.language === "string" &&
        typeof obj.size === "number" &&
        typeof obj.lastModified === "string" &&
        typeof obj.fetchSuccess === "boolean";
}

// ============================================================================
// Integration Types with Existing System
// ============================================================================

export interface ContextEnhancedResult {
    standardResult: ReviewResult;
    contextMetrics: ContextMetrics;
    enhancedFeatures: {
        aiRecommendedFiles: string[];
        contextQualityScore: number;
        processingTimeBreakdown: ProcessingTimes;
    };
}
