import { getFieldFromUnknownObject } from "../helper";
import { ErrorClass } from "../models/general.model";
import { RepositoryStructure, DirectoryNode } from "../models/intelligent-context.model";
import { OctokitService } from "./octokit.service";

/**
 * Repository File Path Service
 * 
 * Implements intelligent repository structure analysis by:
 * - Using existing OctokitService.getAllFilePathsFromTree method
 * - Analyzing file structure to categorize files by language and directory
 * - Building comprehensive RepositoryStructure object with file organization data
 * - Providing error handling for empty repositories and API failures
 */
export class RepositoryFilePathService {
    
    /**
     * Get comprehensive repository structure with file organization data
     */
    async getRepositoryStructure(
        installationId: string,
        repositoryName: string,
        branch?: string
    ): Promise<RepositoryStructure> {
        try {
            // Use existing OctokitService method to get all file paths
            const filePaths = await OctokitService.getAllFilePathsFromTree(
                installationId,
                repositoryName,
                branch
            );

            // Handle empty repository case
            if (!filePaths || filePaths.length === 0) {
                return this.createEmptyRepositoryStructure();
            }

            // Analyze and categorize the file structure
            const filesByLanguage = this.categorizeFilesByLanguage(filePaths);
            const directoryStructure = this.analyzeFileStructure(filePaths);

            return {
                totalFiles: filePaths.length,
                filePaths,
                filesByLanguage,
                directoryStructure
            };

        } catch (error) {
            const errorStatus = getFieldFromUnknownObject<number>(error, "status");
            const errorMessage = getFieldFromUnknownObject<string>(error, "message");
            
            // Handle specific error cases
            if (errorMessage?.includes("empty")) {
                console.log(`Repository ${repositoryName} is empty, returning empty structure`);
                return this.createEmptyRepositoryStructure();
            }

            if (errorStatus === 404) {
                throw new ErrorClass(
                    "RepositoryFilePathServiceError",
                    error,
                    `Repository ${repositoryName} not found or not accessible`
                );
            }

            if (errorStatus === 403) {
                throw new ErrorClass(
                    "RepositoryFilePathServiceError", 
                    error,
                    `Access denied to repository ${repositoryName}`
                );
            }

            // Handle API failures with detailed error information
            throw new ErrorClass(
                "RepositoryFilePathServiceError",
                error,
                `Failed to retrieve repository structure for ${repositoryName}: ${errorMessage}`
            );
        }
    }

