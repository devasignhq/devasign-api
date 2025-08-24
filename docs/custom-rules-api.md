# Custom Rules API Documentation

## Overview

The Custom Rules API allows organizations to define and manage their own code review rules beyond the default set. These rules can be pattern-based, configuration-driven, or type-specific to match your organization's coding standards and requirements.

## API Endpoints

All custom rules endpoints require user authentication and installation access validation.

### Base URL
```
/ai-rules/:installationId
```

### Authentication
All endpoints require a valid user token and the user must have access to the specified installation.

## Endpoints

### 1. Get All Custom Rules

**GET** `/ai-rules/:installationId`

Retrieves all custom rules for a specific installation.

#### Parameters
- `installationId` (path, required): GitHub installation ID

#### Query Parameters
- `active` (optional): Filter by active status (`true`/`false`)
- `ruleType` (optional): Filter by rule type (`CODE_QUALITY`, `SECURITY`, `PERFORMANCE`, `DOCUMENTATION`, `TESTING`, `CUSTOM`)
- `severity` (optional): Filter by severity (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`)

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "rule_123",
      "installationId": "inst_456",
      "name": "No console.log in production",
      "description": "Prevents console.log statements in production code",
      "ruleType": "CODE_QUALITY",
      "severity": "MEDIUM",
      "pattern": "console\\.log\\s*\\(",
      "config": {
        "metrics": ["code_cleanliness"],
        "excludeFiles": ["*.test.js", "*.spec.js"]
      },
      "active": true,
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "count": 1
}
```

### 2. Get Specific Custom Rule

**GET** `/ai-rules/:installationId/:ruleId`

Retrieves a specific custom rule by ID.

#### Parameters
- `installationId` (path, required): GitHub installation ID
- `ruleId` (path, required): Custom rule ID

#### Response
```json
{
  "success": true,
  "data": {
    "id": "rule_123",
    "installationId": "inst_456",
    "name": "No console.log in production",
    "description": "Prevents console.log statements in production code",
    "ruleType": "CODE_QUALITY",
    "severity": "MEDIUM",
    "pattern": "console\\.log\\s*\\(",
    "config": {
      "metrics": ["code_cleanliness"],
      "excludeFiles": ["*.test.js", "*.spec.js"]
    },
    "active": true,
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Create Custom Rule

**POST** `/ai-rules/:installationId`

Creates a new custom rule for the installation.

#### Parameters
- `installationId` (path, required): GitHub installation ID

#### Request Body
```json
{
  "name": "No hardcoded API keys",
  "description": "Detects potential hardcoded API keys in code",
  "ruleType": "SECURITY",
  "severity": "CRITICAL",
  "pattern": "(api[_-]?key|secret|token)\\s*[=:]\\s*['\"][^'\"]{8,}['\"]",
  "config": {
    "checks": ["hardcoded_secrets"],
    "excludeFiles": ["*.example.js", "*.template.js"],
    "description": "Scans for potential hardcoded secrets"
  },
  "active": true
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "rule_789",
    "installationId": "inst_456",
    "name": "No hardcoded API keys",
    "description": "Detects potential hardcoded API keys in code",
    "ruleType": "SECURITY",
    "severity": "CRITICAL",
    "pattern": "(api[_-]?key|secret|token)\\s*[=:]\\s*['\"][^'\"]{8,}['\"]",
    "config": {
      "checks": ["hardcoded_secrets"],
      "excludeFiles": ["*.example.js", "*.template.js"],
      "description": "Scans for potential hardcoded secrets"
    },
    "active": true,
    "createdAt": "2024-01-15T11:00:00Z",
    "updatedAt": "2024-01-15T11:00:00Z"
  },
  "message": "Custom rule created successfully"
}
```

### 4. Update Custom Rule

**PUT** `/ai-rules/:installationId/:ruleId`

Updates an existing custom rule.

#### Parameters
- `installationId` (path, required): GitHub installation ID
- `ruleId` (path, required): Custom rule ID

#### Request Body
```json
{
  "name": "Updated rule name",
  "description": "Updated description",
  "severity": "HIGH",
  "active": false,
  "config": {
    "checks": ["updated_checks"],
    "excludeFiles": ["*.test.js"]
  }
}
```

#### Response
```json
{
  "success": true,
  "data": {
    "id": "rule_789",
    "installationId": "inst_456",
    "name": "Updated rule name",
    "description": "Updated description",
    "ruleType": "SECURITY",
    "severity": "HIGH",
    "pattern": "(api[_-]?key|secret|token)\\s*[=:]\\s*['\"][^'\"]{8,}['\"]",
    "config": {
      "checks": ["updated_checks"],
      "excludeFiles": ["*.test.js"]
    },
    "active": false,
    "createdAt": "2024-01-15T11:00:00Z",
    "updatedAt": "2024-01-15T11:30:00Z"
  },
  "message": "Custom rule updated successfully"
}
```

### 5. Delete Custom Rule

**DELETE** `/ai-rules/:installationId/:ruleId`

Deletes a custom rule.

#### Parameters
- `installationId` (path, required): GitHub installation ID
- `ruleId` (path, required): Custom rule ID

#### Response
```json
{
  "success": true,
  "message": "Custom rule deleted successfully"
}
```

### 6. Get Default Rules

**GET** `/ai-rules/default`

Retrieves the default rules available to all installations. No authentication required.

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "default-no-console-log",
      "name": "No console.log statements",
      "description": "Code should not contain console.log statements in production",
      "ruleType": "CODE_QUALITY",
      "severity": "MEDIUM",
      "pattern": "console\\.log\\s*\\(",
      "config": {
        "metrics": ["code_cleanliness"],
        "excludeFiles": ["*.test.js", "*.test.ts", "*.spec.js", "*.spec.ts"]
      }
    }
  ],
  "count": 6
}
```

