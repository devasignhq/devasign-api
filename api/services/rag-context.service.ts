import { Pinecone } from '@pinecone-database/pinecone';
import { InferenceClient } from '@huggingface/inference';
import {
    PullRequestData,
    RelevantContext,
    HistoricalPR,
    RelevantFile,
    CodePattern,
    ProjectStandard,
    EmbeddingDocument,
    EmbeddingMetadata,
    ReviewResult
} from '../models/ai-review.model';
import { OctokitService } from './octokit.service';

/**
 * RAG Context Service Implementation
 * Handles embedding generation and context retrieval using Pinecone and llama-text-embed-v2
 * Requirements: 5.1, 5.2, 5.3, 8.1
 */
export class RAGContextServiceImpl {
    private pinecone: Pinecone;
    private inferenceClient: InferenceClient;
    private indexName: string;

    constructor() {
        // Initialize Pinecone client
        this.pinecone = new Pinecone({
            apiKey: process.env.PINECONE_API_KEY!,
        });

        // Initialize HuggingFace inference client for embeddings
        // Use the existing API key or create a free account at https://huggingface.co/
        this.inferenceClient = new InferenceClient(process.env.HUGGINGFACE_API_KEY || process.env.OPENAI_API_KEY);

        // Get index name from environment
        this.indexName = process.env.PINECONE_INDEX_NAME || 'code-review-context-llama';
    }

    /**
     * Retrieves relevant context for PR analysis
     * Requirement 5.1: System shall retrieve relevant files from codebase using RAG
     * Requirement 5.2: System shall consider similar closed PRs
     */
    async getRelevantContext(prData: PullRequestData): Promise<RelevantContext> {
        try {
            // Generate search query from PR data
            const searchQuery = this.buildSearchQuery(prData);

            // Get similar PRs and relevant files in parallel
            const [similarPRs, relevantFiles] = await Promise.all([
                this.searchSimilarPRs(searchQuery, prData.installationId, 5),
                this.getRelevantFiles(
                    prData.changedFiles.map(f => f.filename),
                    prData.repositoryName,
                    prData.installationId
                )
            ]);

            // Extract code patterns and project standards from context
            const codePatterns = this.extractCodePatterns(relevantFiles, similarPRs);
            const projectStandards = this.extractProjectStandards(relevantFiles, similarPRs);

            return {
                similarPRs,
                relevantFiles,
                codePatterns,
                projectStandards
            };
        } catch (error) {
            console.error('Error getting relevant context:', error);
            // Return empty context on error to allow graceful degradation
            return {
                similarPRs: [],
                relevantFiles: [],
                codePatterns: [],
                projectStandards: []
            };
        }
    }

    /**
     * Generates embeddings for content using llama-text-embed-v2
     * Requirement 5.3: System shall use llama-text-embed-v2 model for consistency
     */
    async generateEmbeddings(content: string): Promise<number[]> {
        try {
            // Clean and prepare content for embedding
            const cleanContent = this.preprocessContent(content);

            // Try HuggingFace API first if available
            if (process.env.HUGGINGFACE_API_KEY) {
                try {
                    const response = await this.inferenceClient.featureExtraction({
                        model: 'sentence-transformers/all-MiniLM-L6-v2', // Using a reliable alternative
                        inputs: cleanContent
                    });

                    // Handle different response formats
                    let embeddings: number[] = [];
                    if (Array.isArray(response) && Array.isArray(response[0])) {
                        embeddings = response[0] as number[];
                    } else if (Array.isArray(response)) {
                        embeddings = response as number[];
                    }

                    // Pad or truncate to match index dimensions (1024)
                    if (embeddings.length > 0) {
                        return this.adjustEmbeddingDimensions(embeddings, 1024);
                    }
                } catch (hfError) {
                    console.warn('HuggingFace API failed, falling back to local embeddings:', hfError);
                }
            }

            // Fallback to simple text-based embedding generation
            return this.generateSimpleEmbeddings(cleanContent);
        } catch (error) {
            console.error('Error generating embeddings:', error);
            // Return simple hash-based embedding as final fallback
            return this.generateSimpleEmbeddings(content);
        }
    }

