// ============================================================================
// Raw Code Changes Extractor Service
// Service for extracting comprehensive code changes from pull requests
// ============================================================================

import { OctokitService } from "./octokit.service";
import { RawCodeChanges, FileChange } from "../models/intelligent-context.model";
import { ErrorClass } from "../models/general.model";

/**
 * Service implementation for extracting raw code changes from pull requests
 * Uses existing OctokitService methods to gather comprehensive PR data
 */
export class RawCodeChangesExtractorService {
    
    /**
     * Extract complete code changes from a pull request
     * Combines PR files and PR details to build comprehensive RawCodeChanges object
     */
    async extractCodeChanges(
        installationId: string,
        repositoryName: string,
        prNumber: number
    ): Promise<RawCodeChanges> {
        try {
            // Get PR files and details in parallel for efficiency
            const [prFiles, prDetails] = await Promise.all([
                OctokitService.getPRFiles(installationId, repositoryName, prNumber),
                OctokitService.getPRDetails(installationId, repositoryName, prNumber)
            ]);

            if (!prDetails) {
                throw new ErrorClass(
                    "RawCodeChangesExtractorError",
                    null,
                    `Pull request #${prNumber} not found in repository ${repositoryName}`
                );
            }

            // Build file changes array with enhanced metadata
            const fileChanges: FileChange[] = prFiles.map(file => ({
                filename: file.filename,
                status: this.normalizeFileStatus(file.status),
                additions: file.additions,
                deletions: file.deletions,
                patch: file.patch || "",
                language: this.detectLanguage(file.filename),
                previousFilename: file.previous_filename || undefined
            }));

            // Calculate total changes
            const totalChanges = {
                additions: prFiles.reduce((sum, file) => sum + file.additions, 0),
                deletions: prFiles.reduce((sum, file) => sum + file.deletions, 0),
                filesChanged: prFiles.length
            };

            // Build raw diff from all patches
            const rawDiff = prFiles
                .filter(file => file.patch)
                .map(file => `diff --git a/${file.filename} b/${file.filename}\n${file.patch}`)
                .join("\n\n");

            const rawCodeChanges: RawCodeChanges = {
                prNumber,
                repositoryName,
                totalChanges,
                fileChanges,
                rawDiff
            };

            // Validate the extracted changes
            if (!this.validateCodeChanges(rawCodeChanges)) {
                throw new ErrorClass(
                    "RawCodeChangesExtractorError",
                    null,
                    "Extracted code changes failed validation"
                );
            }

            return rawCodeChanges;

        } catch (error) {
            if (error instanceof ErrorClass) {
                throw error;
            }
            
            throw new ErrorClass(
                "RawCodeChangesExtractorError",
                error as Error,
                `Failed to extract code changes for PR #${prNumber}: ${(error as Error).message}`
            );
        }
    }

    /**
     * Validate extracted code changes for completeness and consistency
     */
    validateCodeChanges(changes: RawCodeChanges): boolean {
        try {
            // Basic structure validation
            if (!changes.prNumber || !changes.repositoryName) {
                console.error("Missing required fields: prNumber or repositoryName");
                return false;
            }

            // Validate total changes consistency
            const calculatedAdditions = changes.fileChanges.reduce((sum, file) => sum + file.additions, 0);
            const calculatedDeletions = changes.fileChanges.reduce((sum, file) => sum + file.deletions, 0);
            
            if (calculatedAdditions !== changes.totalChanges.additions) {
                console.warn(`Addition count mismatch: calculated ${calculatedAdditions}, reported ${changes.totalChanges.additions}`);
            }
            
            if (calculatedDeletions !== changes.totalChanges.deletions) {
                console.warn(`Deletion count mismatch: calculated ${calculatedDeletions}, reported ${changes.totalChanges.deletions}`);
            }

            if (changes.fileChanges.length !== changes.totalChanges.filesChanged) {
                console.warn(`File count mismatch: actual ${changes.fileChanges.length}, reported ${changes.totalChanges.filesChanged}`);
            }

            // Validate file changes
            for (const fileChange of changes.fileChanges) {
                if (!fileChange.filename) {
                    console.error("File change missing filename");
                    return false;
                }
                
                if (!["added", "modified", "removed", "renamed"].includes(fileChange.status)) {
                    console.error(`Invalid file status: ${fileChange.status}`);
                    return false;
                }
                
                if (fileChange.additions < 0 || fileChange.deletions < 0) {
                    console.error(`Invalid addition/deletion counts for ${fileChange.filename}`);
                    return false;
                }
            }

            // Validate raw diff exists if there are changes
            if (changes.fileChanges.length > 0 && !changes.rawDiff) {
                console.warn("No raw diff content found despite file changes");
            }

            return true;

        } catch (error) {
            console.error("Error during code changes validation:", error);
            return false;
        }
    }

