import { PrismaClient, AIReviewResult, ContextAnalysisMetrics, Prisma } from "../generated/client";
import { getFieldFromUnknownObject } from "../helper";
import { ContextAnalysisResponse, ContextMetrics } from "../models/intelligent-context.model";

export interface ContextAnalysisData {
    contextAnalysisUsed: boolean;
    totalFilesInRepo?: number;
    filesRecommendedByAI?: number;
    filesFetched?: number;
    fetchSuccessRate?: number;
    contextQualityScore?: number;
    processingTimeMs?: number;
    contextMetrics?: ContextMetrics;
    aiRecommendations?: ContextAnalysisResponse;
    fetchedFilePaths?: string[];
}

export interface ContextAnalysisMetricsData {
    installationId: string;
    repositoryName: string;
    prNumber: number;
    totalFilesInRepo: number;
    filesRecommended: number;
    filesFetched: number;
    fetchSuccessRate: number;
    processingTimes: ContextMetrics["processingTime"];
    aiConfidence: number;
    reviewQualityScore: number;
}

export class ContextAnalysisDbService {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    /**
     * Update an existing AIReviewResult with context analysis data
     */
    async updateAIReviewResultWithContext(
        reviewResultId: string,
        contextData: ContextAnalysisData
    ): Promise<AIReviewResult> {
        return this.prisma.aIReviewResult.update({
            where: { id: reviewResultId },
            data: {
                contextAnalysisUsed: contextData.contextAnalysisUsed,
                totalFilesInRepo: contextData.totalFilesInRepo,
                filesRecommendedByAI: contextData.filesRecommendedByAI,
                filesFetched: contextData.filesFetched,
                fetchSuccessRate: contextData.fetchSuccessRate,
                contextQualityScore: contextData.contextQualityScore,
                processingTimeMs: contextData.processingTimeMs,
                contextMetrics: contextData.contextMetrics as unknown as Prisma.InputJsonObject,
                aiRecommendations: contextData.aiRecommendations as unknown as Prisma.InputJsonObject,
                fetchedFilePaths: contextData.fetchedFilePaths
            }
        });
    }

    /**
     * Create a new ContextAnalysisMetrics record
     */
    async createContextAnalysisMetrics(
        metricsData: ContextAnalysisMetricsData
    ): Promise<ContextAnalysisMetrics> {
        return this.prisma.contextAnalysisMetrics.create({
            data: {
                installationId: metricsData.installationId,
                repositoryName: metricsData.repositoryName,
                prNumber: metricsData.prNumber,
                totalFilesInRepo: metricsData.totalFilesInRepo,
                filesRecommended: metricsData.filesRecommended,
                filesFetched: metricsData.filesFetched,
                fetchSuccessRate: metricsData.fetchSuccessRate,
                processingTimes: metricsData.processingTimes,
                aiConfidence: metricsData.aiConfidence,
                reviewQualityScore: metricsData.reviewQualityScore
            }
        });
    }

    /**
     * Get context analysis metrics for a specific PR
     */
    async getContextAnalysisMetrics(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<ContextAnalysisMetrics | null> {
        return this.prisma.contextAnalysisMetrics.findFirst({
            where: {
                installationId,
                repositoryName,
                prNumber
            },
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    /**
     * Get context analysis metrics for a repository within a date range
     */
    async getRepositoryContextMetrics(
        installationId: string,
        repositoryName: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<ContextAnalysisMetrics[]> {
        const whereClause: Prisma.ContextAnalysisMetricsWhereInput = {
            installationId,
            repositoryName
        };

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) {
                whereClause.createdAt.gte = startDate;
            }
            if (endDate) {
                whereClause.createdAt.lte = endDate;
            }
        }

        return this.prisma.contextAnalysisMetrics.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc"
            }
        });
    }