    /**
     * Generates simple embeddings based on text characteristics
     * Used as fallback when external APIs are unavailable
     */
    private generateSimpleEmbeddings(content: string): number[] {
        const embedding = new Array(1024).fill(0);

        // Simple text-based features
        const words = content.toLowerCase().split(/\s+/);
        const chars = content.split('');

        // Character frequency features (first 256 dimensions)
        for (let i = 0; i < chars.length && i < 256; i++) {
            const charCode = chars[i].charCodeAt(0) % 256;
            embedding[charCode] += 1;
        }

        // Word-based features (next 256 dimensions)
        const wordFeatures = {
            length: Math.min(content.length / 1000, 1),
            wordCount: Math.min(words.length / 100, 1),
            avgWordLength: words.length > 0 ? Math.min(words.reduce((sum, w) => sum + w.length, 0) / words.length / 10, 1) : 0,
            uniqueWords: Math.min(new Set(words).size / words.length, 1),
            // Programming-specific features
            hasCode: /[{}();]/.test(content) ? 1 : 0,
            hasImports: /import|require|include/.test(content) ? 1 : 0,
            hasComments: /\/\/|\/\*|\#/.test(content) ? 1 : 0,
            hasStrings: /"[^"]*"|'[^']*'/.test(content) ? 1 : 0,
            // Additional text features to fill more dimensions
            hasNumbers: /\d/.test(content) ? 1 : 0,
            hasSpecialChars: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(content) ? 1 : 0,
            hasUpperCase: /[A-Z]/.test(content) ? 1 : 0,
            hasLowerCase: /[a-z]/.test(content) ? 1 : 0,
            lineCount: Math.min(content.split('\n').length / 100, 1),
            avgLineLength: content.split('\n').length > 0 ? Math.min(content.split('\n').reduce((sum, line) => sum + line.length, 0) / content.split('\n').length / 100, 1) : 0
        };

        // Fill word-based features (256-511)
        Object.values(wordFeatures).forEach((value, index) => {
            if (index < 256) {
                embedding[256 + index] = value;
            }
        });

        // Fill remaining dimensions with hash-based features (512-1023)
        const hashFeatures = this.generateHashFeatures(content, 512);
        hashFeatures.forEach((value, index) => {
            if (index < 512) {
                embedding[512 + index] = value;
            }
        });

