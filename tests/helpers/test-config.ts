import dotenv from 'dotenv';
import path from 'path';

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

export const testConfig = {
    // Database configuration
    database: {
        url: process.env.TEST_DATABASE_URL || 'file:./test.db',
        integrationUrl: process.env.INTEGRATION_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/test_db',
        reset: process.env.TEST_DB_RESET === 'true',
    },

    // API configuration
    api: {
        port: parseInt(process.env.PORT || '8081', 10),
        timeout: parseInt(process.env.TEST_TIMEOUT || '500000', 10),
    },

    // External services configuration
    services: {
        mockExternal: process.env.MOCK_EXTERNAL_SERVICES === 'true',
        firebase: {
            projectId: process.env.FIREBASE_PROJECT_ID || 'test-project',
            privateKey: process.env.FIREBASE_PRIVATE_KEY || 'test-private-key',
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'test@test-project.iam.gserviceaccount.com',
        },
        github: {
            accessToken: process.env.GITHUB_ACCESS_TOKEN || 'test_token',
            appId: parseInt(process.env.GITHUB_APP_ID || '123456', 10),
            privateKey: process.env.GITHUB_APP_PRIVATE_KEY || 'test-private-key',
            webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'test-webhook-secret',
        },
        ai: {
            groqApiKey: process.env.GROQ_API_KEY || 'test-groq-key',
            huggingfaceApiKey: process.env.HUGGINGFACE_API_KEY || 'test-hf-key',
            openaiApiKey: process.env.OPENAI_API_KEY || 'test-openai-key',
        },
        stellar: {
            horizonUrl: process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org',
            network: process.env.STELLAR_NETWORK || 'testnet',
            masterPublicKey: process.env.STELLAR_MASTER_PUBLIC_KEY || 'test-public-key',
            masterSecretKey: process.env.STELLAR_MASTER_SECRET_KEY || 'test-secret-key',
        },
        pinecone: {
            apiKey: process.env.PINECONE_API_KEY || 'test-pinecone-key',
            indexName: process.env.PINECONE_INDEX_NAME || 'test-index',
        },
    },

    // Test-specific configuration
    test: {
        enableMetrics: process.env.ENABLE_INTELLIGENT_CONTEXT_METRICS === 'true',
        intelligentContextEnabled: process.env.INTELLIGENT_CONTEXT_ENABLED === 'true',
        maxIntelligentContextTime: parseInt(process.env.MAX_INTELLIGENT_CONTEXT_TIME || '5000', 10),
        fallbackOnError: process.env.FALLBACK_ON_INTELLIGENT_CONTEXT_ERROR === 'true',
    },

    // Security configuration
    security: {
        encryptionKey: process.env.ENCRYPTION_KEY || 'test-encryption-key-for-testing-purposes-only',
    },

    // App configuration
    app: {
        contributorAppUrl: process.env.CONTRIBUTOR_APP_URL || 'http://localhost:4001',
        defaultSubscriptionPackageId: process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID || 'test-package-id',
    },
};

export default testConfig;