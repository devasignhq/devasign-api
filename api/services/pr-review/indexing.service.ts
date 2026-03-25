import { OctokitService } from "../octokit.service";
import { VectorStoreService } from "./vector-store.service";
import { dataLogger, messageLogger } from "../../config/logger.config";
import { prisma } from "../../config/database.config";
import { IndexingStatus } from "../../../prisma_client";
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguage } from "@langchain/textsplitters";

type CodeChunkWithEmbedding = {
    codeFileId: string;
    filePath: string;
    chunkIndex: number;
    content: string;
    embedding?: number[];
};

/**
 * Service to manage indexing of repository codebases
 */
export class IndexingService {
    private vectorStoreService: VectorStoreService;
    private minuteStartTime: number = Date.now();
    private requestsThisMinute: number = 0;
    private tokensThisMinute: number = 0;

    constructor() {
        this.vectorStoreService = new VectorStoreService();
    }

    /**
     * Clear all indexing data and state for an installation
     * @param installationId - The ID of the installation
     */
    async clearInstallationData(installationId: string): Promise<void> {
        dataLogger.info("Clearing indexing data for installation", { installationId });

        await prisma.$transaction([
            // Clear indexing state
            prisma.repositoryIndexingState.deleteMany({
                where: { installationId }
            }),
            // Clear code files
            prisma.codeFile.deleteMany({
                where: { installationId }
            })
        ]);
    }

    /**
     * Clear all indexing data and state for a specific repository
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     */
    async clearRepositoryData(installationId: string, repositoryName: string): Promise<void> {
        dataLogger.info("Clearing indexing data for repository", { installationId, repositoryName });

        await prisma.$transaction([
            // Clear indexing state
            prisma.repositoryIndexingState.deleteMany({
                where: { installationId, repositoryName }
            }),
            // Clear code files
            prisma.codeFile.deleteMany({
                where: { installationId, repositoryName }
            })
        ]);
    }

    /**
     * Incrementally index only changed files in a repository.
     * Deletes removed files and re-indexes added/modified files.
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param filesToIndex - File paths to fetch, chunk, embed and upsert
     * @param filesToRemove - File paths to delete from the index
     */
    async indexChangedFiles(
        installationId: string,
        repositoryName: string,
        filesToIndex: string[],
        filesToRemove: string[]
    ): Promise<void> {
        dataLogger.info("Starting incremental indexing", {
            installationId,
            repositoryName,
            filesToIndex: filesToIndex.length,
            filesToRemove: filesToRemove.length
        });

        const startTime = Date.now();

        try {
            // Delete removed files from the index (CodeFile cascade-deletes CodeChunks)
            if (filesToRemove.length > 0) {
                const deleteCount = await prisma.codeFile.deleteMany({
                    where: {
                        installationId,
                        repositoryName,
                        filePath: { in: filesToRemove }
                    }
                });
                dataLogger.info(`Deleted ${deleteCount.count} removed files from index`);
            }

            // Filter relevant files for indexing (skip images, lockfiles, etc.)
            const relevantFiles = filesToIndex.filter(path => this.isRelevantFile(path));

            // Skip if no relevant changes
            if (relevantFiles.length === 0) {
                dataLogger.info("No relevant files to index after filtering");
                return;
            }

            dataLogger.info(`Indexing ${relevantFiles.length} relevant files (from ${filesToIndex.length} changed)`);

            // Fetch, chunk, embed, and upsert in batches (same flow as indexRepository)
            const batchSize = 40;

            for (let i = 0; i < relevantFiles.length; i += batchSize) {
                const batchPaths = relevantFiles.slice(i, i + batchSize);

                // Fetch contents for the batch
                const fileContents = await OctokitService.getMultipleFilesWithFragments(
                    installationId,
                    repositoryName,
                    batchPaths
                );

                // Use helper to process the batch
                await this.processBatch(installationId, repositoryName, batchPaths, fileContents);

                dataLogger.info(`Incrementally indexed batch ${Math.floor(i / batchSize) + 1}: ${batchPaths.length} files`);
            }

            // Log success
            const duration = Date.now() - startTime;
            dataLogger.info("Incremental indexing completed", {
                installationId,
                repositoryName,
                filesIndexed: relevantFiles.length,
                filesRemoved: filesToRemove.length,
                duration: this.formatDuration(duration)
            });
        } catch (error) {
            dataLogger.error("Incremental indexing failed", { error, installationId, repositoryName });
            throw error;
        }
    }

