import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import createError from "http-errors";
import { GeminiAIService } from "../../services/pr-review/gemini-ai.service";
import { validateRequestParameters } from "../../middlewares/request.middleware";
import {
    geminiChatSchema,
    geminiCodeReviewSchema,
    geminiTestModelsSchema,
    geminiTestJsonSchema
} from "./test.schema";
import { ValidationError } from "../../models/error.model";
import { VectorStoreService } from "../../services/pr-review/vector-store.service";
import { cloudTasksService } from "../../services/cloud-tasks.service";

const router = Router();
const geminiService = new GeminiAIService();
const vectorStoreService = new VectorStoreService();

// Simple chat with Gemini AI
router.post("/gemini/chat",
    validateRequestParameters(geminiChatSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { message } = req.body;

            // Create a simple chat prompt
            const chatPrompt = `You are a helpful AI assistant. Please respond to the following message in a conversational way:

User: ${message}
Assistant: Please provide a helpful and informative response.`;

            // Call Gemini API using the service's internal method
            const response = await (geminiService as any).callGeminiAPI(chatPrompt);

            res.status(200).json({
                message: "Chat response generated successfully",
                data: {
                    userMessage: message,
                    aiResponse: response,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to generate chat response", { cause: error }));
        }
    }) as RequestHandler
);

// Code review simulation with Gemini AI
router.post("/gemini/code-review",
    validateRequestParameters(geminiCodeReviewSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { code, language = "javascript", filename = "example.js" } = req.body;

            // Create a code review prompt
            const reviewPrompt = `You are an expert code reviewer. Please analyze the following ${language} code and provide feedback:

Filename: ${filename}
Code:
\`\`\`${language}
${code}
\`\`\`

Please provide:
1. Overall code quality assessment (1-10)
2. Specific suggestions for improvement
3. Any potential bugs or security issues
4. Best practices recommendations`;

            // Call Gemini API
            const response = await (geminiService as any).callGeminiAPI(reviewPrompt);

            res.status(200).json({
                message: "Code review completed successfully",
                data: {
                    filename,
                    language,
                    codeLength: code.length,
                    review: response,
                    parsed: (geminiService as any).parseAIResponse(response),
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(error);
        }
    }) as RequestHandler
);

// Test Gemini AI with different models and parameters
router.post("/gemini/test-models",
    validateRequestParameters(geminiTestModelsSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { prompt, models = ["gemini-1.5-pro", "gemini-1.5-flash"] } = req.body;

            const results = [];

            // Test each model
            for (const model of models) {
                try {
                    const startTime = Date.now();

                    // Create Gemini client with specific model
                    const genAI = (geminiService as any).genAI;
                    const modelInstance = genAI.getGenerativeModel({ model });
                    const result = await modelInstance.generateContent(prompt);
                    const response = result.response.text();

                    const endTime = Date.now();

                    results.push({
                        model,
                        response,
                        responseTime: endTime - startTime,
                        success: true
                        // tokens: result.usage?.totalTokens || 0 // Usage info might differ
                    });
                } catch (modelError: any) {
                    results.push({
                        model,
                        error: modelError.message,
                        success: false,
                        responseTime: 0
                    });
                }
            }

            res.status(200).json({
                message: "Model testing completed",
                data: {
                    prompt,
                    results,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to test models", { cause: error }));
        }
    }) as RequestHandler
);

// Test Gemini AI JSON parsing
router.post("/gemini/test-json",
    validateRequestParameters(geminiTestJsonSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {

            const { testPrompt = "Analyze this simple code: function add(a, b) { return a + b; }" } = req.body;

            // Create a simple test prompt that should return JSON
            const prompt = `You are a code reviewer. Analyze this code and respond with ONLY valid JSON in this exact format:

{
  "mergeScore": 75,
  "codeQuality": {
    "codeStyle": 80,
    "testCoverage": 60,
    "documentation": 40,
    "security": 90,
    "performance": 70,
    "maintainability": 75
  },
  "suggestions": [
    {
      "file": "test.js",
      "lineNumber": 1,
      "type": "improvement",
      "severity": "low",
      "description": "Consider adding JSDoc comments",
      "reasoning": "Documentation improves code maintainability"
    }
  ],
  "summary": "Simple function with good structure but could use documentation",
  "confidence": 0.8
}

Code to analyze: ${testPrompt}

Respond with ONLY the JSON object above, modified for the actual code analysis.`;

            // Call Gemini API directly
            const response = await (geminiService as any).callGeminiAPI(prompt);

            // Try to parse the response
            let parsedResponse;
            let parseError = null;

            try {
                parsedResponse = (geminiService as any).parseAIResponse(response);
            } catch (error: any) {
                parseError = error.message;
            }

            res.status(200).json({
                message: "Gemini AI JSON test completed",
                data: {
                    rawResponse: response,
                    parsedResponse,
                    parseError,
                    isValidJSON: !parseError,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to test Gemini AI JSON parsing", { cause: error }));
        }
    }) as RequestHandler
);

/**
 * Trigger repository indexing
 * POST /api/ai/index-repo
 * Body: { installationId: string, repositoryName: string }
 */
router.post(
    "/index-repo",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { installationId, repositoryName } = req.body;

            if (!installationId || !repositoryName) {
                throw new ValidationError("Missing required parameters");
            }

            const jobId = await cloudTasksService.addRepositoryIndexingJob(
                installationId,
                repositoryName
            );

            res.status(200).json({
                message: "Repository indexing queued successfully",
                data: { jobId }
            });
        } catch (error) {
            next(error);
        }
    }
);

/**
 * Retrieve context for a query
 * POST /api/ai/retrieve-context
 * Body: { installationId: string, repositoryName: string, query: string }
 */
router.post(
    "/retrieve-context",
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { installationId, repositoryName, query } = req.body;

            if (!installationId || !repositoryName || !query) {
                throw new ValidationError("Missing required parameters");
            }

            // 1. Generate embedding for query
            const embedding = await vectorStoreService.generateEmbedding(query, "query");

            // 2. Search vector store
            const results = await vectorStoreService.findSimilarChunks(
                embedding,
                installationId,
                repositoryName,
                5 // limit
            );

            res.status(200).json({
                message: "Context retrieved successfully",
                data: results
            });
        } catch (error) {
            next(error);
        }
    }
);

export const aiServicesRoutes = router;