    /**
     * Get aggregated context analysis statistics for a repository
     */
    async getRepositoryContextStats(
        installationId: string,
        repositoryName: string,
        startDate?: Date,
        endDate?: Date
    ): Promise<{
        totalAnalyses: number;
        averageFilesRecommended: number;
        averageFilesFetched: number;
        averageFetchSuccessRate: number;
        averageAiConfidence: number;
        averageReviewQualityScore: number;
    }> {
        const whereClause: Prisma.ContextAnalysisMetricsWhereInput = {
            installationId,
            repositoryName
        };

        if (startDate || endDate) {
            whereClause.createdAt = {};
            if (startDate) {
                whereClause.createdAt.gte = startDate;
            }
            if (endDate) {
                whereClause.createdAt.lte = endDate;
            }
        }

        const aggregation = await this.prisma.contextAnalysisMetrics.aggregate({
            where: whereClause,
            _count: {
                id: true
            },
            _avg: {
                filesRecommended: true,
                filesFetched: true,
                fetchSuccessRate: true,
                aiConfidence: true,
                reviewQualityScore: true
            }
        });

        return {
            totalAnalyses: aggregation._count.id,
            averageFilesRecommended: aggregation._avg.filesRecommended || 0,
            averageFilesFetched: aggregation._avg.filesFetched || 0,
            averageFetchSuccessRate: aggregation._avg.fetchSuccessRate || 0,
            averageAiConfidence: aggregation._avg.aiConfidence || 0,
            averageReviewQualityScore: aggregation._avg.reviewQualityScore || 0
        };
    }

    /**
     * Get AIReviewResults that used context analysis
     */
    async getAIReviewResultsWithContext(
        installationId: string,
        repositoryName?: string,
        limit: number = 50
    ): Promise<AIReviewResult[]> {
        const whereClause: Prisma.AIReviewResultWhereInput = {
            installationId,
            contextAnalysisUsed: true
        };

        if (repositoryName) {
            whereClause.repositoryName = repositoryName;
        }

        return this.prisma.aIReviewResult.findMany({
            where: whereClause,
            orderBy: {
                createdAt: "desc"
            },
            take: limit
        });
    }

    /**
     * Delete old context analysis metrics (for cleanup)
     */
    async deleteOldContextMetrics(olderThanDays: number): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const result = await this.prisma.contextAnalysisMetrics.deleteMany({
            where: {
                createdAt: {
                    lt: cutoffDate
                }
            }
        });

        return result.count;
    }

    /**
     * Get performance trends for context analysis
     */
    async getContextAnalysisPerformanceTrends(
        installationId: string,
        repositoryName: string,
        days: number = 30
    ): Promise<{
        date: string;
        totalAnalyses: number;
        averageProcessingTime: number;
        averageQualityScore: number;
    }[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const metrics = await this.prisma.contextAnalysisMetrics.findMany({
            where: {
                installationId,
                repositoryName,
                createdAt: {
                    gte: startDate
                }
            },
            orderBy: {
                createdAt: "asc"
            }
        });

        // Group by date and calculate daily averages
        const dailyStats = new Map<string, {
            count: number;
            totalProcessingTime: number;
            totalQualityScore: number;
        }>();

        metrics.forEach(metric => {
            const date = metric.createdAt.toISOString().split("T")[0];
            const processingTimes = metric.processingTimes as unknown;
            const totalProcessingTime = getFieldFromUnknownObject<number>(processingTimes, "total") || 0;

            if (!dailyStats.has(date)) {
                dailyStats.set(date, {
                    count: 0,
                    totalProcessingTime: 0,
                    totalQualityScore: 0
                });
            }

            const stats = dailyStats.get(date)!;
            stats.count++;
            stats.totalProcessingTime += totalProcessingTime;
            stats.totalQualityScore += metric.reviewQualityScore;
        });

        return Array.from(dailyStats.entries()).map(([date, stats]) => ({
            date,
            totalAnalyses: stats.count,
            averageProcessingTime: stats.totalProcessingTime / stats.count,
            averageQualityScore: stats.totalQualityScore / stats.count
        }));
    }
}
