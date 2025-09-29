// ============================================================================
// Enhanced Context Builder Service
// Combines raw code changes, fetched files, and existing context into enhanced review context
// ============================================================================

import {
    RawCodeChanges,
    RepositoryStructure,
    ContextAnalysisResponse,
    FetchedFile,
    EnhancedReviewContext,
    ContextMetrics,
    isValidRawCodeChanges,
    isValidRepositoryStructure,
    isValidContextAnalysisResponse,
    isValidFetchedFile
} from "../models/intelligent-context.model";
import { RelevantContext } from "../models/ai-review.model";
import { LoggingService } from "./logging.service";

export class EnhancedContextBuilderService {

    /**
     * Build enhanced review context by combining all context sources
     */
    async buildEnhancedContext(
        codeChanges: RawCodeChanges,
        repositoryStructure: RepositoryStructure,
        contextAnalysis: ContextAnalysisResponse,
        fetchedFiles: FetchedFile[],
        existingContext: RelevantContext
    ): Promise<EnhancedReviewContext> {
        const startTime = Date.now();

        try {
            // Validate inputs
            this.validateInputs(codeChanges, repositoryStructure, contextAnalysis, fetchedFiles, existingContext);

            // Calculate context metrics
            const contextMetrics = this.calculateContextMetrics(
                repositoryStructure,
                contextAnalysis,
                fetchedFiles,
                { total: Date.now() - startTime } // Will be updated at the end
            );

            // Build enhanced context object
            const enhancedContext: EnhancedReviewContext = {
                // Inherit from existing context
                ...existingContext,
                
                // Add intelligent context data
                rawCodeChanges: codeChanges,
                repositoryStructure,
                contextAnalysis,
                fetchedFiles,
                contextMetrics: {
                    ...contextMetrics,
                    processingTime: {
                        ...contextMetrics.processingTime,
                        total: Date.now() - startTime
                    }
                }
            };

            // Perform context quality assessment and optimization
            const optimizedContext = await this.optimizeContext(enhancedContext);

            LoggingService.logInfo("enhanced_context_built", "Enhanced context built successfully", {
                prNumber: codeChanges.prNumber,
                repositoryName: codeChanges.repositoryName,
                totalFiles: repositoryStructure.totalFiles,
                filesRecommended: contextAnalysis.relevantFiles.length,
                filesFetched: fetchedFiles.length,
                fetchSuccessRate: contextMetrics.fetchSuccessRate,
                processingTime: Date.now() - startTime
            });

            return optimizedContext;

        } catch (error) {
            LoggingService.logError("enhanced_context_build_failed", error instanceof Error ? error : new Error(String(error)), {
                prNumber: codeChanges.prNumber,
                repositoryName: codeChanges.repositoryName
            });
            throw error;
        }
    }

    /**
     * Calculate comprehensive context metrics for performance tracking
     */
    calculateContextMetrics(
        repositoryStructure: RepositoryStructure,
        contextAnalysis: ContextAnalysisResponse,
        fetchedFiles: FetchedFile[],
        processingTimes: Record<string, number>
    ): ContextMetrics {
        const successfulFetches = fetchedFiles.filter(file => file.fetchSuccess).length;
        const totalFetches = fetchedFiles.length;
        
        return {
            totalFilesInRepo: repositoryStructure.totalFiles,
            filesAnalyzedByAI: repositoryStructure.totalFiles, // AI analyzed all files in repo structure
            filesRecommended: contextAnalysis.relevantFiles.length,
            filesFetched: totalFetches,
            fetchSuccessRate: totalFetches > 0 ? successfulFetches / totalFetches : 1.0,
            processingTime: {
                codeExtraction: processingTimes.codeExtraction || 0,
                pathRetrieval: processingTimes.pathRetrieval || 0,
                aiAnalysis: processingTimes.aiAnalysis || 0,
                fileFetching: processingTimes.fileFetching || 0,
                total: processingTimes.total || 0
            }
        };
    }

