# Services Architecture Documentation

## Overview

The AI Review System is built with a modular service architecture that provides separation of concerns, error resilience, and scalability. The system consists of 29 specialized services, each with specific responsibilities and well-defined interfaces for interaction with other components.

## Service Categories

### Core Services
- **PR Analysis Service**: Orchestrates the complete PR analysis workflow
- **Groq AI Service**: Handles AI model interactions for code analysis
- **RAG Context Service**: Manages retrieval-augmented generation context
- **Rule Engine Service**: Evaluates code against rules and standards

### Integration Services
- **Octokit Service**: GitHub API interactions and webhook handling
- **Workflow Integration Service**: Manages the complete review workflow
- **Job Queue Service**: Handles background processing and task management

### Infrastructure Services
- **Error Handler Service**: Centralized error handling and recovery
- **Circuit Breaker Service**: Prevents cascading failures
- **Health Check Service**: System health monitoring
- **Logging Service**: Structured logging and monitoring
- **Retry Service**: Retry logic with exponential backoff

### Intelligent Context Services
- **Raw Code Changes Extractor Service**: Extracts comprehensive code changes from PRs
- **Repository File Path Service**: Analyzes repository structure and file organization
- **Intelligent Context Analyzer Service**: AI-powered context analysis for file recommendations
- **Intelligent Context Config Service**: Configuration management for intelligent context features
- **Enhanced Context Builder Service**: Combines multiple context sources for optimal review quality
- **Selective File Fetcher Service**: Efficiently fetches AI-recommended files

### Comment and Review Services
- **AI Review Comment Service**: Manages GitHub PR comment creation and updates
- **Review Comment Integration Service**: Orchestrates complete review comment workflow
- **Review Formatter Service**: Formats review results into structured GitHub comments

### Data and Analysis Services
- **Merge Score Service**: Calculates comprehensive merge scores based on multiple factors
- **Context Analysis DB Service**: Database operations for context analysis metrics
- **Context Analysis Integration Service**: Integrates context analysis with database storage

### Support Services
- **Error Recovery Service**: Automated system recovery mechanisms
- **Error Handling Integration Service**: Coordinates error handling across services
- **Error Handling Init Service**: Initializes error handling components

## Service Connections and Data Flow

```
GitHub Webhook → Webhook Controller → Workflow Integration Service
                                           ↓
                                    PR Analysis Service
                                           ↓
                    ┌─────────────────────────────────────┐
                    ↓                                     ↓
            RAG Context Service                    Rule Engine Service
                    ↓                                     ↓
            Groq AI Service ←─────────────────────────────┘
                    ↓
            AI Review Orchestration Service
                    ↓
            Octokit Service (Post Results)
```

## Detailed Service Documentation

### 1. PR Analysis Service (`pr-analysis.service.ts`)

**Purpose**: Extracts and processes pull request data for analysis.

**Key Methods**:
- `extractLinkedIssues(body: string)`: Extracts linked issues from PR description
- `fetchChangedFiles(installationId, repositoryName, prNumber)`: Gets changed files from GitHub
- `calculatePRComplexity(changedFiles)`: Calculates complexity metrics
- `validatePRData(prData)`: Validates PR data structure
- `shouldAnalyzePR(prData)`: Determines if PR is eligible for analysis
- `logExtractionResult()`: Logs extraction results for monitoring
- `logAnalysisDecision()`: Logs analysis eligibility decisions

**Used By**: 
- GitHub Controller (manual trigger endpoint)
- Workflow Integration Service
- AI Review Orchestration Service

**Dependencies**: 
- Octokit Service (for GitHub API calls)
- Logging Service (for structured logging)

### 2. Groq AI Service (`groq-ai.service.ts`)

**Purpose**: Interfaces with Groq AI models for code analysis and review generation.

