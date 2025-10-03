import { OctokitService } from "./octokit.service";
import { LoggingService } from "./logging.service";
import {
    RelevantFileRecommendation,
    FetchedFile,
    BatchProcessingConfig,
    RetryConfig
} from "../models/ai-review-context.model";

/**
 * Service for selectively fetching files based on AI recommendations
 * Implements prioritization, batch processing, and graceful error handling
 */
export class SelectiveFileFetcherService {
    private readonly defaultBatchConfig: BatchProcessingConfig = {
        batchSize: 10,
        maxConcurrency: 3,
        retryConfig: {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000,
            backoffMultiplier: 2,
            retryableErrors: [
                "ECONNRESET",
                "ENOTFOUND",
                "ECONNREFUSED",
                "ETIMEDOUT",
                "EPIPE",
                "EPROTO",
                "RequestError",
                "HttpError",
                "GitHubAPIError",
                "RateLimitError",
                "NetworkError"
            ]
        }
    };

    /**
     * Fetch relevant files based on AI recommendations with prioritization and batch processing
     */
    async fetchRelevantFiles(
        installationId: string,
        repositoryName: string,
        recommendations: RelevantFileRecommendation[],
        branch?: string
    ): Promise<FetchedFile[]> {
        const startTime = Date.now();
        LoggingService.logInfo(
            "selective_file_fetching_started",
            "Starting selective file fetching",
            {
                installationId,
                repositoryName,
                recommendationCount: recommendations.length,
                branch
            }
        );

        try {
            // Prioritize files based on AI recommendations
            const prioritizedFiles = this.prioritizeFiles(recommendations);
            
            // Process files in batches with concurrency control
            const fetchedFiles = await this.processBatchesWithConcurrency(
                installationId,
                repositoryName,
                prioritizedFiles,
                branch
            );

            // Handle any fetch errors and compile results
            const processedFiles = this.handleFetchErrors(fetchedFiles);

            const processingTime = Date.now() - startTime;
            const successCount = processedFiles.filter(f => f.fetchSuccess).length;
            const failureCount = processedFiles.length - successCount;

            LoggingService.logInfo(
                "selective_file_fetching_completed",
                "Selective file fetching completed",
                {
                    installationId,
                    repositoryName,
                    totalFiles: processedFiles.length,
                    successCount,
                    failureCount,
                    processingTime,
                    successRate: successCount / processedFiles.length
                }
            );

            return processedFiles;

        } catch (error) {
            LoggingService.logError(
                "selective_file_fetching_failed",
                error instanceof Error ? error : new Error(String(error)),
                {
                    installationId,
                    repositoryName,
                    processingTime: Date.now() - startTime
                }
            );

            // Return empty array with error information rather than throwing
            return recommendations.map(rec => ({
                filePath: rec.filePath,
                content: "",
                language: this.detectLanguage(rec.filePath),
                size: 0,
                lastModified: new Date().toISOString(),
                fetchSuccess: false,
                error: `Batch processing failed: ${error instanceof Error ? error.message : String(error)}`
            }));
        }
    }

    /**
     * Prioritize files based on AI recommendations and relevance scores
     */
    prioritizeFiles(recommendations: RelevantFileRecommendation[]): RelevantFileRecommendation[] {
        return recommendations
            .filter(rec => rec.filePath && rec.filePath.trim().length > 0)
            .sort((a, b) => {
                // Primary sort: Priority (high > medium > low)
                const priorityOrder = { high: 3, medium: 2, low: 1 };
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;

                // Secondary sort: Relevance score (higher is better)
                const scoreDiff = b.relevanceScore - a.relevanceScore;
                if (scoreDiff !== 0) return scoreDiff;

                // Tertiary sort: Category importance
                const categoryOrder = {
                    interface: 6,
                    dependency: 5,
                    related_logic: 4,
                    test: 3,
                    config: 2,
                    documentation: 1
                };
                const categoryDiff = (categoryOrder[b.category] || 0) - (categoryOrder[a.category] || 0);
                if (categoryDiff !== 0) return categoryDiff;

                // Final sort: Alphabetical by file path for consistency
                return a.filePath.localeCompare(b.filePath);
            });
    }

