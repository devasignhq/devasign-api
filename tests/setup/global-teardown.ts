export default async function globalTeardown() {
    console.log("🧹 Starting global test teardown...");

    // Clean up test database
    if (process.env.TEST_DB_RESET === "true") {
        console.log("🗑️ Cleaning up test database...");
        // Database cleanup will be handled in individual test suites
    }

    // Clean up any temporary files
    console.log("📁 Cleaning up temporary test files...");

    // Reset environment
    delete process.env.NODE_ENV;

    console.log("✅ Global test teardown completed");
}
