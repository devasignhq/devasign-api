import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { body, validationResult } from 'express-validator';
import createError from 'http-errors';
import { RAGContextServiceImpl } from '../../services/rag-context.service';
import { GroqAIService } from '../../services/groq-ai.service';

const router = Router();
const ragService = new RAGContextServiceImpl();
const groqService = new GroqAIService();

// ============================================================================
// Pinecone Database Test Routes
// ============================================================================

// Store demo data in Pinecone
router.post('/pinecone/store-demo',
    [
        body('text').notEmpty().withMessage('Text content is required'),
        body('type').isIn(['pr', 'file', 'issue', 'text']).withMessage('Type must be pr, file, or issue'),
        body('metadata').optional().isObject().withMessage('Metadata must be an object'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { text, type, metadata = {} } = req.body;

            // Generate embeddings for the demo text
            const embeddings = await ragService.generateEmbeddings(text);

            // Create demo document with metadata
            const demoId = `demo:${type}:${Date.now()}`;
            const demoMetadata = {
                installationId: 'demo-installation',
                type: type,
                text,
                timestamp: new Date().toISOString(),
                repositoryName: 'demo-repo',
                ...metadata
            };

            // Store in Pinecone (using internal method)
            const pinecone = (ragService as any).pinecone;
            const indexName = (ragService as any).indexName;
            const index = pinecone.index(indexName);

            await index.upsert([{
                id: demoId,
                values: embeddings,
                metadata: demoMetadata
            }]);

            res.status(201).json({
                message: 'Demo data stored successfully in Pinecone',
                data: {
                    id: demoId,
                    embeddingDimensions: embeddings.length,
                    metadata: demoMetadata
                }
            });
        } catch (error) {
            console.log("pinecoderagerror", error);
            next(error);
        }
    }) as RequestHandler
);

// Retrieve specific data from Pinecone
router.get('/pinecone/retrieve/:id',
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id } = req.params;

            // Fetch from Pinecone
            const pinecone = (ragService as any).pinecone;
            const indexName = (ragService as any).indexName;
            const index = pinecone.index(indexName);

            const fetchResult = await index.fetch([id]);
            const record = fetchResult.records?.[id];

            if (!record) {
                return res.status(404).json({
                    message: 'Record not found',
                    id: id
                });
            }

            res.status(200).json({
                message: 'Data retrieved successfully from Pinecone',
                data: {
                    id: id,
                    metadata: record.metadata,
                    embeddingDimensions: record.values?.length || 0,
                    hasEmbedding: !!record.values
                }
            });
        } catch (error) {
            next(createError(500, 'Failed to retrieve data from Pinecone', { cause: error }));
        }
    }) as RequestHandler
);

// Search for topK similar data in Pinecone
router.post('/pinecone/search',
    [
        body('query').notEmpty().withMessage('Search query is required'),
        body('topK').optional().isInt({ min: 1, max: 20 }).withMessage('topK must be between 1 and 20'),
        body('filter').optional().isObject().withMessage('Filter must be an object'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { query, topK = 5, filter = {} } = req.body;

            // Generate query embeddings
            const queryEmbeddings = await ragService.generateEmbeddings(query);

            // Search in Pinecone
            const pinecone = (ragService as any).pinecone;
            const indexName = (ragService as any).indexName;
            const index = pinecone.index(indexName);

            const searchResults = await index.query({
                vector: queryEmbeddings,
                filter: filter,
                topK: topK,
                includeMetadata: true
            });

            const results = searchResults.matches?.map((match: any) => ({
                id: match.id,
                score: match.score,
                metadata: match.metadata
            })) || [];

            res.status(200).json({
                message: 'Search completed successfully',
                data: {
                    query: query,
                    topK: topK,
                    resultsCount: results.length,
                    results: results
                },
            });
        } catch (error) {
            next(createError(500, 'Failed to search in Pinecone', { cause: error }));
        }
    }) as RequestHandler
);

// ============================================================================
// Groq AI Model Test Routes
// ============================================================================

// Simple chat with Groq AI
router.post('/groq/chat',
    [
        body('message').notEmpty().withMessage('Message is required'),
        body('model').optional().isString().withMessage('Model must be a string'),
        body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { message, model, temperature } = req.body;

            // Create a simple chat prompt
            const chatPrompt = `You are a helpful AI assistant. Please respond to the following message in a conversational way:

User: ${message}A
ssistant: Please provide a helpful and informative response.`;

            // Call Groq API using the service's internal method
            const response = await (groqService as any).callGroqAPI(chatPrompt);

            res.status(200).json({
                message: 'Chat response generated successfully',
                data: {
                    userMessage: message,
                    aiResponse: response,
                    model: model || 'llama3-8b-8192',
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, 'Failed to generate chat response', { cause: error }));
        }
    }) as RequestHandler
);

// Code review simulation with Groq AI
router.post('/groq/code-review',
    [
        body('code').notEmpty().withMessage('Code content is required'),
        body('language').optional().isString().withMessage('Language must be a string'),
        body('filename').optional().isString().withMessage('Filename must be a string'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { code, language = 'javascript', filename = 'example.js' } = req.body;

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
                message: 'Code review completed successfully',
                data: {
                    filename: filename,
                    language: language,
                    codeLength: code.length,
                    review: response,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, 'Failed to generate code review', { cause: error }));
        }
    }) as RequestHandler
);

// Test Groq AI with different models and parameters
router.post('/groq/test-models',
    [
        body('prompt').notEmpty().withMessage('Prompt is required'),
        body('models').optional().isArray().withMessage('Models must be an array'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { prompt, models = ['llama3-8b-8192', 'mixtral-8x7b-32768'] } = req.body;

            const results = [];

            // Test each model
            for (const model of models) {
                try {
                    const startTime = Date.now();

                    // Create Groq client with specific model
                    const groqClient = (groqService as any).groqClient;
                    const completion = await groqClient.chat.completions.create({
                        messages: [{ role: 'user', content: prompt }],
                        model: model,
                        max_tokens: 1000,
                        temperature: 0.1,
                    });

                    const endTime = Date.now();
                    const response = completion.choices[0]?.message?.content || 'No response';

                    results.push({
                        model: model,
                        response: response,
                        responseTime: endTime - startTime,
                        success: true,
                        tokens: completion.usage?.total_tokens || 0
                    });
                } catch (modelError: any) {
                    results.push({
                        model: model,
                        error: modelError.message,
                        success: false,
                        responseTime: 0
                    });
                }
            }

            res.status(200).json({
                message: 'Model testing completed',
                data: {
                    prompt: prompt,
                    results: results,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, 'Failed to test models', { cause: error }));
        }
    }) as RequestHandler
);

// Test Groq AI JSON parsing
router.post('/groq/test-json',
    [
        body('testPrompt').optional().isString().withMessage('Test prompt must be a string'),
    ],
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { testPrompt = 'Analyze this simple code: function add(a, b) { return a + b; }' } = req.body;

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
                message: 'Groq AI JSON test completed',
                data: {
                    rawResponse: response,
                    parsedResponse: parsedResponse,
                    parseError: parseError,
                    isValidJSON: !parseError,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            next(createError(500, 'Failed to test Groq AI JSON parsing', { cause: error }));
        }
    }) as RequestHandler
);

export const aiServicesRoutes = router;