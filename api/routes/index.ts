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
        ADD_TEAM_MEMBER: "/:installationId/team",
        UPDATE_TEAM_MEMBER: "/:installationId/team/:userId",
        REMOVE_TEAM_MEMBER: "/:installationId/team/:userId"
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
    GITHUB: {
        GET_REPOSITORIES: "/installations/:installationId/repositories",
        GET_ISSUES: "/installations/:installationId/issues",
        GET_RESOURCES: "/installations/:installationId/resources",
        SET_BOUNTY_LABEL: "/installations/:installationId/set-bounty-label",
        ANALYZE_PR: "/installations/:installationId/analyze-pr"
    },
    CUSTOM_RULES: {
        GET_ALL: "/:installationId",
        GET_BY_ID: "/:installationId/:ruleId",
        CREATE: "/:installationId",
        UPDATE: "/:installationId/:ruleId",
        DELETE: "/:installationId/:ruleId",
        GET_DEFAULT: "/default"
    },
    WEBHOOK: {
        GITHUB_PR_REVIEW: "/webhook/github/pr-review"
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
