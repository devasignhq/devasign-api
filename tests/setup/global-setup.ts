import dotenv from "dotenv";
import path from "path";

export default async function globalSetup() {
    // Load test environment variables
    dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

    console.log("🚀 Starting global test setup...");

    // Set NODE_ENV to test
    process.env.NODE_ENV = "test";

    // Initialize test database if needed
    if (process.env.TEST_DB_RESET === "true") {
        console.log("📊 Preparing test database...");
        // Database setup will be handled in individual test suites
    }

    // Setup mock services
    if (process.env.MOCK_EXTERNAL_SERVICES === "true") {
        console.log("🎭 Configuring mock services...");
        // Mock service configuration will be handled in vitest.setup.ts
    }

    console.log("✅ Global test setup completed");
}
