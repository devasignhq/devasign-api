import { createId } from "@paralleldrive/cuid2";;
import { CodeFile, CodeChunk, Prisma } from "../../../prisma_client";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";

/**
 * Service for managing vector store operations using pgvector
 */
export class VectorStoreService {
    /**
     * Upserts a code file record
     * @param installationId ID of the installation
     * @param repositoryName Name of the repository
     * @param filePath Path to the file
     * @param fileHash Hash of the file
     * @returns Promise<CodeFile>
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
     */
    async deleteFileChunks(codeFileId: string): Promise<void> {
        await prisma.codeChunk.deleteMany({
            where: { codeFileId }
        });
    }

    /**
     * Upserts code chunks with embeddings
     * @param codeFileId ID of the code file
     * @param chunks Array of code chunks to upsert
     * @returns Promise<void>
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
            const id = createId();

            // Return a template fragment for each row
            return Prisma.sql`(${id}, ${codeFileId}, ${chunk.index}, ${chunk.content}, ${embeddingString}::vector)`;
        });

        // Execute one single INSERT statement for all chunks
        await prisma.$executeRaw`
            INSERT INTO "CodeChunk" ("id", "codeFileId", "chunkIndex", "content", "embedding")
            VALUES ${Prisma.join(values)}
        `;
    }

    /**
     * Finds similar code chunks using cosine distance
     * @param embedding Embedding of the query
     * @param installationId ID of the installation
     * @param repositoryName Name of the repository
     * @param limit Maximum number of chunks to return
     * @param similarityThreshold Minimum similarity threshold
     * @returns Promise<CodeChunk & { similarity: number; filePath: string }[]>
     */
    async findSimilarChunks(
        embedding: number[],
        installationId: string,
        repositoryName: string,
        limit: number = 5,
        similarityThreshold: number = 0.7
    ): Promise<(CodeChunk & { similarity: number; filePath: string })[]> {
        const embeddingString = `[${embedding.join(",")}]`;

        // Cosine distance operator is <=>
        // Similarity = 1 - distance
        // We filter by distance < (1 - threshold)
        const distanceThreshold = 1 - similarityThreshold;

        try {
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
}