    /**
     * Analyze file structure and build directory tree
     */
    analyzeFileStructure(filePaths: string[]): DirectoryNode[] {
        const root: Map<string, DirectoryNode> = new Map();

        for (const filePath of filePaths) {
            const pathParts = filePath.split("/");
            let currentLevel = root;
            let currentPath = "";

            for (let i = 0; i < pathParts.length; i++) {
                const part = pathParts[i];
                const isFile = i === pathParts.length - 1;
                currentPath = currentPath ? `${currentPath}/${part}` : part;

                if (!currentLevel.has(part)) {
                    const node: DirectoryNode = {
                        name: part,
                        path: currentPath,
                        type: isFile ? "file" : "directory",
                        language: isFile ? this.detectLanguage(part) : undefined
                    };

                    if (!isFile) {
                        node.children = [];
                    }

                    currentLevel.set(part, node);
                }

                if (!isFile) {
                    const dirNode = currentLevel.get(part)!;
                    if (!dirNode.children) {
                        dirNode.children = [];
                    }
                    
                    // Create a new map for the next level if it doesn't exist
                    const childrenMap = new Map<string, DirectoryNode>();
                    for (const child of dirNode.children) {
                        childrenMap.set(child.name, child);
                    }
                    currentLevel = childrenMap;
                }
            }
        }

        // Convert map to array and sort
        const rootNodes = Array.from(root.values()).sort((a, b) => {
            // Directories first, then files
            if (a.type !== b.type) {
                return a.type === "directory" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        // Recursively sort children
        this.sortDirectoryChildren(rootNodes);

        return rootNodes;
    }

    /**
     * Categorize files by programming language
     */
    categorizeFilesByLanguage(filePaths: string[]): Record<string, string[]> {
        const filesByLanguage: Record<string, string[]> = {};

        for (const filePath of filePaths) {
            const language = this.detectLanguage(filePath);
            
            if (!filesByLanguage[language]) {
                filesByLanguage[language] = [];
            }
            
            filesByLanguage[language].push(filePath);
        }

        // Sort files within each language category
        Object.keys(filesByLanguage).forEach(language => {
            filesByLanguage[language].sort();
        });

        return filesByLanguage;
    }

    /**
     * Detect programming language from file extension
     */
    private detectLanguage(filename: string): string {
        const extension = filename.split(".").pop()?.toLowerCase();
        
        const languageMap: Record<string, string> = {
            // JavaScript/TypeScript
            "js": "JavaScript",
            "jsx": "JavaScript",
            "ts": "TypeScript",
            "tsx": "TypeScript",
            "mjs": "JavaScript",
            "cjs": "JavaScript",
            
            // Python
            "py": "Python",
            "pyx": "Python",
            "pyi": "Python",
            
            // Java
            "java": "Java",
            "class": "Java",
            
            // C/C++
            "c": "C",
            "cpp": "C++",
            "cc": "C++",
            "cxx": "C++",
            "h": "C/C++",
            "hpp": "C++",
            
            // C#
            "cs": "C#",
            
            // Go
            "go": "Go",
            
            // Rust
            "rs": "Rust",
            
            // PHP
            "php": "PHP",
            
            // Ruby
            "rb": "Ruby",
            
            // Swift
            "swift": "Swift",
            
            // Kotlin
            "kt": "Kotlin",
            "kts": "Kotlin",
            
            // Scala
            "scala": "Scala",
            
            // R
            "r": "R",
            
            // MATLAB
            "m": "MATLAB",
            
            // Shell
            "sh": "Shell",
            "bash": "Shell",
            "zsh": "Shell",
            "fish": "Shell",
            
            // Web
            "html": "HTML",
            "htm": "HTML",
            "css": "CSS",
            "scss": "SCSS",
            "sass": "Sass",
            "less": "Less",
            
            // Data/Config
            "json": "JSON",
            "xml": "XML",
            "yaml": "YAML",
            "yml": "YAML",
            "toml": "TOML",
            "ini": "INI",
            "cfg": "Config",
            "conf": "Config",
            
            // Documentation
            "md": "Markdown",
            "markdown": "Markdown",
            "rst": "reStructuredText",
            "txt": "Text",
            
            // Database
            "sql": "SQL",
            
            // Docker
            "dockerfile": "Dockerfile",
            
            // Other
            "gitignore": "Git",
            "gitattributes": "Git",
            "env": "Environment",
            "lock": "Lock File"
        };

        // Handle special cases for files without extensions
        if (!extension) {
            const filename_lower = filename.toLowerCase();
            if (filename_lower === "dockerfile") return "Dockerfile";
            if (filename_lower === "makefile") return "Makefile";
            if (filename_lower === "rakefile") return "Ruby";
            if (filename_lower === "gemfile") return "Ruby";
            if (filename_lower === "podfile") return "Ruby";
            if (filename_lower.startsWith(".git")) return "Git";
            return "Unknown";
        }

        return languageMap[extension] || "Unknown";
    }

    /**
     * Recursively sort directory children
     */
    private sortDirectoryChildren(nodes: DirectoryNode[]): void {
        for (const node of nodes) {
            if (node.children && node.children.length > 0) {
                node.children.sort((a, b) => {
                    // Directories first, then files
                    if (a.type !== b.type) {
                        return a.type === "directory" ? -1 : 1;
                    }
                    return a.name.localeCompare(b.name);
                });
                
                this.sortDirectoryChildren(node.children);
            }
        }
    }

    /**
     * Create empty repository structure for empty repositories
     */
    private createEmptyRepositoryStructure(): RepositoryStructure {
        return {
            totalFiles: 0,
            filePaths: [],
            filesByLanguage: {},
            directoryStructure: []
        };
    }
}

// Export singleton instance
export const RepositoryFilePath = new RepositoryFilePathService();
