# Vector Database Indexing and RAG Context

## Overview

The AI Review System uses Pinecone as a vector database to store and retrieve contextual information for pull request analysis. This document explains how the indexing process works, what gets stored, and when.

## Key Questions Answered

### Does the system assume historical PRs and repository files are already indexed?

**No, the system does not assume pre-existing data.** The vector database starts empty and gets populated progressively as PRs are analyzed. Here's how it works:

### Are all repository files extracted and used for context on every PR review?

**No, the system does NOT extract all repository files.** It uses a selective, intelligent approach to minimize API calls and context size. Here's exactly what gets accessed:

#### Initial State
- When the system first starts, the Pinecone vector database index is empty
- The first few PRs analyzed will have minimal or no historical context
- The system gracefully handles empty context by falling back to rule-based analysis

#### Progressive Learning
- Each successful PR analysis adds new data to the vector database
- Over time, the system builds up a rich context of historical PRs and code patterns
- Later PRs benefit from increasingly relevant historical context

### Does the system store PR data after successful analysis?

**Yes, absolutely.** After each successful AI review, the system stores the PR data as embeddings for future context retrieval.

## What Repository Files Are Actually Accessed

### Files Included in PR Analysis

#### 1. **Changed Files Only (from PR)**
- **Source**: GitHub PR API (`pulls.listFiles`)
- **Content**: File patches/diffs (limited to first 1000 characters per file)
- **Purpose**: Direct analysis of code changes
- **Scope**: Only files modified in the current PR

#### 2. **Relevant Historical Files (selective)**
- **Source**: Vector database search + GitHub API fetch
- **Selection**: Only files similar to changed files (similarity > 0.6)
- **Limit**: Maximum 2 files per PR analysis
- **Content**: First 800 characters of file content
- **Purpose**: Provide context about similar code patterns

#### 3. **No Full Repository Scan**
- ❌ **Does NOT** fetch all repository files
- ❌ **Does NOT** scan entire codebase
- ❌ **Does NOT** download complete file contents
- ✅ **Only** accesses specific files based on relevance

### Selective File Retrieval Process

```typescript
// Step 1: Get changed files from PR
const changedFiles = await OctokitService.getPRFiles(installationId, repositoryName, prNumber);

// Step 2: For each changed file, find similar files (if any exist in vector DB)
for (const filename of changedFiles) {
  // Search vector database for similar files
  const searchResults = await index.query({
    vector: queryEmbedding,
    filter: { installationId, repositoryName, type: 'file' },
    topK: 3, // Maximum 3 similar files
    includeMetadata: true
  });
  
  // Only fetch files with high similarity (> 0.6)
  if (match.score > 0.6) {
    const fileContent = await OctokitService.getFileContent(installationId, repositoryName, filename);
    // Limit content to first 800 characters
    relevantFiles.push({ content: fileContent.substring(0, 800) });
  }
}
```

## Context Sent to AI Model

### What Actually Gets Analyzed

The AI model receives a **carefully curated context window** with these components:

#### 1. **PR Data (Priority 1 - Always Included)**
```
PULL REQUEST ANALYSIS:
Title: [PR Title]
Author: [Author]
Repository: [Repository Name]
PR Number: #[Number]

Description: [PR Description]

Changed Files:
- filename.js (modified, +15/-3)
- another.ts (added, +45/-0)

File Changes Details:
--- filename.js ---
[First 1000 characters of patch/diff]

--- another.ts ---
[First 1000 characters of patch/diff]
```

#### 2. **Similar PRs (Priority 2 - If Available)**
```
SIMILAR PULL REQUESTS (for context):
- PR #123: Similar feature (merged, similarity: 85.2%)
  Description: [First 200 characters]...
  Review feedback: [Top 2 review comments]
```

#### 3. **Relevant Files (Priority 3 - If Available)**
```
RELEVANT CODEBASE FILES:
--- utils/helper.js (javascript, similarity: 78.5%) ---
[First 800 characters of file content]...

--- components/Button.tsx (typescript, similarity: 72.1%) ---
[First 800 characters of file content]...
```