**Key Methods**:
- `analyzeCode(prData, context, rules)`: Performs AI analysis of code changes
- `generateReview(analysis)`: Generates human-readable review from analysis
- `calculateMergeScore(factors)`: Computes merge score based on various factors
- `validateApiKey()`: Validates Groq API configuration
- `handleRateLimit()`: Manages API rate limiting
- `formatPrompt(prData, context)`: Formats prompts for AI model

**Used By**:
- AI Review Orchestration Service
- Error Handling Integration Service (with fallbacks)

**Dependencies**:
- Circuit Breaker Service (for failure protection)
- Logging Service (for API call logging)
- Error Handler Service (for retry logic)

### 3. RAG Context Service (`rag-context.service.ts`)

**Purpose**: Manages retrieval-augmented generation context using vector embeddings.

**Key Methods**:
- `retrieveRelevantContext(prData)`: Gets relevant context for PR analysis
- `generateEmbeddings(codeContent)`: Creates vector embeddings for code
- `searchSimilarPRs(embeddings)`: Finds similar historical PRs
- `extractCodePatterns(context)`: Identifies relevant code patterns
- `storeEmbeddings(prData, embeddings)`: Stores embeddings for future use
- `getProjectStandards(repository)`: Retrieves project-specific standards

**Used By**:
- AI Review Orchestration Service
- Workflow Integration Service

**Dependencies**:
- Pinecone Service (vector database)
- Hugging Face Service (embedding generation)
- Circuit Breaker Service (for external API protection)

### 4. Rule Engine Service (`rule-engine.service.ts`)

**Purpose**: Evaluates code against both default and custom rules.

**Key Methods**:
- `getDefaultRules()`: Returns built-in default rules
- `validateCustomRule(rule)`: Validates custom rule configuration
- `evaluateRules(prData, customRules)`: Evaluates all applicable rules
- `calculateRuleScore(evaluation)`: Calculates score based on rule compliance
- `getSeverityWeight(severity)`: Gets weight for rule severity
- `getRuleTypeWeight(ruleType)`: Gets weight for rule type
- `evaluatePatternRule(rule, prData)`: Evaluates pattern-based rules
- `shouldExcludeFile(filename, config)`: Checks file exclusion patterns

**Used By**:
- AI Review Orchestration Service
- Custom Rules Controller
- Workflow Integration Service

**Dependencies**:
- Database (for custom rules)
- Logging Service (for rule evaluation logging)

### 5. Octokit Service (`octokit.service.ts`)

**Purpose**: Handles all GitHub API interactions and authentication.

**Key Methods**:
- `getOctokit(installationId)`: Creates authenticated Octokit instance
- `getInstallationRepositories(installationId)`: Gets repositories for installation
- `getRepositoryIssues(installationId, repositoryName)`: Fetches repository issues
- `createIssueComment(installationId, repositoryName, issueNumber, body)`: Posts comments
- `getPRFiles(installationId, repositoryName, prNumber)`: Gets PR changed files
- `getPRDetails(installationId, repositoryName, prNumber)`: Gets PR information
- `getFileContent(installationId, repositoryName, filePath)`: Retrieves file content
- `getOrCreateBountyLabel(installationId, repositoryName)`: Manages bounty labels

**Used By**:
- GitHub Controller
- PR Analysis Service
- Workflow Integration Service
- Webhook Controller

**Dependencies**:
- GitHub App authentication
- Circuit Breaker Service (for API protection)
- Logging Service (for API call logging)

### 6. Workflow Integration Service (`workflow-integration.service.ts`)

**Purpose**: Orchestrates the complete AI review workflow from webhook to completion.

**Key Methods**:
- `initialize()`: Initializes the workflow service
- `processWebhookEvent(event)`: Processes incoming webhook events
- `shouldProcessPR(prData)`: Determines if PR should be processed
- `executeReviewWorkflow(prData)`: Executes complete review workflow
- `handleWorkflowError(error, context)`: Handles workflow errors
- `shutdown()`: Gracefully shuts down the service
- `getWorkflowStatus()`: Gets current workflow status

**Used By**:
- Webhook Controller
- Main application (initialization)