    /**
     * Validate all input parameters
     */
    private validateInputs(
        codeChanges: RawCodeChanges,
        repositoryStructure: RepositoryStructure,
        contextAnalysis: ContextAnalysisResponse,
        fetchedFiles: FetchedFile[],
        existingContext: RelevantContext
    ): void {
        if (!isValidRawCodeChanges(codeChanges)) {
            throw new Error("Invalid raw code changes provided");
        }

        if (!isValidRepositoryStructure(repositoryStructure)) {
            throw new Error("Invalid repository structure provided");
        }

        if (!isValidContextAnalysisResponse(contextAnalysis)) {
            throw new Error("Invalid context analysis response provided");
        }

        if (!Array.isArray(fetchedFiles) || !fetchedFiles.every(isValidFetchedFile)) {
            throw new Error("Invalid fetched files array provided");
        }

        if (!existingContext || typeof existingContext !== "object") {
            throw new Error("Invalid existing context provided");
        }

        // Validate that fetched files correspond to AI recommendations
        const recommendedPaths = new Set(contextAnalysis.relevantFiles.map(f => f.filePath));
        const fetchedPaths = new Set(fetchedFiles.map(f => f.filePath));
        
        const unexpectedFiles = [...fetchedPaths].filter(path => !recommendedPaths.has(path));
        if (unexpectedFiles.length > 0) {
            LoggingService.logWarning("unexpected_fetched_files", "Fetched files contain paths not recommended by AI", {
                unexpectedFiles,
                prNumber: codeChanges.prNumber
            });
        }
    }

    /**
     * Optimize context for better review quality and performance
     */
    private async optimizeContext(context: EnhancedReviewContext): Promise<EnhancedReviewContext> {
        const startTime = Date.now();

        try {
            // 1. Prioritize and filter relevant files based on success and relevance
            const optimizedRelevantFiles = this.optimizeRelevantFiles(context);

            // 2. Enhance existing context with intelligent insights
            const enhancedExistingContext = this.enhanceExistingContext(context);

            // 3. Calculate context quality score
            const contextQualityScore = this.calculateContextQualityScore(context);

            // 4. Apply content optimization (truncation, summarization if needed)
            const optimizedContent = await this.optimizeContent(context);

            const optimizedContext: EnhancedReviewContext = {
                ...context,
                ...enhancedExistingContext,
                relevantFiles: optimizedRelevantFiles,
                ...optimizedContent,
                contextMetrics: {
                    ...context.contextMetrics,
                    contextQualityScore,
                    optimizationTime: Date.now() - startTime
                }
            };

            LoggingService.logDebug("context_optimization_completed", "Context optimization completed", {
                prNumber: context.rawCodeChanges.prNumber,
                originalRelevantFiles: context.relevantFiles.length,
                optimizedRelevantFiles: optimizedRelevantFiles.length,
                contextQualityScore,
                optimizationTime: Date.now() - startTime
            });

            return optimizedContext;

        } catch (error) {
            LoggingService.logError("context_optimization_failed", error instanceof Error ? error : new Error(String(error)), {
                prNumber: context.rawCodeChanges.prNumber
            });
            return context;
        }
    }

    /**
     * Optimize relevant files by combining existing and fetched files intelligently
     */
    private optimizeRelevantFiles(context: EnhancedReviewContext) {
        const existingFiles = context.relevantFiles || [];
        const fetchedFiles = context.fetchedFiles || [];
        
        // Merge fetched files with existing files, prioritizing successfully fetched ones
        const mergedFiles = [...existingFiles];
        
        for (const fetchedFile of fetchedFiles) {
            if (fetchedFile.fetchSuccess) {
                const existingIndex = mergedFiles.findIndex(f => f.filename === fetchedFile.filePath);
                
                if (existingIndex >= 0) {
                    // Update existing file with fresh content
                    mergedFiles[existingIndex] = {
                        ...mergedFiles[existingIndex],
                        content: fetchedFile.content,
                        lastModified: fetchedFile.lastModified,
                        language: fetchedFile.language,
                        similarity: 1.0 // AI-recommended files get max similarity
                    };
                } else {
                    // Add new AI-recommended file
                    mergedFiles.push({
                        filename: fetchedFile.filePath,
                        content: fetchedFile.content,
                        language: fetchedFile.language,
                        similarity: 1.0, // AI-recommended files get max similarity
                        lastModified: fetchedFile.lastModified
                    });
                }
            }
        }

        // Sort by similarity (AI-recommended files first, then by similarity score)
        return mergedFiles.sort((a, b) => b.similarity - a.similarity);
    }

    /**
     * Enhance existing context with insights from intelligent analysis
     */
    private enhanceExistingContext(context: EnhancedReviewContext) {
        const { contextAnalysis, rawCodeChanges } = context;
        
        // Enhance project standards with AI insights
        const enhancedStandards = [
            ...(context.projectStandards || []),
            {
                category: "AI Analysis",
                rule: "Context Relevance",
                description: `AI analysis determined ${contextAnalysis.analysisType} context approach with ${Math.round(contextAnalysis.confidence * 100)}% confidence`,
                examples: contextAnalysis.relevantFiles.map(f => `${f.filePath}: ${f.reason}`)
            }
        ];

        // Enhance code patterns with change analysis
        const enhancedPatterns = [
            ...(context.codePatterns || []),
            {
                pattern: "File Change Distribution",
                description: `PR modifies ${rawCodeChanges.fileChanges.length} files with ${rawCodeChanges.totalChanges.additions} additions and ${rawCodeChanges.totalChanges.deletions} deletions`,
                examples: rawCodeChanges.fileChanges.map(f => `${f.filename} (${f.status}): +${f.additions}/-${f.deletions}`),
                frequency: rawCodeChanges.fileChanges.length
            }
        ];

        return {
            projectStandards: enhancedStandards,
            codePatterns: enhancedPatterns
        };
    }