#### 4. **Project Standards (Priority 4 - If Available)**
```
PROJECT STANDARDS:
Code Quality: Consistent naming conventions
Description: Use camelCase for variables
Examples: userName, isActive
```

### Context Window Management

- **Token Limit**: 8,000 tokens (~32,000 characters)
- **Priority System**: Higher priority content included first
- **Truncation**: Content truncated if it exceeds limits
- **Fallback**: System works even with minimal context

## What Gets Stored in the Vector Database

### 1. Pull Request Embeddings
After each successful review, the system stores:

```typescript
// PR-level embedding
{
  id: `${installationId}:pr:${prNumber}`,
  values: [embedding_vector], // 384-dimensional vector
  metadata: {
    installationId: string,
    type: 'pr',
    repositoryName: string,
    prNumber: number,
    content: string, // PR title + description
    timestamp: string,
    title: string,
    linkedIssues: string, // JSON array of issue numbers
    reviewComments: string, // JSON array of AI suggestions
    outcome: 'open' | 'merged' | 'closed'
  }
}
```

### 2. File Change Embeddings
For each changed file in the PR:

```typescript
// File-level embedding
{
  id: `${installationId}:file:${prNumber}:${filename}`,
  values: [embedding_vector], // 384-dimensional vector
  metadata: {
    installationId: string,
    type: 'file',
    repositoryName: string,
    filename: string,
    content: string, // File path + changes (limited to 1000 chars)
    timestamp: string,
    language: string, // Detected programming language
    fileType: 'added' | 'modified' | 'removed' | 'renamed'
  }
}
```

## When Data Gets Stored

### During PR Analysis Workflow

The storage happens in **Step 7** of the AI Review Orchestration Service:

```typescript
// Step 7: Store context for future RAG queries
await this.storeContextForFutureUse(prData, finalResult);
```

This calls the RAG Context Service method:

```typescript
await this.ragContextService.storePRContext(prData, reviewResult);
```

### Storage Process Details

1. **PR Content Embedding**: Creates vector embedding from PR title and description
2. **File Change Embeddings**: Creates embeddings for each changed file's content
3. **Metadata Storage**: Stores rich metadata for filtering and retrieval
4. **Pinecone Upsert**: Stores all embeddings in the vector database

### Outcome Updates

When a PR is merged or closed, the system can update the outcome:

```typescript
await ragContextService.updatePROutcome(installationId, prNumber, 'merged');
```

This updates the metadata to reflect the final state of the PR.

## How Context Retrieval Works

### For New PRs

When analyzing a new PR, the system:

1. **Generates Query Embedding**: Creates embedding from current PR data
2. **Searches Similar PRs**: Finds historically similar PRs using vector similarity
3. **Retrieves Relevant Files**: Finds files similar to those being changed
4. **Extracts Patterns**: Identifies code patterns and project standards

### Search Process

```typescript
// Search for similar PRs
const searchResults = await index.query({
  vector: queryEmbedding,
  filter: {
    installationId: installationId,
    type: 'pr'
  },
  topK: 5, // Get top 5 similar PRs
  includeMetadata: true
});
```

### Similarity Threshold

- Only PRs with similarity score > 0.7 are considered relevant
- Only files with similarity score > 0.6 are included in context
- This ensures high-quality, relevant context

## Embedding Generation

### Primary Method: HuggingFace API
- Uses `sentence-transformers/all-MiniLM-L6-v2` model
- Generates 384-dimensional embeddings
- Requires `HUGGINGFACE_API_KEY` environment variable

### Fallback Method: Simple Text-Based Embeddings
When external APIs are unavailable, the system uses:
- Character frequency analysis (first 256 dimensions)
- Word-based features (next 128 dimensions)
- Programming-specific features (code patterns, imports, comments)

## Configuration

### Environment Variables
```bash
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=code-review-context-llama  # Default name
HUGGINGFACE_API_KEY=your_huggingface_api_key   # Optional, for better embeddings
```

### Index Requirements
- **Dimensions**: 384 (matches embedding model output)
- **Metric**: Cosine similarity
- **Pods**: Starts with 1 pod, can scale based on usage

