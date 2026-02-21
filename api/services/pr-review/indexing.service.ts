import { OctokitService } from "../octokit.service";
import { GeminiAIService } from "./gemini-ai.service";
import { VectorStoreService } from "./vector-store.service";
import { dataLogger, messageLogger } from "../../config/logger.config";
import { prisma } from "../../config/database.config";
import { IndexingStatus } from "../../../prisma_client";
import { RecursiveCharacterTextSplitter, SupportedTextSplitterLanguage } from "@langchain/textsplitters";

/**
 * Service to manage indexing of repository codebases
 */
export class IndexingService {
    private geminiService: GeminiAIService;
    private vectorStoreService: VectorStoreService;
    private tokenPerMinuteCount: number = 0;
    private countingTokens: boolean = false;

    constructor() {
        this.geminiService = new GeminiAIService();
        this.vectorStoreService = new VectorStoreService();
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

            dataLogger.info(`Found ${totalFiles} relevant files to index`);

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

            // Fetch file contents in batches (process in chunks of 20 files to manage memory and API limits)
            const batchSize = 20;
            let processedFiles = totalFiles - relevantFiles.length; // Approximate count of already processed

            for (let i = 0; i < relevantFiles.length; i += batchSize) {
                const batchPaths = relevantFiles.slice(i, i + batchSize);

                // Fetch contents for the whole batch
                const fileContents = await OctokitService.getMultipleFilesWithFragments(
                    installationId,
                    repositoryName,
                    batchPaths
                );

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

                    // Process file
                    await this.processFile(
                        installationId,
                        repositoryName,
                        filePath,
                        trimmedContent,
                        fileData.oid // Use OID as hash
                    );
                }

                // Update progress per batch
                const lastFileInBatch = batchPaths[batchPaths.length - 1];
                await this.updateIndexingProgress(installationId, repositoryName, lastFileInBatch);

                // Update processed files count
                processedFiles += batchPaths.length;
                dataLogger.info(`Indexed ${processedFiles}/${totalFiles} files`);
            }

