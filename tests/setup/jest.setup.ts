import dotenv from "dotenv";
import path from "path";

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env.test") });

// Set test timeout
jest.setTimeout(500000);

// Mock console methods to reduce noise during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

beforeAll(() => {
    // Only show console output if TEST_VERBOSE is set
    if (!process.env.TEST_VERBOSE) {
        console.log = jest.fn();
        console.error = jest.fn();
    }
});

afterAll(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
});
