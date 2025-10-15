import { DatabaseTestHelper } from "../database-test-helper";
import { DatabaseTestUtilities } from "../database-test-utilities";
import { TestDataFactory } from "../test-data-factory";

describe("DatabaseTestUtilities", () => {
    let dbUtils: DatabaseTestUtilities;
    let client: any;

    beforeAll(async () => {
        client = await DatabaseTestHelper.setupTestDatabase();
        dbUtils = new DatabaseTestUtilities(client);
    });

    afterAll(async () => {
        await DatabaseTestHelper.cleanupTestDatabase();
    });

    beforeEach(async () => {
        await dbUtils.cleanupDatabase();
        TestDataFactory.resetCounters();
    });

    describe("seedDatabase", () => {
        it("should seed database with comprehensive test data", async () => {
            const seedData = await dbUtils.seedDatabase();

            expect(seedData.users).toHaveLength(4);
            expect(seedData.installations).toHaveLength(2);
            expect(seedData.tasks).toHaveLength(6); // 3 tasks per installation
            expect(seedData.subscriptionPackages).toHaveLength(2);
            expect(seedData.permissions).toHaveLength(6);

            // Verify data was actually created in database
            const stats = await dbUtils.getDatabaseStats();
            expect(stats.users).toBe(4);
            expect(stats.installations).toBe(2);
            expect(stats.tasks).toBe(6);
        });
    });

    describe("seedMinimalData", () => {
        it("should seed database with minimal test data", async () => {
            const seedData = await dbUtils.seedMinimalData();

            expect(seedData.user).toBeDefined();
            expect(seedData.installation).toBeDefined();
            expect(seedData.task).toBeDefined();
            expect(seedData.subscriptionPackage).toBeDefined();
            expect(seedData.permission).toBeDefined();

            // Verify minimal data was created
            const stats = await dbUtils.getDatabaseStats();
            expect(stats.users).toBe(1);
            expect(stats.installations).toBe(1);
            expect(stats.tasks).toBe(1);
        });
    });

    describe("cleanupDatabase", () => {
        it("should remove all test data from database", async () => {
            // First seed some data
            await dbUtils.seedMinimalData();
            
            // Verify data exists
            let isEmpty = await dbUtils.isDatabaseEmpty();
            expect(isEmpty).toBe(false);

            // Clean up
            await dbUtils.cleanupDatabase();

            // Verify data is gone
            isEmpty = await dbUtils.isDatabaseEmpty();
            expect(isEmpty).toBe(true);
        });
    });

    describe("resetAndSeed", () => {
        it("should clean database and reseed with fresh data", async () => {
            // Seed initial data
            await dbUtils.seedMinimalData();
            
            // Reset and seed comprehensive data
            const seedData = await dbUtils.resetAndSeed();

            expect(seedData.users).toHaveLength(4);
            expect(seedData.installations).toHaveLength(2);
            
            const stats = await dbUtils.getDatabaseStats();
            expect(stats.users).toBe(4);
            expect(stats.installations).toBe(2);
        });
    });

    describe("withTransaction", () => {
        it("should execute function within transaction and rollback changes", async () => {
            // Seed initial data
            await dbUtils.seedMinimalData();
            
            const initialStats = await dbUtils.getDatabaseStats();
            
            // Execute function within transaction
            const result = await dbUtils.withTransaction(async (tx) => {
                // Create additional user within transaction
                await tx.user.create({
                    data: TestDataFactory.user({
                        userId: "transaction-test-user",
                        username: "transactionuser"
                    })
                });
                
                return "test-result";
            });

            expect(result).toBe("test-result");
            
            // Verify changes were rolled back
            const finalStats = await dbUtils.getDatabaseStats();
            expect(finalStats.users).toBe(initialStats.users);
        });
    });

    describe("getDatabaseStats", () => {
        it("should return accurate database statistics", async () => {
            const seedData = await dbUtils.seedDatabase();
            const stats = await dbUtils.getDatabaseStats();

            expect(stats.users).toBe(seedData.users.length);
            expect(stats.installations).toBe(seedData.installations.length);
            expect(stats.tasks).toBe(seedData.tasks.length);
            expect(stats.subscriptionPackages).toBe(seedData.subscriptionPackages.length);
            expect(stats.permissions).toBe(seedData.permissions.length);
        });
    });
});
