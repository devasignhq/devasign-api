import { execSync } from "child_process";
import { PrismaClient } from "../../prisma_client";

/**
 * DatabaseTestHelper provides utilities for managing test databases
 * Supports both in-memory SQLite for unit tests and Docker PostgreSQL for integration tests
 */
export class DatabaseTestHelper {
    private static testClient: PrismaClient | null = null;
    private static isDockerRunning = false;

    /**
     * Setup database for tests using PostgreSQL
     */
    static async setupTestDatabase(): Promise<PrismaClient> {
        if (this.testClient) {
            return this.testClient;
        }

        // Start Docker PostgreSQL container if not running
        await this.startDockerPostgres();

        // Configure PostgreSQL database URL for unit tests
        const unitTestDbUrl = process.env.DATABASE_URL ||
            "postgresql://test_user:test_password@localhost:5433/test_db";

        // Set the environment variable
        process.env.DATABASE_URL = unitTestDbUrl;

        // Create Prisma client
        this.testClient = new PrismaClient({
            datasources: {
                db: {
                    url: unitTestDbUrl
                }
            },
            log: process.env.NODE_ENV === "test" ? [] : ["query", "info", "warn", "error"]
        });

        try {
            // Connect to database
            await this.testClient.$connect();

            console.log("✅ Unit test database (PostgreSQL) setup completed");
            return this.testClient;
        } catch (error) {
            console.error("❌ Failed to setup unit test database:", error);
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
            execSync("docker start test-postgres");
            await new Promise(resolve => setTimeout(resolve, 7000));
            this.isDockerRunning = true;
        } catch (error) {
            console.log("Error starting test container:", error);

            try {
                // Start new PostgreSQL container
                console.log("🐳 Starting Docker PostgreSQL container...");
                execSync("docker run --name test-postgres -e POSTGRES_USER=test_user -e POSTGRES_PASSWORD=test_password -e POSTGRES_DB=test_db -p 5433:5432 -d pgvector/pgvector:pg16");

                // Wait for container to start
                await new Promise(resolve => setTimeout(resolve, 5000));

                execSync("npx prisma migrate deploy");

                // Wait for migration to be completed
                await new Promise(resolve => setTimeout(resolve, 5000));

                // docker run --name test-postgres -e POSTGRES_USER=test_user -e POSTGRES_PASSWORD=test_password -e POSTGRES_DB=test_db -p 5433:5432 -d postgres
                // npx prisma migrate deploy
                // npm run prisma-gen

                this.isDockerRunning = true;
            } catch (error) {
                console.error("❌ Failed to start Docker PostgreSQL:", error);
                throw new Error("Docker PostgreSQL setup failed. Make sure Docker is installed and running.");
            }
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
            } catch {
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
    private static async runMigrations(): Promise<void> {
        try {
            execSync("npx prisma migrate deploy", {
                stdio: "pipe",
                env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL }
            });
            console.log("✅ Database schema pushed");
        } catch (error) {
            console.error("❌ Failed to push schema:", error);
            throw error;
        }
    }

    /**
     * Clean up test database
     */
    static async cleanupTestDatabase(): Promise<void> {
        if (this.testClient) {
            try {
                await this.testClient.$disconnect();
                this.testClient = null;
                console.log("✅ Integration test database cleanup completed");
            } catch (error) {
                console.error("❌ Failed to cleanup integration test database:", error);
            }
        }

        // Stop Docker container
        if (this.isDockerRunning) {
            try {
                execSync("docker stop test-postgres", { stdio: "pipe" });
                execSync("docker rm test-postgres", { stdio: "pipe" });
                this.isDockerRunning = false;
                console.log("✅ Docker PostgreSQL container stopped");
            } catch (error) {
                console.error("❌ Failed to stop Docker container:", error);
            }
        }
    }

    /**
     * Reset database by clearing all data
     */
    static async resetDatabase(client: PrismaClient): Promise<void> {
        try {
            await client.transaction.deleteMany();
            await client.taskSubmission.deleteMany();
            await client.taskActivity.deleteMany();
            await client.userInstallationPermission.deleteMany();
            await client.task.deleteMany();
            await client.contributionSummary.deleteMany();
            await client.installation.deleteMany();
            await client.user.deleteMany();
            await client.wallet.deleteMany();
            await client.permission.deleteMany();
            await client.subscriptionPackage.deleteMany();

            console.log("✅ Database reset completed");
        } catch (error) {
            console.error("❌ Failed to reset database:", error);
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
                    id: "test-package-id",
                    name: "Test Package",
                    description: "Test subscription package",
                    maxTasks: 10,
                    maxUsers: 5,
                    paid: false,
                    price: 0,
                    active: true
                }
            });

            // Create default permissions
            const permissions = [
                { code: "ADMIN", name: "Administrator", isDefault: false },
                { code: "MANAGE_TASKS", name: "Manage Tasks", isDefault: true },
                { code: "VIEW_TASKS", name: "View Tasks", isDefault: true },
                { code: "APPLY_TASKS", name: "Apply to Tasks", isDefault: true }
            ];

            for (const permission of permissions) {
                await client.permission.create({ data: permission });
            }

            console.log("✅ Database seeding completed");
        } catch (error) {
            console.error("❌ Failed to seed database:", error);
            throw error;
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
        let result: T;

        try {
            await client.$transaction(async (tx) => {
                result = await fn(tx);
                // Force rollback by throwing an error
                throw new Error("ROLLBACK_TRANSACTION");
            });
        } catch (error: any) {
            if (error.message === "ROLLBACK_TRANSACTION") {
                // This is expected for test isolation
                return result!;
            }
            throw error;
        }

        return result!;
    }
}