**Dependencies**:
- PR Analysis Service
- AI Review Orchestration Service
- Job Queue Service
- Error Handling Integration Service

### 7. AI Review Orchestration Service (`ai-review-orchestration.service.ts`)

**Purpose**: Coordinates the complete AI review process including context retrieval, analysis, and result generation.

**Key Methods**:
- `performAIReview(prData)`: Orchestrates complete AI review
- `retrieveContext(prData)`: Gets relevant context for analysis
- `analyzeWithAI(prData, context, rules)`: Performs AI analysis
- `generateSuggestions(analysis)`: Creates code suggestions
- `calculateFinalScore(factors)`: Computes final merge score
- `storeResults(results)`: Stores review results in database
- `postResultsToGitHub(results)`: Posts results back to GitHub

**Used By**:
- Workflow Integration Service
- GitHub Controller (manual triggers)

**Dependencies**:
- Groq AI Service
- RAG Context Service
- Rule Engine Service
- Octokit Service
- Database Service

### 8. Job Queue Service (`job-queue.service.ts`)

**Purpose**: Manages background job processing and task queuing.

**Key Methods**:
- `addJob(jobType, data, options)`: Adds job to queue
- `processJob(job)`: Processes individual jobs
- `getQueueStatus()`: Gets current queue status
- `pauseQueue()`: Pauses job processing
- `resumeQueue()`: Resumes job processing
- `clearQueue()`: Clears all pending jobs
- `retryFailedJobs()`: Retries failed jobs

**Used By**:
- Workflow Integration Service
- AI Review Orchestration Service
- Error Recovery Service

**Dependencies**:
- Database (for job persistence)
- Logging Service (for job logging)
- Error Handler Service (for job error handling)

## Error Handling Services

### 9. Error Handler Service (`error-handler.service.ts`)

**Purpose**: Provides centralized error handling with retry logic and timeouts.

**Key Methods**:
- `withRetry(operation, context, maxRetries, timeout)`: Executes operation with retry
- `withTimeout(operation, context, timeout)`: Executes operation with timeout
- `handleGroqFailure(prData, context, rules, error)`: Handles Groq service failures
- `handlePineconeFailure(prData, error)`: Handles Pinecone service failures
- `handleGitHubFailure(installationId, repo, prNumber, operation, error)`: Handles GitHub failures
- `handleDatabaseFailure(operation, fallbackValue, error)`: Handles database failures

**Used By**:
- All services that need error handling
- Error Handling Integration Service
- Circuit Breaker Service

**Dependencies**:
- Logging Service

### 10. Circuit Breaker Service (`circuit-breaker.service.ts`)

**Purpose**: Implements circuit breaker pattern to prevent cascading failures.

**Key Methods**:
- `getCircuit(serviceName, options)`: Gets or creates circuit breaker
- `execute(serviceName, operation, fallback)`: Executes operation through circuit
- `getCircuitStatus()`: Gets status of all circuits
- `resetAll()`: Resets all circuit breakers
- Circuit states: `CLOSED`, `OPEN`, `HALF_OPEN`

**Used By**:
- Error Handling Integration Service
- All external service calls
- Health Check Service

**Dependencies**:
- Logging Service (for state change logging)

### 11. Health Check Service (`health-check.service.ts`)

**Purpose**: Monitors system health and provides status information.

**Key Methods**:
- `performHealthCheck(includeDetailed)`: Performs comprehensive health check
- `getCachedHealthStatus()`: Gets cached health status
- `isSystemHealthy()`: Checks if system is healthy
- `isSystemDegraded()`: Checks if system is in degraded mode
- `getServiceHealth(serviceName)`: Gets specific service health
- `checkDatabase()`: Checks database connectivity
- `checkGroq()`: Checks Groq AI service
- `checkPinecone()`: Checks Pinecone service
- `checkGitHub()`: Checks GitHub API

**Used By**:
- Health endpoints in main application
- Error Recovery Service