            // Mark as completed
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
            dataLogger.info("Repository indexing completed", { installationId, repositoryName, duration });

        } catch (error) {
            dataLogger.error("Repository indexing failed", { error, installationId, repositoryName });

            // Mark as failed
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
     * Process a single file: chunk, embed, and store
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param filePath - The file path
     * @param content - The file content
     * @param fileHash - The file hash
     * @returns A promise that resolves when the file is processed
     */
    private async processFile(
        installationId: string,
        repositoryName: string,
        filePath: string,
        content: string,
        fileHash: string
    ) {
        // Preprocess: Extract clean code if it's a Notebook
        const cleanContent = this.preprocessContent(content, filePath);

        // Upsert file metadata
        const codeFile = await this.vectorStoreService.upsertCodeFile(
            installationId,
            repositoryName,
            filePath,
            fileHash
        );

        // Smart Splitting
        const chunks = await this.chunkContent(cleanContent, filePath);

        // Generate embeddings and prepare for storage
        const allChunkTexts = chunks.map(c => c.trim()).filter(Boolean);
        const chunksWithEmbeddings: { index: number; content: string; embedding: number[] }[] = [];
        const failedChunks: { index: number; content: string }[] = [];

        // Estimate tokens for all chunks
        const estimatedTokens = this.geminiService.estimateTokens(allChunkTexts.join("\n"));
        messageLogger.info(`Estimated tokens: ${estimatedTokens}`);
        if (!this.countingTokens) {
            this.checkTokenLimit();
            this.countingTokens = true;
        }

        // Generate embeddings and prepare for storage
        for (let i = 0; i < allChunkTexts.length; i++) {
            const chunkText = allChunkTexts[i].trim();
            if (!chunkText) continue;

            // Estimate tokens for each chunk
            const estimatedTokens = this.geminiService.estimateTokens(chunkText);
            this.tokenPerMinuteCount += estimatedTokens;

            try {
                // Generate embedding
                const embedding = await this.geminiService.generateEmbedding(chunkText);

                // Add chunk to list
                chunksWithEmbeddings.push({
                    index: i,
                    content: chunkText,
                    embedding
                });
            } catch (error) {
                // Log and skip this chunk if embedding fails, but continue revision
                dataLogger.warn("Failed to generate embedding for chunk, scheduling retry", { filePath, chunkIndex: i, error });
                failedChunks.push({ index: i, content: chunkText });
            }
        }

        // Retry failed chunks
        if (failedChunks.length > 0) {
            dataLogger.info(`Retrying ${failedChunks.length} failed chunks`, { filePath });
            for (const failedChunk of failedChunks) {
                const { index, content } = failedChunk;

                // Estimate tokens for each chunk
                const estimatedTokens = this.geminiService.estimateTokens(content);
                this.tokenPerMinuteCount += estimatedTokens;

                try {
                    // Generate embedding
                    const embedding = await this.geminiService.generateEmbedding(content);

                    // Add chunk to list
                    chunksWithEmbeddings.push({
                        index,
                        content,
                        embedding
                    });
                    dataLogger.info("Retry successful for chunk", { filePath, chunkIndex: index });
                } catch (error) {
                    dataLogger.warn("Retry failed for chunk, skipping", { filePath, chunkIndex: index, error });
                }
            }
        }

        // Store chunks
        if (chunksWithEmbeddings.length > 0) {
            await this.vectorStoreService.upsertCodeChunks(codeFile.id, chunksWithEmbeddings);
        }

        // Log successful indexing of this file
        dataLogger.info("File indexed successfully", {
            filePath,
            totalChunks: chunks.length,
            successfulChunks: chunksWithEmbeddings.length
        });
    }


    /**
     * Check the token limit 
     * @returns A promise that resolves when the token limit is checked
     */
    private async checkTokenLimit() {
        await new Promise(resolve => setInterval(() => {
            messageLogger.warn(`Token count for minute: ${this.tokenPerMinuteCount}`);
            resolve(true);
            this.tokenPerMinuteCount = 0;
        }, 60000));
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
                chunkSize: 3000,
                chunkOverlap: 200
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
        // Check if the file is a Jupyter Notebook
        if (!filePath.toLowerCase().endsWith(".ipynb")) {
            return content;
        }

        try {
            // Parse the notebook JSON
            const notebook = JSON.parse(content);
            if (!notebook.cells || !Array.isArray(notebook.cells)) return content;

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
        } catch {
            dataLogger.warn("Notebook parsing failed, using raw JSON", { filePath });
            return content;
        }
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
        // Configuration & Build
        ".json", ".yml", ".yaml", ".toml", ".lock", ".config", ".conf",

        // Documentation
        ".md", ".txt", ".rst", ".adoc",

        // Media & Assets
        ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".webp", ".mp4", ".webm",

        // Fonts
        ".woff", ".woff2", ".ttf", ".eot", ".otf",

        // Build artifacts & Dependencies
        ".map", ".min.js", ".min.css",

        // Environment & Secrets
        ".env", ".env.example", ".env.local",

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

        // Database files (often large)
        ".db", ".sqlite", ".sqlite3",

        // OS files
        ".DS_Store", "Thumbs.db", "desktop.ini"
    ];

    /** Directories to ignore for vector DB indexing */
    private ignoredDirs: string[] = [
        // Dependencies
        "node_modules/", ".yarn/", ".pnp/",

        // Build outputs
        "dist/", "build/", ".next/", "out/", ".turbo/",

        // Test coverage
        "coverage/", ".nyc_output/",

        // Cache directories
        ".cache/", ".parcel-cache/", ".eslintcache/",

        // IDE & Editor
        ".vscode/", ".idea/", ".vs/",

        // Version control
        ".git/", ".github/", ".husky/",

        // Package manager
        ".yarn/cache/", ".yarn/unplugged/",

        // Documentation sites
        "docs/public/", "storybook-static/",

        // Test fixtures (often large mock data)
        "__fixtures__/", "fixtures/",

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

        // Python
        "__pycache__/", ".venv/", "venv/", "env/", "virtualenv/",
        ".Python/", "*.egg-info/", ".eggs/", ".pytest_cache/",
        ".tox/", ".hypothesis/", ".mypy_cache/", ".pyre/", ".pytype/",
        "htmlcov/", ".ruff_cache/",

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
        "vendor/", ".well-known/",

        // Examples & Documentation code
        "examples/", "cookbook/", "samples/", "demos/",
        "tutorials/", "guides/", "docs/"
    ];
}