    /**
     * Index a repository by fetching all files, chunking them, and storing embeddings
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @returns A promise that resolves when the indexing is complete
     */
    async indexRepository(installationId: string, repositoryName: string): Promise<void> {
        dataLogger.info("Starting repository indexing", { installationId, repositoryName });
        const startTime = Date.now();

        try {
            // Check for existing indexing state
            const indexingState = await prisma.repositoryIndexingState.upsert({
                where: {
                    installationId_repositoryName: {
                        installationId,
                        repositoryName
                    }
                },
                update: {
                    status: IndexingStatus.IN_PROGRESS,
                    updatedAt: new Date()
                },
                create: {
                    installationId,
                    repositoryName,
                    status: IndexingStatus.IN_PROGRESS,
                    lastIndexedFilePath: null
                }
            });

            // Get all file paths
            const allFiles = await OctokitService.getAllFilePathsFromTree(installationId, repositoryName);

            // Filter relevant files (skip images, lockfiles, etc)
            let relevantFiles = allFiles.filter(path => this.isRelevantFile(path));
            const totalFiles = relevantFiles.length;

            dataLogger.info(`Found ${totalFiles} relevant files to index from ${allFiles.length} total files`);

            // Resume logic: if we have a lastIndexedFilePath, filter out files that come before or equal to it
            if (indexingState.lastIndexedFilePath) {
                const resumeIndex = relevantFiles.findIndex(f => f === indexingState.lastIndexedFilePath);
                if (resumeIndex !== -1) {
                    dataLogger.info(`Resuming indexing from after file: ${indexingState.lastIndexedFilePath}`);
                    relevantFiles = relevantFiles.slice(resumeIndex + 1);
                } else {
                    // If lastIndexedFilePath not found, find the insertion point
                    // relevantFiles is sorted. We want to start at the first file > lastIndexedFilePath
                    const resumeIndex = relevantFiles.findIndex(f => f > indexingState.lastIndexedFilePath!);
                    if (resumeIndex !== -1) {
                        dataLogger.info(`Last indexed file not found. Resuming from closest next file: ${relevantFiles[resumeIndex]}`);
                        relevantFiles = relevantFiles.slice(resumeIndex);
                    } else if (indexingState.lastIndexedFilePath < relevantFiles[relevantFiles.length - 1]) {
                        // All files are greater than last indexed file path
                        dataLogger.info("All files appear to be already indexed.");
                        relevantFiles = [];
                    }
                }
            }

            // If no relevant files, return
            if (relevantFiles.length === 0) {
                dataLogger.info("No relevant files to index");
                return;
            }

            // Fetch file contents in batches (process in chunks of 40 files to optimize GraphQL efficiency)
            const batchSize = 40;
            let processedFiles = totalFiles - relevantFiles.length; // Approximate count of already processed

            for (let i = 0; i < relevantFiles.length; i += batchSize) {
                const batchPaths = relevantFiles.slice(i, i + batchSize);

                // Fetch contents for the whole batch
                const fileContents = await OctokitService.getMultipleFilesWithFragments(
                    installationId,
                    repositoryName,
                    batchPaths
                );

                // Use helper to process the batch
                await this.processBatch(installationId, repositoryName, batchPaths, fileContents);

                // Update progress per batch
                const lastFileInBatch = batchPaths[batchPaths.length - 1];
                await this.updateIndexingProgress(installationId, repositoryName, lastFileInBatch);

                // Update processed files count
                processedFiles += batchPaths.length;
                dataLogger.info(`Indexed ${processedFiles}/${totalFiles} files`);
            }

            // Mark indexing as completed
            await prisma.repositoryIndexingState.update({
                where: {
                    installationId_repositoryName: {
                        installationId,
                        repositoryName
                    }
                },
                data: {
                    status: IndexingStatus.COMPLETED,
                    updatedAt: new Date()
                }
            });

            const duration = Date.now() - startTime;
            dataLogger.info(
                "Repository indexing completed",
                { installationId, repositoryName, duration: this.formatDuration(duration) }
            );

        } catch (error) {
            dataLogger.error("Repository indexing failed", { error, installationId, repositoryName });

            // Mark indexing as failed
            await prisma.repositoryIndexingState.update({
                where: {
                    installationId_repositoryName: {
                        installationId,
                        repositoryName
                    }
                },
                data: {
                    status: IndexingStatus.FAILED,
                    updatedAt: new Date()
                }
            });

            throw error;
        }
    }