**Dependencies**:
- Database
- Circuit Breaker Service
- Logging Service

### 12. Logging Service (`logging.service.ts`)

**Purpose**: Provides structured logging with monitoring integration.

**Key Methods**:
- `logError(eventType, error, context)`: Logs error events
- `logWarning(eventType, message, context)`: Logs warning events
- `logInfo(eventType, message, context)`: Logs info events
- `logDebug(eventType, message, context)`: Logs debug events
- `logPerformance(operation, duration, context)`: Logs performance metrics
- `logHealthStatus(serviceName, status, details)`: Logs health status
- `logAIReviewEvent(eventType, installationId, prNumber, repo, details)`: Logs AI review events
- `logExternalServiceCall(serviceName, operation, status, duration, details)`: Logs service calls
- `createTimer(operation)`: Creates performance timer

**Used By**:
- All services for logging
- Error handlers
- Performance monitoring

**Dependencies**:
- External monitoring webhooks (optional)
- Database (for error storage)



### 14. Error Recovery Service (`error-recovery.service.ts`)

**Purpose**: Provides automated recovery mechanisms for system failures.

**Key Methods**:
- `attemptSystemRecovery(failureType, context)`: Attempts system recovery
- `recoverFromServiceFailure(context)`: Recovers from service failures
- `recoverFromCircuitBreakerFailure(context)`: Recovers from circuit breaker issues
- `recoverFromHealthCheckFailure(context)`: Recovers from health check failures
- `performCompleteSystemRecovery(context)`: Performs full system recovery
- `getRecoveryStatus()`: Gets recovery status and history
- `resetRecoveryState()`: Resets recovery state

**Used By**:
- Health endpoints (manual recovery)
- Error Handling Integration Service

**Dependencies**:
- Health Check Service
- Circuit Breaker Service
- Logging Service
- All core services (for recovery testing)

### 15. Error Handling Integration Service (`error-handling-integration.service.ts`)

**Purpose**: Coordinates error handling across all services with fallback mechanisms.

**Key Methods**:
- `executeAIReviewWithErrorHandling(prData, operation)`: Executes AI review with error handling
- `executeRAGContextWithErrorHandling(prData, operation)`: Executes RAG context with error handling
- `executeGitHubOperationWithErrorHandling(operationName, installationId, repo, prNumber, operation, fallbackValue)`: Executes GitHub operations with error handling
- `executeDatabaseOperationWithErrorHandling(operationName, operation, fallbackValue)`: Executes database operations with error handling
- `initializeCircuitBreakers()`: Initializes circuit breakers
- `getErrorHandlingStatus()`: Gets error handling status
- `resetErrorHandling()`: Resets error handling mechanisms

**Used By**:
- Workflow Integration Service
- AI Review Orchestration Service
- Error Handling Init Service

**Dependencies**:
- Error Handler Service
- Circuit Breaker Service
- Health Check Service
- All core services

### 16. Error Handling Init Service (`error-handling-init.service.ts`)

**Purpose**: Initializes and configures all error handling components.

**Key Methods**:
- `initialize()`: Initializes all error handling components
- `shutdown()`: Shuts down error handling gracefully
- `getInitializationStatus()`: Gets initialization status
- `addShutdownHandler(handler)`: Adds shutdown handler
- `forceReinitialize()`: Forces reinitialization
- `isInitialized()`: Checks initialization status
- `performInitialHealthCheck()`: Performs startup health check
- `setupProcessEventHandlers()`: Sets up process event handlers
- `setupPeriodicHealthChecks()`: Sets up periodic health monitoring
- `validateEnvironmentConfiguration()`: Validates environment setup

**Used By**:
- Main application (startup)
- Health endpoints
- Recovery mechanisms

**Dependencies**:
- All error handling services
- Health Check Service
- Circuit Breaker Service

### 17. Retry Service (`retry.service.ts`)

**Purpose**: Provides retry logic with exponential backoff for various operations.

