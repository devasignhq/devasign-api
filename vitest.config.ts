import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
    test: {
        // Enable global test APIs (describe, it, expect, etc.)
        globals: true,

        // Use Node.js environment for server-side testing
        environment: "node",

        // Set test root directory to the new Vitest tests folder
        root: "./tests",

        // Setup files to run before each test file
        setupFiles: ["./setup/vitest.setup.ts"],

        // Global setup file to run once before all tests
        globalSetup: ["./setup/global-setup.ts"],

        // Global test timeout (3 minutes)
        testTimeout: 180000,

        // Test file patterns
        include: ["**/*.test.ts"],

        // Coverage configuration
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            reportsDirectory: "../coverage",
            exclude: [
                "**/node_modules/**",
                "**/dist/**",
                "**/coverage/**",
                "**/setup/**",
                "**/mocks/**",
                "**/*.config.*",
                "**/*.d.ts"
            ]
        }
    },

    // Module resolution configuration
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./api")
        }
    }
});