    /**
     * Update the indexing progress
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param lastIndexedFilePath - The last indexed file path
     * @returns A promise that resolves when the progress is updated
     */
    private async updateIndexingProgress(installationId: string, repositoryName: string, lastIndexedFilePath: string) {
        await prisma.repositoryIndexingState.update({
            where: {
                installationId_repositoryName: {
                    installationId,
                    repositoryName
                }
            },
            data: {
                lastIndexedFilePath,
                updatedAt: new Date()
            }
        });
        messageLogger.info(`Repository indexing progress updated ${lastIndexedFilePath}`);
    }

    /**
     * Processes a batch of files: skips binary/empty files, preprocesses,
     * upserts metadata, chunks content, and stores embeddings.
     */
    private async processBatch(
        installationId: string,
        repositoryName: string,
        batchPaths: string[],
        fileContents: Record<string, { oid: string; text: string; isBinary: boolean } | null>
    ): Promise<void> {
        const currentBatchChunks: CodeChunkWithEmbedding[] = [];

        // Process each file in the batch
        for (const filePath of batchPaths) {
            const fileData = fileContents[filePath];
            // Skip binary files
            if (!fileData || fileData.isBinary) continue;

            const trimmedContent = fileData.text.trim();
            // Skip empty or whitespace-only files
            if (!trimmedContent) {
                dataLogger.info(`Skipping empty or whitespace-only file: ${filePath}`);
                continue;
            }

            // Preprocess content
            const cleanContent = this.preprocessContent(trimmedContent, filePath);

            // Upsert file metadata
            const codeFile = await this.vectorStoreService.upsertCodeFile(
                installationId,
                repositoryName,
                filePath,
                fileData.oid // Use OID as hash
            );

            // Chunk content
            const chunks = await this.chunkContent(cleanContent, filePath);
            const allChunkTexts = chunks.map(c => c.trim()).filter(Boolean);

            // Add chunks to batch
            for (let j = 0; j < allChunkTexts.length; j++) {
                currentBatchChunks.push({
                    codeFileId: codeFile.id,
                    filePath,
                    chunkIndex: j,
                    content: allChunkTexts[j]
                });
            }
        }

        // Embed and store chunks
        if (currentBatchChunks.length > 0) {
            await this.embedAndStoreChunks(currentBatchChunks);
        }
    }

    /**
     * Process chunk buffer in optimal batches, respecting TPM and RPM rate limits
     * @param chunks - Array of chunk objects over multiple files
     */
    private async embedAndStoreChunks(
        chunks: CodeChunkWithEmbedding[]
    ) {
        let p = 0;

        // Process chunk buffer in optimal batches, noting TPM and RPM rate limits
        while (p < chunks.length) {
            const embedBatch: CodeChunkWithEmbedding[] = [];
            let batchTokens = 0;

            // Add chunks to batch
            while (p < chunks.length) {
                const chunk = chunks[p];
                const tokens = this.vectorStoreService.estimateTokens(chunk.content);

                // Limits for voyage-code-3 bulk endpoint
                // Max length of list: 1000
                if (embedBatch.length >= 1000) break;
                // Target ~80-95% of total max tokens per lists to be safe (100,000 out of 120,000 max)
                if (batchTokens + tokens > 100000 && embedBatch.length > 0) break;

                embedBatch.push(chunk);
                batchTokens += tokens;
                p++;
            }

            await this.checkRateLimits(batchTokens);

            // Reserve rate limits synchronously to prevent race conditions during concurrent execution
            this.requestsThisMinute++;
            this.tokensThisMinute += batchTokens;

            try {
                // Embed documents
                const documents = embedBatch.map(c => c.content);
                const embeddings = await this.vectorStoreService.embedDocuments(documents);

                // Add embeddings to chunks
                for (let i = 0; i < embedBatch.length; i++) {
                    embedBatch[i].embedding = embeddings[i];
                }
            } catch (error) {
                dataLogger.error("Failed to embed batch of chunks", { error });
                throw error;
            }
        }

        // Group chunks by file to satisfy vector DB constraints (clear old content per file)
        const chunksByFile: Record<string, { index: number; content: string; embedding: number[] }[]> = {};
        for (const chunk of chunks) {
            if (!chunk.embedding) continue;
            if (!chunksByFile[chunk.codeFileId]) chunksByFile[chunk.codeFileId] = [];
            chunksByFile[chunk.codeFileId].push({
                index: chunk.chunkIndex,
                content: chunk.content,
                embedding: chunk.embedding
            });
        }

        // Upsert by file
        for (const [fileId, fileChunks] of Object.entries(chunksByFile)) {
            await this.vectorStoreService.upsertCodeChunks(fileId, fileChunks);
        }
    }

