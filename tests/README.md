# Testing Infrastructure

This directory contains the comprehensive testing infrastructure for the DevAsign server application.

## Directory Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   ├── controllers/        # Controller tests
│   ├── middlewares/        # Middleware tests
│   ├── validators/         # Validator tests
│   └── models/            # Model tests
├── integration/            # Integration tests
│   ├── api/               # API endpoint tests
│   ├── database/          # Database integration tests
│   └── workflows/         # End-to-end workflow tests
├── fixtures/              # Test data and fixtures
├── helpers/               # Test utility functions
├── mocks/                 # Mock implementations
├── setup/                 # Test environment setup
└── README.md              # This file
```

## Configuration

### Jest Configuration
- **File**: `jest.config.js` (root directory)
- **Preset**: `ts-jest` for TypeScript support
- **Environment**: Node.js
- **Coverage**: 80% minimum, higher for critical components
- **Timeout**: 30 seconds per test

### Environment Configuration
- **Test Environment**: `.env.test`
- **Database**: In-memory SQLite for unit tests, Docker PostgreSQL for integration tests
- **External Services**: Mocked by default

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### Watch Mode
```bash
npm run test:watch
```

### Coverage Report
```bash
npm run test:coverage
```

### CI Mode
```bash
npm run test:ci
```

## Test Utilities

### Test Configuration
- `tests/helpers/test-config.ts` - Centralized test configuration
- `tests/helpers/test-utils.ts` - Common test utilities and helpers

### Mock Utilities
- Mock Express request/response objects
- Mock external services (Firebase, GitHub, AI services)
- Database test helpers

### Custom Matchers
- `toBeValidDate()` - Validates Date objects
- `toBeValidUUID()` - Validates UUID format
- `toHaveValidationError(field)` - Validates API error responses
- `toMatchAPIResponse(schema)` - Validates API response structure

## Writing Tests

### Unit Tests
```typescript
import { createMockRequest, createMockResponse } from '@tests/helpers/test-utils';
import { testConfig } from '@tests/helpers/test-config';

describe('ServiceName', () => {
  it('should perform expected behavior', () => {
    // Test implementation
  });
});
```

### Integration Tests
```typescript
import request from 'supertest';
import app from '@/index';

describe('API Endpoint', () => {
  it('should return expected response', async () => {
    const response = await request(app)
      .get('/api/endpoint')
      .expect(200);
    
    expect(response.body).toMatchAPIResponse(expectedSchema);
  });
});
```

## Coverage Requirements

- **Global Minimum**: 80%
- **Services**: 90%
- **Middlewares**: 90%
- **Validators**: 95%
- **Controllers**: 85%

## Database Testing

### Unit Tests
- Use in-memory SQLite database
- Automatic cleanup between tests
- Factory functions for test data generation

### Integration Tests
- Use Docker PostgreSQL container
- Real database operations
- Transaction rollback for test isolation

## Mock Services

All external services are mocked by default:
- Firebase Admin SDK
- GitHub API (Octokit)
- AI Services (Groq, OpenAI, Hugging Face)
- Stellar SDK
- Pinecone Vector Database

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Descriptive Names**: Use clear, descriptive test names
3. **Arrange-Act-Assert**: Follow the AAA pattern
4. **Mock External Dependencies**: Don't rely on external services
5. **Test Edge Cases**: Include error scenarios and edge cases
6. **Keep Tests Fast**: Unit tests should run quickly
7. **Use Factories**: Use factory functions for test data
8. **Clean Up**: Ensure proper cleanup after tests

## Troubleshooting

### Common Issues

1. **Tests Timeout**: Increase timeout in Jest configuration
2. **Database Connection**: Check test database configuration
3. **Mock Issues**: Verify mock implementations in setup files
4. **TypeScript Errors**: Check tsconfig.json includes test files

### Debug Mode
```bash
# Run tests with debug output
npm test -- --verbose

# Run specific test file
npm test -- tests/path/to/test.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="pattern"
```

## CI/CD Integration

Tests are automatically run in GitHub Actions:
- On every push to repository
- On pull request creation
- Coverage reports are generated
- Tests must pass before deployment

## Performance Testing

Performance tests are located in `tests/integration/performance/`:
- Load testing for critical endpoints
- Memory usage monitoring
- Response time benchmarks
- Concurrent user scenarios