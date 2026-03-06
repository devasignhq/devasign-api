import { CodeFile, CodeChunk, Prisma } from "../../../prisma_client";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { VoyageAPIError } from "../../models/error.model";
import { getFieldFromUnknownObject } from "../../utilities/helper";

/**
 * Service for managing vector store operations using pgvector
 */
export class VectorStoreService {
    private getEmbeddingModel: (inputType: "document" | "query") => VoyageEmbeddings;

    constructor() {
        // Verify required environment variables are present
        if (!process.env.VOYAGEAI_API_KEY) {
            throw new VoyageAPIError("Missing VoyageAI API key in environment variables");
        }

        // Initialize embedding model
        this.getEmbeddingModel = (inputType: "document" | "query") => new VoyageEmbeddings({
            apiKey: process.env.VOYAGEAI_API_KEY,
            modelName: process.env.VOYAGEAI_MODEL || "voyage-code-3",
            inputType,
            truncation: false
        });
    }

    /**
     * Generates text embeddings for a given string array
     * @param documents - The array of strings to embed
     * @returns A promise that resolves to an array of embeddings
     */
    async embedDocuments(documents: string[]): Promise<number[][]> {
        try {
            const embeddings = await this.getEmbeddingModel("document").embedDocuments(documents);

            if (!embeddings) {
                throw new VoyageAPIError("Failed to generate embeddings");
            }

            return embeddings;
        } catch (error) {
            // Remove stack trace from error
            if (typeof error === "object" && error !== null && "stack" in error) {
                error.stack = undefined;
            }
            const mainError = getFieldFromUnknownObject(error, "error");
            throw new VoyageAPIError("Failed to generate embedding", mainError || error);
        }
    }

    /**
     * Generates text embeddings for a given string
     * @param text - The text to embed
     * @returns A promise that resolves to the generated embedding
     */
    async generateEmbedding(text: string, inputType: "document" | "query" = "document"): Promise<number[]> {
        try {
            const embeddings = await this.getEmbeddingModel(inputType).embedQuery(text);

            if (!embeddings) {
                throw new VoyageAPIError("Failed to generate embedding");
            }

            return embeddings;
        } catch (error) {
            // Remove stack trace from error
            if (typeof error === "object" && error !== null && "stack" in error) {
                error.stack = undefined;
            }
            const mainError = getFieldFromUnknownObject(error, "error");
            throw new VoyageAPIError("Failed to generate embedding", mainError || error);
        }
    }

    /**
     * Upserts a code file record
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param filePath - The path to the file
     * @param fileHash - The hash of the file
     * @returns A promise that resolves to the upserted CodeFile
     */
    async upsertCodeFile(
        installationId: string,
        repositoryName: string,
        filePath: string,
        fileHash: string
    ): Promise<CodeFile> {
        return prisma.codeFile.upsert({
            where: {
                installationId_repositoryName_filePath: {
                    installationId,
                    repositoryName,
                    filePath
                }
            },
            update: {
                fileHash,
                lastIndexedAt: new Date()
            },
            create: {
                installationId,
                repositoryName,
                filePath,
                fileHash
            }
        });
    }

    /**
     * Deletes existing chunks for a file
     * @param codeFileId - The ID of the code file
     * @returns A promise that resolves when chunks are deleted
     */
    async deleteFileChunks(codeFileId: string): Promise<void> {
        await prisma.codeChunk.deleteMany({
            where: { codeFileId }
        });
    }