    /**
     * Format duration in milliseconds to "X min Y sec"
     * @param ms - duration in milliseconds
     * @returns formatted duration string
     */
    private formatDuration(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes} min ${seconds} sec`;
    }

    /**
     * Restricts execution to respect global RPM / TPM rate limits
     * @param nextBatchTokens - Tokens to be embedded in the subsequent request
     */
    private async checkRateLimits(nextBatchTokens: number) {
        const now = Date.now();

        // Reset rate limits if a minute has passed
        if (now - this.minuteStartTime > 60000) {
            this.minuteStartTime = now;
            this.requestsThisMinute = 0;
            this.tokensThisMinute = 0;
        }

        // Voyage voyage-code-3 limit: 3M TPM, 2000 RPM. (Target limits slightly lower for safety)
        if (this.requestsThisMinute >= 1990 || this.tokensThisMinute + nextBatchTokens > 2900000) {
            // Wait for rate limits to reset
            const waitTime = 60000 - (now - this.minuteStartTime) + 1000;
            messageLogger.warn(`Rate limit near: TPM (${this.tokensThisMinute}/${nextBatchTokens}), RPM (${this.requestsThisMinute}). Waiting ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));

            // Reset rate limits
            this.minuteStartTime = Date.now();
            this.requestsThisMinute = 0;
            this.tokensThisMinute = 0;
        }
    }

    /**
     * Chunk content based on file extension
     * @param content - The content to chunk
     * @param filePath - The file path
     * @returns A promise that resolves to an array of chunks
     */
    private async chunkContent(content: string, filePath: string): Promise<string[]> {
        // Determine language based on file extension for better splitting
        const extension = filePath.split(".").pop()?.toLowerCase();

        // Chunk content
        const splitter = RecursiveCharacterTextSplitter.fromLanguage(
            this.getLanguageFromExtension(extension),
            {
                chunkSize: 6000,
                chunkOverlap: 600
            }
        );

        // Split content
        const documents = await splitter.createDocuments([content]);
        return documents.map(doc => doc.pageContent);
    }

    /**
     * Get language from extension
     * @param ext - The file extension
     * @returns The corresponding text splitter language
     */
    private getLanguageFromExtension(ext?: string): SupportedTextSplitterLanguage {
        if (!ext) return "markdown";

        const extension = ext.toLowerCase().replace(".", "");

        const map: Record<string, SupportedTextSplitterLanguage> = {
            "js": "js", "jsx": "js", "ts": "js", "tsx": "js", "mjs": "js", "cjs": "js",
            "py": "python", "ipynb": "python", "pyw": "python",
            "cpp": "cpp", "cxx": "cpp", "cc": "cpp", "hpp": "cpp", "h": "cpp", "c": "cpp",
            "java": "java",
            "scala": "scala", "sc": "scala",
            "go": "go",
            "rb": "ruby", "rake": "ruby",
            "rs": "rust",
            "swift": "swift",
            "php": "php", "phtml": "php", "php3": "php", "php4": "php", "php5": "php",
            "html": "html", "htm": "html",
            "markdown": "markdown", "md": "markdown", "mdx": "markdown",
            "rst": "rst",
            "latex": "latex", "tex": "latex",
            "proto": "proto",
            "sol": "sol"
        };

        // Default Fallback Strategy
        return map[extension] || "markdown";
    }

    /**
     * Preprocess content based on file type
     * @param content - The content to preprocess
     * @param filePath - The file path
     * @returns The preprocessed content
     */
    private preprocessContent(content: string, filePath: string): string {
        // 1. Check if the file is a Jupyter Notebook
        if (filePath.toLowerCase().endsWith(".ipynb")) {
            try {
                // Parse the notebook JSON directly from content
                const notebook = JSON.parse(content);
                if (!notebook.cells || !Array.isArray(notebook.cells)) return ""; // Return empty string instead of raw content

                // Extract only code and markdown cells
                return notebook.cells
                    .map((cell: { source: unknown[]; cell_type: string; }) => {
                        // source can be a string or an array of strings in Jupyter JSON
                        const source = Array.isArray(cell.source)
                            ? cell.source.join("")
                            : (cell.source || "");

                        // Add a small header for the AI context if it's a markdown cell
                        return cell.cell_type === "markdown"
                            ? `### Notebook Markdown: ${source}`
                            : source;
                    })
                    .filter(Boolean)
                    .join("\n\n");
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                dataLogger.warn("Notebook parsing failed (likely truncated or invalid JSON), using regex fallback to extract source", { filePath, error: errorMessage });

                // Fallback: Use string matching to extract "source" fields safely ignoring structural JSON errors
                const sourceBlocks: string[] = [];
                // Match "source": [...] or "source": "..."
                const sourceRegex = /"source"\s*:\s*(?:\[(.*?)\]|"(.*?)")/gs;
                let match;

                while ((match = sourceRegex.exec(content)) !== null) {
                    if (match[1]) {
                        // Array of strings inside the source block
                        const stringLiterals = match[1].match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
                        if (stringLiterals) {
                            sourceBlocks.push(
                                stringLiterals.map(s => {
                                    try { return JSON.parse(s); }
                                    catch { return s.replace(/^"|"$/g, "").replace(/\\n/g, "\n").replace(/\\"/g, "\""); }
                                }).join("")
                            );
                        }
                    } else if (match[2]) {
                        // Single string source block
                        try {
                            sourceBlocks.push(JSON.parse(`"${match[2]}"`));
                        } catch {
                            sourceBlocks.push(match[2].replace(/\\n/g, "\n").replace(/\\"/g, "\""));
                        }
                    }
                }

                return sourceBlocks.length > 0 ? sourceBlocks.join("\n\n") : "";
            }
        }

        // 2. Strip massive base64 encoded images across ALL other file types (Markdown, CSS, HTML, TSX)
        return content.replace(/data:image\/[^;]+;base64,[a-zA-Z0-9+/]+=*/g, "[BASE64_IMAGE_STRIPPED]");
    }

    /**
     * Check if file is relevant for indexing
     * @param filePath - The file path
     * @returns True if the file is relevant, false otherwise
     */
    private isRelevantFile(filePath: string): boolean {
        const isIgnoredExt = this.ignoredExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
        const isIgnoredDir = this.ignoredDirs.some(dir => filePath.toLowerCase().includes(dir));

        return !isIgnoredExt && !isIgnoredDir;
    }

    /** File extensions to ignore for vector DB indexing */
    private ignoredExtensions: string[] = [
        // Huge auto-generated dependency locks
        "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", ".lock",

        // Media, Audio & Assets
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".mp4", ".webm",
        ".mp3", ".wav", ".ogg", ".flac",

        // Design & 3D Models
        ".fig", ".sketch", ".psd", ".ai", ".xd", ".fbx", ".gltf", ".blend",

        // Office & Documents (PDF already ignored below)
        ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",

        // Fonts
        ".woff", ".woff2", ".ttf", ".eot", ".otf",

        // Build artifacts & Dependencies
        ".map", ".min.js", ".min.css",

        // Environment, Secrets & Cryptography
        ".env", ".pem", ".crt", ".cer", ".key", ".p12",

        // Archives
        ".zip", ".tar", ".gz", ".7z", ".rar",

        // Binaries
        ".exe", ".dll", ".so", ".dylib",

        // Misc
        ".log", ".sh", ".bat", ".ps1", ".gitignore", ".dockerignore",
        ".editorconfig", ".npmrc", ".gitattributes", ".pdf",

        // C/C++ Build artifacts
        ".o", ".obj", ".a", ".lib", ".so", ".dylib", ".dll", ".out", ".elf",
        ".d", ".gch", ".pch", ".ilk", ".exp", ".idb", ".pdb",

        // Python bytecode & packages
        ".pyc", ".pyo", ".pyd", ".whl",

        // Rust build artifacts
        ".rlib", ".rmeta",

        // Java/JVM
        ".class", ".jar", ".war", ".ear",

        // Compiled/Binary
        ".wasm", ".bin", ".hex",

        // Machine Learning Models & Large Data
        ".onnx", ".pt", ".pth", ".h5", ".hdf5", ".parquet", ".avro", ".csv",

        // Database files (often large)
        ".db", ".sqlite", ".sqlite3",

        // OS files
        ".DS_Store", "Thumbs.db", "desktop.ini"
    ];

    /** Directories to ignore for vector DB indexing */
    private ignoredDirs: string[] = [
        // Dependencies & Framework Caches
        "node_modules/", ".yarn/", ".pnp/",
        ".nuxt/", ".output/", ".serverless/", ".terraform/",
        ".expo/", "ios/Pods/", ".angular/", ".nx/",

        // Build outputs
        "dist/", "build/", ".next/", "out/", ".turbo/",

        // Test coverage & E2E Reports
        "coverage/", ".nyc_output/", "playwright-report/", "test-results/",
        "cypress/videos/", "cypress/screenshots/",

        // Cache directories
        ".cache/", ".parcel-cache/", ".eslintcache/",

        // IDE & Editor
        ".vscode/", ".idea/", ".vs/",

        // Version control
        ".git/", ".husky/",

        // Package manager
        ".yarn/cache/", ".yarn/unplugged/",

        // Test fixtures & Mock data (often large JSON dumps)
        "__fixtures__/", "fixtures/", "mocks/", "__mocks__/", "stub/", "stubs/",

        // Data & Seed files (massive database initializers or raw data dumps)
        "data/", "seeds/", "seeders/",

        // API Client workspaces (Massive JSON collections)
        "postman/", "insomnia/", ".postman/",

        // Generated files
        ".snaplet/", "prisma/migrations/", "__snapshots__/",

        // Temporary
        "tmp/", "temp/", ".temp/",

        // Logs
        "logs/",

        // Agent/AI specific (instructions, not code)
        ".claude/", ".cursor/", ".opencode/", "agents/skills/", ".kiro/",

        // Checks/monitoring
        "__checks__/",

        // Public assets
        "public/fonts/", "public/images/", "public/videos/",

        // Localization & Translations
        "locales/", "locale/", "i18n/", "translations/", "lang/",

        // Python & ML
        "__pycache__/", ".venv/", "venv/", "env/", "virtualenv/",
        ".Python/", "*.egg-info/", ".eggs/", ".pytest_cache/",
        ".tox/", ".hypothesis/", ".mypy_cache/", ".pyre/", ".pytype/",
        "htmlcov/", ".ruff_cache/", ".ipynb_checkpoints/",

        // C/C++
        "CMakeFiles/", "cmake-build-debug/", "cmake-build-release/",
        ".cmake/", "vcpkg_installed/", ".conan/",

        // Rust
        "target/",

        // Java/Gradle/Maven
        ".gradle/", ".m2/", "target/",

        // Ruby
        ".bundle/", "vendor/bundle/",

        // Go
        "vendor/",

        // Generic build/output
        "bin/", "obj/", "Debug/", "Release/", "x64/", "x86/",

        // More IDE/Editors
        ".fleet/", ".eclipse/", "*.iml/",

        // Documentation builds
        "_build/", "site/", "_site/",

        // OS specific
        "__MACOSX/",

        // Other common
        "vendor/", ".well-known/"
    ];
}

export const indexingService = new IndexingService();
