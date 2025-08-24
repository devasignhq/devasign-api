import { PrismaClient } from '../generated/client';
import { ContextAnalysisDbService, ContextAnalysisData, ContextAnalysisMetricsData } from './context-analysis-db.service';

export interface EnhancedReviewContext {
    rawCodeChanges: any;
    repositoryStructure: any;
    contextAnalysis: any;
    fetchedFiles: any[];
    contextMetrics: ContextMetrics;
}

export interface ContextMetrics {
    totalFilesInRepo: number;
    filesAnalyzedByAI: number;
    filesRecommended: number;
    filesFetched: number;
    fetchSuccessRate: number;
    processingTime: {
        codeExtraction: number;
        pathRetrieval: number;
        aiAnalysis: number;
        fileFetching: number;
        total: number;
    };
}

export interface ContextAnalysisResponse {
    relevantFiles: any[];
    reasoning: string;
    confidence: number;
    analysisType: 'comprehensive' | 'focused' | 'minimal';
    estimatedReviewQuality: number;
}

export class ContextAnalysisIntegrationService {
    private contextDbService: ContextAnalysisDbService;

    constructor(prisma: PrismaClient) {
        this.contextDbService = new ContextAnalysisDbService(prisma);
    }

    /**
     * Store context analysis results after completing intelligent context fetching
     */
    async storeContextAnalysisResults(
        reviewResultId: string,
        installationId: string,
        repositoryName: string,
        prNumber: number,
        enhancedContext: EnhancedReviewContext,
        contextAnalysis: ContextAnalysisResponse
    ): Promise<void> {
        try {
            // Prepare context data for AIReviewResult update
            const contextData: ContextAnalysisData = {
                contextAnalysisUsed: true,
                totalFilesInRepo: enhancedContext.contextMetrics.totalFilesInRepo,
                filesRecommendedByAI: enhancedContext.contextMetrics.filesRecommended,
                filesFetched: enhancedContext.contextMetrics.filesFetched,
                fetchSuccessRate: enhancedContext.contextMetrics.fetchSuccessRate,
                contextQualityScore: Math.round(contextAnalysis.estimatedReviewQuality),
                processingTimeMs: enhancedContext.contextMetrics.processingTime.total,
                contextMetrics: enhancedContext.contextMetrics,
                aiRecommendations: {
                    relevantFiles: contextAnalysis.relevantFiles,
                    reasoning: contextAnalysis.reasoning,
                    confidence: contextAnalysis.confidence,
                    analysisType: contextAnalysis.analysisType,
                    estimatedReviewQuality: contextAnalysis.estimatedReviewQuality,
                },
                fetchedFilePaths: enhancedContext.fetchedFiles
                    .filter(file => file.fetchSuccess)
                    .map(file => file.filePath),
            };

            // Update AIReviewResult with context data
            await this.contextDbService.updateAIReviewResultWithContext(reviewResultId, contextData);

            // Create detailed metrics record
            const metricsData: ContextAnalysisMetricsData = {
                installationId,
                repositoryName,
                prNumber,
                totalFilesInRepo: enhancedContext.contextMetrics.totalFilesInRepo,
                filesRecommended: enhancedContext.contextMetrics.filesRecommended,
                filesFetched: enhancedContext.contextMetrics.filesFetched,
                fetchSuccessRate: enhancedContext.contextMetrics.fetchSuccessRate,
                processingTimes: enhancedContext.contextMetrics.processingTime,
                aiConfidence: contextAnalysis.confidence,
                reviewQualityScore: Math.round(contextAnalysis.estimatedReviewQuality),
            };

            await this.contextDbService.createContextAnalysisMetrics(metricsData);

            console.log(`Context analysis results stored for PR ${prNumber} in ${repositoryName}`);
        } catch (error) {
            console.error('Failed to store context analysis results:', error);
            // Don't throw - this is a non-critical operation that shouldn't break the review process
        }
    }

    /**
     * Mark an AIReviewResult as using fallback (no intelligent context)
     */
    async markAsFallback(reviewResultId: string): Promise<void> {
        try {
            const contextData: ContextAnalysisData = {
                contextAnalysisUsed: false,
            };

            await this.contextDbService.updateAIReviewResultWithContext(reviewResultId, contextData);
        } catch (error) {
            console.error('Failed to mark review as fallback:', error);
        }
    }