    /**
     * Upserts code chunks with embeddings
     * @param codeFileId - The ID of the code file
     * @param chunks - The array of code chunks to upsert
     * @returns A promise that resolves when the chunks are upserted
     */
    async upsertCodeChunks(
        codeFileId: string,
        chunks: { index: number; content: string; embedding: number[] }[]
    ): Promise<void> {
        // Delete existing chunks first to ensure clean slate for this file update
        await this.deleteFileChunks(codeFileId);

        if (chunks.length === 0) return;

        // Map chunks to SQL Value fragments
        const values = chunks.map(chunk => {
            // Format embedding array as string for SQL vector syntax
            const embeddingString = `[${chunk.embedding.join(",")}]`;

            // Return a template fragment for each row
            return Prisma.sql`(${codeFileId}, ${chunk.index}, ${chunk.content}, ${embeddingString}::vector)`;
        });

        // Execute INSERT statements in batches to prevent Prisma Accelerate P6004 timeout errors
        // (10 seconds query limit). We implement a fallback mechanism to reduce batch size on failure.
        let remainingValues = [...values];
        let currentBatchSize = 100;

        while (remainingValues.length > 0) {
            const batchToInsert = remainingValues.slice(0, currentBatchSize);

            try {
                await prisma.$executeRaw`
                    INSERT INTO "CodeChunk" ("codeFileId", "chunkIndex", "content", "embedding")
                    VALUES ${Prisma.join(batchToInsert)}
                    ON CONFLICT ("codeFileId", "chunkIndex") DO NOTHING
                `;

                // If successful, remove the inserted items from the remaining pool
                remainingValues = remainingValues.slice(batchToInsert.length);
            } catch (error) {
                if (currentBatchSize === 100) {
                    dataLogger.warn("Batch insert failed at size 100, retrying with 50", { codeFileId });
                    currentBatchSize = 50;
                } else if (currentBatchSize === 50) {
                    dataLogger.warn("Batch insert failed at size 50, retrying with 25", { codeFileId });
                    currentBatchSize = 25;
                } else {
                    dataLogger.error("Batch insert failed at size 25, aborting", { codeFileId, error });
                    throw error;
                }
            }
        }
    }

    /**
     * Finds similar code chunks using cosine distance
     * @param embedding - The embedding of the query
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param limit - The maximum number of chunks to return
     * @param similarityThreshold - The minimum similarity threshold
     * @returns A promise that resolves to an array of similar code chunks
     */
    async findSimilarChunks(
        embedding: number[],
        installationId: string,
        repositoryName: string,
        limit: number = 5,
        similarityThreshold: number = 0.7
    ): Promise<(CodeChunk & { similarity: number; filePath: string })[]> {
        // Format embedding array as string for SQL vector syntax
        const embeddingString = `[${embedding.join(",")}]`;

        // Cosine distance operator is <=>
        // Similarity = 1 - distance
        // We filter by distance < (1 - threshold)
        const distanceThreshold = 1 - similarityThreshold;

        try {
            // Execute raw SQL query to find similar chunks
            const result = await prisma.$queryRaw<{
                id: string;
                codeFileId: string;
                chunkIndex: number;
                content: string;
                filePath: string;
                similarity: number;
            }[]>`
                SELECT 
                    cc."id",
                    cc."codeFileId",
                    cc."chunkIndex",
                    cc."content",
                    cf."filePath",
                    1 - (cc."embedding" <=> ${embeddingString}::vector) as similarity
                FROM "CodeChunk" cc
                JOIN "CodeFile" cf ON cc."codeFileId" = cf."id"
                WHERE cf."installationId" = ${installationId}
                AND cf."repositoryName" = ${repositoryName}
                AND (cc."embedding" <=> ${embeddingString}::vector) < ${distanceThreshold}
                ORDER BY cc."embedding" <=> ${embeddingString}::vector ASC
                LIMIT ${limit};
            `;

            // Map result to CodeChunk with similarity
            return result.map(row => ({
                id: row.id,
                codeFileId: row.codeFileId,
                chunkIndex: row.chunkIndex,
                content: row.content,
                embedding: null,
                filePath: row.filePath,
                similarity: row.similarity
            }));
        } catch (error) {
            dataLogger.error("Error finding similar chunks", { error });
            return [];
        }
    }

    /**
     * Estimates token count for content (rough approximation)
     */
    public estimateTokens(content: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(content.length / 4);
    }
}