    /**
     * Calculate context quality score based on various factors
     */
    private calculateContextQualityScore(context: EnhancedReviewContext): number {
        let score = 0;
        let maxScore = 0;

        // Factor 1: AI confidence (0-30 points)
        score += context.contextAnalysis.confidence * 30;
        maxScore += 30;

        // Factor 2: Fetch success rate (0-25 points)
        score += context.contextMetrics.fetchSuccessRate * 25;
        maxScore += 25;

        // Factor 3: Coverage of recommended files (0-20 points)
        const recommendedCount = context.contextAnalysis.relevantFiles.length;
        const fetchedCount = context.fetchedFiles.filter(f => f.fetchSuccess).length;
        const coverageRatio = recommendedCount > 0 ? fetchedCount / recommendedCount : 1;
        score += coverageRatio * 20;
        maxScore += 20;

        // Factor 4: Repository analysis completeness (0-15 points)
        const repoAnalysisScore = context.repositoryStructure.totalFiles > 0 ? 15 : 0;
        score += repoAnalysisScore;
        maxScore += 15;

        // Factor 5: Existing context richness (0-10 points)
        const existingContextScore = Math.min(
            (context.similarPRs?.length || 0) * 2 +
            (context.relevantFiles?.length || 0) * 1 +
            (context.codePatterns?.length || 0) * 1,
            10
        );
        score += existingContextScore;
        maxScore += 10;

        // Normalize to 0-100 scale
        return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    }

    /**
     * Optimize content for token efficiency while maintaining quality
     */
    private async optimizeContent(context: EnhancedReviewContext): Promise<Partial<EnhancedReviewContext>> {
        // In the future, this could implement:
        // - Content truncation for large files
        // - Summarization of less relevant content
        // - Token counting and optimization
        // - Compression of repetitive patterns
        
        return context;
    }

    /**
     * Get context summary for logging and debugging
     */
    getContextSummary(context: EnhancedReviewContext): string {
        const metrics = context.contextMetrics;
        const analysis = context.contextAnalysis;
        
        return [
            `PR #${context.rawCodeChanges.prNumber} in ${context.rawCodeChanges.repositoryName}`,
            `Repository: ${metrics.totalFilesInRepo} files`,
            `AI Analysis: ${analysis.analysisType} (${Math.round(analysis.confidence * 100)}% confidence)`,
            `Files: ${metrics.filesRecommended} recommended, ${metrics.filesFetched} fetched (${Math.round(metrics.fetchSuccessRate * 100)}% success)`,
            `Processing: ${metrics.processingTime.total}ms total`,
            `Quality Score: ${metrics.contextQualityScore || "N/A"}/100`
        ].join(" | ");
    }

    /**
     * Validate enhanced context completeness
     */
    validateEnhancedContext(context: EnhancedReviewContext): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        // Check required fields
        if (!context.rawCodeChanges) issues.push("Missing raw code changes");
        if (!context.repositoryStructure) issues.push("Missing repository structure");
        if (!context.contextAnalysis) issues.push("Missing context analysis");
        if (!context.fetchedFiles) issues.push("Missing fetched files");
        if (!context.contextMetrics) issues.push("Missing context metrics");

        // Check data consistency
        if (context.contextAnalysis && context.fetchedFiles) {
            const recommendedCount = context.contextAnalysis.relevantFiles.length;
            const fetchedCount = context.fetchedFiles.length;
            
            if (fetchedCount > recommendedCount * 1.5) {
                issues.push(`Too many files fetched (${fetchedCount}) compared to recommended (${recommendedCount})`);
            }
        }

        // Check metrics validity
        if (context.contextMetrics) {
            const metrics = context.contextMetrics;
            if (metrics.fetchSuccessRate < 0 || metrics.fetchSuccessRate > 1) {
                issues.push("Invalid fetch success rate");
            }
            if (metrics.totalFilesInRepo < 0) {
                issues.push("Invalid total files count");
            }
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }
}

// Export singleton instance
export const EnhancedContextBuilder = new EnhancedContextBuilderService();
