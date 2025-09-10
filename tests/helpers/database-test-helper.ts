import { PrismaClient } from '../../api/generated/client';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * DatabaseTestHelper provides utilities for managing test databases
 * Supports both in-memory SQLite for unit tests and Docker PostgreSQL for integration tests
 */
export class DatabaseTestHelper {
    private static unitTestClient: PrismaClient | null = null;
    private static integrationTestClient: PrismaClient | null = null;
    private static isDockerRunning = false;

    /**
     * Setup database for unit tests using in-memory SQLite
     */
    static async setupUnitTestDatabase(): Promise<PrismaClient> {
        if (this.unitTestClient) {
            return this.unitTestClient;
        }

        // Configure SQLite database URL for unit tests
        const sqliteUrl = 'file:./test-unit.db';
        process.env.DATABASE_URL = sqliteUrl;

        // Create Prisma client for SQLite
        this.unitTestClient = new PrismaClient({
            datasources: {
                db: {
                    url: sqliteUrl
                }
            },
            log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error']
        });

        try {
            // Connect to database
            await this.unitTestClient.$connect();

            // Run migrations for SQLite
            await this.runMigrations('sqlite');

            console.log('✅ Unit test database (SQLite) setup completed');
            return this.unitTestClient;
        } catch (error) {
            console.error('❌ Failed to setup unit test database:', error);
            throw error;
        }
    }

    /**
     * Setup database for integration tests using Docker PostgreSQL
     */
    static async setupIntegrationTestDatabase(): Promise<PrismaClient> {
        if (this.integrationTestClient) {
            return this.integrationTestClient;
        }

        // Start Docker PostgreSQL container if not running
        await this.startDockerPostgres();

        // Configure PostgreSQL database URL for integration tests
        const postgresUrl = process.env.INTEGRATION_DATABASE_URL ||
            'postgresql://test_user:test_password@localhost:5433/test_db';

        process.env.DATABASE_URL = postgresUrl;

        // Create Prisma client for PostgreSQL
        this.integrationTestClient = new PrismaClient({
            datasources: {
                db: {
                    url: postgresUrl
                }
            },
            log: process.env.NODE_ENV === 'test' ? [] : ['query', 'info', 'warn', 'error']
        });

        try {
            // Wait for database to be ready
            await this.waitForDatabase(this.integrationTestClient);

            // Connect to database
            await this.integrationTestClient.$connect();

            // Run migrations for PostgreSQL
            await this.runMigrations('postgresql');

            console.log('✅ Integration test database (PostgreSQL) setup completed');
            return this.integrationTestClient;
        } catch (error) {
            console.error('❌ Failed to setup integration test database:', error);
            throw error;
        }
    }

