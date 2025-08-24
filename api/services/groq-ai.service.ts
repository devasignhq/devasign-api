import Groq from 'groq-sdk';
import {
    PullRequestData,
    RelevantContext,
    AIReview,
    CodeAnalysis,
    RuleEvaluation,
    CodeSuggestion,
    QualityMetrics,
    ComplexityMetrics
} from '../models/ai-review.model';
import { MergeScoreService } from './merge-score.service';
import { ContextWindow } from '../models/ai-review.types';
import {
    GroqServiceError,
    GroqRateLimitError,
    GroqContextLimitError,
    ErrorUtils
} from '../models/ai-review.errors';

/**
 * Groq AI Integration Service
 * Implements AI-powered code review using Groq's free models
 * Requirements: 7.1, 7.2, 7.3, 4.1
 */
export class GroqAIService {
    private groqClient: Groq;
    private readonly config: {
        model: string;
        maxTokens: number;
        temperature: number;
        maxRetries: number;
        contextLimit: number;
    };

    constructor() {
        // Initialize Groq client with API key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error('GROQ_API_KEY environment variable is required');
        }

        this.groqClient = new Groq({
            apiKey: apiKey,
        });

        // Configuration for Groq models
        this.config = {
            model: process.env.GROQ_MODEL || 'llama3-8b-8192', // Free model
            maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || '4096'),
            temperature: parseFloat(process.env.GROQ_TEMPERATURE || '0.0'), // Lower temperature for more consistent JSON
            maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || '3'),
            contextLimit: parseInt(process.env.GROQ_CONTEXT_LIMIT || '8000')
        };
    }

    /**
     * Generates comprehensive AI review for a pull request
     * Requirement 7.1: System shall use Groq's free model endpoints
     * Requirement 4.1: System shall provide specific, actionable code suggestions
     */
    async generateReview(prData: PullRequestData, context: RelevantContext): Promise<AIReview> {
        try {
            // Build context window with priority-based content
            const contextWindow = this.buildContextWindow(prData, context);

            // Generate the review using Groq
            const reviewPrompt = this.buildReviewPrompt(prData, contextWindow);
            const aiResponse = await this.callGroqAPI(reviewPrompt);

            // Parse and validate the response
            const parsedReview = this.parseAIResponse(aiResponse);

            // Validate the review quality
            if (!this.validateAIResponse(parsedReview)) {
                throw new GroqServiceError('AI response validation failed', { response: aiResponse });
            }

            return parsedReview;
        } catch (error) {
            if (error instanceof GroqServiceError) {
                throw error;
            }
            throw ErrorUtils.wrapError(error as Error, 'Failed to generate AI review');
        }
    }

    /**
     * Calculates merge score based on analysis and rule evaluation
     * Requirement 2.1: System shall generate merge score between 0 and 100
     */
    calculateMergeScore(analysis: CodeAnalysis, ruleEvaluation: RuleEvaluation): number {
        return MergeScoreService.calculateMergeScore(analysis, ruleEvaluation);
    }

    /**
     * Generates specific code suggestions
     * Requirement 4.2: System shall include line numbers and file references
     */
    async generateSuggestions(prData: PullRequestData, context: RelevantContext): Promise<CodeSuggestion[]> {
        try {
            const contextWindow = this.buildContextWindow(prData, context);
            const suggestionsPrompt = this.buildSuggestionsPrompt(prData, contextWindow);

            const aiResponse = await this.callGroqAPI(suggestionsPrompt);
            const suggestions = this.parseSuggestions(aiResponse);

            return suggestions;
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return []; // Return empty array on error to allow graceful degradation
        }
    }

    /**
     * Validates AI response quality
     * Requirement 7.3: System shall validate AI responses
     */
    validateAIResponse(review: AIReview): boolean {
        try {
            // Check required fields with more lenient validation
            if (typeof review.mergeScore !== 'number' || review.mergeScore < 0 || review.mergeScore > 100) {
                console.warn('Invalid merge score:', review.mergeScore);
                return false;
            }

            if (!review.summary || typeof review.summary !== 'string' || review.summary.length < 5) {
                console.warn('Invalid summary:', review.summary);
                return false;
            }

            if (typeof review.confidence !== 'number' || review.confidence < 0 || review.confidence > 1) {
                console.warn('Invalid confidence:', review.confidence);
                return false;
            }

            // Validate quality metrics with more lenient checks
            const metrics = review.codeQuality;
            if (!metrics || typeof metrics !== 'object') {
                console.warn('Invalid code quality metrics:', metrics);
                return false;
            }

            const requiredMetrics = ['codeStyle', 'testCoverage', 'documentation', 'security', 'performance', 'maintainability'];

            for (const metric of requiredMetrics) {
                const value = metrics[metric as keyof QualityMetrics];
                if (typeof value !== 'number' || value < 0 || value > 100) {
                    console.warn(`Invalid metric ${metric}:`, value);
                    return false;
                }
            }

            // Validate suggestions format (more lenient)
            if (!Array.isArray(review.suggestions)) {
                console.warn('Invalid suggestions array:', review.suggestions);
                return false;
            }

            for (const suggestion of review.suggestions) {
                if (!suggestion || typeof suggestion !== 'object') {
                    console.warn('Invalid suggestion object:', suggestion);
                    return false;
                }
                if (!suggestion.file || !suggestion.description || !suggestion.type || !suggestion.severity) {
                    console.warn('Missing required suggestion fields:', suggestion);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Error validating AI response:', error);
            return false;
        }
    }

    /**
     * Handles rate limiting with exponential backoff
     * Requirement 7.2: System shall handle rate limiting gracefully
     */
    async handleRateLimit(operation: () => Promise<any>, maxRetries: number = this.config.maxRetries): Promise<any> {
        let lastError: Error;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Check if it's a rate limit error
                if (this.isRateLimitError(error)) {
                    const delay = ErrorUtils.getRetryDelay(error as Error, attempt);
                    console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
                    await this.sleep(delay);
                    continue;
                }

                // If it's not retryable, throw immediately
                if (!ErrorUtils.isRetryable(error as Error)) {
                    throw error;
                }

                // For other retryable errors, wait and retry
                const delay = ErrorUtils.getRetryDelay(error as Error, attempt);
                await this.sleep(delay);
            }
        }

        throw lastError!;
    }

    // ============================================================================
    // Private Helper Methods
    // ============================================================================

    /**
     * Builds context window with priority-based content selection
     */
    private buildContextWindow(prData: PullRequestData, context: RelevantContext): ContextWindow {
        const contextWindow: ContextWindow = {
            maxTokens: this.config.contextLimit,
            currentTokens: 0,
            priority: []
        };

        // Priority 1: PR data (always include)
        const prContent = this.formatPRData(prData);
        const prTokens = this.estimateTokens(prContent);
        contextWindow.priority.push({
            type: 'pr_data',
            content: prContent,
            tokens: prTokens,
            priority: 1
        });
        contextWindow.currentTokens += prTokens;

        // Priority 2: Similar PRs (high value context)
        if (context.similarPRs.length > 0) {
            const similarPRsContent = this.formatSimilarPRs(context.similarPRs.slice(0, 3)); // Limit to top 3
            const similarPRsTokens = this.estimateTokens(similarPRsContent);

            if (contextWindow.currentTokens + similarPRsTokens <= contextWindow.maxTokens) {
                contextWindow.priority.push({
                    type: 'similar_prs',
                    content: similarPRsContent,
                    tokens: similarPRsTokens,
                    priority: 2
                });
                contextWindow.currentTokens += similarPRsTokens;
            }
        }

        // Priority 3: Relevant files (code context)
        if (context.relevantFiles.length > 0) {
            const relevantFilesContent = this.formatRelevantFiles(context.relevantFiles.slice(0, 2)); // Limit to top 2
            const relevantFilesTokens = this.estimateTokens(relevantFilesContent);

            if (contextWindow.currentTokens + relevantFilesTokens <= contextWindow.maxTokens) {
                contextWindow.priority.push({
                    type: 'relevant_files',
                    content: relevantFilesContent,
                    tokens: relevantFilesTokens,
                    priority: 3
                });
                contextWindow.currentTokens += relevantFilesTokens;
            }
        }

        // Priority 4: Project standards (lower priority)
        if (context.projectStandards.length > 0) {
            const standardsContent = this.formatProjectStandards(context.projectStandards);
            const standardsTokens = this.estimateTokens(standardsContent);

            if (contextWindow.currentTokens + standardsTokens <= contextWindow.maxTokens) {
                contextWindow.priority.push({
                    type: 'rules',
                    content: standardsContent,
                    tokens: standardsTokens,
                    priority: 4
                });
                contextWindow.currentTokens += standardsTokens;
            }
        }

        return contextWindow;
    }

    /**
     * Builds the main review prompt for Groq
     */
    private buildReviewPrompt(prData: PullRequestData, contextWindow: ContextWindow): string {
        const contextContent = contextWindow.priority
            .sort((a, b) => a.priority - b.priority)
            .map(item => item.content)
            .join('\n\n');

        return `You are an expert code reviewer analyzing a pull request. Provide a comprehensive review with specific, actionable feedback.

CONTEXT:
${contextContent}

TASK:
Analyze this pull request and provide:
1. A merge score (0-100) based on code quality, security, performance, and best practices
2. Quality metrics for: code style, test coverage, documentation, security, performance, maintainability (each 0-100)
3. Specific code suggestions with file names, line numbers (if applicable), and clear descriptions
4. A summary of your findings
5. Your confidence level (0.0-1.0) in this analysis

CRITICAL: You MUST respond with ONLY valid JSON. No additional text, explanations, or formatting outside the JSON.

RESPONSE FORMAT (JSON ONLY):
{
  "mergeScore": <number 0-100>,
  "codeQuality": {
    "codeStyle": <number 0-100>,
    "testCoverage": <number 0-100>,
    "documentation": <number 0-100>,
    "security": <number 0-100>,
    "performance": <number 0-100>,
    "maintainability": <number 0-100>
  },
  "suggestions": [
    {
      "file": "<filename>",
      "lineNumber": <number or null>,
      "type": "<improvement|fix|optimization|style>",
      "severity": "<low|medium|high>",
      "description": "<specific actionable description>",
      "suggestedCode": "<optional code suggestion>",
      "reasoning": "<explanation of why this suggestion is important>"
    }
  ],
  "summary": "<comprehensive summary of the review>",
  "confidence": <number 0.0-1.0>
}

Focus on:
- Security vulnerabilities and best practices
- Code maintainability and readability
- Performance implications
- Test coverage and quality
- Documentation completeness
- Adherence to coding standards

IMPORTANT: Respond with ONLY the JSON object. Do not include any text before or after the JSON.`;
    }

    /**
     * Builds suggestions-specific prompt
     */
    private buildSuggestionsPrompt(prData: PullRequestData, contextWindow: ContextWindow): string {
        const contextContent = contextWindow.priority
            .sort((a, b) => a.priority - b.priority)
            .map(item => item.content)
            .join('\n\n');

        return `You are a senior code reviewer focusing on providing specific, actionable code suggestions for this pull request.

CONTEXT:
${contextContent}

TASK:
Analyze the code changes and provide specific suggestions for improvement. Focus on:
- Code quality and maintainability
- Security best practices
- Performance optimizations
- Bug prevention
- Code style and consistency

RESPONSE FORMAT (JSON array):
[
  {
    "file": "<exact filename>",
    "lineNumber": <specific line number or null>,
    "type": "<improvement|fix|optimization|style>",
    "severity": "<low|medium|high>",
    "description": "<specific, actionable description>",
    "suggestedCode": "<optional improved code snippet>",
    "reasoning": "<clear explanation of why this matters>"
  }
]

Requirements:
- Be specific about file names and line numbers when possible
- Provide clear, actionable descriptions
- Include code examples when helpful
- Explain the reasoning behind each suggestion
- Prioritize high-impact improvements

IMPORTANT: Adhere to the RESPONSE FORMAT. Do not include any text before or after the array.`;
    }

    /**
     * Calls Groq API with error handling and retries
     */
    private async callGroqAPI(prompt: string): Promise<string> {
        return this.handleRateLimit(async () => {
            try {
                const completion = await this.groqClient.chat.completions.create({
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a code review assistant. You MUST respond with valid JSON only. No additional text, explanations, or markdown formatting. Your response must be a valid JSON object that can be parsed directly.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    model: this.config.model,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                });

                const content = completion.choices[0]?.message?.content;
                if (!content) {
                    throw new GroqServiceError('Empty response from Groq API');
                }

                return content;
            } catch (error: any) {
                // Handle specific Groq API errors
                if (error.status === 429) {
                    const retryAfter = error.headers?.['retry-after'] ? parseInt(error.headers['retry-after']) : undefined;
                    throw new GroqRateLimitError('Groq API rate limit exceeded', retryAfter, error);
                }

                if (error.status === 413 || error.message?.includes('context_length_exceeded')) {
                    throw new GroqContextLimitError(
                        this.estimateTokens(prompt),
                        this.config.contextLimit,
                        error
                    );
                }

                throw new GroqServiceError(`Groq API error: ${error.message}`, error);
            }
        });
    }

    /**
     * Parses AI response into structured review
     */
    private parseAIResponse(response: string): AIReview {
        try {
            console.log("ai-response", response);

            // Clean the response - remove any markdown formatting or extra text
            let cleanResponse = response.trim();

            // Remove markdown code blocks if present
            cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');

            // Try multiple JSON extraction strategies
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
                    // Strategy 3: Look for JSON between specific markers or at the end
                    const lines = cleanResponse.split('\n');
                    const jsonLines = [];
                    let inJson = false;

                    for (const line of lines) {
                        if (line.trim().startsWith('{')) {
                            inJson = true;
                        }
                        if (inJson) {
                            jsonLines.push(line);
                        }
                        if (line.trim().endsWith('}') && inJson) {
                            break;
                        }
                    }

                    if (jsonLines.length > 0) {
                        jsonString = jsonLines.join('\n');
                    }
                }
            }

            if (!jsonString) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonString);

            // Ensure all required fields are present with defaults
            return {
                mergeScore: this.validateNumber(parsed.mergeScore, 0, 100, 50),
                codeQuality: {
                    codeStyle: this.validateNumber(parsed.codeQuality?.codeStyle, 0, 100, 50),
                    testCoverage: this.validateNumber(parsed.codeQuality?.testCoverage, 0, 100, 50),
                    documentation: this.validateNumber(parsed.codeQuality?.documentation, 0, 100, 50),
                    security: this.validateNumber(parsed.codeQuality?.security, 0, 100, 50),
                    performance: this.validateNumber(parsed.codeQuality?.performance, 0, 100, 50),
                    maintainability: this.validateNumber(parsed.codeQuality?.maintainability, 0, 100, 50)
                },
                suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(this.validateSuggestion) : [],
                summary: typeof parsed.summary === 'string' ? parsed.summary : 'AI review completed',
                confidence: this.validateNumber(parsed.confidence, 0, 1, 0.5)
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.error('Raw response:', response);

            // Try to extract meaningful information from the text response as fallback
            const fallbackReview = this.extractFallbackReview(response);
            return fallbackReview;
        }
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
     * Validates a suggestion object
     */
    private validateSuggestion(suggestion: any): CodeSuggestion {
        return {
            file: typeof suggestion.file === 'string' ? suggestion.file : 'unknown',
            lineNumber: typeof suggestion.lineNumber === 'number' ? suggestion.lineNumber : undefined,
            type: ['improvement', 'fix', 'optimization', 'style'].includes(suggestion.type) ? suggestion.type : 'improvement',
            severity: ['low', 'medium', 'high'].includes(suggestion.severity) ? suggestion.severity : 'medium',
            description: typeof suggestion.description === 'string' ? suggestion.description : 'No description provided',
            suggestedCode: typeof suggestion.suggestedCode === 'string' ? suggestion.suggestedCode : undefined,
            reasoning: typeof suggestion.reasoning === 'string' ? suggestion.reasoning : 'No reasoning provided'
        };
    }

    /**
     * Extracts meaningful information from non-JSON response as fallback
     */
    private extractFallbackReview(response: string): AIReview {
        // Try to extract merge score from text
        const scoreMatch = response.match(/(?:merge\s*score|score)[:\s]*(\d+)/i);
        const mergeScore = scoreMatch ? parseInt(scoreMatch[1]) : 50;

        // Extract suggestions from text
        const suggestions: CodeSuggestion[] = [];
        const suggestionMatches = response.match(/(?:suggestion|fix|improvement)[:\s]*([^\n]+)/gi);

        if (suggestionMatches) {
            suggestionMatches.slice(0, 3).forEach((match, index) => {
                suggestions.push({
                    file: 'extracted_from_text',
                    type: 'improvement',
                    severity: 'medium',
                    description: match.replace(/(?:suggestion|fix|improvement)[:\s]*/i, '').trim(),
                    reasoning: 'Extracted from AI text response'
                });
            });
        }

        return {
            mergeScore: this.validateNumber(mergeScore, 0, 100, 50),
            codeQuality: {
                codeStyle: 50,
                testCoverage: 40,
                documentation: 30,
                security: 60,
                performance: 50,
                maintainability: 50
            },
            suggestions,
            summary: response.length > 200 ? response.substring(0, 200) + '...' : response,
            confidence: 0.3 // Lower confidence for fallback parsing
        };
    }

    /**
     * Parses suggestions from AI response
     */
    private parseSuggestions(response: string): CodeSuggestion[] {
        try {
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
                return [];
            }

            const parsed = JSON.parse(jsonMatch[0]);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Error parsing suggestions:', error);
            return [];
        }
    }



    /**
     * Formats PR data for context
     */
    private formatPRData(prData: PullRequestData): string {
        const changedFilesInfo = prData.changedFiles.map(file =>
            `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`
        ).join('\n');

        const linkedIssuesInfo = prData.linkedIssues.map(issue =>
            `- #${issue.number}: ${issue.title} (${issue.linkType})`
        ).join('\n');

        return `PULL REQUEST ANALYSIS:
Title: ${prData.title}
Author: ${prData.author}
Repository: ${prData.repositoryName}
PR Number: #${prData.prNumber}

Description:
${prData.body || 'No description provided'}

Changed Files:
${changedFilesInfo}

Linked Issues:
${linkedIssuesInfo}

File Changes Details:
${prData.changedFiles.map(file =>
            `\n--- ${file.filename} ---\n${file.patch?.substring(0, 1000) || 'No patch available'}`
        ).join('\n')}`;
    }

    /**
     * Formats similar PRs for context
     */
    private formatSimilarPRs(similarPRs: any[]): string {
        return `SIMILAR PULL REQUESTS (for context):
${similarPRs.map(pr =>
            `- PR #${pr.prNumber}: ${pr.title} (${pr.outcome}, similarity: ${(pr.similarity * 100).toFixed(1)}%)
  Description: ${pr.description.substring(0, 200)}...
  Review feedback: ${pr.reviewComments.slice(0, 2).join('; ')}`
        ).join('\n\n')}`;
    }

    /**
     * Formats relevant files for context
     */
    private formatRelevantFiles(relevantFiles: any[]): string {
        return `RELEVANT CODEBASE FILES:
${relevantFiles.map(file =>
            `--- ${file.filename} (${file.language}, similarity: ${(file.similarity * 100).toFixed(1)}%) ---
${file.content.substring(0, 800)}...`
        ).join('\n\n')}`;
    }

    /**
     * Formats project standards for context
     */
    private formatProjectStandards(standards: any[]): string {
        return `PROJECT STANDARDS:
${standards.map(standard =>
            `${standard.category}: ${standard.rule}
Description: ${standard.description}
Examples: ${standard.examples.slice(0, 2).join(', ')}`
        ).join('\n\n')}`;
    }

    /**
     * Estimates token count for content (rough approximation)
     */
    private estimateTokens(content: string): number {
        // Rough estimation: ~4 characters per token
        return Math.ceil(content.length / 4);
    }

    /**
     * Checks if error is a rate limit error
     */
    private isRateLimitError(error: any): boolean {
        return error instanceof GroqRateLimitError ||
            (error.status === 429) ||
            (error.message && error.message.includes('rate limit'));
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Groq Client Implementation
 * Provides low-level Groq API access
 */
export class GroqClientImpl {
    private groqService: GroqAIService;

    constructor() {
        this.groqService = new GroqAIService();
    }

    /**
     * Generates chat completion using Groq API
     */
    async generateCompletion(messages: any[], model?: string): Promise<any> {
        const prompt = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
        return this.groqService['callGroqAPI'](prompt);
    }

    /**
     * Checks API status and limits
     */
    async checkStatus(): Promise<{ available: boolean; rateLimitRemaining: number }> {
        try {
            // Simple test call to check if API is available
            await this.generateCompletion([{ role: 'user', content: 'test' }]);
            return { available: true, rateLimitRemaining: 100 }; // Placeholder values
        } catch (error) {
            return { available: false, rateLimitRemaining: 0 };
        }
    }

    /**
     * Waits for rate limit to reset
     */
    async waitForRateLimit(): Promise<void> {
        // Wait for 60 seconds by default
        await new Promise(resolve => setTimeout(resolve, 60000));
    }
}