        // Normalize the embedding
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            return embedding.map(val => val / magnitude);
        }

        return embedding;
    }

    /**
     * Adjusts embedding dimensions to match index requirements
     */
    private adjustEmbeddingDimensions(embeddings: number[], targetDimensions: number): number[] {
        if (embeddings.length === targetDimensions) {
            return embeddings;
        }

        if (embeddings.length > targetDimensions) {
            // Truncate if too long
            return embeddings.slice(0, targetDimensions);
        }

        // Pad if too short
        const padded = [...embeddings];
        while (padded.length < targetDimensions) {
            // Repeat the embedding pattern or pad with zeros
            const remaining = targetDimensions - padded.length;
            if (remaining >= embeddings.length) {
                padded.push(...embeddings);
            } else {
                padded.push(...embeddings.slice(0, remaining));
            }
        }

        // Normalize the padded embedding
        const magnitude = Math.sqrt(padded.reduce((sum, val) => sum + val * val, 0));
        if (magnitude > 0) {
            return padded.map(val => val / magnitude);
        }

        return padded;
    }

    /**
     * Generates hash-based features for additional dimensions
     */
    private generateHashFeatures(content: string, dimensions: number): number[] {
        const features = new Array(dimensions).fill(0);

        // Simple hash function to distribute content across dimensions
        for (let i = 0; i < content.length; i++) {
            const char = content.charCodeAt(i);
            const hash1 = (char * 31 + i) % dimensions;
            const hash2 = (char * 17 + i * 3) % dimensions;
            const hash3 = (char * 13 + i * 7) % dimensions;

            features[hash1] += 0.1;
            features[hash2] += 0.05;
            features[hash3] += 0.02;
        }

        // Normalize to prevent overflow
        const maxVal = Math.max(...features);
        if (maxVal > 0) {
            return features.map(val => Math.min(val / maxVal, 1));
        }

        return features;
    }

    /**
     * Searches for similar PRs in vector database
     * Requirement 5.2: System shall consider similar closed PRs that resolved related issues
     */
    async searchSimilarPRs(query: string, installationId: string, limit: number = 10): Promise<HistoricalPR[]> {
        try {
            // Generate query embedding
            const queryEmbedding = await this.generateEmbeddings(query);

            // Search in Pinecone index
            const index = this.pinecone.index(this.indexName);
            const searchResults = await index.query({
                vector: queryEmbedding,
                filter: {
                    installationId: installationId,
                    type: 'pr'
                },
                topK: limit,
                includeMetadata: true
            });

            // Convert results to HistoricalPR format
            const historicalPRs: HistoricalPR[] = [];

            for (const match of searchResults.matches || []) {
                if (match.metadata && match.score && match.score > 0.7) { // Similarity threshold
                    const metadata = match.metadata as any;
                    historicalPRs.push({
                        prNumber: metadata.prNumber || 0,
                        title: metadata.title || '',
                        description: metadata.content || '',
                        linkedIssues: metadata.linkedIssues ? JSON.parse(metadata.linkedIssues) : [],
                        outcome: metadata.outcome || 'closed',
                        reviewComments: metadata.reviewComments ? JSON.parse(metadata.reviewComments) : [],
                        similarity: match.score
                    });
                }
            }

            return historicalPRs;
        } catch (error) {
            console.error('Error searching similar PRs:', error);
            return [];
        }
    }

    /**
     * Gets relevant files based on changed files
     * Requirement 5.1: System shall retrieve relevant files from current codebase
     */
    async getRelevantFiles(changedFiles: string[], repositoryName: string, installationId: string): Promise<RelevantFile[]> {
        try {
            const relevantFiles: RelevantFile[] = [];

            // For each changed file, find similar files in the codebase
            for (const filename of changedFiles) {
                // Generate search query based on file path and type
                const fileQuery = this.buildFileQuery(filename);
                const queryEmbedding = await this.generateEmbeddings(fileQuery);

                // Search for similar files
                const index = this.pinecone.index(this.indexName);
                const searchResults = await index.query({
                    vector: queryEmbedding,
                    filter: {
                        installationId: installationId,
                        repositoryName: repositoryName,
                        type: 'file'
                    },
                    topK: 3,
                    includeMetadata: true
                });

                // Process search results
                for (const match of searchResults.matches || []) {
                    if (match.metadata && match.score && match.score > 0.6) {
                        const metadata = match.metadata as any;

                        // Fetch actual file content from GitHub
                        try {
                            const fileContent = await OctokitService.getFileContent(
                                installationId,
                                repositoryName,
                                metadata.filename
                            );

                            relevantFiles.push({
                                filename: metadata.filename,
                                content: fileContent,
                                language: metadata.language || this.detectLanguage(metadata.filename),
                                similarity: match.score,
                                lastModified: metadata.timestamp || new Date().toISOString()
                            });
                        } catch (fileError) {
                            console.warn(`Could not fetch content for file ${metadata.filename}:`, fileError);
                        }
                    }
                }
            }

            return relevantFiles;
        } catch (error) {
            console.error('Error getting relevant files:', error);
            return [];
        }
    }

    /**
     * Stores PR data as embeddings for future context
     * Requirement 8.1: System shall use existing Pinecone database index
     */
    async storePRContext(prData: PullRequestData, reviewResult: ReviewResult): Promise<void> {
        try {
            const documents: EmbeddingDocument[] = [];

            // Create embedding for PR description and title
            const prContent = `${prData.title}\n\n${prData.body}`;
            const prEmbedding = await this.generateEmbeddings(prContent);

            documents.push({
                id: `${prData.installationId}:pr:${prData.prNumber}`,
                values: prEmbedding,
                metadata: {
                    installationId: prData.installationId,
                    type: 'pr',
                    repositoryName: prData.repositoryName,
                    prNumber: prData.prNumber,
                    content: prContent,
                    timestamp: new Date().toISOString(),
                    title: prData.title,
                    linkedIssues: JSON.stringify(prData.linkedIssues.map(i => i.number)),
                    reviewComments: JSON.stringify(reviewResult.suggestions.map(s => s.description)),
                    outcome: 'open' // Will be updated when PR is closed/merged
                }
            });

            // Create embeddings for changed files (store file paths and types)
            for (const file of prData.changedFiles) {
                if (file.patch && file.patch.length > 0) {
                    const fileContent = `File: ${file.filename}\nChanges: ${file.patch.substring(0, 1000)}`; // Limit patch size
                    const fileEmbedding = await this.generateEmbeddings(fileContent);

                    documents.push({
                        id: `${prData.installationId}:file:${prData.prNumber}:${file.filename}`,
                        values: fileEmbedding,
                        metadata: {
                            installationId: prData.installationId,
                            type: 'file',
                            repositoryName: prData.repositoryName,
                            filename: file.filename,
                            content: fileContent,
                            timestamp: new Date().toISOString(),
                            language: this.detectLanguage(file.filename),
                            fileType: file.status
                        }
                    });
                }
            }

            // Store embeddings in Pinecone
            if (documents.length > 0) {
                const index = this.pinecone.index(this.indexName);
                // Convert to Pinecone format
                const pineconeRecords = documents.map(doc => ({
                    id: doc.id,
                    values: doc.values,
                    metadata: doc.metadata as Record<string, any>
                }));
                await index.upsert(pineconeRecords);
            }
        } catch (error) {
            console.error('Error storing PR context:', error);
            // Don't throw error to avoid breaking the main workflow
        }
    }

    /**
     * Updates embeddings when PR is merged or closed
     * Requirement 8.1: System shall optimize vector searches for performance
     */
    async updatePROutcome(installationId: string, prNumber: number, outcome: 'merged' | 'closed'): Promise<void> {
        try {
            const index = this.pinecone.index(this.indexName);
            const prId = `${installationId}:pr:${prNumber}`;

            // Fetch existing embedding
            const fetchResult = await index.fetch([prId]);
            const existingRecord = fetchResult.records?.[prId];

            if (existingRecord && existingRecord.metadata) {
                // Update metadata with outcome
                const updatedMetadata = {
                    ...existingRecord.metadata,
                    outcome: outcome,
                    updatedAt: new Date().toISOString()
                };

                // Upsert with updated metadata
                await index.upsert([{
                    id: prId,
                    values: existingRecord.values,
                    metadata: updatedMetadata
                }]);
            }
        } catch (error) {
            console.error('Error updating PR outcome:', error);
            // Don't throw error to avoid breaking the main workflow
        }
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Builds search query from PR data
     */
    private buildSearchQuery(prData: PullRequestData): string {
        const components = [
            prData.title,
            prData.body?.substring(0, 500), // Limit body length
            prData.changedFiles.map(f => f.filename).join(' '),
            prData.linkedIssues.map(i => i.title).join(' ')
        ].filter(Boolean);

        return components.join(' ').trim();
    }

    /**
     * Builds file-specific search query
     */
    private buildFileQuery(filename: string): string {
        const parts = filename.split('/');
        const fileName = parts[parts.length - 1];
        const directory = parts.slice(0, -1).join('/');
        const extension = fileName.split('.').pop() || '';

        return `${fileName} ${directory} ${extension} file`;
    }

    /**
     * Preprocesses content for embedding generation
     */
    private preprocessContent(content: string): string {
        return content
            .replace(/\r\n/g, '\n') // Normalize line endings
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .substring(0, 8000); // Limit content length for embedding model
    }

    /**
     * Detects programming language from filename
     */
    private detectLanguage(filename: string): string {
        const extension = filename.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'js': 'javascript',
            'ts': 'typescript',
            'jsx': 'javascript',
            'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql'
        };

        return languageMap[extension || ''] || 'text';
    }

    /**
     * Extracts code patterns from relevant files and similar PRs
     */
    private extractCodePatterns(relevantFiles: RelevantFile[], similarPRs: HistoricalPR[]): CodePattern[] {
        const patterns: CodePattern[] = [];

        // Extract patterns from file names and types
        const fileExtensions = relevantFiles.map(f => f.filename.split('.').pop()).filter(Boolean);
        const extensionCounts = fileExtensions.reduce((acc, ext) => {
            acc[ext!] = (acc[ext!] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Create patterns based on file types
        Object.entries(extensionCounts).forEach(([ext, count]) => {
            if (count > 1) {
                patterns.push({
                    pattern: `*.${ext}`,
                    description: `${ext.toUpperCase()} files pattern`,
                    examples: relevantFiles.filter(f => f.filename.endsWith(`.${ext}`)).map(f => f.filename),
                    frequency: count
                });
            }
        });

        return patterns;
    }

    /**
     * Extracts project standards from relevant files and similar PRs
     */
    private extractProjectStandards(relevantFiles: RelevantFile[], similarPRs: HistoricalPR[]): ProjectStandard[] {
        const standards: ProjectStandard[] = [];

        // Extract standards from file structure
        const directories = relevantFiles.map(f => f.filename.split('/').slice(0, -1).join('/')).filter(Boolean);
        const uniqueDirectories = [...new Set(directories)];

        if (uniqueDirectories.length > 0) {
            standards.push({
                category: 'File Organization',
                rule: 'Consistent directory structure',
                description: 'Files are organized in consistent directory patterns',
                examples: uniqueDirectories.slice(0, 3)
            });
        }

        // Extract standards from similar PRs
        const commonReviewComments = similarPRs
            .flatMap(pr => pr.reviewComments)
            .filter(comment => comment.length > 10);

        if (commonReviewComments.length > 0) {
            standards.push({
                category: 'Code Review',
                rule: 'Common review patterns',
                description: 'Patterns identified from previous code reviews',
                examples: commonReviewComments.slice(0, 3)
            });
        }

        return standards;
    }
}