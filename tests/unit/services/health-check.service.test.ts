import { HealthCheckService } from "../../../api/services/health-check.service";

// Mock dependencies
const mockPrisma = {
    $queryRaw: jest.fn()
};

jest.mock("../../../api/config/database.config", () => ({
    prisma: mockPrisma
}));

jest.mock("../../../api/services/error-handler.service", () => ({
    ErrorHandlerService: {
        withTimeout: jest.fn().mockImplementation(async (fn) => {
            return await fn();
        })
    }
}));

jest.mock("../../../api/services/circuit-breaker.service", () => ({
    CircuitBreakerService: {
        getCircuitStatus: jest.fn().mockReturnValue({
            groq: { state: "CLOSED" },
            pinecone: { state: "CLOSED" },
            github: { state: "CLOSED" },
            database: { state: "CLOSED" }
        })
    }
}));

jest.mock("../../../api/services/logging.service", () => ({
    LoggingService: {
        createTimer: jest.fn().mockReturnValue({
            end: jest.fn(),
            getCurrentDuration: jest.fn().mockReturnValue(100)
        }),
        logHealthStatus: jest.fn(),
        logError: jest.fn(),
        logInfo: jest.fn(),
        logWarning: jest.fn()
    }
}));

// Mock environment variables
const originalEnv = process.env;

describe("HealthCheckService", () => {
    beforeEach(() => {
        // Set up environment variables
        process.env = {
            ...originalEnv,
            GROQ_API_KEY: "test_groq_key",
            PINECONE_API_KEY: "test_pinecone_key",
            GITHUB_APP_ID: "test_app_id",
            GITHUB_APP_PRIVATE_KEY: "test_private_key",
            NODE_ENV: "test",
            npm_package_version: "1.0.0"
        };

        // Reset all mocks
        jest.clearAllMocks();
        mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe("performHealthCheck", () => {
        it("should perform comprehensive health check successfully", async () => {
            // Act
            const result = await HealthCheckService.performHealthCheck(true);

            // Assert
            expect(result.status).toBe("healthy");
            expect(result.services).toHaveProperty("database");
            expect(result.services).toHaveProperty("groq");
            expect(result.services).toHaveProperty("pinecone");
            expect(result.services).toHaveProperty("github");
            expect(result.degradedMode).toBe(false);
            expect(result.circuitBreakers).toBeDefined();
        });

        it("should return cached result when health check is in progress", async () => {
            // Arrange - Start a health check that will take time
            const slowHealthCheck = HealthCheckService.performHealthCheck();

            // Act - Start another health check immediately
            const quickResult = await HealthCheckService.performHealthCheck();

            // Clean up
            await slowHealthCheck;

            // Assert
            expect(quickResult.status).toBeDefined();
        });

        it("should handle health check errors gracefully", async () => {
            // Arrange
            mockPrisma.$queryRaw.mockRejectedValue(new Error("Database connection failed"));

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.status).toBe("unhealthy");
            expect(result.services.database.status).toBe("unhealthy");
            expect(result.services.database.error).toContain("Database connection failed");
        });

        it("should determine degraded mode correctly", async () => {
            // Arrange - Database healthy, but AI services fail
            mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);
            delete process.env.GROQ_API_KEY; // This will make Groq unhealthy

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.status).toBe("degraded");
            expect(result.degradedMode).toBe(true);
            expect(result.services.database.status).toBe("healthy");
            expect(result.services.groq.status).toBe("unhealthy");
        });

        it("should not include circuit breakers when includeDetailed is false", async () => {
            // Act
            const result = await HealthCheckService.performHealthCheck(false);

            // Assert
            expect(result.circuitBreakers).toBeUndefined();
        });
    });

    describe("Database Health Check", () => {
        it("should report database as healthy when connection succeeds", async () => {
            // Arrange
            mockPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }]);

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.database.status).toBe("healthy");
            expect(result.services.database.message).toBe("Database connection successful");
            expect(result.services.database.responseTime).toBeGreaterThan(0);
        });

        it("should report database as unhealthy when connection fails", async () => {
            // Arrange
            mockPrisma.$queryRaw.mockRejectedValue(new Error("Connection timeout"));

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.database.status).toBe("unhealthy");
            expect(result.services.database.message).toContain("Database connection failed");
            expect(result.services.database.error).toContain("Connection timeout");
        });
    });

    describe("Groq Service Health Check", () => {
        it("should report Groq as healthy when API key is configured", async () => {
            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.groq.status).toBe("healthy");
            expect(result.services.groq.message).toBe("Groq service configuration valid");
        });

        it("should report Groq as unhealthy when API key is missing", async () => {
            // Arrange
            delete process.env.GROQ_API_KEY;

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.groq.status).toBe("unhealthy");
            expect(result.services.groq.message).toContain("GROQ_API_KEY not configured");
        });
    });

    describe("Pinecone Service Health Check", () => {
        it("should report Pinecone as healthy when API key is configured", async () => {
            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.pinecone.status).toBe("healthy");
            expect(result.services.pinecone.message).toBe("Pinecone service configuration valid");
        });

        it("should report Pinecone as unhealthy when API key is missing", async () => {
            // Arrange
            delete process.env.PINECONE_API_KEY;

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.pinecone.status).toBe("unhealthy");
            expect(result.services.pinecone.message).toContain("PINECONE_API_KEY not configured");
        });
    });

    describe("GitHub Service Health Check", () => {
        it("should report GitHub as healthy when credentials are configured", async () => {
            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.github.status).toBe("healthy");
            expect(result.services.github.message).toBe("GitHub service configuration valid");
        });

        it("should report GitHub as unhealthy when app ID is missing", async () => {
            // Arrange
            delete process.env.GITHUB_APP_ID;

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.github.status).toBe("unhealthy");
            expect(result.services.github.message).toContain("GitHub app credentials not configured");
        });

        it("should report GitHub as unhealthy when private key is missing", async () => {
            // Arrange
            delete process.env.GITHUB_APP_PRIVATE_KEY;

            // Act
            const result = await HealthCheckService.performHealthCheck();

            // Assert
            expect(result.services.github.status).toBe("unhealthy");
            expect(result.services.github.message).toContain("GitHub app credentials not configured");
        });
    });
});
