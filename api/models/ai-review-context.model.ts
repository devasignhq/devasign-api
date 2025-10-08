// ============================================================================
// AI Context Analysis Types
// ============================================================================

export interface RelevantFileRecommendation {
    filePath: string;
    reason: string;
    priority: "high" | "medium" | "low";
    content?: string;
}

export interface FetchedFile { // !
    filePath: string;
    content: string;
    size: number;
    fetchSuccess: boolean;
    error?: string;
}

// ============================================================================
// Context Types
// ============================================================================

export interface ContextMetrics { // ?
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

export interface RetryConfig { // !
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryableErrors: string[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ContextValidationResult {
    isValid: boolean;
    errors: string[];
}

// ============================================================================
// Batch Processing Types
// ============================================================================

export interface BatchProcessingConfig { // ?
    batchSize: number;
    maxConcurrency: number;
    retryConfig: RetryConfig;
}
