import {
    VertexAI,
    GenerativeModel,
    SchemaType,
    ResponseSchema
} from "@google-cloud/vertexai";
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
        if (!process.env.GCP_PROJECT_ID) {
            throw new GeminiServiceError("Missing GCP credentials (GCP_PROJECT_ID) in environment variables");
        }

        // Configuration for Gemini models
        this.config = {
            model: process.env.GEMINI_MODEL || "gemini-2.5-pro",
            maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || "65536"),
            temperature: parseFloat(process.env.GEMINI_TEMPERATURE || "0.0"),
            maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || "5"),
            contextLimit: parseInt(process.env.GEMINI_CONTEXT_LIMIT || "1048576"),
            projectId: process.env.GCP_PROJECT_ID,
            location: "global"
        };

        // Initialize Vertex AI
        this.vertexAI = new VertexAI({
            project: this.config.projectId,
            location: this.config.location,
            apiEndpoint: "aiplatform.googleapis.com"
        });

        // Initialize Gemini model with Priority PayGo headers
        this.model = this.vertexAI.getGenerativeModel(
            {
                model: this.config.model,
                generationConfig: {
                    maxOutputTokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                    responseMimeType: "application/json",
                    responseSchema: this.getResponseSchema()
                }
            },
            {
                customHeaders: new Headers({
                    "X-Vertex-AI-LLM-Request-Type": "shared",
                    "X-Vertex-AI-LLM-Shared-Request-Type": "priority"
                })
            }
        );
    }

    /**
     * Generates comprehensive AI review for a pull request
     * @param context - The PR review context
     * @returns A promise that resolves to the generated AIReview
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
     * @param context - The follow-up review context
     * @returns A promise that resolves to the generated follow-up AIReview
     */
    async generateFollowUpReview(context: FollowUpReviewContext): Promise<AIReview> {
        try {
            // Generate the follow-up review prompt
            const prompt = this.buildFollowUpReviewPrompt(context);
            const aiResponse = await this.callGeminiAPI(prompt);

            // Parse the response
            const parsedReview = this.parseAIResponse<AIReview>(aiResponse);
            if (!parsedReview) {
                throw new GeminiServiceError("Failed to parse follow-up AI response into JSON", { response: aiResponse });
            }

            // Sanitize the response to handle nullable fields and edge cases
            const sanitized = this.sanitizeAIResponse(parsedReview);

            // Validate the sanitized review
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
     * Validates AI response quality
     * @param review - The AI review to validate
     * @returns True if the AI response is valid, false otherwise
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
     * @param review - The raw AI review response to sanitize
     * @returns The sanitized AI review
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
     * @param operation - The operation to execute
     * @param maxRetries - The maximum number of retries
     * @returns A promise that resolves to the operation result
     */
    async handleRateLimit<T>(operation: () => Promise<T>, maxRetries: number = this.config.maxRetries): Promise<T> {
        let lastError: Error;

        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                // Execute the operation
                return await operation();
            } catch (error) {
                lastError = error as Error;

                // Check if it's a rate limit error and retry after delay
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
        dataLogger.info("Building review prompt", {
            prNumber: context.prData.prNumber,
            repositoryName: context.prData.repositoryName
        });

        const { prData, styleGuide, readme, relevantChunks } = context;

        // Build the chunks info string
        const chunksInfo = relevantChunks.map((chunk, index) => {
            return `--- CHUNK ${index + 1} (Similarity: ${chunk.similarity.toFixed(2)}) ---\nFile: ${chunk.filePath}\n${chunk.content}\n--- END CHUNK ${index + 1} ---`;
        }).join("\n\n");

        // Build the style guide section
        const styleGuideSection = styleGuide ? `\nPROJECT STYLE GUIDE (STRICTLY ADHERE TO THIS):\n${styleGuide}\n` : "";
        const readmeSection = readme ? `\nPROJECT README (Context context):\n${readme.slice(0, 3000)}${readme.length > 3000 ? "\n... (readme truncated)" : ""}\n` : "";

        // Build the final prompt
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
1. **Analyze the PR**: Understand the goal from the description and linked issues (if any).
2. **Review Changes**: Examine the code changes in \`formattedPullRequest\`.
3. **Apply Context**:
    - Use the **README** to understand the high-level project domain.
    - STRICTLY follow the **STYLE GUIDE** if provided.
    - Use **RELEVANT CODE CHUNKS** to detect inconsistencies, redundant implementations, or broken imports.
4. **Identify Issues**: Prioritize in this order:
    - **Core**: Verify that the PR actually solves the linked issue(s) or fulfills the goal described in the PR's title and description.
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
- **Summary**: Very short, concise, and straight to the point summary of the review.

=== REASONING ===
For 'suggestions', include specific file paths, line numbers, and 'suggestedCode'. Do NOT return any markdown formatting outside the JSON block.`;
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

        // Build the chunks info string
        const chunksInfo = relevantChunks.map((chunk, index) => {
            return `--- CHUNK ${index + 1} (Similarity: ${chunk.similarity.toFixed(2)}) ---\nFile: ${chunk.filePath}\n${chunk.content}\n--- END CHUNK ${index + 1} ---`;
        }).join("\n\n");

        // Build the style guide section
        const styleGuideSection = styleGuide ? `\nPROJECT STYLE GUIDE (STRICTLY ADHERE TO THIS):\n${styleGuide}\n` : "";
        const readmeSection = readme ? `\nPROJECT README:\n${readme.slice(0, 3000)}${readme.length > 3000 ? "\n... (readme truncated)" : ""}\n` : "";

        // Build the chunks section
        const chunksSection = (process.env.SKIP_CODE_CHUNKS === "true" || !chunksInfo)
            ? ""
            : `=== RELEVANT CODEBASE CHUNKS ===
${chunksInfo}`;

        // Build the final prompt
        return `You are a Senior Principal Software Engineer and Security Expert performing an **incremental follow-up review** of a pull request.
New commits have been pushed to this PR since the last review. Your task is to evaluate ONLY the new changes in the context of the previous review, determining:
1. Whether the author addressed the concerns raised in the previous review.
2. What new issues (if any) were introduced by the new commits.
3. An updated overall assessment.

=== CHAIN OF THOUGHT — THINK STEP BY STEP ===
Before producing your final JSON output, reason through the following steps internally:

Step 1 — Understand the PR goal:
  Examine the PR title, description, and linked issues (if any) to clarify what the PR aims to achieve.

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
    - **Core**: Does the new diff still make progress towards solving the linked issue(s) or fulfilling the PR's stated goals?
    - **Critical**: Security vulnerabilities, logic bugs, race conditions.
    - **Important**: Performance, error handling, missing tests.
    - **Maintainability**: Code clarity, duplication, naming.
    - **Style**: Style guide violations.

=== OUTPUT REQUIREMENTS ===
- **Merge Score**: Updated 0-100 score reflecting the PR state after the new push.
- **Suggestions**: Only actionable suggestions on the NEW code or STILL-OPEN previous concerns.
- **Summary**: Concise and straight to the point summary that covers (a) what was fixed since the last review, (b) remaining issues, (c) new issues.

=== REASONING ===
For 'suggestions', include specific file paths, line numbers, and 'suggestedCode'. Do NOT return any markdown formatting outside the JSON block.`;
    }

    /**
     * Calls Gemini API with error handling and retries
     */
    async callGeminiAPI(prompt: string): Promise<string> {
        return this.handleRateLimit(async () => {
            try {
                // Call Gemini API
                const { response } = await this.model.generateContent(prompt);

                dataLogger.info(
                    "Gemini API response",
                    { model: this.config.model, usageMetadata: response.usageMetadata }
                );

                // Extract the response text
                const candidate = response.candidates?.[0];
                const text = candidate?.content?.parts?.[0]?.text;

                if (!text) {
                    throw new GeminiServiceError("Empty response from Gemini API");
                }

                // Detect truncated responses — finishReason will be MAX_TOKENS
                // when the model hit the maxOutputTokens limit mid-generation.
                const finishReason = candidate?.finishReason;
                if (finishReason === "MAX_TOKENS") {
                    messageLogger.warn(
                        "Gemini response was truncated (finishReason=MAX_TOKENS). " +
                        "Output tokens may have been insufficient. Attempting JSON repair."
                    );
                }

                return text;
            } catch (error) {
                const errorStatus = getFieldFromUnknownObject<number>(error, "status");
                const errorMessage = getFieldFromUnknownObject<string>(error, "message");

                // Handle specific Gemini API errors
                if (errorStatus === 429 || errorMessage?.includes("429")) {
                    throw new GeminiRateLimitError("Gemini API rate limit exceeded", undefined, error);
                }

                // Handle context limit errors
                if (errorMessage?.includes("context") || errorMessage?.includes("token")) {
                    let tokens = 0;
                    try {
                        tokens = await this.estimateTokens(prompt);
                    } catch (estimationError) {
                        dataLogger.warn("Failed to estimate token count after context limit error", { estimationError });
                        // Fallback to a zero count, but don't let the estimation failure crash the process.
                    }
                    throw new GeminiContextLimitError(
                        tokens,
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
            const fenceMatch = raw.match(/```(?:json)?([\s\S]*?)```/);
            if (fenceMatch) {
                try {
                    return JSON.parse(fenceMatch[1].trim()) as T;
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

                // Parse the JSON
                for (let i = start; i < raw.length; i++) {
                    const ch = raw[i];

                    // Handle escape sequences
                    if (escape) { escape = false; continue; }
                    if (ch === "\\" && inString) { escape = true; continue; }
                    if (ch === "\"") { inString = !inString; continue; }
                    if (inString) continue;

                    // Handle brace counting
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
                        // Still invalid — fall through to repair
                    }
                }

                // ----------------------------------------------------------
                // Strategy 4: JSON was truncated (e.g. due to MAX_TOKENS).
                // Attempt to repair the truncated JSON by closing any open
                // strings, arrays, and objects so we can salvage whatever
                // the model managed to produce.
                // ----------------------------------------------------------
                const truncated = raw.slice(start);
                const repaired = this.repairTruncatedJSON(truncated);
                if (repaired) {
                    messageLogger.warn("Successfully repaired truncated JSON response");
                    return repaired as T;
                }
            }

            throw new Error("No valid JSON found in response");
        } catch (error) {
            dataLogger.error("Error parsing AI response", { error, rawResponse: response });
            return null;
        }
    }

    /**
     * Attempts to repair a truncated JSON string by closing any open
     * strings, arrays, and objects. This handles the common case where
     * the Gemini model hits maxOutputTokens and the JSON is cut off
     * mid-value.
     *
     * The algorithm walks the string character-by-character, tracking
     * whether we are inside a string and maintaining a stack of open
     * structural tokens ({ and [). When the string ends we:
     *   1. Close any open string with a quote
     *   2. Pop the structural stack, emitting } or ] for each open brace/bracket
     *   3. Try to parse the result
     *
     * To avoid keeping a half-written final field (which is almost
     * certainly garbage), we also try a "trimmed" variant that strips
     * the last incomplete key-value pair before closing.
     */
    private repairTruncatedJSON(truncated: string): unknown | null {
        try {
            let inString = false;
            let escape = false;
            const stack: string[] = []; // tracks open { and [

            for (let i = 0; i < truncated.length; i++) {
                const ch = truncated[i];
                if (escape) { escape = false; continue; }
                if (ch === "\\" && inString) { escape = true; continue; }
                if (ch === "\"") { inString = !inString; continue; }
                if (inString) continue;

                if (ch === "{" || ch === "[") {
                    stack.push(ch);
                } else if (ch === "}" || ch === "]") {
                    stack.pop();
                }
            }

            // Nothing to repair — the braces are balanced (shouldn't happen
            // if we got here, but just in case).
            if (stack.length === 0) return null;

            // Build the closing sequence
            let repaired = truncated;

            // If we ended mid-string, close the string
            if (inString) {
                repaired += "\"";
            }

            // Build closing brackets in reverse stack order
            const closers = stack
                .map(open => (open === "{" ? "}" : "]"))
                .reverse()
                .join("");

            // --- Attempt A: trim the last incomplete value, then close ---
            // Find the last complete key-value separator (comma or colon
            // outside a string) and cut there so we don't keep a half-
            // written value.
            const trimmedRepaired = this.trimLastIncompleteValue(repaired) + closers;

            try {
                return JSON.parse(trimmedRepaired);
            } catch {
                // Trimmed variant didn't work — try the raw close
            }

            // --- Attempt B: just close everything as-is ---
            repaired += closers;
            try {
                return JSON.parse(repaired);
            } catch {
                return null;
            }
        } catch {
            return null;
        }
    }

    /**
     * Trims the last incomplete key-value pair from a JSON string that
     * was cut off mid-generation. Works by finding the last top-level
     * comma and cutting there, or the last complete structural element.
     */
    private trimLastIncompleteValue(json: string): string {
        // Walk backwards to find the last comma that is NOT inside a string
        let inString = false;
        let escape = false;
        let lastSafeComma = -1;

        for (let i = 0; i < json.length; i++) {
            const ch = json[i];
            if (escape) { escape = false; continue; }
            if (ch === "\\" && inString) { escape = true; continue; }
            if (ch === "\"") { inString = !inString; continue; }
            if (inString) continue;

            if (ch === ",") {
                // Last comma before the truncated section, at any depth
                lastSafeComma = i;
            }
        }

        if (lastSafeComma > 0) {
            // Cut right after the last complete element (before the comma
            // that precedes the truncated element). We keep everything up
            // to (but not including) the comma.
            return json.slice(0, lastSafeComma);
        }

        return json;
    }

    /**
     * Estimates token count for content (rough approximation)
     */
    public async estimateTokens(text: string): Promise<number> {
        const result = await this.model.countTokens({
            contents: [{ role: "user", parts: [{ text }] }]
        });
        return result.totalTokens;
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

    /**
     * Define the schema for structured JSON output
     */
    private getResponseSchema(): ResponseSchema {
        return {
            type: SchemaType.OBJECT,
            properties: {
                mergeScore: { type: SchemaType.NUMBER, description: "0-100 score" },
                codeQuality: {
                    type: SchemaType.OBJECT,
                    properties: {
                        codeStyle: { type: SchemaType.NUMBER, description: "0-100 score" },
                        testCoverage: { type: SchemaType.NUMBER, description: "0-100 score" },
                        documentation: { type: SchemaType.NUMBER, description: "0-100 score" },
                        security: { type: SchemaType.NUMBER, description: "0-100 score" },
                        performance: { type: SchemaType.NUMBER, description: "0-100 score" },
                        maintainability: { type: SchemaType.NUMBER, description: "0-100 score" }
                    },
                    required: ["codeStyle", "testCoverage", "documentation", "security", "performance", "maintainability"]
                },
                suggestions: {
                    type: SchemaType.ARRAY,
                    items: {
                        type: SchemaType.OBJECT,
                        properties: {
                            file: { type: SchemaType.STRING, description: "Filename", nullable: true },
                            lineNumber: { type: SchemaType.NUMBER, description: "Line number of the issue", nullable: true },
                            type: {
                                type: SchemaType.STRING,
                                description: "Must be 'improvement', 'fix', 'optimization', or 'style'"
                            },
                            severity: {
                                type: SchemaType.STRING,
                                description: "Must be 'low', 'medium', or 'high'"
                            },
                            description: { type: SchemaType.STRING, description: "Clear explanation" },
                            suggestedCode: { type: SchemaType.STRING, description: "The fixed code block", nullable: true },
                            language: { type: SchemaType.STRING, description: "The programming language of the fixed code block", nullable: true },
                            reasoning: { type: SchemaType.STRING, description: "Why this change is better" }
                        },
                        required: ["type", "severity", "description", "reasoning"]
                    },
                    description: "List of actionable suggestions"
                },
                summary: { type: SchemaType.STRING, description: "Concise review summary" },
                confidence: { type: SchemaType.NUMBER, description: "0.0 to 1.0 confidence level" }
            },
            required: ["mergeScore", "codeQuality", "suggestions", "summary", "confidence"]
        };
    }
}
