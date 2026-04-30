import { ErrorClass } from "../models/error.model.js";
import { STATUS_CODES } from "./data.js";

/**
 * Env class to get environment variables
 */
export class Env {
    private static getOrThrowError(key: string) {
        const value = process.env[key];
        if (!value) {
            throw new ErrorClass(
                "SERVER_MISCONFIGURATION",
                null,
                `Missing environment variable: ${key}`,
                STATUS_CODES.INTERNAL_SERVER_ERROR
            );
        }
        return value;
    }

    static nodeEnv(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("NODE_ENV");
        }
        return process.env.NODE_ENV;
    }

    static corsOrigins(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CORS_ORIGINS").split(",");
        }
        return process.env.CORS_ORIGINS?.split(",") || [];
    }

    static databaseUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("DATABASE_URL");
        }
        return process.env.DATABASE_URL;
    }

    static firebaseProjectId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("FIREBASE_PROJECT_ID");
        }
        return process.env.FIREBASE_PROJECT_ID;
    }

    static firebasePrivateKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("FIREBASE_PRIVATE_KEY");
        }
        return process.env.FIREBASE_PRIVATE_KEY;
    }

    static firebaseClientEmail(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("FIREBASE_CLIENT_EMAIL");
        }
        return process.env.FIREBASE_CLIENT_EMAIL;
    }

    static githubAccessToken(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GITHUB_ACCESS_TOKEN");
        }
        return process.env.GITHUB_ACCESS_TOKEN;
    }

    static githubAppId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GITHUB_APP_ID");
        }
        return process.env.GITHUB_APP_ID;
    }

    static githubAppPrivateKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GITHUB_APP_PRIVATE_KEY");
        }
        return process.env.GITHUB_APP_PRIVATE_KEY;
    }

    static githubWebhookSecret(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GITHUB_WEBHOOK_SECRET");
        }
        return process.env.GITHUB_WEBHOOK_SECRET;
    }

    static stellarNetwork(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STELLAR_NETWORK");
        }
        return process.env.STELLAR_NETWORK;
    }

    static stellarHorizonUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STELLAR_HORIZON_URL");
        }
        return process.env.STELLAR_HORIZON_URL;
    }

    static stellarRpcUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STELLAR_RPC_URL");
        }
        return process.env.STELLAR_RPC_URL;
    }

    static stellarMasterPublicKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STELLAR_MASTER_PUBLIC_KEY");
        }
        return process.env.STELLAR_MASTER_PUBLIC_KEY;
    }

    static stellarMasterSecretKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STELLAR_MASTER_SECRET_KEY");
        }
        return process.env.STELLAR_MASTER_SECRET_KEY;
    }

    static taskEscrowContractId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("TASK_ESCROW_CONTRACT_ID");
        }
        return process.env.TASK_ESCROW_CONTRACT_ID;
    }

    static usdcContractId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("USDC_CONTRACT_ID");
        }
        return process.env.USDC_CONTRACT_ID;
    }

    static usdcAssetId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("USDC_ASSET_ID");
        }
        return process.env.USDC_ASSET_ID;
    }

    static maxFee(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("MAX_FEE");
        }
        return process.env.MAX_FEE;
    }

    static x402PayeeAddress(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("X402_PAYEE_ADDRESS");
        }
        return process.env.X402_PAYEE_ADDRESS;
    }

    static x402FacilitatorUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("X402_FACILITATOR_URL");
        }
        return process.env.X402_FACILITATOR_URL;
    }

    static x402ApiKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("X402_API_KEY");
        }
        return process.env.X402_API_KEY;
    }

    static gcpProjectId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GCP_PROJECT_ID");
        }
        return process.env.GCP_PROJECT_ID;
    }

    static gcpLocationId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GCP_LOCATION_ID");
        }
        return process.env.GCP_LOCATION_ID;
    }

    static gcpKeyRingId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GCP_KEY_RING_ID");
        }
        return process.env.GCP_KEY_RING_ID;
    }

    static gcpKeyId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("GCP_KEY_ID");
        }
        return process.env.GCP_KEY_ID;
    }

    static cloudTasksPrAnalysisQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_PR_ANALYSIS_QUEUE");
        }
        return process.env.CLOUD_TASKS_PR_ANALYSIS_QUEUE;
    }

    static cloudTasksManualPrAnalysisQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_MANUAL_PR_ANALYSIS_QUEUE");
        }
        return process.env.CLOUD_TASKS_MANUAL_PR_ANALYSIS_QUEUE;
    }

    static cloudTasksRepoIndexingQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_REPO_INDEXING_QUEUE");
        }
        return process.env.CLOUD_TASKS_REPO_INDEXING_QUEUE;
    }

    static cloudTasksIncrementalIndexingQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE");
        }
        return process.env.CLOUD_TASKS_INCREMENTAL_INDEXING_QUEUE;
    }

    static cloudTasksBountyPayoutQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_BOUNTY_PAYOUT_QUEUE");
        }
        return process.env.CLOUD_TASKS_BOUNTY_PAYOUT_QUEUE;
    }

    static cloudTasksClearInstallationQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_CLEAR_INSTALLATION_QUEUE");
        }
        return process.env.CLOUD_TASKS_CLEAR_INSTALLATION_QUEUE;
    }

    static cloudTasksClearRepoQueue(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_CLEAR_REPO_QUEUE");
        }
        return process.env.CLOUD_TASKS_CLEAR_REPO_QUEUE;
    }

    static cloudRunServiceUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_RUN_SERVICE_URL");
        }
        return process.env.CLOUD_RUN_SERVICE_URL;
    }

    static cloudRunPrivateServiceUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_RUN_PRIVATE_SERVICE_URL");
        }
        return process.env.CLOUD_RUN_PRIVATE_SERVICE_URL;
    }

    static cloudTasksServiceAccountEmail(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL");
        }
        return process.env.CLOUD_TASKS_SERVICE_ACCOUNT_EMAIL;
    }

    static defaultSubscriptionPackageId(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("DEFAULT_SUBSCRIPTION_PACKAGE_ID");
        }
        return process.env.DEFAULT_SUBSCRIPTION_PACKAGE_ID;
    }

    static sumsubAppToken(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("SUMSUB_APP_TOKEN");
        }
        return process.env.SUMSUB_APP_TOKEN;
    }

    static sumsubSecretKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("SUMSUB_SECRET_KEY");
        }
        return process.env.SUMSUB_SECRET_KEY;
    }

    static sumsubWebhookSecret(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("SUMSUB_WEBHOOK_SECRET");
        }
        return process.env.SUMSUB_WEBHOOK_SECRET;
    }

    static sumsubLevelName(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("SUMSUB_LEVEL_NAME");
        }
        return process.env.SUMSUB_LEVEL_NAME;
    }

    static sumsubBaseUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("SUMSUB_BASE_URL");
        }
        return process.env.SUMSUB_BASE_URL;
    }

    static logLevel(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("LOG_LEVEL");
        }
        return process.env.LOG_LEVEL;
    }

    static statsigApiKey(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("STATSIG_API_KEY");
        }
        return process.env.STATSIG_API_KEY;
    }

    static port(throwError: boolean = false) {
        if (throwError) {
            return Number(this.getOrThrowError("PORT"));
        }
        return Number(process.env.PORT);
    }

    static contributorAppUrl(throwError: boolean = false) {
        if (throwError) {
            return this.getOrThrowError("CONTRIBUTOR_APP_URL");
        }
        return process.env.CONTRIBUTOR_APP_URL;
    }
}
