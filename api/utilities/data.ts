/**
 * HTTP status codes used throughout the application.
 */
export const STATUS_CODES = {
    /**200 */
    SUCCESS: 200,
    /**202 */
    PARTIAL_SUCCESS: 202,
    /**201 */
    POST: 201,
    /**203 */
    BACKGROUND_JOB: 203,
    /**204 */
    NO_CONTENT: 204,

    /**429 */
    RATE_LIMIT: 429,
    /**408 */
    TIMEOUT: 408,

    /**400 */
    UNAUTHENTICATED: 400,
    /**403 */
    UNAUTHORIZED: 403,
    /**401 */
    SERVER_ERROR: 401,
    /**404 */
    NOT_FOUND: 404,
    /**407 */
    BAD_PAYLOAD: 407,
    /**500 */
    UNKNOWN: 500,

    /**410 */
    STELLAR_ERROR: 410,
    /**411 */
    GROQ_API_ERROR: 411,
    /**412 */
    GITHUB_API_ERROR: 412
};

/**
 * API endpoint definitions
 */
export const ENDPOINTS = {
    /** User management endpoints */
    USER: {
        /** POST / - Create a new user */
        CREATE: "/",
        /** GET / - Get user information */
        GET: "/",
        /** PUT /username - Update user's username */
        UPDATE_USERNAME: "/username",
        /** PUT /address-book - Update user's address book */
        UPDATE_ADDRESS_BOOK: "/address-book"
    },
    /** Installation management endpoints */
    INSTALLATION: {
        /** GET / - Get all installations */
        GET_ALL: "/",
        /** GET /:installationId - Get installation by ID */
        GET_BY_ID: "/:installationId",
        /** POST / - Create a new installation */
        CREATE: "/",
        /** PUT /:installationId - Update installation */
        UPDATE: "/:installationId",
        /** DELETE /:installationId - Delete installation */
        DELETE: "/:installationId",
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
            SET_BOUNTY_LABEL: "/github/:installationId/set-bounty-label",
            /** POST /github/:installationId/analyze-pr - Analyze pull request */
            ANALYZE_PR: "/github/:installationId/analyze-pr"
        },
        /** PR review rules management endpoints */
        PR_REVIEW_RULES: {
            /** GET /pr-review-rules/:installationId - Get all PR review rules */
            GET_ALL: "/pr-review-rules/:installationId",
            /** GET /pr-review-rules/:installationId/:ruleId - Get PR review rule by ID */
            GET_BY_ID: "/pr-review-rules/:installationId/:ruleId",
            /** POST /pr-review-rules/:installationId - Create PR review rule */
            CREATE: "/pr-review-rules/:installationId",
            /** PUT /pr-review-rules/:installationId/:ruleId - Update PR review rule */
            UPDATE: "/pr-review-rules/:installationId/:ruleId",
            /** DELETE /pr-review-rules/:installationId/:ruleId - Delete PR review rule */
            DELETE: "/pr-review-rules/:installationId/:ruleId",
            /** GET /pr-review-rules/default - Get default PR review rules */
            GET_DEFAULT: "/pr-review-rules/default"
        }
    },
    /** Task management endpoints */
    TASK: {
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
            /** GET /contributor - Get tasks for contributor */
            GET_TASKS: "/contributor",
            /** GET /contributor/:taskId - Get specific task for contributor */
            GET_TASK: "/contributor/:taskId"
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
        /** GET /account - Get wallet account information */
        GET_ACCOUNT: "/account",
        /** POST /withdraw - Withdraw funds from wallet */
        WITHDRAW: "/withdraw",
        /** POST /swap - Swap currencies in wallet */
        SWAP: "/swap",
        /** Transaction management endpoints */
        TRANSACTIONS: {
            /** GET /transactions - Get all transactions */
            GET_ALL: "/transactions",
            /** POST /transactions/record-topups - Record wallet top-ups */
            RECORD_TOPUPS: "/transactions/record-topups"
        }
    },
    /** Webhook endpoints */
    WEBHOOK: {
        /** POST /github/pr-review - GitHub PR review webhook */
        PR_REVIEW: "/github/pr-review"
    },
    /** Administrative endpoints */
    ADMIN: {
        /** Webhook-related admin endpoints */
        WEBHOOK: {
            /** GET /webhook/health - Health check endpoint */
            HEALTH: "/webhook/health",
            /** GET /webhook/jobs/:jobId - Get job information */
            GET_JOB: "/webhook/jobs/:jobId",
            /** GET /webhook/queue-stats - Get queue statistics */
            QUEUE_STATS: "/webhook/queue-stats",
            /** GET /webhook/workflow-status - Get workflow status */
            WORKFLOW_STATUS: "/webhook/workflow-status"
        },
        /** POST /recover-system - Recover system from failure */
        RECOVER_SYSTEM: "/recover-system",
        /** POST /reset-db - Reset database (To be removed) */
        RESET_DATABASE: "/reset-db"
    }
};

