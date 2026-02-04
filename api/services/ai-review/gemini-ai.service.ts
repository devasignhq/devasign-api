import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import {
    PullRequestData,
    AIReview,
    QualityMetrics,
    RelevantFileRecommendation
} from "../../models/ai-review.model";
import {
    GeminiServiceError,
    GeminiRateLimitError,
    GeminiContextLimitError,
    ErrorUtils
} from "../../models/error.model";
import { getFieldFromUnknownObject } from "../../utilities/helper";
import { dataLogger, messageLogger } from "../../config/logger.config";

/**
 * Implements AI-powered code review using Google's Vertex AI (Gemini).
 */
export class GeminiAIService {
    private vertexAI: VertexAI;
    private model: GenerativeModel;
    private readonly config: {
        model: string;
        maxTokens: number;
        temperature: number;
        maxRetries: number;
        contextLimit: number;
        projectId: string;
        location: string;
    };

    constructor() {
        // Initialize Vertex AI with project and location
        const projectId = process.env.GCP_PROJECT_ID!;
        // const location = process.env.GCP_LOCATION_ID!;
        const location = "us-central1";

        // Configuration for Gemini models
        this.config = {
            model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
            maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "8192"),
            temperature: parseFloat(process.env.GEMINI_TEMPERATURE || "0.0"),
            maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "3"),
            contextLimit: parseInt(process.env.GEMINI_CONTEXT_LIMIT || "1048576"),
            projectId,
            location
        };

        this.vertexAI = new VertexAI({
            project: this.config.projectId,
            location: this.config.location
        });

        this.model = this.vertexAI.getGenerativeModel({
            model: this.config.model,
            generationConfig: {
                maxOutputTokens: this.config.maxTokens,
                temperature: this.config.temperature
                // responseMimeType: "application/json"
            }
        });
    }

    /**
     * Generates comprehensive AI review for a pull request
     */
    async generateReview(
        prData: PullRequestData,
        relevantFiles: RelevantFileRecommendation[]
    ): Promise<AIReview> {
        try {
            // Generate the review using Gemini
            const reviewPrompt = this.buildReviewPrompt(prData, relevantFiles);
            const aiResponse = await this.callGeminiAPI(reviewPrompt);

            // Parse and validate the response
            const parsedReview = this.parseAIResponse<AIReview>(aiResponse);
            if (!parsedReview) {
                throw new GeminiServiceError("AI response validation failed", { response: aiResponse });
            }

            // Validate the review quality
            if (!this.validateAIResponse(parsedReview)) {
                throw new GeminiServiceError("AI response validation failed", { response: aiResponse });
            }

            return parsedReview;
        } catch (error) {
            if (error instanceof GeminiServiceError) {
                throw error;
            }
            throw new GeminiServiceError("Failed to generate AI review", error);
        }
    }

    /**
     * Validates AI response quality
     */
    validateAIResponse(review: AIReview): boolean {
        try {
            // Check required fields with more lenient validation
            if (typeof review.mergeScore !== "number" || review.mergeScore < 0 || review.mergeScore > 100) {
                dataLogger.warn("Invalid merge score", { mergeScore: review.mergeScore });
                return false;
            }

            if (!review.summary || typeof review.summary !== "string" || review.summary.length < 5) {
                dataLogger.warn("Invalid summary", { summary: review.summary });
                return false;
            }

            if (typeof review.confidence !== "number" || review.confidence < 0 || review.confidence > 1) {
                dataLogger.warn("Invalid confidence", { confidence: review.confidence });
                return false;
            }

            // Validate quality metrics with more lenient checks
            const metrics = review.codeQuality;
            if (!metrics || typeof metrics !== "object") {
                dataLogger.warn("Invalid code quality metrics", { metrics });
                return false;
            }

            const requiredMetrics = ["codeStyle", "testCoverage", "documentation", "security", "performance", "maintainability"];

            for (const metric of requiredMetrics) {
                const value = metrics[metric as keyof QualityMetrics];
                if (typeof value !== "number" || value < 0 || value > 100) {
                    dataLogger.warn(`Invalid metric ${metric}`, { value });
                    return false;
                }
            }

            // Validate suggestions format (more lenient)
            if (!Array.isArray(review.suggestions)) {
                dataLogger.warn("Invalid suggestions array", { suggestions: review.suggestions });
                return false;
            }

            for (const suggestion of review.suggestions) {
                if (!suggestion || typeof suggestion !== "object") {
                    dataLogger.warn("Invalid suggestion object", { suggestion });
                    return false;
                }
                if (!suggestion.file || !suggestion.description || !suggestion.type || !suggestion.severity) {
                    dataLogger.warn("Missing required suggestion fields", { suggestion });
                    return false;
                }
            }

            return true;
        } catch (error) {
            dataLogger.error("Error validating AI response", { error });
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
                    messageLogger.info(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
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
     * Builds the main review prompt for Gemini
     */
    private buildReviewPrompt(
        prData: PullRequestData,
        relevantFiles: RelevantFileRecommendation[]
    ): string {
        const fileInfoList = relevantFiles.map((file, index) => {
            return file.content ? `FILE ${index + 1}: ${file.filePath}\n
                Reason for inclusion: ${file.reason || "N/A"}\n
                ---CONTENT START---\n
                ${file.content}\n
                ---CONTENT END---` : "";
        }).join("\n\n");

        return `You are an expert code reviewer analyzing a pull request. Provide a concise review with specific, actionable feedback.

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
     * Calls Gemini API with error handling and retries
     */
    async callGeminiAPI(prompt: string): Promise<string> {
        return this.handleRateLimit(async () => {
            try {
                const result = await this.model.generateContent(prompt);
                const response = await result.response;

                const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

                if (!text) {
                    throw new GeminiServiceError("Empty response from Gemini API");
                }

                return text;
            } catch (error) {
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");
                const errorMessage = getFieldFromUnknownObject<string>(error, "message");

                // Handle specific Gemini API errors
                if (errorStatus === 429 || errorMessage?.includes("429")) {
                    throw new GeminiRateLimitError("Gemini API rate limit exceeded", undefined, error);
                }

                if (errorMessage?.includes("context") || errorMessage?.includes("token")) {
                    throw new GeminiContextLimitError(
                        this.estimateTokens(prompt),
                        this.config.contextLimit,
                        error
                    );
                }

                throw new GeminiServiceError(`Gemini API error: ${errorMessage}`, error);
            }
        });
    }

    /**
     * Parses AI response into structured review
     */
    parseAIResponse<T>(response: string): T | null {
        try {
            dataLogger.debug("ai-response", { response });

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

            return parsed as T;
        } catch (error) {
            dataLogger.error("Error parsing AI response", { error, rawResponse: response });

            return null;
        }
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
        return error instanceof GeminiRateLimitError ||
            (errorStatus === 429) ||
            Boolean(errorMessage && errorMessage.includes("rate limit")) ||
            Boolean(errorMessage && errorMessage.includes("429"));
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
