import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import createError from "http-errors";
import { GeminiAIService } from "../../services/ai-review/gemini-ai.service";
import { dataLogger } from "../../config/logger.config";
import { STATUS_CODES } from "../../utilities/data";
import { GitHubPullRequest, GitHubInstallation, APIResponse } from "../../models/ai-review.model";
import { OctokitService } from "../../services/octokit.service";
import { WorkflowIntegrationService } from "../../services/ai-review/workflow-integration.service";
import { validateRequestParameters } from "../../middlewares/request.middleware";
import {
    geminiChatSchema,
    geminiCodeReviewSchema,
    geminiTestModelsSchema,
    geminiTestJsonSchema,
    manualAnalysisSchema
} from "./test.schema";

const router = Router();
const geminiService = new GeminiAIService();

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
4. Best practices recommendations

Format your response as JSON:
{
  "quality_score": <number 1-10>,
  "summary": "<brief summary>",
  "suggestions": [
    {
      "type": "<improvement|bug|security|style>",
      "description": "<detailed description>",
      "line": <line number or null>
    }
  ],
  "overall_feedback": "<comprehensive feedback>"
}`;

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
            next(createError(500, "Failed to generate code review", { cause: error }));
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

// Trigger manual analysis
router.post("/github/manual-analysis",
    validateRequestParameters(manualAnalysisSchema),
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { installationId, repositoryName, prNumber, reason } = req.body;

            if (!installationId || !repositoryName || !prNumber) {
                // Missing required fields
                return res.status(STATUS_CODES.SERVER_ERROR).json({
                    success: false,
                    error: "Missing required fields: installationId, repositoryName, prNumber"
                });
            }

            // Fetch PR details using Octokit
            const octokit = await OctokitService.getOctokit(installationId);
            const [owner, repo] = OctokitService.getOwnerAndRepo(repositoryName);

            const { data: pull_request } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            const { data: installation } = await octokit.request(
                "GET /app/installations/{installation_id}",
                { installation_id: Number(installationId) }
            );

            const { data: repository } = await octokit.request(
                "GET /repos/{owner}/{repo}",
                { owner, repo }
            );

            // Use the integrated workflow service for manual analysis
            const workflowService = WorkflowIntegrationService.getInstance();
            const result = await workflowService.processWebhookWorkflow({
                action: "opened",
                number: prNumber,
                pull_request: pull_request as GitHubPullRequest,
                repository,
                installation: installation as GitHubInstallation
            });

            if (!result.success) {
                // Analysis could not be queued
                return res.status(STATUS_CODES.UNKNOWN).json({
                    success: false,
                    error: result.error,
                    timestamp: new Date().toISOString()
                } as APIResponse);
            }

            // Return success response
            res.status(STATUS_CODES.BACKGROUND_JOB).json({
                success: true,
                message: "Manual analysis queued successfully",
                data: {
                    jobId: result.jobId,
                    installationId,
                    repositoryName,
                    prNumber,
                    status: "queued",
                    reason: reason || "Manual trigger"
                },
                timestamp: new Date().toISOString()
            } as APIResponse);

        } catch (error) {
            // Log and pass error to middleware
            dataLogger.error("Error in manual analysis trigger", { error });
            next(error);
        }
    }) as RequestHandler);

export const aiServicesRoutes = router;
