/**
 * List of allowed origins for API requests.
 */
export const ALLOWED_ORIGINS = [
    "https://devasign.com",
    "https://app.devasign.com",
    "https://contributor.devasign.com",
    ...(process.env.NODE_ENV === "development" ? [
        "http://localhost:3000",
        "http://localhost:4000",
        "http://localhost:3001"
    ] : [])
];

/**
 * HTTP status codes used throughout the application.
 */
export const STATUS_CODES = {
    // --- 2xx Success ---
    /** 200 */
    OK: 200,
    /** 201 */
    CREATED: 201,
    /** 202 */
    ACCEPTED: 202,
    /** 204 */
    NO_CONTENT: 204,

    // --- 4xx Client Errors ---
    /** 400 */
    BAD_REQUEST: 400,
    /** 401 */
    UNAUTHORIZED: 401,
    /** 403 */
    FORBIDDEN: 403,
    /** 404 */
    NOT_FOUND: 404,
    /** 408 */
    REQUEST_TIMEOUT: 408,
    /** 409 */
    CONFLICT: 409,
    /** 422 */
    UNPROCESSABLE_ENTITY: 422,
    /** 429 */
    TOO_MANY_REQUESTS: 429,

    // --- 5xx Server Errors ---
    /** 500 */
    INTERNAL_SERVER_ERROR: 500
};


/**
 * API endpoint definitions
 */