    /**
     * Handle individual file fetch errors gracefully
     */
    handleFetchErrors(files: FetchedFile[]): FetchedFile[] {
        const successfulFiles = files.filter(f => f.fetchSuccess);
        const failedFiles = files.filter(f => !f.fetchSuccess);

        if (failedFiles.length > 0) {
            LoggingService.logWarning(
                "file_fetch_partial_failure",
                "Some files failed to fetch",
                {
                    totalFiles: files.length,
                    successfulFiles: successfulFiles.length,
                    failedFiles: failedFiles.length,
                    failedFilePaths: failedFiles.map(f => f.filePath)
                }
            );
        }

        // Return all files (both successful and failed) for transparency
        return files;
    }

    /**
     * Process files in batches with concurrency control
     */
    private async processBatchesWithConcurrency(
        installationId: string,
        repositoryName: string,
        recommendations: RelevantFileRecommendation[],
        branch?: string
    ): Promise<FetchedFile[]> {
        const { batchSize, maxConcurrency } = this.defaultBatchConfig;
        const batches = this.createBatches(recommendations, batchSize);
        const results: FetchedFile[] = [];

        // Process batches with concurrency control
        for (let i = 0; i < batches.length; i += maxConcurrency) {
            const concurrentBatches = batches.slice(i, i + maxConcurrency);
            
            const batchPromises = concurrentBatches.map(batch =>
                this.processBatch(installationId, repositoryName, batch, branch)
            );

            try {
                const batchResults = await Promise.allSettled(batchPromises);
                
                batchResults.forEach((result, index) => {
                    if (result.status === "fulfilled") {
                        results.push(...result.value);
                    } else {
                        LoggingService.logError(
                            "batch_processing_failed",
                            new Error(`Batch ${i + index} failed: ${result.reason}`),
                            {
                                batchIndex: i + index,
                                batchSize: concurrentBatches[index].length
                            }
                        );
                        
                        // Add failed entries for this batch
                        const failedFiles = concurrentBatches[index].map(rec => ({
                            filePath: rec.filePath,
                            content: "",
                            language: this.detectLanguage(rec.filePath),
                            size: 0,
                            lastModified: new Date().toISOString(),
                            fetchSuccess: false,
                            error: `Batch processing failed: ${result.reason}`
                        }));
                        results.push(...failedFiles);
                    }
                });
            } catch (error) {
                LoggingService.logError(
                    "concurrent_batch_processing_failed",
                    error instanceof Error ? error : new Error(String(error)),
                    {
                        batchIndex: i
                    }
                );
            }
        }

        return results;
    }

    /**
     * Process a single batch of file recommendations using efficient batch fetching
     */
    private async processBatch(
        installationId: string,
        repositoryName: string,
        batch: RelevantFileRecommendation[],
        branch?: string
    ): Promise<FetchedFile[]> {
        const batchStartTime = Date.now();

        LoggingService.logDebug(
            "batch_processing_started",
            "Processing file batch",
            {
                installationId,
                repositoryName,
                batchSize: batch.length,
                filePaths: batch.map(b => b.filePath)
            }
        );

        try {
            // Use the efficient getMultipleFilesWithFragments method
            const filePaths = batch.map(rec => rec.filePath);
            const fileContents = await OctokitService.getMultipleFilesWithFragments(
                installationId,
                repositoryName,
                filePaths,
                branch
            );

            // Convert the results to FetchedFile format
            const results: FetchedFile[] = batch.map(recommendation => {
                const fileData = fileContents[recommendation.filePath];
                const language = this.detectLanguage(recommendation.filePath);

                if (fileData && !fileData.isBinary) {
                    return {
                        filePath: recommendation.filePath,
                        content: fileData.text,
                        language,
                        size: fileData.byteSize,
                        lastModified: new Date().toISOString(),
                        fetchSuccess: true
                    };
                } else {
                    return {
                        filePath: recommendation.filePath,
                        content: "",
                        language,
                        size: 0,
                        lastModified: new Date().toISOString(),
                        fetchSuccess: false,
                        error: fileData?.isBinary ? "Binary file not supported" : "File not found or not accessible"
                    };
                }
            });

            const batchProcessingTime = Date.now() - batchStartTime;
            const successCount = results.filter(r => r.fetchSuccess).length;

            LoggingService.logDebug(
                "batch_processing_completed",
                "Batch processing completed",
                {
                    batchSize: batch.length,
                    successCount,
                    failureCount: batch.length - successCount,
                    processingTime: batchProcessingTime
                }
            );

            return results;

        } catch (error) {
            // If batch fetching fails, fall back to individual file fetching with retries
            LoggingService.logWarning(
                "batch_fetch_failed_fallback",
                "Batch fetch failed, falling back to individual file fetching",
                {
                    batchSize: batch.length,
                    error: error instanceof Error ? error.message : String(error)
                }
            );

            return this.processBatchWithIndividualFetching(installationId, repositoryName, batch, branch);
        }
    }