## Rule Types

### CODE_QUALITY
Rules that check for code style, maintainability, and general quality issues.

**Required config fields:**
- `metrics`: Array of metrics this rule affects

**Example:**
```json
{
  "ruleType": "CODE_QUALITY",
  "config": {
    "metrics": ["code_cleanliness", "maintainability"],
    "excludeFiles": ["*.test.js"]
  }
}
```

### SECURITY
Rules that identify potential security vulnerabilities or issues.

**Required config fields:**
- `checks`: Array of security checks this rule performs

**Example:**
```json
{
  "ruleType": "SECURITY",
  "config": {
    "checks": ["hardcoded_secrets", "sql_injection"],
    "description": "Detects security vulnerabilities"
  }
}
```

### PERFORMANCE
Rules that identify performance issues or inefficient code patterns.

**Required config fields:**
- `thresholds`: Object containing performance thresholds

**Example:**
```json
{
  "ruleType": "PERFORMANCE",
  "config": {
    "thresholds": {
      "maxCyclomaticComplexity": 10,
      "maxLinesPerFunction": 50
    }
  }
}
```

### DOCUMENTATION
Rules that ensure proper documentation of code.

**Required config fields:**
- `requirements`: Array of documentation requirements

**Example:**
```json
{
  "ruleType": "DOCUMENTATION",
  "config": {
    "requirements": ["public_functions", "exported_classes"],
    "description": "Ensures proper documentation"
  }
}
```

### TESTING
Rules that check for adequate test coverage and testing practices.

**Required config fields:**
- `coverage`: Object containing coverage requirements

**Example:**
```json
{
  "ruleType": "TESTING",
  "config": {
    "coverage": {
      "minimum": 80,
      "excludeFiles": ["*.config.js"]
    }
  }
}
```

### CUSTOM
Flexible rules that don't fit into other categories.

**Required config fields:**
- `description`: Description of what the rule checks

**Example:**
```json
{
  "ruleType": "CUSTOM",
  "config": {
    "description": "Custom organizational rule",
    "customLogic": "specific_to_organization"
  }
}
```

## Severity Levels

- **LOW**: Minor issues that don't significantly impact code quality
- **MEDIUM**: Moderate issues that should be addressed
- **HIGH**: Important issues that impact code quality or security
- **CRITICAL**: Severe issues that must be fixed before merging

## Pattern Matching

Rules can use regular expressions for pattern matching. The pattern is applied to the changed code in pull requests.

### Pattern Examples

**Detect console.log:**
```regex
console\.log\s*\(
```

**Detect hardcoded secrets:**
```regex
(api[_-]?key|password|secret|token)\s*[=:]\s*['"][^'"]{8,}['"]
```

**Detect TODO comments:**
```regex
//\s*TODO|#\s*TODO
```

## File Exclusion

Rules can exclude certain files using glob patterns in the `excludeFiles` config:

```json
{
  "excludeFiles": [
    "*.test.js",
    "*.spec.ts",
    "**/__tests__/**",
    "*.config.js"
  ]
}
```

## Error Responses

### Validation Errors
```json
{
  "success": false,
  "error": "Rule name is required",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Not Found Errors
```json
{
  "success": false,
  "error": "Custom rule not found",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Access Denied Errors
```json
{
  "success": false,
  "error": "Installation not found or access denied",
  "timestamp": "2024-01-15T12:00:00Z"
}
```

## Usage Examples

### Creating a Security Rule
```javascript
const response = await fetch('/ai-rules/inst_123', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    name: 'No eval() usage',
    description: 'Prevents use of eval() function for security',
    ruleType: 'SECURITY',
    severity: 'CRITICAL',
    pattern: '\\beval\\s*\\(',
    config: {
      checks: ['dangerous_functions'],
      description: 'Detects eval() usage which can be dangerous'
    },
    active: true
  })
});
```

### Updating Rule Status
```javascript
const response = await fetch('/ai-rules/inst_123/rule_456', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-token'
  },
  body: JSON.stringify({
    active: false
  })
});
```

### Filtering Rules
```javascript
// Get only active security rules
const response = await fetch('/ai-rules/inst_123?active=true&ruleType=SECURITY');

// Get only critical severity rules
const response = await fetch('/ai-rules/inst_123?severity=CRITICAL');
```

This API provides comprehensive control over custom rules, allowing organizations to tailor the AI review system to their specific needs and coding standards.