**Key Methods**:
- `executeWithRetry(operationName, operation, options)`: Executes operation with retry logic
- `executeWithTimeoutAndRetry(operationName, operation, maxRetries, baseDelay, maxDelay, timeout, retryCondition)`: Executes with timeout and retry
- `calculateDelay(error, attempt, baseDelay, maxDelay)`: Calculates retry delay with exponential backoff
- `githubRetryConfig()`: Creates retry configuration for GitHub API operations
- `groqRetryConfig()`: Creates retry configuration for Groq AI operations
- `pineconeRetryConfig()`: Creates retry configuration for Pinecone operations
- `databaseRetryConfig()`: Creates retry configuration for database operations
- `withTimeout(operation, operationName, timeoutMs)`: Wraps operation with timeout

**Used By**:
- All services requiring retry logic
- Error Handler Service
- External API integrations

**Dependencies**:
- Circuit Breaker Service
- Logging Service

### 18. AI Review Comment Service (`ai-review-comment.service.ts`)

**Purpose**: Manages GitHub PR comment creation, updates, and deletion for AI reviews.

**Key Methods**:
- `postOrUpdateReview(result)`: Posts or updates AI review comment on PR
- `createComment(installationId, repositoryName, prNumber, body)`: Creates new comment on PR
- `updateComment(installationId, repositoryName, commentId, body)`: Updates existing comment
- `findExistingReviewComment(installationId, repositoryName, prNumber)`: Finds existing AI review comment
- `deleteReviewComment(installationId, repositoryName, commentId)`: Deletes AI review comment
- `postStatusComment(installationId, repositoryName, prNumber, status, details)`: Posts status comment
- `validateCommentPermissions(installationId, repositoryName)`: Validates comment permissions
- `withRateLimit(operation, octokit, maxRetries)`: Handles GitHub API rate limiting

**Used By**:
- Review Comment Integration Service
- AI Review Orchestration Service
- Workflow Integration Service

**Dependencies**:
- Octokit Service
- Logging Service
- Database (for comment ID storage)

### 19. Review Comment Integration Service (`review-comment-integration.service.ts`)

**Purpose**: Orchestrates the complete review comment workflow with error handling and retry logic.

**Key Methods**:
- `postReviewComment(result)`: Posts or updates complete AI review comment
- `postReviewWithRetry(result, maxRetries)`: Posts review with retry logic and graceful degradation
- `postStatusUpdate(installationId, repositoryName, prNumber, status, details)`: Posts status update comment
- `postAnalysisErrorComment(installationId, repositoryName, prNumber, error)`: Posts error message when analysis fails
- `previewReviewComment(result)`: Gets preview of review comment formatting
- `getReviewComments(installationId, repositoryName, prNumber)`: Gets all AI review comments for PR
- `deleteReviewComment(installationId, repositoryName, commentId)`: Deletes review comment
- `validateReviewResult(result)`: Validates review result before posting

**Used By**:
- AI Review Orchestration Service
- Workflow Integration Service
- Manual review endpoints

**Dependencies**:
- AI Review Comment Service
- Review Formatter Service
- Error Handler Service

### 20. Review Formatter Service (`review-formatter.service.ts`)

**Purpose**: Formats review results into structured GitHub comments with proper markdown formatting.

**Key Methods**:
- `formatReview(result)`: Formats complete review result into structured GitHub comment
- `formatCompactSummary(result)`: Creates compact summary format for notifications
- `getMergeRecommendation(score)`: Gets merge recommendation based on score
- `getMergeScoreEmoji(score)`: Gets emoji based on merge score
- `getMergeScoreStatus(score)`: Gets status text based on merge score
- `groupSuggestionsBySeverity(suggestions)`: Groups suggestions by severity
- `getSeverityBadge(severity)`: Gets badge for rule severity
- `getSeverityEmoji(severity)`: Gets emoji for rule severity
- `getSuggestionSeverityEmoji(severity)`: Gets emoji for suggestion severity
- `isAIReviewComment(commentBody)`: Checks if comment is AI review comment