    /**
     * Fallback method for individual file fetching when batch fetching fails
     */
    private async processBatchWithIndividualFetching(
        installationId: string,
        repositoryName: string,
        batch: RelevantFileRecommendation[],
        branch?: string
    ): Promise<FetchedFile[]> {
        const results: FetchedFile[] = [];

        // Process each file individually with retry logic
        for (const recommendation of batch) {
            try {
                const fetchedFile = await this.fetchSingleFileWithRetry(
                    installationId,
                    repositoryName,
                    recommendation,
                    branch
                );
                results.push(fetchedFile);
            } catch (error) {
                LoggingService.logWarning(
                    "file_fetch_failed_after_retries",
                    "File fetch failed after retries",
                    {
                        filePath: recommendation.filePath,
                        error: error instanceof Error ? error.message : String(error)
                    }
                );

                // Add failed file entry
                results.push({
                    filePath: recommendation.filePath,
                    content: "",
                    language: this.detectLanguage(recommendation.filePath),
                    size: 0,
                    lastModified: new Date().toISOString(),
                    fetchSuccess: false,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }

        return results;
    }

    /**
     * Fetch a single file with retry logic
     */
    private async fetchSingleFileWithRetry(
        installationId: string,
        repositoryName: string,
        recommendation: RelevantFileRecommendation,
        branch?: string
    ): Promise<FetchedFile> {
        const { maxRetries, baseDelay, maxDelay, backoffMultiplier, retryableErrors } = this.defaultBatchConfig.retryConfig;
        let lastError: Error | null = null;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                const startTime = Date.now();
                const content = await OctokitService.getFileContent(
                    installationId,
                    repositoryName,
                    recommendation.filePath,
                    branch
                );

                const fetchTime = Date.now() - startTime;
                const language = this.detectLanguage(recommendation.filePath);
                const size = Buffer.byteLength(content, "utf8");

                LoggingService.logDebug(
                    "file_fetch_success",
                    "File fetched successfully",
                    {
                        filePath: recommendation.filePath,
                        size,
                        language,
                        fetchTime,
                        attempt: attempt + 1
                    }
                );

                return {
                    filePath: recommendation.filePath,
                    content,
                    language,
                    size,
                    lastModified: new Date().toISOString(),
                    fetchSuccess: true
                };

            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                
                // Check if error is retryable
                const isRetryable = this.isErrorRetryable(lastError, retryableErrors);
                
                if (attempt === maxRetries - 1 || !isRetryable) {
                    // Last attempt failed or error is not retryable, will throw
                    if (!isRetryable) {
                        LoggingService.logDebug(
                            "file_fetch_non_retryable_error",
                            "Non-retryable error encountered, not retrying",
                            {
                                filePath: recommendation.filePath,
                                error: lastError.message,
                                errorType: lastError.constructor.name
                            }
                        );
                    }
                    break;
                }

                // Calculate delay with exponential backoff
                const delay = Math.min(
                    baseDelay * Math.pow(backoffMultiplier, attempt),
                    maxDelay
                );

                LoggingService.logDebug(
                    "file_fetch_retry",
                    "File fetch attempt failed, retrying",
                    {
                        filePath: recommendation.filePath,
                        attempt: attempt + 1,
                        maxRetries,
                        delay,
                        error: lastError.message,
                        errorType: lastError.constructor.name
                    }
                );

                await this.sleep(delay);
            }
        }

        // All retries failed
        throw lastError || new Error("Unknown error during file fetch");
    }

    /**
     * Check if an error is retryable based on configuration
     */
    private isErrorRetryable(error: Error, retryableErrors: string[]): boolean {
        // Check error message for retryable patterns
        const errorMessage = error.message.toLowerCase();
        const errorType = error.constructor.name;
        
        // Check if error type is in retryable list
        if (retryableErrors.includes(errorType)) {
            return true;
        }
        
        // Check if error message contains retryable patterns
        return retryableErrors.some(pattern => 
            errorMessage.includes(pattern.toLowerCase()) ||
            errorType.toLowerCase().includes(pattern.toLowerCase())
        );
    }

    /**
     * Create batches from recommendations array
     */
    private createBatches<T>(items: T[], batchSize: number): T[][] {
        const batches: T[][] = [];
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        return batches;
    }

    /**
     * Detect programming language from file extension
     */
    private detectLanguage(filePath: string): string {
        const extension = filePath.split(".").pop()?.toLowerCase();
        
        const languageMap: Record<string, string> = {
            "ts": "typescript",
            "js": "javascript",
            "tsx": "typescript",
            "jsx": "javascript",
            "py": "python",
            "java": "java",
            "cpp": "cpp",
            "c": "c",
            "cs": "csharp",
            "php": "php",
            "rb": "ruby",
            "go": "go",
            "rs": "rust",
            "swift": "swift",
            "kt": "kotlin",
            "scala": "scala",
            "sh": "bash",
            "bash": "bash",
            "zsh": "zsh",
            "fish": "fish",
            "ps1": "powershell",
            "sql": "sql",
            "html": "html",
            "css": "css",
            "scss": "scss",
            "sass": "sass",
            "less": "less",
            "json": "json",
            "xml": "xml",
            "yaml": "yaml",
            "yml": "yaml",
            "toml": "toml",
            "ini": "ini",
            "cfg": "ini",
            "conf": "ini",
            "md": "markdown",
            "markdown": "markdown",
            "txt": "text",
            "log": "text",
            "dockerfile": "dockerfile",
            "makefile": "makefile",
            "gradle": "gradle",
            "maven": "xml",
            "pom": "xml"
        };

        return languageMap[extension || ""] || "text";
    }

    /**
     * Sleep utility for retry delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get processing statistics for monitoring
     */
    getProcessingStats(): {
        defaultBatchSize: number;
        defaultMaxConcurrency: number;
        defaultRetryConfig: RetryConfig;
        } {
        return {
            defaultBatchSize: this.defaultBatchConfig.batchSize,
            defaultMaxConcurrency: this.defaultBatchConfig.maxConcurrency,
            defaultRetryConfig: this.defaultBatchConfig.retryConfig
        };
    }

    /**
     * Update batch processing configuration
     */
    updateBatchConfig(config: Partial<BatchProcessingConfig>): void {
        if (config.batchSize !== undefined) {
            this.defaultBatchConfig.batchSize = Math.max(1, Math.min(50, config.batchSize));
        }
        if (config.maxConcurrency !== undefined) {
            this.defaultBatchConfig.maxConcurrency = Math.max(1, Math.min(10, config.maxConcurrency));
        }
        if (config.retryConfig !== undefined) {
            this.defaultBatchConfig.retryConfig = { ...this.defaultBatchConfig.retryConfig, ...config.retryConfig };
        }

        LoggingService.logInfo(
            "batch_config_updated",
            "Batch processing configuration updated",
            {
                newConfig: this.defaultBatchConfig
            }
        );
    }
}
