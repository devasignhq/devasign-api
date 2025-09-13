module.exports = {
    // Use ts-jest preset for TypeScript support
    preset: 'ts-jest',

    // Set test environment to Node.js
    testEnvironment: 'node',

    // Setup files to run after Jest environment is set up
    setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],

    // Test file patterns
    testMatch: [
        '<rootDir>/tests/**/*.test.ts',
        '<rootDir>/tests/**/*.spec.ts',
        '<rootDir>/tests/**/*.test.js',
        '<rootDir>/tests/**/*.spec.js'
    ],

    // Module name mapping for path aliases
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/api/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1'
    },

    // Coverage configuration
    collectCoverageFrom: [
        'api/**/*.ts',
        '!api/**/*.d.ts',
        '!api/index.ts',
        '!api/**/test_routes/**',
        '!**/node_modules/**',
        '!**/dist/**'
    ],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80
        }
    },

    // Coverage reporters
    coverageReporters: [
        'text',
        'text-summary',
        'html',
        'lcov'
    ],

    // Coverage directory
    coverageDirectory: 'coverage',

    // File extensions to consider
    moduleFileExtensions: ['ts', 'js', 'json'],

    // Ignore patterns
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/coverage/'
    ],

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks after each test
    restoreMocks: true,

    // Timeout for tests (500 seconds)
    testTimeout: 500000
};