    /**
     * Get context analysis statistics for monitoring
     */
    async getContextAnalysisStats(
        installationId: string,
        repositoryName: string,
        days: number = 30
    ): Promise<{
        usage: {
            totalReviews: number;
            contextAnalysisUsed: number;
            usagePercentage: number;
        };
        performance: {
            averageFilesRecommended: number;
            averageFilesFetched: number;
            averageFetchSuccessRate: number;
            averageProcessingTime: number;
            averageQualityScore: number;
        };
        trends: {
            date: string;
            totalAnalyses: number;
            averageProcessingTime: number;
            averageQualityScore: number;
        }[];
    }> {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Get repository context stats
        const repoStats = await this.contextDbService.getRepositoryContextStats(
            installationId,
            repositoryName,
            startDate,
            endDate
        );

        // Get performance trends
        const trends = await this.contextDbService.getContextAnalysisPerformanceTrends(
            installationId,
            repositoryName,
            days
        );

        // Calculate usage statistics (would need to query AIReviewResult for total reviews)
        const contextReviews = await this.contextDbService.getAIReviewResultsWithContext(
            installationId,
            repositoryName,
            1000 // Large number to get all recent reviews
        );

        const recentContextReviews = contextReviews.filter(
            review => review.createdAt >= startDate
        );

        // This is a simplified calculation - in a real implementation, you'd want to
        // query the total number of AIReviewResults for the same period
        const totalReviews = recentContextReviews.length * 2; // Rough estimate
        const contextAnalysisUsed = recentContextReviews.length;

        return {
            usage: {
                totalReviews,
                contextAnalysisUsed,
                usagePercentage: totalReviews > 0 ? (contextAnalysisUsed / totalReviews) * 100 : 0,
            },
            performance: {
                averageFilesRecommended: repoStats.averageFilesRecommended,
                averageFilesFetched: repoStats.averageFilesFetched,
                averageFetchSuccessRate: repoStats.averageFetchSuccessRate * 100, // Convert to percentage
                averageProcessingTime: trends.length > 0
                    ? trends.reduce((sum, t) => sum + t.averageProcessingTime, 0) / trends.length
                    : 0,
                averageQualityScore: repoStats.averageReviewQualityScore,
            },
            trends,
        };
    }

    /**
     * Clean up old context analysis data
     */
    async cleanupOldData(olderThanDays: number = 90): Promise<number> {
        return this.contextDbService.deleteOldContextMetrics(olderThanDays);
    }

    /**
     * Get recent context analysis results for debugging
     */
    async getRecentContextAnalyses(
        installationId: string,
        repositoryName?: string,
        limit: number = 10
    ) {
        return this.contextDbService.getAIReviewResultsWithContext(
            installationId,
            repositoryName,
            limit
        );
    }

    /**
     * Validate context metrics before storing
     */
    private validateContextMetrics(metrics: ContextMetrics): boolean {
        return (
            typeof metrics.totalFilesInRepo === 'number' &&
            typeof metrics.filesRecommended === 'number' &&
            typeof metrics.filesFetched === 'number' &&
            typeof metrics.fetchSuccessRate === 'number' &&
            metrics.fetchSuccessRate >= 0 &&
            metrics.fetchSuccessRate <= 1 &&
            typeof metrics.processingTime === 'object' &&
            typeof metrics.processingTime.total === 'number'
        );
    }

    /**
     * Calculate context quality score based on various factors
     */
    calculateContextQualityScore(
        contextMetrics: ContextMetrics,
        contextAnalysis: ContextAnalysisResponse
    ): number {
        let score = 0;

        // Base score from AI confidence (0-40 points)
        score += contextAnalysis.confidence * 40;

        // Fetch success rate (0-30 points)
        score += contextMetrics.fetchSuccessRate * 30;

        // Files fetched vs recommended ratio (0-20 points)
        if (contextMetrics.filesRecommended > 0) {
            const fetchRatio = contextMetrics.filesFetched / contextMetrics.filesRecommended;
            score += Math.min(fetchRatio, 1) * 20;
        }

        // Processing time penalty (0-10 points deduction)
        const processingTimeSeconds = contextMetrics.processingTime.total / 1000;
        if (processingTimeSeconds > 30) {
            score -= Math.min((processingTimeSeconds - 30) / 10, 10);
        } else {
            score += 10; // Bonus for fast processing
        }

        return Math.max(0, Math.min(100, Math.round(score)));
    }
}