export const ENDPOINTS = {
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
        TEAM: {
            ADD_MEMBER: "/:installationId/team",
            UPDATE_MEMBER: "/:installationId/team/:userId",
            REMOVE_MEMBER: "/:installationId/team/:userId"
        },
        GITHUB: {
            GET_REPOSITORIES: "/github/:installationId/repositories",
            GET_ISSUES: "/github/:installationId/issues",
            GET_RESOURCES: "/github/:installationId/resources",
            SET_BOUNTY_LABEL: "/github/:installationId/set-bounty-label",
            ANALYZE_PR: "/github/:installationId/analyze-pr"
        },
        PR_REVIEW_RULES: {
            GET_ALL: "/pr-review-rules/:installationId",
            GET_BY_ID: "/pr-review-rules/:installationId/:ruleId",
            CREATE: "/pr-review-rules/:installationId",
            UPDATE: "/pr-review-rules/:installationId/:ruleId",
            DELETE: "/pr-review-rules/:installationId/:ruleId",
            GET_DEFAULT: "/pr-review-rules/default"
        }
    },
    TASK: {
        GET_ALL: "/",
        GET_BY_ID: "/:taskId",
        CREATE: "/",
        DELETE: "/:taskId",
        INSTALLATION: {
            GET_TASKS: "/installation/:installationId",
            GET_TASK: "/installation/:installationId/:taskId"
        },
        CONTRIBUTOR: {
            GET_TASKS: "/contributor",
            GET_TASK: "/contributor/:taskId"
        },
        "{TASKID}": {
            ADD_BOUNTY_COMMENT: "/:taskId/bounty-comment",
            UPDATE_BOUNTY: "/:taskId/bounty",
            UPDATE_TIMELINE: "/:taskId/timeline",
            APPLY: "/:taskId/apply",
            ACCEPT_APPLICATION: "/:taskId/accept/:contributorId",
            MARK_COMPLETE: "/:taskId/complete",
            VALIDATE_COMPLETION: "/:taskId/validate",
            REQUEST_TIMELINE_EXTENSION: "/:taskId/timeline-extension",
            REPLY_TIMELINE_EXTENSION: "/:taskId/timeline-extension/reply"
        },
        ACTIVITIES: {
            GET_ALL: "/activities/:taskId",
            MARK_VIEWED: "/activities/:taskActivityId/viewed"
        }
    },
    WALLET: {
        GET_ACCOUNT: "/account",
        WITHDRAW: "/withdraw",
        SWAP: "/swap",
        TRANSACTIONS: {
            GET_ALL: "/transactions",
            RECORD_TOPUPS: "/transactions/record-topups"
        }
    },
    WEBHOOK: {
        PR_REVIEW: "/github/pr-review"
    },
    ADMIN: {
        WEBHOOK: {
            HEALTH: "/webhook/health",
            GET_JOB: "/webhook/jobs/:jobId",
            QUEUE_STATS: "/webhook/queue-stats",
            WORKFLOW_STATUS: "/webhook/workflow-status"
        },
        RECOVER_SYSTEM: "/recover-system",
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