    /**
     * Generate a human-readable summary of the code changes
     */
    getChangesSummary(changes: RawCodeChanges): string {
        const { totalChanges, fileChanges } = changes;
        
        // Count files by status
        const statusCounts = fileChanges.reduce((counts, file) => {
            counts[file.status] = (counts[file.status] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        // Count files by language
        const languageCounts = fileChanges.reduce((counts, file) => {
            const lang = file.language || "unknown";
            counts[lang] = (counts[lang] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);

        // Build summary parts
        const parts: string[] = [];
        
        // Overall changes
        parts.push(`${totalChanges.filesChanged} files changed`);
        if (totalChanges.additions > 0) {
            parts.push(`${totalChanges.additions} additions(+)`);
        }
        if (totalChanges.deletions > 0) {
            parts.push(`${totalChanges.deletions} deletions(-)`);
        }

        // File status breakdown
        const statusParts: string[] = [];
        if (statusCounts.added) statusParts.push(`${statusCounts.added} added`);
        if (statusCounts.modified) statusParts.push(`${statusCounts.modified} modified`);
        if (statusCounts.removed) statusParts.push(`${statusCounts.removed} removed`);
        if (statusCounts.renamed) statusParts.push(`${statusCounts.renamed} renamed`);
        
        if (statusParts.length > 0) {
            parts.push(`(${statusParts.join(", ")})`);
        }

        // Language breakdown (top 3)
        const topLanguages = Object.entries(languageCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([lang, count]) => `${count} ${lang}`)
            .join(", ");
        
        if (topLanguages) {
            parts.push(`Languages: ${topLanguages}`);
        }

        return parts.join(", ");
    }

    /**
     * Normalize GitHub file status to our standard format
     */
    private normalizeFileStatus(status: string): "added" | "modified" | "removed" | "renamed" {
        switch (status.toLowerCase()) {
        case "added":
            return "added";
        case "modified":
        case "changed":
            return "modified";
        case "removed":
        case "deleted":
            return "removed";
        case "renamed":
            return "renamed";
        default:
            console.warn(`Unknown file status: ${status}, defaulting to 'modified'`);
            return "modified";
        }
    }

    /**
     * Detect programming language from file extension
     */
    private detectLanguage(filename: string): string {
        const parts = filename.split(".");
        const extension = parts.length > 1 ? parts.pop()?.toLowerCase() : undefined;
        
        const languageMap: Record<string, string> = {
            // JavaScript/TypeScript
            "js": "javascript",
            "jsx": "javascript",
            "ts": "typescript",
            "tsx": "typescript",
            "mjs": "javascript",
            "cjs": "javascript",
            
            // Python
            "py": "python",
            "pyx": "python",
            "pyi": "python",
            
            // Java
            "java": "java",
            "class": "java",
            
            // C/C++
            "c": "c",
            "cpp": "cpp",
            "cc": "cpp",
            "cxx": "cpp",
            "h": "c",
            "hpp": "cpp",
            
            // C#
            "cs": "csharp",
            
            // Go
            "go": "go",
            
            // Rust
            "rs": "rust",
            
            // PHP
            "php": "php",
            
            // Ruby
            "rb": "ruby",
            
            // Swift
            "swift": "swift",
            
            // Kotlin
            "kt": "kotlin",
            "kts": "kotlin",
            
            // Scala
            "scala": "scala",
            "sc": "scala",
            
            // Shell
            "sh": "shell",
            "bash": "shell",
            "zsh": "shell",
            
            // Web
            "html": "html",
            "htm": "html",
            "css": "css",
            "scss": "scss",
            "sass": "sass",
            "less": "less",
            
            // Config/Data
            "json": "json",
            "yaml": "yaml",
            "yml": "yaml",
            "xml": "xml",
            "toml": "toml",
            "ini": "ini",
            "cfg": "config",
            "conf": "config",
            
            // Documentation
            "md": "markdown",
            "markdown": "markdown",
            "rst": "restructuredtext",
            "txt": "text",
            
            // Database
            "sql": "sql",
            
            // Docker
            "dockerfile": "dockerfile",
            
            // Other
            "r": "r",
            "R": "r",
            "pl": "perl",
            "lua": "lua",
            "vim": "vim",
            "ex": "elixir",
            "exs": "elixir",
            "erl": "erlang",
            "hrl": "erlang",
            "clj": "clojure",
            "cljs": "clojure",
            "hs": "haskell",
            "elm": "elm",
            "dart": "dart",
            "f90": "fortran",
            "f95": "fortran",
            "f03": "fortran",
            "f08": "fortran",
            "pas": "pascal",
            "pp": "pascal",
            "asm": "assembly",
            "s": "assembly",
            "S": "assembly"
        };

        // Special cases for files without extensions
        if (!extension) {
            const filename_lower = filename.toLowerCase();
            if (filename_lower === "dockerfile") return "dockerfile";
            if (filename_lower === "makefile") return "makefile";
            if (filename_lower === "rakefile") return "ruby";
            if (filename_lower === "gemfile") return "ruby";
            if (filename_lower === "podfile") return "ruby";
            if (filename_lower.startsWith("jenkinsfile")) return "groovy";
            return "text";
        }

        return languageMap[extension] || "unknown";
    }
}

// Export singleton instance
export const RawCodeChangesExtractor = new RawCodeChangesExtractorService();