export const ENDPOINTS = {
    /** Public endpoints (no authentication required) */
    PUBLIC_PREFIX: "/public",

    /** User management endpoints */
    USER: {
        PREFIX: "/users",
        /** POST / - Create a new user */
        CREATE: "/",
        /** GET / - Get user information */
        GET: "/",
        /** PUT /address-book - Update user's address book */
        UPDATE_ADDRESS_BOOK: "/address-book",
        /** POST /sumsub-token - Generate Sumsub SDK access token */
        SUMSUB_TOKEN: "/sumsub-token"
    },

    /** Installation management endpoints */
    INSTALLATION: {
        PREFIX: "/installations",
        /** GET / - Get all installations */
        GET_ALL: "/",
        /** GET /:installationId - Get installation by ID */
        GET_BY_ID: "/:installationId",
        /** POST / - Create a new installation */
        CREATE: "/",
        /** ARCHIVE /:installationId - Archive installation */
        ARCHIVE: "/:installationId/archive",
        /** Team member management endpoints */
        TEAM: {
            /** POST /:installationId/team - Add team member */
            ADD_MEMBER: "/:installationId/team",
            /** PUT /:installationId/team/:userId - Update team member */
            UPDATE_MEMBER: "/:installationId/team/:userId",
            /** DELETE /:installationId/team/:userId - Remove team member */
            REMOVE_MEMBER: "/:installationId/team/:userId"
        },
        /** GitHub integration endpoints */
        GITHUB: {
            /** GET /github/:installationId/repositories - Get GitHub repositories */
            GET_REPOSITORIES: "/github/:installationId/repositories",
            /** GET /github/:installationId/issues - Get GitHub issues */
            GET_ISSUES: "/github/:installationId/issues",
            /** GET /github/:installationId/resources - Get GitHub resources */
            GET_RESOURCES: "/github/:installationId/resources",
            /** POST /github/:installationId/set-bounty-label - Set bounty label */
            SET_BOUNTY_LABEL: "/github/:installationId/set-bounty-label"
        }
    },

    /** Task management endpoints */
    TASK: {
        PREFIX: "/tasks",
        /** GET / - Get all tasks */
        GET_ALL: "/",
        /** GET /:taskId - Get task by ID */
        GET_BY_ID: "/:taskId",
        /** POST / - Create a new task */
        CREATE: "/",
        /** DELETE /:taskId - Delete task */
        DELETE: "/:taskId",
        /** Installation-specific task endpoints */
        INSTALLATION: {
            /** GET /installation/:installationId - Get tasks for installation */
            GET_TASKS: "/installation/:installationId",
            /** GET /installation/:installationId/:taskId - Get specific task for installation */
            GET_TASK: "/installation/:installationId/:taskId"
        },
        /** Contributor-specific task endpoints */
        CONTRIBUTOR: {
            /** GET /contributor/tasks - Get tasks for contributor */
            GET_TASKS: "/contributor/tasks",
            /** GET /contributor/tasks/:taskId - Get specific task for contributor */
            GET_TASK: "/contributor/tasks/:taskId"
        },
        /** Task-specific action endpoints (requires taskId parameter) */
        "{TASKID}": {
            /** POST /:taskId/bounty-comment - Add bounty comment to task */
            ADD_BOUNTY_COMMENT: "/:taskId/bounty-comment",
            /** PUT /:taskId/bounty - Update task bounty */
            UPDATE_BOUNTY: "/:taskId/bounty",
            /** PUT /:taskId/timeline - Update task timeline */
            UPDATE_TIMELINE: "/:taskId/timeline",
            /** POST /:taskId/apply - Apply to task */
            APPLY: "/:taskId/apply",
            /** POST /:taskId/accept/:contributorId - Accept contributor application */
            ACCEPT_APPLICATION: "/:taskId/accept/:contributorId",
            /** POST /:taskId/complete - Mark task as complete */
            MARK_COMPLETE: "/:taskId/complete",
            /** POST /:taskId/validate - Validate task completion */
            VALIDATE_COMPLETION: "/:taskId/validate",
            /** POST /:taskId/timeline-extension - Request timeline extension */
            REQUEST_TIMELINE_EXTENSION: "/:taskId/timeline-extension",
            /** POST /:taskId/timeline-extension/reply - Reply to timeline extension request */
            REPLY_TIMELINE_EXTENSION: "/:taskId/timeline-extension/reply"
        },
        /** Task activity endpoints */
        ACTIVITIES: {
            /** GET /activities/:taskId - Get all activities for task */
            GET_ALL: "/activities/:taskId",
            /** PUT /activities/:taskActivityId/viewed - Mark activity as viewed */
            MARK_VIEWED: "/activities/:taskActivityId/viewed"
        }
    },

    /** Wallet and payment endpoints */
    WALLET: {
        PREFIX: "/wallet",
        /** GET /account - Get wallet account information */
        GET_ACCOUNT: "/account",
        /** POST /withdraw - Withdraw funds from wallet */
        WITHDRAW: "/withdraw",
        /** POST /swap/:installationId - Swap currencies in wallet */
        SWAP: "/swap/:installationId",
        /** Transaction management endpoints */
        TRANSACTIONS: {
            /** GET /transactions/user - Get all transactions for user */
            GET_ALL_USER: "/transactions/user",
            /** GET /transactions/installation/:installationId - Get all transactions for installation */
            GET_ALL_INSTALLATION: "/transactions/installation/:installationId",
            /** POST /transactions/record-topups - Record wallet top-ups */
            RECORD_TOPUPS: "/transactions/record-topups"
        }
    },

    /** Webhook endpoints */
    WEBHOOK: {
        PREFIX: "/webhook",
        /** POST /github - GitHub webhook events */
        GITHUB: "/github",
        /** POST /sumsub - Sumsub webhook events */
        SUMSUB: "/sumsub"
    },

    /** Agent endpoints */
    AGENT: {
        PREFIX: "/agent",
        /** POST /review - PR Review agent endpoint */
        REVIEW: "/review"
    },

    /** Internal endpoints */
    INTERNAL: {
        PREFIX: "/internal",
        
        /** POST /pr-analysis - Handle PR analysis */
        PR_ANALYSIS: "/pr-analysis",

        /** POST /manual-pr-analysis - Handle manual PR analysis from x402 integration */
        MANUAL_PR_ANALYSIS: "/manual-pr-analysis",
        
        /** Indexing routes */
        INDEXING: {
            /** POST /indexing/repository - Handle repository indexing */
            REPOSITORY: "/indexing/repository",
            /** POST /indexing/incremental - Handle incremental repository indexing */
            INCREMENTAL: "/indexing/incremental",
            /** POST /indexing/clear-installation - Clear installation indexed data */
            CLEAR_INSTALLATION: "/indexing/clear-installation",
            /** POST /indexing/clear-repo - Clear repository indexed data */
            CLEAR_REPO: "/indexing/clear-repo"
        },
        
        /** POST /bounty-payout - Handle bounty payout */
        BOUNTY_PAYOUT: "/bounty-payout"
    }
};