export const ENDPOINTS_OLD = {
    USER: {
        CREATE: "/",
        GET: "/",
        UPDATE_USERNAME: "/username",
        UPDATE_ADDRESS_BOOK: "/address-book"
    },
    INSTALLATION: {
        GET_ALL: "/",
        GET_BY_ID: "/:installationId",
        CREATE: "/",
        UPDATE: "/:installationId",
        DELETE: "/:installationId",
        ADD_TEAM_MEMBER: "/:installationId/team",
        UPDATE_TEAM_MEMBER: "/:installationId/team/:userId",
        REMOVE_TEAM_MEMBER: "/:installationId/team/:userId",
        GITHUB: {
            GET_REPOSITORIES: "/installations/:installationId/repositories",
            GET_ISSUES: "/installations/:installationId/issues",
            GET_RESOURCES: "/installations/:installationId/resources",
            SET_BOUNTY_LABEL: "/installations/:installationId/set-bounty-label",
            ANALYZE_PR: "/installations/:installationId/analyze-pr",
            WEBHOOK: {
                GITHUB_PR_REVIEW: "/webhook/github/pr-review"
            }
        },
        CUSTOM_RULES: {
            GET_ALL: "/:installationId",
            GET_BY_ID: "/:installationId/:ruleId",
            CREATE: "/:installationId",
            UPDATE: "/:installationId/:ruleId",
            DELETE: "/:installationId/:ruleId",
            GET_DEFAULT: "/default"
        }
    },
    TASK: {
        GET_ALL: "/",
        GET_BY_ID: "/:taskId",
        GET_INSTALLATION_TASKS: "/installation/:installationId",
        GET_INSTALLATION_TASK: "/installation/:installationId/:taskId",
        GET_CONTRIBUTOR_TASKS: "/contributor",
        GET_CONTRIBUTOR_TASK: "/contributor/:taskId",
        GET_ACTIVITIES: "/activities/:taskId",
        MARK_ACTIVITY_VIEWED: "/activities/:taskActivityId/viewed",
        CREATE: "/",
        ADD_BOUNTY_COMMENT: "/:taskId/issue-comment",
        UPDATE_BOUNTY: "/:taskId/bounty",
        UPDATE_TIMELINE: "/:taskId/timeline",
        DELETE: "/:taskId",
        APPLY: "/:taskId/apply",
        ACCEPT_APPLICATION: "/:taskId/accept/:contributorId",
        MARK_COMPLETE: "/:taskId/complete",
        VALIDATE_COMPLETION: "/:taskId/validate",
        REQUEST_TIMELINE_EXTENSION: "/:taskId/timeline",
        REPLY_TIMELINE_EXTENSION: "/:taskId/timeline/reply"
    },
    WALLET: {
        GET_ACCOUNT: "/account",
        WITHDRAW: "/withdraw",
        SWAP: "/swap",
        GET_TRANSACTIONS: "/transactions",
        RECORD_TOPUPS: "/transactions/record-topups"
    },
    ADMIN: {
        HEALTH: "/webhook/health",
        GET_JOB: "/webhook/jobs/:jobId",
        QUEUE_STATS: "/webhook/queue/stats",
        WORKFLOW_STATUS: "/webhook/workflow/status",
        RECOVER_SYSTEM: "/recover-system",
        RESET_DATABASE: "/reset-db"
    }
};