**Used By**:
- Review Comment Integration Service
- AI Review Comment Service
- Preview and testing endpoints

**Dependencies**:
- None (pure formatting service)

### 21. Merge Score Service (`merge-score.service.ts`)

**Purpose**: Calculates comprehensive merge scores based on multiple quality factors.

**Key Methods**:
- `calculateMergeScore(analysis, ruleEvaluation)`: Calculates comprehensive merge score (0-100)
- `calculateComprehensiveMergeScore(analysis, ruleEvaluation)`: Full merge score calculation with result object
- `calculateCodeQualityScore(metrics)`: Calculates code quality score from AI analysis
- `calculateComplexityScore(complexity)`: Calculates complexity score (lower complexity = higher score)
- `calculateTestCoverageScore(testCoverage)`: Calculates test coverage score
- `calculateDocumentationScore(documentationMetric)`: Calculates documentation score
- `calculateRuleComplianceScore(ruleEvaluation)`: Calculates rule compliance score
- `getMergeRecommendation(mergeScore)`: Provides merge recommendation based on score
- `getScoreBreakdown(analysis, ruleEvaluation)`: Provides detailed score breakdown
- `createScoringSummary(analysis, ruleEvaluation, prContext)`: Creates summary for logging

**Used By**:
- AI Review Orchestration Service
- Groq AI Service
- Review result compilation

**Dependencies**:
- Logging Service (for score tracking)

### 22. Raw Code Changes Extractor Service (`raw-code-changes-extractor.service.ts`)

**Purpose**: Extracts comprehensive code changes from pull requests for intelligent context analysis.

**Key Methods**:
- `extractCodeChanges(installationId, repositoryName, prNumber)`: Extracts complete code changes from PR
- `getChangesSummary(changes)`: Generates human-readable summary of code changes
- `validateCodeChanges(changes)`: Validates extracted code changes for completeness
- `normalizeFileStatus(status)`: Normalizes GitHub file status to standard format
- `detectLanguage(filename)`: Detects programming language from file extension

**Used By**:
- PR Analysis Service (intelligent context workflow)
- Intelligent Context Analyzer Service
- Enhanced Context Builder Service

**Dependencies**:
- Octokit Service
- Logging Service

### 23. Repository File Path Service (`repository-file-path.service.ts`)

**Purpose**: Analyzes repository structure and provides comprehensive file organization data.

**Key Methods**:
- `getRepositoryStructure(installationId, repositoryName, branch)`: Gets comprehensive repository structure
- `analyzeFileStructure(filePaths)`: Analyzes file structure and builds directory tree
- `categorizeFilesByLanguage(filePaths)`: Categorizes files by programming language
- `createEmptyRepositoryStructure()`: Creates empty structure for empty repositories
- `detectLanguage(filename)`: Detects programming language from file extension
- `sortDirectoryChildren(nodes)`: Recursively sorts directory children

**Used By**:
- PR Analysis Service (intelligent context workflow)
- Intelligent Context Analyzer Service
- Enhanced Context Builder Service

**Dependencies**:
- Octokit Service
- Logging Service

### 24. Intelligent Context Analyzer Service (`intelligent-context-analyzer.service.ts`)

**Purpose**: Uses AI to analyze code changes and determine which files are most relevant for optimal review quality.

**Key Methods**:
- `analyzeContextNeeds(request)`: Analyzes code changes to determine relevant files using AI
- `buildContextPrompt(request)`: Builds specialized prompt for AI context analysis
- `parseContextResponse(response)`: Parses AI response into structured context analysis
- `validateContextAnalysis(analysis)`: Validates and normalizes AI recommendations
- `generateHeuristicFallback(request, errors)`: Generates fallback when AI analysis fails
- `analyzeWithReducedContext(request)`: Analyzes with reduced context when hitting token limits
- `formatCodeChangesPreview(codeChanges)`: Formats code changes preview for AI prompt
- `validateAndNormalizeRecommendations(recommendations)`: Validates file recommendations

