import Groq from "groq-sdk";
import {
    PullRequestData,
    AIReview,
    CodeSuggestion,
    QualityMetrics,
    RelevantFileRecommendation
} from "../models/ai-review.model";
import {
    GroqServiceError,
    GroqRateLimitError,
    GroqContextLimitError,
    ErrorUtils
} from "../models/ai-review.errors";
import { getFieldFromUnknownObject } from "../helper";

/**
 * Implements AI-powered code review.
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
            throw new Error("GROQ_API_KEY environment variable is required");
        }

        this.groqClient = new Groq({
            apiKey
        });

        // Configuration for Groq models
        this.config = {
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            maxTokens: parseInt(process.env.GROQ_MAX_TOKENS || "4096"),
            temperature: parseFloat(process.env.GROQ_TEMPERATURE || "0.0"), // Lower temperature for more consistent JSON
            maxRetries: parseInt(process.env.GROQ_MAX_RETRIES || "3"),
            contextLimit: parseInt(process.env.GROQ_CONTEXT_LIMIT || "8000")
        };
    }

    /**
     * Generates comprehensive AI review for a pull request
     */
    async generateReview(
        prData: PullRequestData,
        relevantFiles: RelevantFileRecommendation[]
    ): Promise<AIReview> {
        try {
            // Generate the review using Groq
            const reviewPrompt = this.buildReviewPrompt(prData, relevantFiles);
            const aiResponse = await this.callGroqAPI(reviewPrompt);

            // Parse and validate the response
            const parsedReview = this.parseAIResponse(aiResponse);

            // Validate the review quality
            if (!this.validateAIResponse(parsedReview)) {
                throw new GroqServiceError("AI response validation failed", { response: aiResponse });
            }

            return parsedReview;
        } catch (error) {
            if (error instanceof GroqServiceError) {
                throw error;
            }
            throw ErrorUtils.wrapError(error as Error, "Failed to generate AI review");
        }
    }

    /**
     * Validates AI response quality
     */
    validateAIResponse(review: AIReview): boolean {
        try {
            // Check required fields with more lenient validation
            if (typeof review.mergeScore !== "number" || review.mergeScore < 0 || review.mergeScore > 100) {
                console.warn("Invalid merge score:", review.mergeScore);
                return false;
            }

            if (!review.summary || typeof review.summary !== "string" || review.summary.length < 5) {
                console.warn("Invalid summary:", review.summary);
                return false;
            }

            if (typeof review.confidence !== "number" || review.confidence < 0 || review.confidence > 1) {
                console.warn("Invalid confidence:", review.confidence);
                return false;
            }

            // Validate quality metrics with more lenient checks
            const metrics = review.codeQuality;
            if (!metrics || typeof metrics !== "object") {
                console.warn("Invalid code quality metrics:", metrics);
                return false;
            }

            const requiredMetrics = ["codeStyle", "testCoverage", "documentation", "security", "performance", "maintainability"];

            for (const metric of requiredMetrics) {
                const value = metrics[metric as keyof QualityMetrics];
                if (typeof value !== "number" || value < 0 || value > 100) {
                    console.warn(`Invalid metric ${metric}:`, value);
                    return false;
                }
            }

            // Validate suggestions format (more lenient)
            if (!Array.isArray(review.suggestions)) {
                console.warn("Invalid suggestions array:", review.suggestions);
                return false;
            }

            for (const suggestion of review.suggestions) {
                if (!suggestion || typeof suggestion !== "object") {
                    console.warn("Invalid suggestion object:", suggestion);
                    return false;
                }
                if (!suggestion.file || !suggestion.description || !suggestion.type || !suggestion.severity) {
                    console.warn("Missing required suggestion fields:", suggestion);
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error("Error validating AI response:", error);
            return false;
        }
    }

    /**
     * Handles rate limiting with exponential backoff
     */
    async handleRateLimit<T>(operation: () => Promise<T>, maxRetries: number = this.config.maxRetries): Promise<T> {
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
     * Builds the main review prompt for Groq
     */
    private buildReviewPrompt(
        prData: PullRequestData,
        relevantFiles: RelevantFileRecommendation[]
    ): string {
        const fileInfoList = relevantFiles.map((file, index) => {
            return `FILE ${index + 1}: ${file.filePath}\n
                Reason for inclusion: ${file.reason || "N/A"}\n
                ---CONTENT START---\n
                ${file.content}\n
                ---CONTENT END---`;
        }).join("\n\n");

        return `You are an expert code reviewer analyzing a pull request. Provide a comprehensive review with specific, actionable feedback.

${prData.formattedPullRequest}

CONTEXTUAL FILES:
The following files were fetched to provide context for this pull request review:
${fileInfoList}

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
     * Calls Groq API with error handling and retries
     */
    async callGroqAPI(prompt: string): Promise<string> {
        return this.handleRateLimit(async () => {
            try {
                const completion = await this.groqClient.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a code review assistant. You MUST respond with valid JSON only. No additional text, explanations, or markdown formatting. Your response must be a valid JSON object that can be parsed directly."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: this.config.model,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature
                });

                const content = completion.choices[0]?.message?.content;
                if (!content) {
                    throw new GroqServiceError("Empty response from Groq API");
                }

                return content;
            } catch (error) {
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");
                const errorMessage = getFieldFromUnknownObject<string>(error, "message");
                const errorHeaders = getFieldFromUnknownObject<Record<string, unknown>>(error, "headers");

                // Handle specific Groq API errors
                if (errorStatus === 429) {
                    const retryAfter = errorHeaders?.["retry-after"] ? parseInt(errorHeaders["retry-after"] as string) : undefined;
                    throw new GroqRateLimitError("Groq API rate limit exceeded", retryAfter, error);
                }

                if (errorStatus === 413 || errorMessage?.includes("context_length_exceeded")) {
                    throw new GroqContextLimitError(
                        this.estimateTokens(prompt),
                        this.config.contextLimit,
                        error
                    );
                }

                throw new GroqServiceError(`Groq API error: ${errorMessage}`, error);
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
            cleanResponse = cleanResponse.replace(/```json\s*/g, "").replace(/```\s*/g, "");

            // Try multiple JSON extraction strategies
            let jsonString = "";

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
                    const lines = cleanResponse.split("\n");
                    const jsonLines = [];
                    let inJson = false;

                    for (const line of lines) {
                        if (line.trim().startsWith("{")) {
                            inJson = true;
                        }
                        if (inJson) {
                            jsonLines.push(line);
                        }
                        if (line.trim().endsWith("}") && inJson) {
                            break;
                        }
                    }

                    if (jsonLines.length > 0) {
                        jsonString = jsonLines.join("\n");
                    }
                }
            }

            if (!jsonString) {
                throw new Error("No JSON found in response");
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
                summary: typeof parsed.summary === "string" ? parsed.summary : "AI review completed",
                confidence: this.validateNumber(parsed.confidence, 0, 1, 0.5)
            };
        } catch (error) {
            console.error("Error parsing AI response:", error);
            console.error("Raw response:", response);

            // Try to extract meaningful information from the text response as fallback
            const fallbackReview = this.extractFallbackReview(response);
            return fallbackReview;
        }
    }

    /**
     * Validates and clamps a number within a range
     */
    private validateNumber(value: unknown, min: number, max: number, defaultValue: number): number {
        if (typeof value === "number" && !isNaN(value)) {
            return Math.max(min, Math.min(max, value));
        }
        return defaultValue;
    }

    /**
     * Validates a suggestion object
     */
    private validateSuggestion(suggestion: CodeSuggestion): CodeSuggestion {
        return {
            file: typeof suggestion.file === "string" ? suggestion.file : "unknown",
            lineNumber: typeof suggestion.lineNumber === "number" ? suggestion.lineNumber : undefined,
            type: ["improvement", "fix", "optimization", "style"].includes(suggestion.type) ? suggestion.type : "improvement",
            severity: ["low", "medium", "high"].includes(suggestion.severity) ? suggestion.severity : "medium",
            description: typeof suggestion.description === "string" ? suggestion.description : "No description provided",
            suggestedCode: typeof suggestion.suggestedCode === "string" ? suggestion.suggestedCode : undefined,
            reasoning: typeof suggestion.reasoning === "string" ? suggestion.reasoning : "No reasoning provided"
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
            suggestionMatches.slice(0, 3).forEach((match) => {
                suggestions.push({
                    file: "extracted_from_text",
                    type: "improvement",
                    severity: "medium",
                    description: match.replace(/(?:suggestion|fix|improvement)[:\s]*/i, "").trim(),
                    reasoning: "Extracted from AI text response"
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
            summary: response.length > 200 ? `${response.substring(0, 200)  }...` : response,
            confidence: 0.3 // Lower confidence for fallback parsing
        };
    }

    /**
     * Formats PR data for context
     */
    private formatPRData(prData: PullRequestData): string {
        const changedFilesInfo = prData.changedFiles.map(file =>
            `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`
        ).join("\n");

        const linkedIssuesInfo = prData.linkedIssues.map(issue =>
            `- #${issue.number}: ${issue.title} (${issue.linkType})`
        ).join("\n");

        return `PULL REQUEST ANALYSIS:
Title: ${prData.title}
Author: ${prData.author}
Repository: ${prData.repositoryName}
PR Number: #${prData.prNumber}

Description:
${prData.body || "No description provided"}

Changed Files:
${changedFilesInfo}

Linked Issues:
${linkedIssuesInfo}

File Changes Details:
${prData.changedFiles.map(file =>
        `\n--- ${file.filename} ---\n${file.patch?.substring(0, 1000) || "No patch available"}`
    ).join("\n")}`;
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
    private isRateLimitError(error: unknown): boolean {
        const errorStatus = getFieldFromUnknownObject<number>(error, "status");
        const errorMessage = getFieldFromUnknownObject<string>(error, "message");
        return error instanceof GroqRateLimitError ||
            (errorStatus === 429) ||
            Boolean(errorMessage && errorMessage.includes("rate limit"));
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