## Data Lifecycle

### Initial Setup
1. Create empty Pinecone index with 384 dimensions
2. No pre-population required
3. System starts with empty context

### Growth Phase
1. First PRs analyzed with minimal context
2. Each analysis adds new embeddings
3. Context quality improves over time
4. System becomes more intelligent with usage

### Maintenance
1. **Automatic Updates**: PR outcomes updated when PRs are closed/merged
2. **No Manual Cleanup**: Embeddings persist indefinitely
3. **Scaling**: Pinecone handles scaling automatically

## Performance Characteristics

### Repository Access Patterns
- **GitHub API Calls per PR**: 2-5 calls typically
  - 1 call: Get PR details
  - 1 call: Get changed files list
  - 0-3 calls: Get relevant file contents (only if similar files found)
- **No Full Repository Scanning**: Avoids expensive full repo downloads
- **Content Limits**: 
  - PR patches: 1000 characters per file
  - Relevant files: 800 characters per file
  - Total context: ~8000 tokens (~32KB)

### Storage Volume
- **Per PR**: ~2-10 embeddings (1 PR + 1-9 files typically)
- **Per Embedding**: ~1.5KB (384 floats + metadata)
- **Monthly Volume**: Depends on PR frequency (typically 100-1000 PRs/month)

### Query Performance
- **Similarity Search**: ~50-200ms per query
- **Parallel Queries**: PR and file searches run in parallel
- **Caching**: Results cached within single analysis session

### Cost Optimization
- **Selective File Access**: Only fetches files when similarity > 0.6
- **Metadata Filtering**: Reduces search scope by installation/repository
- **Content Limits**: File patches limited to 1000 characters
- **Relevance Thresholds**: Only high-similarity results retrieved
- **API Rate Limiting**: Respects GitHub API limits with circuit breakers

## Error Handling

### Storage Failures
- **Non-blocking**: Storage failures don't break the main workflow
- **Logging**: Errors logged but analysis continues
- **Graceful Degradation**: System works without storage

### Retrieval Failures
- **Empty Context**: Returns empty context arrays
- **Fallback Analysis**: Continues with rule-based analysis only
- **No User Impact**: Users still get review results

## Future Enhancements

### Planned Improvements
1. **Repository File Indexing**: Index entire repository files for broader context
2. **Semantic Code Search**: Better code pattern recognition
3. **Cross-Repository Learning**: Learn from similar projects
4. **Automated Cleanup**: Remove outdated embeddings

### Scalability Considerations
1. **Sharding**: Separate indexes per organization for large deployments
2. **Compression**: Reduce embedding dimensions for storage efficiency
3. **Caching**: Add Redis layer for frequently accessed embeddings

## Summary

The AI Review System uses a **smart, selective approach** to repository file access:

### Repository File Access
- ❌ **Does NOT** extract all repository files
- ❌ **Does NOT** scan entire codebase on every PR
- ✅ **Only** accesses changed files from the PR (via GitHub API)
- ✅ **Selectively** fetches 0-2 relevant files based on similarity search
- ✅ **Limits** content to first 800-1000 characters per file
- ✅ **Respects** API rate limits with circuit breakers

### Vector Database Indexing
- ✅ **No pre-indexing required** - starts empty and learns over time
- ✅ **Automatic storage** - every successful PR analysis adds to the knowledge base
- ✅ **Graceful degradation** - works even when context is minimal or unavailable
- ✅ **Self-improving** - gets smarter with each PR analyzed
- ✅ **Installation-specific** - each GitHub installation has its own context

### Efficiency Benefits
- **Minimal API Usage**: 2-5 GitHub API calls per PR (not hundreds)
- **Fast Analysis**: No waiting for full repository downloads
- **Cost Effective**: Only pays for relevant file access
- **Scalable**: Works efficiently even with large repositories
- **Context-Aware**: Provides relevant historical context without overwhelming the AI

This approach ensures the system is immediately usable, cost-effective, and continuously improving while providing intelligent context-aware code reviews.