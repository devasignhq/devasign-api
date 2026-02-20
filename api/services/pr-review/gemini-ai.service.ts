import { VertexAI, GenerativeModel } from "@google-cloud/vertexai";
import { VertexAIEmbeddings } from "@langchain/google-vertexai";
import {
    AIReview,
    QualityMetrics,
    ReviewContext,
    FollowUpReviewContext
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
    private embeddingModel: VertexAIEmbeddings;
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
        // Verify required environment variables are present
        if (!process.env.GCP_PROJECT_ID || !process.env.GCP_LOCATION_ID) {
            throw new GeminiServiceError("Missing GCP credentials (GCP_PROJECT_ID, GCP_LOCATION_ID) in environment variables");
        }

        // Initialize Vertex AI with project and location
        const projectId = process.env.GCP_PROJECT_ID;
        const location = process.env.GCP_LOCATION_ID;

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

        this.embeddingModel = new VertexAIEmbeddings({
            model: "gemini-embedding-001",
            location: this.config.location,
            platformType: "gcp",
            authOptions: { projectId: this.config.projectId },
            maxConcurrency: 1,
            maxRetries: 3
        });
    }

    /**
     * Generates comprehensive AI review for a pull request
     */
    async generateReview(context: ReviewContext): Promise<AIReview> {
        try {
            // Generate the review using Gemini
            const reviewPrompt = this.buildReviewPrompt(context);
            const aiResponse = await this.callGeminiAPI(reviewPrompt);

            // Parse the response
            const parsedReview = this.parseAIResponse<AIReview>(aiResponse);
            if (!parsedReview) {
                throw new GeminiServiceError("Failed to parse AI response into JSON", { response: aiResponse });
            }

            // Sanitize the response to handle nullable fields and edge cases
            // before strict validation, so a single bad suggestion doesn't
            // discard an otherwise valid review.
            const sanitized = this.sanitizeAIResponse(parsedReview);

            // Validate the sanitized review
            if (!this.validateAIResponse(sanitized)) {
                throw new GeminiServiceError("AI response validation failed after sanitization", { response: aiResponse });
            }

            return sanitized;
        } catch (error) {
            if (error instanceof GeminiServiceError) {
                throw error;
            }
            throw new GeminiServiceError("Failed to generate AI review", error);
        }
    }

    /**
     * Generates a follow-up AI review when new commits are pushed to an already-reviewed PR.
     * The prompt includes the previous diff, previous review summary, and the new diff so the
     * model can reason step-by-step about what changed and whether earlier concerns were addressed.
     */
    async generateFollowUpReview(context: FollowUpReviewContext): Promise<AIReview> {
        try {
            const prompt = this.buildFollowUpReviewPrompt(context);
            const aiResponse = await this.callGeminiAPI(prompt);

            const parsedReview = this.parseAIResponse<AIReview>(aiResponse);
            if (!parsedReview) {
                throw new GeminiServiceError("Failed to parse follow-up AI response into JSON", { response: aiResponse });
            }

            const sanitized = this.sanitizeAIResponse(parsedReview);

            if (!this.validateAIResponse(sanitized)) {
                throw new GeminiServiceError("Follow-up AI response validation failed after sanitization", { response: aiResponse });
            }

            return sanitized;
        } catch (error) {
            if (error instanceof GeminiServiceError) {
                throw error;
            }
            throw new GeminiServiceError("Failed to generate follow-up AI review", error);
        }
    }

    /**
     * Generates text embeddings for a given string array
     */
    async embedDocuments(documents: string[]): Promise<number[][]> {
        return this.handleRateLimit(async () => {
            try {
                const embeddings = await this.embeddingModel.embedDocuments(documents);

                if (!embeddings) {
                    throw new GeminiServiceError("Failed to generate embeddings");
                }

                return embeddings;
            } catch (error) {
                if (typeof error === "object" && error !== null && "stack" in error) {
                    error.stack = undefined;
                }
                const mainError = getFieldFromUnknownObject(error, "error");
                throw new GeminiServiceError("Failed to generate embedding", mainError || error);
            }
        });
    }

    /**
     * Generates text embeddings for a given string
     */
    async generateEmbedding(text: string): Promise<number[]> {
        return this.handleRateLimit(async () => {
            try {
                const embeddings = await this.embeddingModel.embedQuery(text);

                if (!embeddings) {
                    throw new GeminiServiceError("Failed to generate embedding");
                }

                return embeddings;
            } catch (error) {
                if (typeof error === "object" && error !== null && "stack" in error) {
                    error.stack = undefined;
                }
                const mainError = getFieldFromUnknownObject(error, "error");
                throw new GeminiServiceError("Failed to generate embedding", mainError || error);
            }
        });
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
                // `file`, `lineNumber`, `suggestedCode`, and `language` are nullable
                // per the prompt schema — only description, type, and severity are required.
                if (!suggestion.description || !suggestion.type || !suggestion.severity) {
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
     * Sanitizes a raw parsed AI response to handle nullable fields, clamp
     * out-of-range numbers, and filter out malformed suggestions.
     * This runs before strict validation so minor model quirks don't discard
     * an otherwise valid review.
     */
    private sanitizeAIResponse(review: AIReview): AIReview {
        // Clamp scores to valid range
        review.mergeScore = Math.max(0, Math.min(100, review.mergeScore ?? 0));
        review.confidence = Math.max(0, Math.min(1, review.confidence ?? 0));

        // Clamp quality metrics
        if (review.codeQuality && typeof review.codeQuality === "object") {
            const metrics = review.codeQuality;
            for (const key of Object.keys(metrics) as (keyof typeof metrics)[]) {
                const val = metrics[key];
                if (typeof val === "number") {
                    (metrics[key] as number) = Math.max(0, Math.min(100, val));
                }
            }
        }

        // Filter out suggestions that are missing the truly required fields
        if (Array.isArray(review.suggestions)) {
            review.suggestions = review.suggestions.filter((s) => {
                if (!s || typeof s !== "object") return false;
                if (!s.description || !s.type || !s.severity) {
                    dataLogger.warn("Dropping malformed suggestion during sanitization", { suggestion: s });
                    return false;
                }
                // Normalise nullable/optional fields so downstream code is safe.
                // file is string | null per the interface; the rest are optional (undefined).
                s.file = s.file ?? null;
                s.lineNumber = s.lineNumber ?? undefined;
                s.suggestedCode = s.suggestedCode ?? undefined;
                s.language = s.language ?? undefined;
                return true;
            });
        } else {
            review.suggestions = [];
        }

        return review;
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
    private buildReviewPrompt(context: ReviewContext): string {
        dataLogger.info("Building review prompt", { context });
        const { prData, styleGuide, readme, relevantChunks } = context;

        const chunksInfo = relevantChunks.map((chunk, index) => {
            return `--- CHUNK ${index + 1} (Similarity: ${chunk.similarity.toFixed(2)}) ---\nFile: ${chunk.filePath}\n${chunk.content}\n--- END CHUNK ${index + 1} ---`;
        }).join("\n\n");

        const styleGuideSection = styleGuide ? `\nPROJECT STYLE GUIDE (STRICTLY ADHERE TO THIS):\n${styleGuide}\n` : "";
        const readmeSection = readme ? `\nPROJECT README (Context context):\n${readme.slice(0, 3000)}${readme.length > 3000 ? "\n... (readme truncated)" : ""}\n` : "";

        return `You are a Senior Principal Software Engineer and Security Expert reviewing a pull request.
Your goal is to ensure code quality, security, maintainability, and alignment with the project's architecture and style guides.

=== INPUT CONTEXT ===

${prData.formattedPullRequest}

${readmeSection}
${styleGuideSection}

${(process.env.SKIP_CODE_CHUNKS === "true" || !chunksInfo) ? "" : `=== RELEVANT CODEBASE CHUNKS ===
(These code chunks were retrieved from the indexed codebase using a vector similarity search, e.g.:
prisma.$queryRaw\`
    SELECT cc."id", cc."codeFileId", cc."chunkIndex", cc."content", cf."filePath",
           1 - (cc."embedding" <=> \${embeddingVector}::vector) AS similarity
    FROM "CodeChunk" cc
    JOIN "CodeFile" cf ON cc."codeFileId" = cf."id"
    WHERE cf."installationId" = \${installationId}
      AND cf."repositoryName" = \${repositoryName}
      AND (cc."embedding" <=> \${embeddingVector}::vector) < \${distanceThreshold}
    ORDER BY cc."embedding" <=> \${embeddingVector}::vector ASC
    LIMIT \${limit};
\`)
${chunksInfo || "No relevant code chunks found."}}`}

=== INSTRUCTIONS ===
1. **Analyze the PR**: Understand the goal from the description and linked issues.
2. **Review Changes**: Examine the code changes in \`formattedPullRequest\`.
3. **Apply Context**:
    - Use the **README** to understand the high-level project domain.
    - STRICTLY follow the **STYLE GUIDE** if provided.
    - Use **RELEVANT CODE CHUNKS** to detect inconsistencies, redundant implementations, or broken imports.
4. **Identify Issues**: Prioritize in this order:
    - **Core**: Verify that the PR actually solves the linked issue(s).
    - **Critical**: Security vulnerabilities (SQLi, XSS, etc.), logic bugs, race conditions, broken interfaces.
    - **Important**: Performance bottlenecks (~O(n^2) or worse), poor error handling, missing tests.
    - **Maintainability**: Spaghetti code, poor naming, lack of comments, code duplication.
    - **Style**: Violations of the provided style guide or standard language idioms.

=== OUTPUT REQUIREMENTS ===
- **Merge Score**: 0-100. < 70 implies "Request Changes", > 90 implies "Approve". Be rigorous.
- **Suggestions**:
    - **MUST** be actionable.
    - **MUST** include specific file paths and line numbers.
    - **MUST** provide \`suggestedCode\` for fixes and optimizations.
    - Focus on the *changed* code, but note if changed code breaks existing patterns seen in chunks.
- **Summary**: Very short and concise summary of the review.

=== RESPONSE FORMAT ===
Return ONLY a valid JSON object matching this TypeScript interface. Do not include markdown formatting (ie \`\`\`json or \`\`\`).

{
  "mergeScore": number, // 0-100
  "codeQuality": {
    "codeStyle": number, // 0-100
    "testCoverage": number, // 0-100
    "documentation": number, // 0-100
    "security": number, // 0-100
    "performance": number, // 0-100
    "maintainability": number // 0-100
  },
  "suggestions": [
    {
      "file": string, // Filename
      "lineNumber": number | null, // Line number of the issue
      "type": "improvement" | "fix" | "optimization" | "style",
      "severity": "low" | "medium" | "high",
      "description": string, // Clear explanation
      "suggestedCode": string | null, // The fixed code block
      "language": string | null, // The language of the fixed code block
      "reasoning": string // Why this change is better
    }
  ],
  "summary": string,
  "confidence": number // 0.0 to 1.0
}`;
    }

    /**
     * Builds the follow-up review prompt for Gemini.
     * Instructs the model to think step-by-step, comparing the new diff against
     * the previous diff and the earlier review's feedback.
     */
    private buildFollowUpReviewPrompt(context: FollowUpReviewContext): string {
        dataLogger.info("Building follow-up review prompt", {
            prNumber: context.prData.prNumber,
            repositoryName: context.prData.repositoryName
        });

        const { prData, styleGuide, readme, relevantChunks, previousDiff, previousReviewSummary, previousMergeScore } = context;

        const chunksInfo = relevantChunks.map((chunk, index) => {
            return `--- CHUNK ${index + 1} (Similarity: ${chunk.similarity.toFixed(2)}) ---\nFile: ${chunk.filePath}\n${chunk.content}\n--- END CHUNK ${index + 1} ---`;
        }).join("\n\n");

        const styleGuideSection = styleGuide ? `\nPROJECT STYLE GUIDE (STRICTLY ADHERE TO THIS):\n${styleGuide}\n` : "";
        const readmeSection = readme ? `\nPROJECT README:\n${readme.slice(0, 3000)}${readme.length > 3000 ? "\n... (readme truncated)" : ""}\n` : "";

        const chunksSection = (process.env.SKIP_CODE_CHUNKS === "true" || !chunksInfo)
            ? ""
            : `=== RELEVANT CODEBASE CHUNKS ===
${chunksInfo}`;

        return `You are a Senior Principal Software Engineer and Security Expert performing an **incremental follow-up review** of a pull request.
New commits have been pushed to this PR since the last review. Your task is to evaluate ONLY the new changes in the context of the previous review, determining:
1. Whether the author addressed the concerns raised in the previous review.
2. What new issues (if any) were introduced by the new commits.
3. An updated overall assessment.

=== CHAIN OF THOUGHT — THINK STEP BY STEP ===
Before producing your final JSON output, reason through the following steps internally:

Step 1 — Understand the PR goal:
  Examine the PR title, description, and linked issues to clarify what the PR aims to achieve.

Step 2 — Recall the previous review:
  Read the PREVIOUS DIFF and the PREVIOUS REVIEW SUMMARY.
  Identify the key concerns / suggestions made in the previous review.

Step 3 — Analyse the new changes:
  Read the NEW DIFF carefully.
  For each file changed, determine what the author did.

Step 4 — Cross-reference:
  For each concern from the previous review, determine:
  - Was it addressed? (fully / partially / not at all)
  - Did the fix introduce new problems?

Step 5 — Identify new issues:
  Look for issues in the new diff that were NOT present before and were NOT covered by the previous review.

Step 6 — Score and summarise:
  Produce an updated merge score, code quality metrics, and a concise summary that explicitly calls out:
  - Which previous concerns were resolved.
  - Which previous concerns remain open.
  - Any brand-new issues.

(Do NOT output the chain-of-thought — output ONLY the JSON below.)

=== INPUT CONTEXT ===

${prData.formattedPullRequest}

${readmeSection}
${styleGuideSection}
${chunksSection}

=== PREVIOUS REVIEW ===
Previous Merge Score: ${previousMergeScore}/100

Previous Review Summary:
${previousReviewSummary}

=== PREVIOUS DIFF (changes from the first review cycle) ===
${previousDiff || "(not available)"}

=== NEW DIFF (changes introduced by the latest push) ===
${prData.formattedPullRequest}

=== INSTRUCTIONS ===
1. Focus primarily on the **NEW DIFF**.
2. Explicitly note whether each concern from the **PREVIOUS REVIEW SUMMARY** was addressed.
3. Do NOT re-report issues that were fully fixed; DO report issues that are still present or worsened.
4. Identify any **new** issues introduced by the latest commits.
5. Prioritise in this order:
    - **Core**: Does the new diff still make progress towards solving the linked issue(s)?
    - **Critical**: Security vulnerabilities, logic bugs, race conditions.
    - **Important**: Performance, error handling, missing tests.
    - **Maintainability**: Code clarity, duplication, naming.
    - **Style**: Style guide violations.

=== OUTPUT REQUIREMENTS ===
- **Merge Score**: Updated 0-100 score reflecting the PR state after the new push.
- **Suggestions**: Only actionable suggestions on the NEW code or STILL-OPEN previous concerns.
- **Summary**: Concise summary that covers (a) what was fixed since the last review, (b) remaining issues, (c) new issues.

=== RESPONSE FORMAT ===
Return ONLY a valid JSON object matching this TypeScript interface. Do not include markdown formatting (like \`\`\`json).

{
  "mergeScore": number, // 0-100
  "codeQuality": {
    "codeStyle": number, // 0-100
    "testCoverage": number, // 0-100
    "documentation": number, // 0-100
    "security": number, // 0-100
    "performance": number, // 0-100
    "maintainability": number // 0-100
  },
  "suggestions": [
    {
      "file": string, // Filename
      "lineNumber": number | null, // Line number of the issue
      "type": "improvement" | "fix" | "optimization" | "style",
      "severity": "low" | "medium" | "high",
      "description": string, // Clear explanation
      "suggestedCode": string | null, // The fixed code block
      "language": string | null, // The language of the fixed code block
      "reasoning": string // Why this change is better
    }
  ],
  "summary": string,
  "confidence": number // 0.0 to 1.0
}`;
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

            const raw = response.trim();

            // ----------------------------------------------------------------
            // Strategy 1: Gemini wrapped the JSON in a markdown fence.
            // Extract ONLY the text between the opening ```(json)? and the
            // very last ``` so that backtick sequences *inside* field values
            // (e.g. suggestedCode blocks) are left untouched.
            // ----------------------------------------------------------------
            const fenceMatch = raw.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
            if (fenceMatch) {
                try {
                    return JSON.parse(fenceMatch[1]) as T;
                } catch {
                    // Fell through — try brute-force extraction below
                }
            }

            // ----------------------------------------------------------------
            // Strategy 2: The response is already valid JSON (no fence).
            // ----------------------------------------------------------------
            try {
                return JSON.parse(raw) as T;
            } catch {
                // Not clean JSON — continue
            }

            // ----------------------------------------------------------------
            // Strategy 3: Find the outermost { … } block using brace counting
            // so we don't accidentally grab a truncated partial object.
            // ----------------------------------------------------------------
            const start = raw.indexOf("{");
            if (start !== -1) {
                let depth = 0;
                let end = -1;
                let inString = false;
                let escape = false;

                for (let i = start; i < raw.length; i++) {
                    const ch = raw[i];

                    if (escape) { escape = false; continue; }
                    if (ch === "\\" && inString) { escape = true; continue; }
                    if (ch === "\"") { inString = !inString; continue; }
                    if (inString) continue;

                    if (ch === "{") depth++;
                    else if (ch === "}") {
                        depth--;
                        if (depth === 0) { end = i; break; }
                    }
                }

                if (end !== -1) {
                    try {
                        return JSON.parse(raw.slice(start, end + 1)) as T;
                    } catch {
                        // Still invalid — fall through to null
                    }
                }
            }

            throw new Error("No valid JSON found in response");
        } catch (error) {
            dataLogger.error("Error parsing AI response", { error, rawResponse: response });
            return null;
        }
    }

    /**
     * Estimates token count for content (rough approximation)
     */
    /**
     * Estimates token count for content (rough approximation)
     */
    public estimateTokens(content: string): number {
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
            Boolean(errorMessage && (
                errorMessage.toLowerCase().includes("rate limit") ||
                errorMessage.includes("429") ||
                errorMessage.toLowerCase().includes("quota exceeded") ||
                errorMessage.toLowerCase().includes("resource exhausted")
            ));
    }

    /**
     * Sleep utility for delays
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
