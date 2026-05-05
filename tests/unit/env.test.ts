import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Must mock error.model before importing Env, since Env imports it
vi.mock("../../api/models/error.model.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../api/models/error.model.js")>();
    return actual;
});

import { Env } from "../../api/utils/env.js";
import { STATUS_CODES } from "../../api/utils/data.js";

describe("Env class", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
        // Clear all potentially relevant env vars before each test
        const keysToDelete = [
            "NODE_ENV", "CORS_ORIGINS", "DATABASE_URL", "FIREBASE_PROJECT_ID",
            "FIREBASE_PRIVATE_KEY", "FIREBASE_CLIENT_EMAIL", "GITHUB_ACCESS_TOKEN",
            "GITHUB_APP_ID", "GITHUB_APP_PRIVATE_KEY", "GITHUB_WEBHOOK_SECRET",
            "STELLAR_NETWORK", "STELLAR_HORIZON_URL", "STELLAR_RPC_URL",
            "STELLAR_MASTER_PUBLIC_KEY", "STELLAR_MASTER_SECRET_KEY",
            "TASK_ESCROW_CONTRACT_ID", "USDC_CONTRACT_ID", "USDC_ASSET_ID",
            "MAX_FEE", "X402_PAYEE_ADDRESS", "X402_FACILITATOR_URL", "X402_API_KEY",
            "GCP_PROJECT_ID", "GCP_LOCATION_ID", "GCP_KEY_RING_ID", "GCP_KEY_ID",
            "CLOUD_TASKS_PR_ANALYSIS_QUEUE", "CLOUD_TASKS_MANUAL_PR_ANALYSIS_QUEUE",
            "CLOUD_TASKS_REPO_INDEXING_QUEUE", "CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE",
            "CLOUD_TASKS_BOUNTY_PAYOUT_QUEUE", "CLOUD_TASKS_CLEAR_INSTALLATION_QUEUE",
            "CLOUD_TASKS_CLEAR_REPO_QUEUE", "CLOUD_RUN_SERVICE_URL",
            "CLOUD_RUN_PRIVATE_SERVICE_URL", "CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL",
            "DEFAULT_SUBSCRIPTION_PACKAGE_ID", "SUMSUB_APP_TOKEN", "SUMSUB_SECRET_KEY",
            "SUMSUB_WEBHOOK_SECRET", "SUMSUB_LEVEL_NAME", "SUMSUB_BASE_URL",
            "LOG_LEVEL", "STATSIG_API_KEY", "PORT", "CONTRIBUTOR_APP_URL"
        ];
        keysToDelete.forEach(key => delete process.env[key]);
    });

    afterEach(() => {
        // Restore original environment
        Object.assign(process.env, originalEnv);
    });

    // =========================================================================
    // getOrThrowError (private, tested indirectly)
    // =========================================================================

    describe("Error throwing behavior", () => {
        it("should throw an ErrorClass with correct status when required env var is missing", () => {
            expect(() => Env.nodeEnv(true)).toThrow();
            try {
                Env.nodeEnv(true);
            } catch (err: any) {
                expect(err.code).toBe("SERVER_MISCONFIGURATION");
                expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
                expect(err.message).toContain("NODE_ENV");
            }
        });

        it("should not throw when throwError=false and env var is missing", () => {
            expect(() => Env.nodeEnv(false)).not.toThrow();
            expect(Env.nodeEnv()).toBeUndefined();
        });

        it("should return the value when env var is present and throwError=true", () => {
            process.env.NODE_ENV = "production";
            expect(Env.nodeEnv(true)).toBe("production");
        });
    });

    // =========================================================================
    // nodeEnv
    // =========================================================================

    describe("nodeEnv", () => {
        it("should return undefined when NODE_ENV is not set", () => {
            expect(Env.nodeEnv()).toBeUndefined();
        });

        it("should return NODE_ENV value when set", () => {
            process.env.NODE_ENV = "development";
            expect(Env.nodeEnv()).toBe("development");
        });

        it("should return 'production' when NODE_ENV is production", () => {
            process.env.NODE_ENV = "production";
            expect(Env.nodeEnv()).toBe("production");
        });

        it("should return 'test' when NODE_ENV is test", () => {
            process.env.NODE_ENV = "test";
            expect(Env.nodeEnv()).toBe("test");
        });

        it("should throw when throwError=true and NODE_ENV is not set", () => {
            expect(() => Env.nodeEnv(true)).toThrow();
        });

        it("should not throw when throwError=false and NODE_ENV is not set", () => {
            expect(() => Env.nodeEnv(false)).not.toThrow();
        });
    });

    // =========================================================================
    // corsOrigins
    // =========================================================================

    describe("corsOrigins", () => {
        it("should return empty array when CORS_ORIGINS is not set", () => {
            expect(Env.corsOrigins()).toEqual([]);
        });

        it("should parse a single origin", () => {
            process.env.CORS_ORIGINS = "http://localhost:3000";
            expect(Env.corsOrigins()).toEqual(["http://localhost:3000"]);
        });

        it("should split multiple origins by comma", () => {
            process.env.CORS_ORIGINS = "http://localhost:3000,http://localhost:4000,http://localhost:3001";
            expect(Env.corsOrigins()).toEqual([
                "http://localhost:3000",
                "http://localhost:4000",
                "http://localhost:3001"
            ]);
        });

        it("should throw when throwError=true and CORS_ORIGINS is not set", () => {
            expect(() => Env.corsOrigins(true)).toThrow();
        });

        it("should split and return array when throwError=true and CORS_ORIGINS is set", () => {
            process.env.CORS_ORIGINS = "http://localhost:3000,http://localhost:4000";
            const result = Env.corsOrigins(true);
            expect(result).toEqual(["http://localhost:3000", "http://localhost:4000"]);
        });
    });

    // =========================================================================
    // port
    // =========================================================================

    describe("port", () => {
        it("should return NaN when PORT is not set", () => {
            const result = Env.port();
            // Number(undefined) === NaN
            expect(isNaN(result)).toBe(true);
        });

        it("should return port as a number when PORT is set", () => {
            process.env.PORT = "5000";
            expect(Env.port()).toBe(5000);
        });

        it("should return port as number type (not string)", () => {
            process.env.PORT = "8080";
            const result = Env.port();
            expect(typeof result).toBe("number");
            expect(result).toBe(8080);
        });

        it("should throw when throwError=true and PORT is not set", () => {
            expect(() => Env.port(true)).toThrow();
        });
    });

    // =========================================================================
    // databaseUrl
    // =========================================================================

    describe("databaseUrl", () => {
        it("should return undefined when DATABASE_URL is not set", () => {
            expect(Env.databaseUrl()).toBeUndefined();
        });

        it("should return the database URL when set", () => {
            process.env.DATABASE_URL = "postgresql://user:pass@localhost/db";
            expect(Env.databaseUrl()).toBe("postgresql://user:pass@localhost/db");
        });

        it("should throw when throwError=true and DATABASE_URL is not set", () => {
            expect(() => Env.databaseUrl(true)).toThrow();
        });
    });

    // =========================================================================
    // Firebase env vars
    // =========================================================================

    describe("Firebase environment variables", () => {
        it("firebaseProjectId should return undefined when not set", () => {
            expect(Env.firebaseProjectId()).toBeUndefined();
        });

        it("firebaseProjectId should return value when set", () => {
            process.env.FIREBASE_PROJECT_ID = "my-project";
            expect(Env.firebaseProjectId()).toBe("my-project");
        });

        it("firebaseProjectId should throw when throwError=true and not set", () => {
            expect(() => Env.firebaseProjectId(true)).toThrow();
        });

        it("firebasePrivateKey should return undefined when not set", () => {
            expect(Env.firebasePrivateKey()).toBeUndefined();
        });

        it("firebasePrivateKey should return value when set", () => {
            process.env.FIREBASE_PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----";
            expect(Env.firebasePrivateKey()).toBe("-----BEGIN RSA PRIVATE KEY-----\\ntest\\n-----END RSA PRIVATE KEY-----");
        });

        it("firebaseClientEmail should return undefined when not set", () => {
            expect(Env.firebaseClientEmail()).toBeUndefined();
        });

        it("firebaseClientEmail should return value when set", () => {
            process.env.FIREBASE_CLIENT_EMAIL = "service@project.iam.gserviceaccount.com";
            expect(Env.firebaseClientEmail()).toBe("service@project.iam.gserviceaccount.com");
        });
    });

    // =========================================================================
    // GitHub env vars
    // =========================================================================

    describe("GitHub environment variables", () => {
        it("githubAccessToken should return undefined when not set", () => {
            expect(Env.githubAccessToken()).toBeUndefined();
        });

        it("githubAccessToken should return value when set", () => {
            process.env.GITHUB_ACCESS_TOKEN = "ghp_token123";
            expect(Env.githubAccessToken()).toBe("ghp_token123");
        });

        it("githubAccessToken should throw when throwError=true and not set", () => {
            expect(() => Env.githubAccessToken(true)).toThrow();
        });

        it("githubAppId should return undefined when not set", () => {
            expect(Env.githubAppId()).toBeUndefined();
        });

        it("githubAppId should return value when set", () => {
            process.env.GITHUB_APP_ID = "12345";
            expect(Env.githubAppId()).toBe("12345");
        });

        it("githubWebhookSecret should return undefined when not set", () => {
            expect(Env.githubWebhookSecret()).toBeUndefined();
        });

        it("githubWebhookSecret should return value when set", () => {
            process.env.GITHUB_WEBHOOK_SECRET = "my-webhook-secret";
            expect(Env.githubWebhookSecret()).toBe("my-webhook-secret");
        });

        it("githubWebhookSecret should throw when throwError=true and not set", () => {
            expect(() => Env.githubWebhookSecret(true)).toThrow();
        });
    });

    // =========================================================================
    // Stellar env vars
    // =========================================================================

    describe("Stellar environment variables", () => {
        it("stellarNetwork should return undefined when not set", () => {
            expect(Env.stellarNetwork()).toBeUndefined();
        });

        it("stellarNetwork should return 'public' for mainnet", () => {
            process.env.STELLAR_NETWORK = "public";
            expect(Env.stellarNetwork()).toBe("public");
        });

        it("stellarNetwork should return 'testnet' for testnet", () => {
            process.env.STELLAR_NETWORK = "testnet";
            expect(Env.stellarNetwork()).toBe("testnet");
        });

        it("stellarMasterSecretKey should return undefined when not set", () => {
            expect(Env.stellarMasterSecretKey()).toBeUndefined();
        });

        it("stellarMasterSecretKey should return value when set", () => {
            process.env.STELLAR_MASTER_SECRET_KEY = "SXXXXXXXXXXXXXXXX";
            expect(Env.stellarMasterSecretKey()).toBe("SXXXXXXXXXXXXXXXX");
        });

        it("stellarMasterSecretKey should throw when throwError=true and not set", () => {
            expect(() => Env.stellarMasterSecretKey(true)).toThrow();
        });

        it("usdcAssetId should return undefined when not set", () => {
            expect(Env.usdcAssetId()).toBeUndefined();
        });

        it("usdcAssetId should return value when set", () => {
            process.env.USDC_ASSET_ID = "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP";
            expect(Env.usdcAssetId()).toBe("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP");
        });

        it("usdcAssetId should throw when throwError=true and not set", () => {
            expect(() => Env.usdcAssetId(true)).toThrow();
        });
    });

    // =========================================================================
    // Sumsub env vars
    // =========================================================================

    describe("Sumsub environment variables", () => {
        it("sumsubAppToken should return undefined when not set", () => {
            expect(Env.sumsubAppToken()).toBeUndefined();
        });

        it("sumsubAppToken should return value when set", () => {
            process.env.SUMSUB_APP_TOKEN = "sumsub-token-xyz";
            expect(Env.sumsubAppToken()).toBe("sumsub-token-xyz");
        });

        it("sumsubAppToken should throw when throwError=true and not set", () => {
            expect(() => Env.sumsubAppToken(true)).toThrow();
        });

        it("sumsubSecretKey should return undefined when not set", () => {
            expect(Env.sumsubSecretKey()).toBeUndefined();
        });

        it("sumsubSecretKey should throw when throwError=true and not set", () => {
            expect(() => Env.sumsubSecretKey(true)).toThrow();
        });

        it("sumsubWebhookSecret should return undefined when not set", () => {
            expect(Env.sumsubWebhookSecret()).toBeUndefined();
        });

        it("sumsubWebhookSecret should return value when set", () => {
            process.env.SUMSUB_WEBHOOK_SECRET = "webhook-secret-abc";
            expect(Env.sumsubWebhookSecret()).toBe("webhook-secret-abc");
        });

        it("sumsubLevelName should return undefined when not set", () => {
            expect(Env.sumsubLevelName()).toBeUndefined();
        });

        it("sumsubBaseUrl should return undefined when not set", () => {
            expect(Env.sumsubBaseUrl()).toBeUndefined();
        });

        it("sumsubBaseUrl should return value when set", () => {
            process.env.SUMSUB_BASE_URL = "https://api.sumsub.com";
            expect(Env.sumsubBaseUrl()).toBe("https://api.sumsub.com");
        });
    });

    // =========================================================================
    // GCP env vars
    // =========================================================================

    describe("GCP environment variables", () => {
        it("gcpProjectId should return undefined when not set", () => {
            expect(Env.gcpProjectId()).toBeUndefined();
        });

        it("gcpProjectId should return value when set", () => {
            process.env.GCP_PROJECT_ID = "my-gcp-project";
            expect(Env.gcpProjectId()).toBe("my-gcp-project");
        });

        it("gcpProjectId should throw when throwError=true and not set", () => {
            expect(() => Env.gcpProjectId(true)).toThrow();
        });

        it("gcpLocationId should return undefined when not set", () => {
            expect(Env.gcpLocationId()).toBeUndefined();
        });

        it("cloudRunServiceUrl should return undefined when not set", () => {
            expect(Env.cloudRunServiceUrl()).toBeUndefined();
        });

        it("cloudRunServiceUrl should return value when set", () => {
            process.env.CLOUD_RUN_SERVICE_URL = "https://my-service.run.app";
            expect(Env.cloudRunServiceUrl()).toBe("https://my-service.run.app");
        });

        it("cloudRunServiceUrl should throw when throwError=true and not set", () => {
            expect(() => Env.cloudRunServiceUrl(true)).toThrow();
        });

        it("cloudTasksServiceAccountEmail should return undefined when not set", () => {
            expect(Env.cloudTasksServiceAccountEmail()).toBeUndefined();
        });

        it("cloudTasksServiceAccountEmail should return value when set", () => {
            process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL = "tasks@project.iam.gserviceaccount.com";
            expect(Env.cloudTasksServiceAccountEmail()).toBe("tasks@project.iam.gserviceaccount.com");
        });
    });

    // =========================================================================
    // Cloud Tasks queue env vars
    // =========================================================================

    describe("Cloud Tasks queue environment variables", () => {
        it("cloudTasksPrAnalysisQueue should return undefined when not set", () => {
            expect(Env.cloudTasksPrAnalysisQueue()).toBeUndefined();
        });

        it("cloudTasksPrAnalysisQueue should return value when set", () => {
            process.env.CLOUD_TASKS_PR_ANALYSIS_QUEUE = "pr-analysis-queue";
            expect(Env.cloudTasksPrAnalysisQueue()).toBe("pr-analysis-queue");
        });

        it("cloudTasksBountyPayoutQueue should return undefined when not set", () => {
            expect(Env.cloudTasksBountyPayoutQueue()).toBeUndefined();
        });

        it("cloudTasksBountyPayoutQueue should throw when throwError=true and not set", () => {
            expect(() => Env.cloudTasksBountyPayoutQueue(true)).toThrow();
        });

        it("cloudTasksClearInstallationQueue should return undefined when not set", () => {
            expect(Env.cloudTasksClearInstallationQueue()).toBeUndefined();
        });

        it("cloudTasksClearRepoQueue should return undefined when not set", () => {
            expect(Env.cloudTasksClearRepoQueue()).toBeUndefined();
        });
    });

    // =========================================================================
    // Other env vars
    // =========================================================================

    describe("Other environment variables", () => {
        it("logLevel should return undefined when not set", () => {
            expect(Env.logLevel()).toBeUndefined();
        });

        it("logLevel should return value when set", () => {
            process.env.LOG_LEVEL = "debug";
            expect(Env.logLevel()).toBe("debug");
        });

        it("statsigApiKey should return undefined when not set", () => {
            expect(Env.statsigApiKey()).toBeUndefined();
        });

        it("contributorAppUrl should return undefined when not set", () => {
            expect(Env.contributorAppUrl()).toBeUndefined();
        });

        it("contributorAppUrl should return value when set", () => {
            process.env.CONTRIBUTOR_APP_URL = "http://localhost:4000";
            expect(Env.contributorAppUrl()).toBe("http://localhost:4000");
        });

        it("defaultSubscriptionPackageId should return undefined when not set", () => {
            expect(Env.defaultSubscriptionPackageId()).toBeUndefined();
        });

        it("defaultSubscriptionPackageId should return value when set", () => {
            process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID = "pkg-id-123";
            expect(Env.defaultSubscriptionPackageId()).toBe("pkg-id-123");
        });

        it("defaultSubscriptionPackageId should throw when throwError=true and not set", () => {
            expect(() => Env.defaultSubscriptionPackageId(true)).toThrow();
        });

        it("x402PayeeAddress should return undefined when not set", () => {
            expect(Env.x402PayeeAddress()).toBeUndefined();
        });

        it("x402FacilitatorUrl should return undefined when not set", () => {
            expect(Env.x402FacilitatorUrl()).toBeUndefined();
        });

        it("x402ApiKey should return undefined when not set", () => {
            expect(Env.x402ApiKey()).toBeUndefined();
        });
    });

    // =========================================================================
    // Error structure validation
    // =========================================================================

    describe("Error structure when required var is missing", () => {
        it("should throw with name 'ErrorClass'", () => {
            try {
                Env.databaseUrl(true);
                expect.fail("Should have thrown");
            } catch (err: any) {
                expect(err.name).toBe("ErrorClass");
            }
        });

        it("should include the missing variable name in the error message", () => {
            try {
                Env.stellarMasterSecretKey(true);
                expect.fail("Should have thrown");
            } catch (err: any) {
                expect(err.message).toContain("STELLAR_MASTER_SECRET_KEY");
            }
        });

        it("should use INTERNAL_SERVER_ERROR status", () => {
            try {
                Env.githubWebhookSecret(true);
                expect.fail("Should have thrown");
            } catch (err: any) {
                expect(err.status).toBe(STATUS_CODES.INTERNAL_SERVER_ERROR);
            }
        });

        it("should use SERVER_MISCONFIGURATION code", () => {
            try {
                Env.usdcAssetId(true);
                expect.fail("Should have thrown");
            } catch (err: any) {
                expect(err.code).toBe("SERVER_MISCONFIGURATION");
            }
        });

        it("should have null details", () => {
            try {
                Env.sumsubAppToken(true);
                expect.fail("Should have thrown");
            } catch (err: any) {
                expect(err.details).toBeNull();
            }
        });
    });

    // =========================================================================
    // Edge cases: empty string behavior
    // =========================================================================

    describe("Edge cases", () => {
        it("should treat empty string as falsy and throw when throwError=true", () => {
            process.env.NODE_ENV = "";
            expect(() => Env.nodeEnv(true)).toThrow();
        });

        it("should return empty string as undefined-like when not required", () => {
            process.env.NODE_ENV = "";
            // process.env.NODE_ENV = "" means getOrThrowError would throw
            // but without throwError, we just return process.env.NODE_ENV which is ""
            // The falsy check matters for getOrThrowError
            const result = Env.nodeEnv(false);
            // When throwError=false, returns process.env.NODE_ENV directly
            expect(result).toBe("");
        });

        it("corsOrigins should return empty array when CORS_ORIGINS is not set", () => {
            delete process.env.CORS_ORIGINS;
            expect(Env.corsOrigins()).toEqual([]);
        });

        it("port should handle non-numeric PORT value", () => {
            process.env.PORT = "not-a-number";
            const result = Env.port();
            expect(isNaN(result)).toBe(true);
        });

        it("all methods should default throwError to false", () => {
            // Verify no env vars set, methods don't throw by default
            expect(() => Env.nodeEnv()).not.toThrow();
            expect(() => Env.corsOrigins()).not.toThrow();
            expect(() => Env.databaseUrl()).not.toThrow();
            expect(() => Env.firebaseProjectId()).not.toThrow();
            expect(() => Env.githubAccessToken()).not.toThrow();
            expect(() => Env.stellarNetwork()).not.toThrow();
            expect(() => Env.stellarMasterSecretKey()).not.toThrow();
            expect(() => Env.usdcAssetId()).not.toThrow();
            expect(() => Env.sumsubAppToken()).not.toThrow();
            expect(() => Env.gcpProjectId()).not.toThrow();
            expect(() => Env.port()).not.toThrow();
        });
    });
});