    /**
     * Start Docker PostgreSQL container for integration tests
     */
    private static async startDockerPostgres(): Promise<void> {
        if (this.isDockerRunning) {
            return;
        }

        try {
            // Check if container already exists and is running
            const containerStatus = execSync(
                'docker ps --filter "name=test-postgres" --format "{{.Status}}"',
                { encoding: 'utf8', stdio: 'pipe' }
            ).trim();

            if (containerStatus.includes('Up')) {
                console.log('📦 Docker PostgreSQL container already running');
                this.isDockerRunning = true;
                return;
            }

            // Stop and remove existing container if it exists
            try {
                execSync('docker stop test-postgres', { stdio: 'pipe' });
                execSync('docker rm test-postgres', { stdio: 'pipe' });
            } catch {
                // Container doesn't exist, continue
            }

            // Start new PostgreSQL container
            console.log('🐳 Starting Docker PostgreSQL container...');
            execSync(`
                docker run -d \
                --name test-postgres \
                -e POSTGRES_USER=test_user \
                -e POSTGRES_PASSWORD=test_password \
                -e POSTGRES_DB=test_db \
                -p 5433:5432 \
                postgres:13-alpine
            `, { stdio: 'pipe' });

            this.isDockerRunning = true;
            console.log('✅ Docker PostgreSQL container started');

            // Wait a moment for container to fully start
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (error) {
            console.error('❌ Failed to start Docker PostgreSQL:', error);
            throw new Error('Docker PostgreSQL setup failed. Make sure Docker is installed and running.');
        }
    }

    /**
     * Wait for database to be ready for connections
     */
    private static async waitForDatabase(client: PrismaClient, maxRetries = 30): Promise<void> {
        for (let i = 0; i < maxRetries; i++) {
            try {
                await client.$queryRaw`SELECT 1`;
                return;
            } catch (error) {
                if (i === maxRetries - 1) {
                    throw new Error(`Database not ready after ${maxRetries} attempts`);
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    /**
     * Run database migrations
     */
    private static async runMigrations(provider: 'sqlite' | 'postgresql'): Promise<void> {
        try {
            if (provider === 'sqlite') {
                // For SQLite, we need to push the schema directly since migrations might not work
                execSync('npx prisma db push --force-reset', {
                    stdio: 'pipe',
                    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
                });
            } else {
                // For PostgreSQL, run migrations
                execSync('npx prisma migrate deploy', {
                    stdio: 'pipe',
                    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
                });
            }
            console.log(`✅ Database migrations completed for ${provider}`);
        } catch (error) {
            console.error(`❌ Failed to run migrations for ${provider}:`, error);
            throw error;
        }
    }

    /**
     * Clean up unit test database
     */
    static async cleanupUnitTestDatabase(): Promise<void> {
        if (this.unitTestClient) {
            try {
                await this.unitTestClient.$disconnect();
                this.unitTestClient = null;

                // Remove SQLite database file
                const dbPath = path.resolve('./test-unit.db');
                if (fs.existsSync(dbPath)) {
                    fs.unlinkSync(dbPath);
                }

                console.log('✅ Unit test database cleanup completed');
            } catch (error) {
                console.error('❌ Failed to cleanup unit test database:', error);
            }
        }
    }

    /**
     * Clean up integration test database
     */
    static async cleanupIntegrationTestDatabase(): Promise<void> {
        if (this.integrationTestClient) {
            try {
                await this.integrationTestClient.$disconnect();
                this.integrationTestClient = null;
                console.log('✅ Integration test database cleanup completed');
            } catch (error) {
                console.error('❌ Failed to cleanup integration test database:', error);
            }
        }

        // Stop Docker container
        if (this.isDockerRunning) {
            try {
                execSync('docker stop test-postgres', { stdio: 'pipe' });
                execSync('docker rm test-postgres', { stdio: 'pipe' });
                this.isDockerRunning = false;
                console.log('✅ Docker PostgreSQL container stopped');
            } catch (error) {
                console.error('❌ Failed to stop Docker container:', error);
            }
        }
    }

    /**
     * Reset database by clearing all data
     */
    static async resetDatabase(client: PrismaClient): Promise<void> {
        try {
            // Get all table names from the schema
            const tables = await client.$queryRaw<Array<{ tablename: string }>>`
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            `;

            // Disable foreign key checks and truncate all tables
            await client.$executeRaw`SET session_replication_role = replica;`;

            for (const table of tables) {
                if (table.tablename !== '_prisma_migrations') {
                    await client.$executeRawUnsafe(`TRUNCATE TABLE "${table.tablename}" CASCADE;`);
                }
            }

            await client.$executeRaw`SET session_replication_role = DEFAULT;`;

            console.log('✅ Database reset completed');
        } catch (error) {
            // Fallback for SQLite or if the above doesn't work
            try {
                await client.$executeRaw`PRAGMA foreign_keys = OFF;`;

                // For SQLite, delete from tables in reverse dependency order
                const deleteOrder = [
                    'TaskActivity',
                    'TaskSubmission',
                    'Transaction',
                    'AIReviewResult',
                    'AIReviewRule',
                    'ContextAnalysisMetrics',
                    'UserInstallationPermission',
                    'Task',
                    'ContributionSummary',
                    'User',
                    'Installation',
                    'SubscriptionPackage',
                    'Permission'
                ];

                for (const table of deleteOrder) {
                    await client.$executeRawUnsafe(`DELETE FROM "${table}";`);
                }

                await client.$executeRaw`PRAGMA foreign_keys = ON;`;
                console.log('✅ Database reset completed (SQLite fallback)');
            } catch (fallbackError) {
                console.error('❌ Failed to reset database:', fallbackError);
                throw fallbackError;
            }
        }
    }

    /**
     * Seed database with basic test data
     */
    static async seedDatabase(client: PrismaClient): Promise<void> {
        try {
            // Create default subscription package
            await client.subscriptionPackage.create({
                data: {
                    id: 'test-package-id',
                    name: 'Test Package',
                    description: 'Test subscription package',
                    maxTasks: 10,
                    maxUsers: 5,
                    paid: false,
                    price: 0,
                    active: true
                }
            });

            // Create default permissions
            const permissions = [
                { code: 'ADMIN', name: 'Administrator', isDefault: false },
                { code: 'MANAGE_TASKS', name: 'Manage Tasks', isDefault: true },
                { code: 'VIEW_TASKS', name: 'View Tasks', isDefault: true },
                { code: 'APPLY_TASKS', name: 'Apply to Tasks', isDefault: true }
            ];

            for (const permission of permissions) {
                await client.permission.create({ data: permission });
            }

            console.log('✅ Database seeding completed');
        } catch (error) {
            console.error('❌ Failed to seed database:', error);
            throw error;
        }
    }

    /**
     * Get the appropriate database client for the current test type
     */
    static getClient(testType: 'unit' | 'integration' = 'unit'): PrismaClient {
        if (testType === 'unit') {
            if (!this.unitTestClient) {
                throw new Error('Unit test database not initialized. Call setupUnitTestDatabase() first.');
            }
            return this.unitTestClient;
        } else {
            if (!this.integrationTestClient) {
                throw new Error('Integration test database not initialized. Call setupIntegrationTestDatabase() first.');
            }
            return this.integrationTestClient;
        }
    }

    /**
     * Execute a function within a database transaction that will be rolled back
     * Useful for test isolation
     */
    static async withTransaction<T>(
        client: PrismaClient,
        fn: (tx: any) => Promise<T>
    ): Promise<T> {
        return await client.$transaction(async (tx) => {
            const result = await fn(tx);
            // Transaction will be automatically rolled back if an error is thrown
            throw new Error('ROLLBACK_TRANSACTION'); // Force rollback for testing
        }).catch((error) => {
            if (error.message === 'ROLLBACK_TRANSACTION') {
                // This is expected for test isolation
                return undefined as T;
            }
            throw error;
        });
    }
}