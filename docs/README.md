# AI Review System Documentation

## Overview

This documentation covers the complete AI Review System - an intelligent, automated code review solution that integrates with GitHub repositories to provide AI-powered analysis, custom rule evaluation, and comprehensive feedback on pull requests.

## Documentation Structure

### 📋 [System Overview](./ai-review-system-overview.md)
Complete overview of the AI Review System including:
- System architecture and components
- Key features and capabilities
- How the system works from A-Z
- Error handling and fallback mechanisms
- Configuration and customization options
- Security considerations and performance optimization

### 🔧 [Custom Rules API](./custom-rules-api.md)
Comprehensive API documentation for managing custom rules:
- All API endpoints with examples
- Rule types and severity levels
- Pattern matching and file exclusion
- Configuration examples for different rule types
- Error handling and validation

### 🏗️ [Services Architecture](./services-architecture.md)
Detailed documentation of all services and their interactions:
- Core services (PR Analysis, AI, RAG, Rule Engine)
- Integration services (GitHub, Workflow, Job Queue)
- Infrastructure services (Error Handling, Health Checks, Monitoring)
- Service connections and data flow
- Configuration and environment setup

### 🔄 [Complete Workflow Process](./complete-workflow-process.md)
Step-by-step walkthrough of the entire review process:
- Phase-by-phase breakdown from webhook to GitHub comment
- Data structures and transformations
- Error handling at each step
- Performance characteristics and optimization
- Monitoring and observability

### 🗄️ [Vector Database Indexing](./vector-database-indexing.md)
Detailed explanation of how the RAG context system works:
- Progressive learning and data storage
- What gets stored in Pinecone vector database
- When and how PR data is indexed
- Context retrieval and similarity search
- Embedding generation and fallback mechanisms
- Performance characteristics and scaling

## Quick Start Guide

### For Developers
1. **Understanding the System**: Start with [System Overview](./ai-review-system-overview.md)
2. **Service Architecture**: Review [Services Architecture](./services-architecture.md)
3. **Process Flow**: Study [Complete Workflow Process](./complete-workflow-process.md)

### For API Users
1. **Custom Rules**: Read [Custom Rules API](./custom-rules-api.md)
2. **Integration**: Check [System Overview](./ai-review-system-overview.md) for webhook setup
3. **Error Handling**: Review error responses in API documentation

### For System Administrators
1. **Deployment**: Review environment variables in [Services Architecture](./services-architecture.md)
2. **Monitoring**: Check health endpoints in [System Overview](./ai-review-system-overview.md)
3. **Troubleshooting**: Study error handling in [Complete Workflow Process](./complete-workflow-process.md)

## Key Components Summary

### Core Services
- **PR Analysis Service**: Extracts and processes pull request data
- **Groq AI Service**: Interfaces with AI models for code analysis
- **RAG Context Service**: Manages retrieval-augmented generation context
- **Rule Engine Service**: Evaluates code against rules and standards

### API Endpoints
- **Custom Rules Management**: CRUD operations for organization-specific rules
- **Manual PR Analysis**: Trigger analysis on-demand
- **Health Monitoring**: System status and diagnostics
- **Webhook Processing**: GitHub integration endpoints

### Error Handling
- **Circuit Breakers**: Prevent cascading failures
- **Fallback Mechanisms**: Graceful degradation when services fail
- **Retry Logic**: Automatic recovery with exponential backoff
- **Health Monitoring**: Continuous system health assessment

## System Capabilities

### Automated Analysis
- **Merge Score**: 0-100 score based on code quality, security, and compliance
- **Rule Evaluation**: Both default and custom rules with pattern matching
- **AI Suggestions**: Context-aware code improvement recommendations
- **Security Scanning**: Detection of potential vulnerabilities

### Intelligent Context
- **RAG Integration**: Uses historical PR data for context-aware analysis
- **Project Standards**: Learns from existing codebase patterns
- **Similar PR Detection**: Finds relevant historical examples
- **Code Pattern Recognition**: Identifies common patterns and anti-patterns