**Used By**:
- PR Analysis Service (intelligent context workflow)
- Enhanced Context Builder Service

**Dependencies**:
- Groq AI Service
- Logging Service
- Intelligent Context Config Service

### 25. Intelligent Context Config Service (`intelligent-context-config.service.ts`)

**Purpose**: Manages configuration and feature flags for intelligent context analysis features.

**Key Methods**:
- `getConfig()`: Gets current intelligent context configuration
- `updateConfig(updates)`: Updates configuration at runtime
- `getFeatureFlags()`: Gets current feature flags
- `updateFeatureFlags(updates)`: Updates feature flags at runtime
- `isEnabled()`: Checks if intelligent context is enabled
- `isFeatureEnabled(feature)`: Checks if specific feature is enabled
- `loadConfigFromEnvironment()`: Loads configuration from environment variables
- `reloadFromEnvironment()`: Reloads configuration from environment
- `validateConfig()`: Validates configuration settings
- `getConfigSummary()`: Gets configuration summary for logging

**Used By**:
- PR Analysis Service
- Intelligent Context Analyzer Service
- All intelligent context services

**Dependencies**:
- Environment variables
- Logging Service

### 26. Enhanced Context Builder Service (`enhanced-context-builder.service.ts`)

**Purpose**: Combines multiple context sources to build optimal review context with quality scoring.

**Key Methods**:
- `buildEnhancedContext(codeChanges, repositoryStructure, contextAnalysis, fetchedFiles, existingContext)`: Builds enhanced review context
- `calculateContextMetrics(repositoryStructure, contextAnalysis, fetchedFiles, processingTimes)`: Calculates comprehensive context metrics
- `calculateContextQualityScore(context)`: Calculates context quality score
- `optimizeContext(context)`: Optimizes context for better review quality and performance
- `optimizeRelevantFiles(context)`: Optimizes relevant files by combining sources intelligently
- `enhanceExistingContext(context)`: Enhances existing context with intelligent insights
- `validateEnhancedContext(context)`: Validates enhanced context completeness
- `getContextSummary(context)`: Gets context summary for logging and debugging

**Used By**:
- PR Analysis Service (intelligent context workflow)
- AI Review Orchestration Service

**Dependencies**:
- Logging Service
- Intelligent Context Config Service

### 27. Selective File Fetcher Service (`selective-file-fetcher.service.ts`)

**Purpose**: Efficiently fetches only AI-recommended files instead of all potentially relevant files.

**Key Methods**:
- `fetchRecommendedFiles(installationId, repositoryName, recommendations, branch)`: Fetches AI-recommended files efficiently
- `fetchFileWithRetry(installationId, repositoryName, filePath, branch, maxRetries)`: Fetches single file with retry logic
- `validateFileRecommendations(recommendations)`: Validates file recommendations before fetching
- `calculateFetchMetrics(recommendations, results)`: Calculates fetch success metrics
- `optimizeFetchOrder(recommendations)`: Optimizes fetch order based on priority and size
- `handleFetchErrors(errors)`: Handles and categorizes fetch errors
- `getFileSizeEstimate(filePath)`: Estimates file size for optimization
- `shouldSkipFile(filePath, fileSize)`: Determines if file should be skipped

**Used By**:
- PR Analysis Service (intelligent context workflow)
- Enhanced Context Builder Service

**Dependencies**:
- Octokit Service
- Retry Service
- Logging Service

### 28. Context Analysis DB Service (`context-analysis-db.service.ts`)

**Purpose**: Manages database operations for context analysis metrics and performance tracking.

