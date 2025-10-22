import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { body, validationResult } from "express-validator";
import createError from "http-errors";
import { GroqAIService } from "../../services/ai-review/groq-ai.service";
import { dataLogger } from "../../config/logger.config";
import { STATUS_CODES } from "../../helper";
import { GitHubPullRequest, GitHubInstallation, APIResponse } from "../../models/ai-review.model";
import { OctokitService } from "../../services/octokit.service";
import { WorkflowIntegrationService } from "../../services/ai-review/workflow-integration.service";

const router = Router();
const groqService = new GroqAIService();

// Simple chat with Groq AI
router.post("/groq/chat",
    [
        body("message").notEmpty().withMessage("Message is required"),
        body("model").optional().isString().withMessage("Model must be a string")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { message, model } = req.body;

            // Create a simple chat prompt
            const chatPrompt = `You are a helpful AI assistant. Please respond to the following message in a conversational way:

User: ${message}A
ssistant: Please provide a helpful and informative response.`;

            // Call Groq API using the service's internal method
            const response = await (groqService as any).callGroqAPI(chatPrompt);

            res.status(200).json({
                message: "Chat response generated successfully",
                data: {
                    userMessage: message,
                    aiResponse: response,
                    model: model || "llama3-8b-8192",
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to generate chat response", { cause: error }));
        }
    }) as RequestHandler
);

// Code review simulation with Groq AI
router.post("/groq/code-review",
    [
        body("code").notEmpty().withMessage("Code content is required"),
        body("language").optional().isString().withMessage("Language must be a string"),
        body("filename").optional().isString().withMessage("Filename must be a string")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

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

            // Call Groq API
            const response = await (groqService as any).callGroqAPI(reviewPrompt);

            res.status(200).json({
                message: "Code review completed successfully",
                data: {
                    filename,
                    language,
                    codeLength: code.length,
                    review: response,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to generate code review", { cause: error }));
        }
    }) as RequestHandler
);

// Test Groq AI with different models and parameters
router.post("/groq/test-models",
    [
        body("prompt").notEmpty().withMessage("Prompt is required"),
        body("models").optional().isArray().withMessage("Models must be an array")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { prompt, models = ["llama3-8b-8192", "mixtral-8x7b-32768"] } = req.body;

            const results = [];

            // Test each model
            for (const model of models) {
                try {
                    const startTime = Date.now();

                    // Create Groq client with specific model
                    const groqClient = (groqService as any).groqClient;
                    const completion = await groqClient.chat.completions.create({
                        messages: [{ role: "user", content: prompt }],
                        model,
                        max_tokens: 1000,
                        temperature: 0.1
                    });

                    const endTime = Date.now();
                    const response = completion.choices[0]?.message?.content || "No response";

                    results.push({
                        model,
                        response,
                        responseTime: endTime - startTime,
                        success: true,
                        tokens: completion.usage?.total_tokens || 0
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

// Test Groq AI JSON parsing
router.post("/groq/test-json",
    [
        body("testPrompt").optional().isString().withMessage("Test prompt must be a string")
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

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

            // Call Groq API directly
            const response = await (groqService as any).callGroqAPI(prompt);

            // Try to parse the response
            let parsedResponse;
            let parseError = null;

            try {
                parsedResponse = (groqService as any).parseAIResponse(response);
            } catch (error: any) {
                parseError = error.message;
            }

            res.status(200).json({
                message: "Groq AI JSON test completed",
                data: {
                    rawResponse: response,
                    parsedResponse,
                    parseError,
                    isValidJSON: !parseError,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, "Failed to test Groq AI JSON parsing", { cause: error }));
        }
    }) as RequestHandler
);

// Trigger manual analysis
router.post("/github/manual-analysis", (async (req: Request, res: Response, next: NextFunction) => {
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
