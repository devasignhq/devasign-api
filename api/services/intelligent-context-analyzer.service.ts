// ============================================================================
// Intelligent Context Analyzer Service
// AI-powered service that determines which repository files are most relevant
// for comprehensive code review based on PR changes and repository structure
// ============================================================================

import { GroqAIService } from './groq-ai.service';
import {
    ContextAnalysisRequest,
    ContextAnalysisResponse,
    RelevantFileRecommendation,
    ContextValidationResult,
    RawCodeChanges,
    isValidContextAnalysisResponse
} from '../models/intelligent-context.model';
import {
    GroqServiceError,
    GroqRateLimitError,
    GroqContextLimitError,
    ErrorUtils
} from '../models/ai-review.errors';

/**
 * Intelligent Context Analyzer Service Implementation
 * Uses AI to determine which files are most relevant for PR review context
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class IntelligentContextAnalyzerService {
    private groqService: GroqAIService;
    private readonly config: {
        maxRecommendedFiles: number;
        minConfidenceThreshold: number;
        analysisTimeout: number;
        maxRetries: number;
        fallbackToHeuristics: boolean;
    };

    constructor(groqService?: GroqAIService) {
        this.groqService = groqService || new GroqAIService();
        
        this.config = {
            maxRecommendedFiles: parseInt(process.env.MAX_RECOMMENDED_FILES || '10'),
            minConfidenceThreshold: parseFloat(process.env.MIN_CONFIDENCE_THRESHOLD || '0.3'),
            analysisTimeout: parseInt(process.env.ANALYSIS_TIMEOUT || '30000'), // 30 seconds
            maxRetries: parseInt(process.env.CONTEXT_ANALYSIS_MAX_RETRIES || '3'),
            fallbackToHeuristics: process.env.FALLBACK_TO_HEURISTICS !== 'false'
        };
    }

    /**
     * Analyzes code changes and repository structure to determine relevant files
     * Requirement 3.1: System shall send code changes and file paths to AI model
     * Requirement 3.2: System shall ask AI which files are needed for optimal review
     */
    async analyzeContextNeeds(request: ContextAnalysisRequest): Promise<ContextAnalysisResponse> {
        try {
            console.log(`Starting context analysis for PR #${request.codeChanges.prNumber} in ${request.codeChanges.repositoryName}`);
            
            // Validate input request
            this.validateAnalysisRequest(request);
            
            // Build specialized prompt for context analysis
            const prompt = this.buildContextPrompt(request);
            
            // Call AI service with timeout and retries
            const aiResponse = await this.callAIWithTimeout(prompt);
            
            // Parse and validate AI response
            const contextAnalysis = this.parseContextResponse(aiResponse);
            
            // Validate the analysis result
            const validation = this.validateContextAnalysis(contextAnalysis);
            if (!validation.isValid) {
                console.warn('Context analysis validation failed:', validation.errors);
                
                if (this.config.fallbackToHeuristics) {
                    return this.generateHeuristicFallback(request, validation.errors);
                } else {
                    throw new GroqServiceError(`Context analysis validation failed: ${validation.errors.join(', ')}`);
                }
            }
            
            console.log(`Context analysis completed: ${contextAnalysis.relevantFiles.length} files recommended with ${(contextAnalysis.confidence * 100).toFixed(1)}% confidence`);
            
            return contextAnalysis;
            
        } catch (error) {
            console.error('Error in context analysis:', error);
            
            // Handle specific error types
            if (error instanceof GroqRateLimitError) {
                console.log('Rate limit hit, falling back to heuristics');
                return this.generateHeuristicFallback(request, ['AI service rate limited']);
            }
            
            if (error instanceof GroqContextLimitError) {
                console.log('Context limit exceeded, trying with reduced context');
                return this.analyzeWithReducedContext(request);
            }
            
            // Fallback to heuristics if enabled
            if (this.config.fallbackToHeuristics) {
                console.log('Falling back to heuristic analysis due to error:', (error as Error).message);
                return this.generateHeuristicFallback(request, [(error as Error).message]);
            }
            
            throw ErrorUtils.wrapError(error as Error, 'Failed to analyze context needs');
        }
    }

    /**
     * Builds specialized prompt for AI context analysis
     * Requirement 3.3: System shall receive list of specific file paths that are relevant
     */
    buildContextPrompt(request: ContextAnalysisRequest): string {
        const { codeChanges, repositoryStructure, prMetadata } = request;
        
        // Format code changes for analysis
        const changedFilesInfo = codeChanges.fileChanges.map(file => 
            `${file.filename} (${file.status}, +${file.additions}/-${file.deletions}, ${file.language || 'unknown'})`
        ).join('\n');
        
        // Format file structure (limit to prevent token overflow)
        const filePathsPreview = repositoryStructure.filePaths.slice(0, 200).join('\n');
        const hasMoreFiles = repositoryStructure.filePaths.length > 200;
        
        // Format languages breakdown
        const languageBreakdown = Object.entries(repositoryStructure.filesByLanguage)
            .map(([lang, files]) => `${lang}: ${files.length} files`)
            .join(', ');
        
        // Format linked issues
        const linkedIssuesInfo = prMetadata.linkedIssues.length > 0 
            ? prMetadata.linkedIssues.map(issue => `#${issue.number}: ${issue.title}`).join(', ')
            : 'None';

        return `You are an expert code reviewer analyzing a pull request to determine which repository files are most relevant for providing comprehensive review context.

PULL REQUEST CHANGES:
Repository: ${codeChanges.repositoryName}
PR #${codeChanges.prNumber}: ${prMetadata.title}
Author: ${prMetadata.author}
Total Changes: +${codeChanges.totalChanges.additions}/-${codeChanges.totalChanges.deletions} across ${codeChanges.totalChanges.filesChanged} files

Description:
${prMetadata.description || 'No description provided'}

Linked Issues: ${linkedIssuesInfo}

CHANGED FILES:
${changedFilesInfo}

CODE CHANGES PREVIEW:
${this.formatCodeChangesPreview(codeChanges)}

REPOSITORY STRUCTURE:
Total files: ${repositoryStructure.totalFiles}
Languages: ${languageBreakdown}

File paths${hasMoreFiles ? ' (first 200)' : ''}:
${filePathsPreview}
${hasMoreFiles ? '\n... and ' + (repositoryStructure.totalFiles - 200) + ' more files' : ''}

TASK:
Analyze the code changes and determine which files from the repository would be most helpful for providing comprehensive review context. Consider:

1. **Dependencies**: Files that the changed code imports, requires, or depends on
2. **Interfaces**: Type definitions, interfaces, contracts, or APIs that the changes implement or modify
3. **Tests**: Existing tests that might be affected, provide context, or need updates
4. **Configuration**: Config files, package.json, tsconfig.json, etc. that might be relevant
5. **Related Logic**: Files with similar functionality, shared utilities, or that work with the changed code
6. **Documentation**: README, docs that might need updates or provide important context

ANALYSIS GUIDELINES:
- Only recommend files that actually exist in the repository file list above
- Limit recommendations to ${this.config.maxRecommendedFiles} most relevant files
- Provide clear reasoning for each recommendation
- Use exact file paths from the repository structure
- Prioritize files that will significantly improve review quality
- Consider the scope and impact of the changes
- If no additional files are needed beyond the changed files, return empty relevantFiles array

RESPONSE FORMAT (JSON only):
{
  "relevantFiles": [
    {
      "filePath": "exact/path/to/file.ext",
      "relevanceScore": 0.9,
      "reason": "This file defines the interface that the changed code implements",
      "category": "interface",
      "priority": "high"
    }
  ],
  "reasoning": "Overall explanation of the analysis approach and key factors considered",
  "confidence": 0.85,
  "analysisType": "comprehensive",
  "estimatedReviewQuality": 85
}

CATEGORIES:
- "dependency": Files that the changed code depends on
- "interface": Type definitions, interfaces, contracts
- "test": Test files that provide context or might be affected
- "config": Configuration files
- "documentation": README, docs, comments
- "related_logic": Files with similar or related functionality

PRIORITIES:
- "high": Critical for understanding the changes
- "medium": Helpful for context
- "low": Nice to have for completeness

IMPORTANT:
- Respond with ONLY the JSON object
- Use exact file paths from the repository structure
- Relevance scores should be between 0.0 and 1.0
- Confidence should be between 0.0 and 1.0
- Estimated review quality should be between 0 and 100
- Analysis type should be "comprehensive", "focused", or "minimal"

IMPORTANT: Respond with ONLY the JSON object. Do not include any text before or after.`;
    }

    /**
     * Parses AI response into structured context analysis
     * Requirement 3.4: System shall parse AI recommendations
     */
    parseContextResponse(response: string): ContextAnalysisResponse {
        try {
            console.log('Parsing AI context analysis response...');
            
            // Clean the response - remove any markdown formatting or extra text
            let cleanResponse = response.trim();
            
            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
            
            // Extract JSON object using multiple strategies
            let jsonString = '';
            
            // Strategy 1: Try to parse the entire response as JSON
            try {
                JSON.parse(cleanResponse);
                jsonString = cleanResponse;
            } catch {
                // Strategy 2: Extract JSON object using regex
                const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonString = jsonMatch[0];
                } else {
                    throw new Error('No JSON found in response');
                }
            }
            
            if (!jsonString) {
                throw new Error('Could not extract JSON from AI response');
            }
            
            const parsed = JSON.parse(jsonString);
            
            // Validate and normalize the response
            const contextAnalysis: ContextAnalysisResponse = {
                relevantFiles: this.validateAndNormalizeRecommendations(parsed.relevantFiles || []),
                reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'AI analysis completed',
                confidence: this.validateNumber(parsed.confidence, 0, 1, 0.5),
                analysisType: this.validateAnalysisType(parsed.analysisType),
                estimatedReviewQuality: this.validateNumber(parsed.estimatedReviewQuality, 0, 100, 50)
            };
            
            // Limit the number of recommendations
            if (contextAnalysis.relevantFiles.length > this.config.maxRecommendedFiles) {
                contextAnalysis.relevantFiles = contextAnalysis.relevantFiles
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .slice(0, this.config.maxRecommendedFiles);
            }
            
            return contextAnalysis;
            
        } catch (error) {
            console.error('Error parsing context analysis response:', error);
            console.error('Raw response:', response);
            
            throw new GroqServiceError(`Failed to parse context analysis response: ${(error as Error).message}`, { response });
        }
    }

    /**
     * Validates context analysis result
     * Requirement 3.5: System shall validate AI recommendations
     */
    validateContextAnalysis(analysis: ContextAnalysisResponse): ContextValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        
        try {
            // Validate basic structure
            if (!isValidContextAnalysisResponse(analysis)) {
                errors.push('Invalid context analysis response structure');
                return { isValid: false, errors, warnings };
            }
            
            // Validate confidence threshold
            if (analysis.confidence < this.config.minConfidenceThreshold) {
                warnings.push(`Low confidence score: ${analysis.confidence}`);
            }
            
            // Validate relevant files
            if (!Array.isArray(analysis.relevantFiles)) {
                errors.push('relevantFiles must be an array');
            } else {
                for (let i = 0; i < analysis.relevantFiles.length; i++) {
                    const file = analysis.relevantFiles[i];
                    const fileErrors = this.validateRecommendation(file, i);
                    errors.push(...fileErrors);
                }
            }
            
            // Validate reasoning
            if (!analysis.reasoning || analysis.reasoning.length < 10) {
                warnings.push('Reasoning is too short or missing');
            }
            
            // Validate estimated review quality
            if (analysis.estimatedReviewQuality < 0 || analysis.estimatedReviewQuality > 100) {
                errors.push('estimatedReviewQuality must be between 0 and 100');
            }
            
            return {
                isValid: errors.length === 0,
                errors,
                warnings
            };
            
        } catch (error) {
            errors.push(`Validation error: ${(error as Error).message}`);
            return { isValid: false, errors, warnings };
        }
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Validates the analysis request
     */
    private validateAnalysisRequest(request: ContextAnalysisRequest): void {
        if (!request.codeChanges || !request.repositoryStructure || !request.prMetadata) {
            throw new Error('Invalid analysis request: missing required fields');
        }
        
        if (!request.codeChanges.fileChanges || request.codeChanges.fileChanges.length === 0) {
            throw new Error('No file changes found in PR');
        }
        
        if (!request.repositoryStructure.filePaths || request.repositoryStructure.filePaths.length === 0) {
            throw new Error('No files found in repository structure');
        }
    }

    /**
     * Calls AI service with timeout handling
     */
    private async callAIWithTimeout(prompt: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Context analysis timed out after ${this.config.analysisTimeout}ms`));
            }, this.config.analysisTimeout);
            
            try {
                // Use the existing GroqAIService's internal method for making API calls
                const response = await (this.groqService as any).callGroqAPI(prompt);
                clearTimeout(timeout);
                resolve(response);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    /**
     * Formats code changes preview for the prompt
     */
    private formatCodeChangesPreview(codeChanges: RawCodeChanges): string {
        return codeChanges.fileChanges.map((file: any) => {
            const patchPreview = file.patch ? file.patch.substring(0, 500) : 'No patch available';
            return `\n--- ${file.filename} (${file.status}) ---\n${patchPreview}${file.patch && file.patch.length > 500 ? '\n...' : ''}`;
        }).join('\n');
    }

    /**
     * Validates and normalizes file recommendations
     */
    private validateAndNormalizeRecommendations(recommendations: any[]): RelevantFileRecommendation[] {
        if (!Array.isArray(recommendations)) {
            return [];
        }
        
        return recommendations
            .filter(rec => rec && typeof rec === 'object')
            .map(rec => ({
                filePath: typeof rec.filePath === 'string' ? rec.filePath : 'unknown',
                relevanceScore: this.validateNumber(rec.relevanceScore, 0, 1, 0.5),
                reason: typeof rec.reason === 'string' ? rec.reason : 'No reason provided',
                category: this.validateCategory(rec.category),
                priority: this.validatePriority(rec.priority)
            }))
            .filter(rec => rec.filePath !== 'unknown'); // Remove invalid file paths
    }

    /**
     * Validates a single file recommendation
     */
    private validateRecommendation(recommendation: RelevantFileRecommendation, index: number): string[] {
        const errors: string[] = [];
        
        if (!recommendation.filePath || typeof recommendation.filePath !== 'string') {
            errors.push(`Recommendation ${index}: missing or invalid filePath`);
        }
        
        if (typeof recommendation.relevanceScore !== 'number' || 
            recommendation.relevanceScore < 0 || recommendation.relevanceScore > 1) {
            errors.push(`Recommendation ${index}: relevanceScore must be between 0 and 1`);
        }
        
        if (!recommendation.reason || typeof recommendation.reason !== 'string') {
            errors.push(`Recommendation ${index}: missing or invalid reason`);
        }
        
        const validCategories = ['dependency', 'interface', 'test', 'config', 'documentation', 'related_logic'];
        if (!validCategories.includes(recommendation.category)) {
            errors.push(`Recommendation ${index}: invalid category '${recommendation.category}'`);
        }
        
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(recommendation.priority)) {
            errors.push(`Recommendation ${index}: invalid priority '${recommendation.priority}'`);
        }
        
        return errors;
    }

    /**
     * Validates and clamps a number within a range
     */
    private validateNumber(value: any, min: number, max: number, defaultValue: number): number {
        if (typeof value === 'number' && !isNaN(value)) {
            return Math.max(min, Math.min(max, value));
        }
        return defaultValue;
    }

    /**
     * Validates analysis type
     */
    private validateAnalysisType(type: any): 'comprehensive' | 'focused' | 'minimal' {
        const validTypes = ['comprehensive', 'focused', 'minimal'];
        return validTypes.includes(type) ? type : 'focused';
    }

    /**
     * Validates recommendation category
     */
    private validateCategory(category: any): RelevantFileRecommendation['category'] {
        const validCategories = ['dependency', 'interface', 'test', 'config', 'documentation', 'related_logic'];
        return validCategories.includes(category) ? category : 'related_logic';
    }

    /**
     * Validates recommendation priority
     */
    private validatePriority(priority: any): RelevantFileRecommendation['priority'] {
        const validPriorities = ['high', 'medium', 'low'];
        return validPriorities.includes(priority) ? priority : 'medium';
    }

    /**
     * Generates heuristic fallback when AI analysis fails
     */
    private generateHeuristicFallback(request: ContextAnalysisRequest, errors: string[]): ContextAnalysisResponse {
        console.log('Generating heuristic fallback for context analysis');
        
        const { codeChanges, repositoryStructure } = request;
        const relevantFiles: RelevantFileRecommendation[] = [];
        
        // Heuristic 1: Look for common configuration files
        const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.js', 'next.config.js', '.env', 'README.md'];
        configFiles.forEach(configFile => {
            if (repositoryStructure.filePaths.includes(configFile)) {
                relevantFiles.push({
                    filePath: configFile,
                    relevanceScore: 0.7,
                    reason: `Common configuration file that might be relevant to the changes`,
                    category: configFile.endsWith('.md') ? 'documentation' : 'config',
                    priority: 'medium'
                });
            }
        });
        
        // Heuristic 2: Look for test files related to changed files
        codeChanges.fileChanges.forEach(changedFile => {
            const baseName = changedFile.filename.replace(/\.[^/.]+$/, ''); // Remove extension
            const testPatterns = [
                `${baseName}.test.ts`,
                `${baseName}.test.js`,
                `${baseName}.spec.ts`,
                `${baseName}.spec.js`,
                `tests/${changedFile.filename}`,
                `__tests__/${changedFile.filename}`
            ];
            
            testPatterns.forEach(pattern => {
                if (repositoryStructure.filePaths.includes(pattern)) {
                    relevantFiles.push({
                        filePath: pattern,
                        relevanceScore: 0.8,
                        reason: `Test file for ${changedFile.filename}`,
                        category: 'test',
                        priority: 'high'
                    });
                }
            });
        });
        
        // Heuristic 3: Look for type definition files
        const typeFiles = repositoryStructure.filePaths.filter(path => 
            path.endsWith('.d.ts') || path.includes('types') || path.includes('interfaces')
        ).slice(0, 3);
        
        typeFiles.forEach(typeFile => {
            relevantFiles.push({
                filePath: typeFile,
                relevanceScore: 0.6,
                reason: 'Type definition file that might provide context',
                category: 'interface',
                priority: 'medium'
            });
        });
        
        // Remove duplicates and limit results
        const uniqueFiles = relevantFiles.filter((file, index, self) => 
            index === self.findIndex(f => f.filePath === file.filePath)
        ).slice(0, this.config.maxRecommendedFiles);
        
        return {
            relevantFiles: uniqueFiles,
            reasoning: `Used heuristic analysis due to AI service issues: ${errors.join(', ')}. Applied common patterns for configuration files, tests, and type definitions.`,
            confidence: 0.3, // Lower confidence for heuristic approach
            analysisType: 'minimal',
            estimatedReviewQuality: 40
        };
    }

    /**
     * Analyzes with reduced context when hitting token limits
     */
    private async analyzeWithReducedContext(request: ContextAnalysisRequest): Promise<ContextAnalysisResponse> {
        console.log('Retrying context analysis with reduced context due to token limits');
        
        // Create a reduced version of the request
        const reducedRequest: ContextAnalysisRequest = {
            ...request,
            repositoryStructure: {
                ...request.repositoryStructure,
                filePaths: request.repositoryStructure.filePaths.slice(0, 100), // Limit to first 100 files
                directoryStructure: [] // Remove directory structure to save tokens
            },
            codeChanges: {
                ...request.codeChanges,
                fileChanges: request.codeChanges.fileChanges.map(file => ({
                    ...file,
                    patch: file.patch.substring(0, 200) // Limit patch size
                }))
            }
        };
        
        try {
            const prompt = this.buildContextPrompt(reducedRequest);
            const aiResponse = await this.callAIWithTimeout(prompt);
            const contextAnalysis = this.parseContextResponse(aiResponse);
            
            // Add note about reduced context
            contextAnalysis.reasoning += ' (Analysis performed with reduced context due to size limitations)';
            contextAnalysis.confidence = Math.max(0.2, contextAnalysis.confidence - 0.2); // Reduce confidence
            
            return contextAnalysis;
        } catch (error) {
            console.error('Reduced context analysis also failed:', error);
            return this.generateHeuristicFallback(request, ['Token limit exceeded', (error as Error).message]);
        }
    }
}