**Key Methods**:
- `createContextAnalysisMetrics(metricsData)`: Creates new context analysis metrics record
- `getContextAnalysisMetrics(installationId, repositoryName, prNumber)`: Gets context analysis metrics for specific PR
- `getRepositoryContextMetrics(installationId, repositoryName, startDate, endDate)`: Gets context metrics for repository
- `getRepositoryContextStats(installationId, repositoryName, startDate, endDate)`: Gets aggregated context statistics
- `updateAIReviewResultWithContext(reviewResultId, contextData)`: Updates review result with context data
- `getAIReviewResultsWithContext(installationId, repositoryName, limit)`: Gets review results that used context analysis
- `getContextAnalysisPerformanceTrends(installationId, repositoryName, days)`: Gets performance trends
- `deleteOldContextMetrics(olderThanDays)`: Deletes old metrics for cleanup

**Used By**:
- Context Analysis Integration Service
- PR Analysis Service
- Monitoring and analytics endpoints

**Dependencies**:
- Database (Prisma)
- Logging Service

### 29. Context Analysis Integration Service (`context-analysis-integration.service.ts`)

**Purpose**: Integrates context analysis results with database storage and provides analytics capabilities.

**Key Methods**:
- `storeContextAnalysisResults(reviewResultId, installationId, repositoryName, prNumber, enhancedContext, contextAnalysis)`: Stores complete context analysis results
- `markAsFallback(reviewResultId)`: Marks review result as using fallback (no intelligent context)
- `getContextAnalysisStats(installationId, repositoryName, days)`: Gets context analysis statistics for monitoring
- `getRecentContextAnalyses(installationId, repositoryName, limit)`: Gets recent context analyses for debugging
- `calculateContextQualityScore(contextMetrics, contextAnalysis)`: Calculates context quality score
- `validateContextMetrics(metrics)`: Validates context metrics before storing
- `cleanupOldData(olderThanDays)`: Cleans up old context analysis data

**Used By**:
- PR Analysis Service (intelligent context workflow)
- AI Review Orchestration Service
- Analytics and monitoring endpoints

**Dependencies**:
- Context Analysis DB Service
- Logging Service

## Service Interaction Patterns

### Request Flow Pattern
1. **Webhook Reception**: GitHub webhook → Webhook Controller
2. **Workflow Orchestration**: Controller → Workflow Integration Service
3. **Data Processing**: Workflow Service → PR Analysis Service
4. **Context Retrieval**: Workflow Service → RAG Context Service
5. **Rule Evaluation**: Workflow Service → Rule Engine Service
6. **AI Analysis**: Workflow Service → AI Review Orchestration Service
7. **Result Storage**: Orchestration Service → Database
8. **GitHub Integration**: Orchestration Service → Octokit Service

### Error Handling Pattern
1. **Error Detection**: Any service detects error
2. **Circuit Breaker Check**: Circuit Breaker Service evaluates
3. **Retry Logic**: Error Handler Service manages retries
4. **Fallback Execution**: Service-specific fallback mechanisms
5. **Recovery Attempt**: Error Recovery Service attempts recovery
6. **Monitoring**: Logging Service tracks events

### Health Monitoring Pattern
1. **Periodic Checks**: Health Check Service monitors all services
2. **Status Caching**: Results cached for quick access
3. **Alert Generation**: Logging Service generates alerts
4. **Recovery Triggers**: Automated recovery based on health status

## Configuration and Environment

### Required Environment Variables
- `GROQ_API_KEY`: Groq AI service authentication
- `PINECONE_API_KEY`: Pinecone vector database authentication
- `GITHUB_APP_ID`: GitHub App ID for authentication
- `GITHUB_APP_PRIVATE_KEY`: GitHub App private key
- `DATABASE_URL`: PostgreSQL database connection string

### Optional Environment Variables
- `MONITORING_WEBHOOK_URL`: External monitoring webhook
- `ALERT_WEBHOOK_URL`: External alerting webhook
- `NODE_ENV`: Environment (development/production)

### Service Configuration
Each service can be configured through environment variables and has sensible defaults for timeouts, retry counts, and other operational parameters.

This architecture provides a robust, scalable, and maintainable system that can handle failures gracefully while providing comprehensive AI-powered code review capabilities.