### Robust Operations
- **High Availability**: Circuit breakers and fallback mechanisms
- **Performance Monitoring**: Comprehensive metrics and alerting
- **Graceful Degradation**: Continues operating with reduced functionality
- **Error Recovery**: Automated recovery from service failures

## Configuration Requirements

### Required Environment Variables
```bash
GROQ_API_KEY=your_groq_api_key
PINECONE_API_KEY=your_pinecone_api_key
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY=your_github_private_key
DATABASE_URL=postgresql://user:pass@host:port/db
```

### Optional Configuration
```bash
MONITORING_WEBHOOK_URL=your_monitoring_webhook
ALERT_WEBHOOK_URL=your_alert_webhook
NODE_ENV=production
```

## API Quick Reference

### Custom Rules
```bash
# Get all rules
GET /ai-rules/:installationId

# Create rule
POST /ai-rules/:installationId

# Update rule
PUT /ai-rules/:installationId/:ruleId

# Delete rule
DELETE /ai-rules/:installationId/:ruleId
```

### Manual Analysis
```bash
# Trigger PR analysis
POST /github/installations/:installationId/analyze-pr
```

### Health Monitoring
```bash
# Basic health
GET /health

# Detailed health
GET /health/detailed

# Error handling status
GET /health/error-handling
```

## Error Handling Strategy

### Service Failures
- **AI Service Down**: Falls back to rule-based analysis
- **Vector DB Down**: Uses basic context without RAG
- **GitHub API Issues**: Stores results for later posting
- **Database Issues**: Temporary in-memory storage

### Recovery Mechanisms
- **Circuit Breakers**: Automatic failure detection and recovery
- **Health Checks**: Continuous monitoring with automated alerts
- **Manual Recovery**: Admin endpoints for forced system recovery
- **Graceful Shutdown**: Proper cleanup on system termination

## Performance Characteristics

### Processing Times
- **Simple PRs**: 15-30 seconds
- **Medium PRs**: 30-60 seconds  
- **Complex PRs**: 60-120 seconds

### Scalability
- **Async Processing**: Background job queues
- **Connection Pooling**: Optimized database connections
- **Caching**: Health status and context caching
- **Rate Limiting**: Respects external service limits

## Security Features

### Authentication & Authorization
- GitHub App authentication for secure API access
- User permission validation for installations
- Webhook signature verification
- Secure environment variable handling

### Data Protection
- No permanent storage of sensitive code
- Anonymized embeddings for RAG
- Audit logging for access tracking
- Secure communication with external services

## Monitoring & Observability

### Metrics Collected
- AI review success/failure rates
- Service response times and error rates
- Circuit breaker status and recovery
- System resource usage and health

### Alerting Capabilities
- Critical system failures
- High error rates and performance issues
- Service unavailability notifications
- Resource exhaustion warnings

## Support & Troubleshooting

### Common Issues
1. **AI Analysis Failures**: Check Groq API key and rate limits
2. **Context Retrieval Issues**: Verify Pinecone configuration
3. **GitHub Integration Problems**: Validate app credentials and permissions
4. **Database Connection Issues**: Check connection string and network access

### Diagnostic Endpoints
- `/health/detailed`: Comprehensive system status
- `/health/error-handling`: Error handling system status
- Circuit breaker status in health responses
- Structured logging for issue investigation

### Recovery Procedures
1. **Service Recovery**: Use `/health/recover` endpoint (admin only)
2. **Circuit Breaker Reset**: Automatic after timeout or manual reset
3. **System Restart**: Graceful shutdown and restart procedures
4. **Configuration Reload**: Environment variable updates

This documentation provides everything needed to understand, deploy, configure, and maintain the AI Review System. Each document focuses on specific aspects while maintaining consistency and cross-references for comprehensive coverage.