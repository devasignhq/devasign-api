import {
    User,
    Task,
    Installation,
    SubscriptionPackage,
    Permission,
    UserInstallationPermission,
    Transaction,
    TaskSubmission,
    TaskActivity,
    AIReviewRule,
    AIReviewResult,
    ContributionSummary,
    Wallet,
    TaskStatus,
    TimelineType,
    TransactionCategory,
    RuleType,
    RuleSeverity,
    ReviewStatus
} from "../../prisma_client";

/**
 * TestDataFactory provides factory methods for creating test data objects
 * Supports both in-memory object creation and database persistence
 */
export class TestDataFactory {
    private static userCounter = 1;
    private static taskCounter = 1;
    private static installationCounter = 1;
    private static walletCounter = 1;

    /**
     * Create a test wallet with realistic data
     */
    static wallet(overrides: Partial<Wallet> = {}): Omit<Wallet, "userId"> {
        const counter = this.walletCounter++;
        return {
            address: `GWALLET${counter.toString().padStart(47, "0")}`,
            encryptedDEK: `encrypted-dek-${counter}`,
            encryptedSecret: `encrypted-secret-${counter}`,
            iv: `iv-${counter}`,
            authTag: `auth-tag-${counter}`,
            ...overrides
        };
    }

    /**
     * Create a test user with realistic data
     */
    static user(overrides: Partial<User> = {}): Omit<User, "createdAt" | "updatedAt"> {
        const counter = this.userCounter++;
        return {
            userId: `test-user-${counter}`,
            username: `testuser${counter}`,
            addressBook: [],
            ...overrides
        };
    }

    /**
     * Create multiple test users
     */
    static users(count: number, overrides: Partial<User> = {}): Array<Omit<User, "createdAt" | "updatedAt">> {
        return Array.from({ length: count }, () => this.user(overrides));
    }

    /**
     * Create a test task with realistic data
     */
    static task(overrides: Partial<Task> = {}): Omit<Task, "id" | "createdAt" | "updatedAt"> {
        const counter = this.taskCounter++;
        return {
            issue: this.githubIssue(),
            timeline: 1,
            timelineType: TimelineType.WEEK,
            bounty: 100.0,
            status: TaskStatus.OPEN,
            settled: false,
            acceptedAt: null,
            completedAt: null,
            creatorId: `test-user-${counter}`,
            contributorId: null,
            installationId: `12345${Math.random().toString().slice(-3)}`,
            ...overrides
        };
    }

    /**
     * Create multiple test tasks
     */
    static tasks(count: number, overrides: Partial<Task> = {}): Array<Omit<Task, "id" | "createdAt" | "updatedAt">> {
        return Array.from({ length: count }, () => this.task(overrides));
    }

    /**
     * Create a test installation with realistic data
     */
    static installation(overrides: Partial<Installation> = {}): Omit<Installation, "createdAt" | "updatedAt" | "subscriptionPackageId" | "walletAddress" | "escrowAddress"> {
        const counter = this.installationCounter++;
        return {
            id: `12345${Math.random().toString().slice(-3)}`,
            htmlUrl: `https://github.com/test/repo${counter}`,
            targetId: counter,
            targetType: "Repository",
            account: {
                login: `testorg${counter}`,
                nodeId: `MDEwOlJlcG9zaXRvcnk${counter}`,
                avatarUrl: `https://github.com/testorg${counter}.png`,
                htmlUrl: `https://github.com/testorg${counter}`
            },
            ...overrides
        };
    }

    /**
     * Helper to create wallet relation object for Prisma create
     */
    static createWalletRelation(address?: string) {
        const counter = this.walletCounter++;
        return {
            create: {
                address: address || `GWALLET${counter.toString().padStart(47, "0")}`,
                encryptedDEK: `encrypted-dek-${counter}`,
                encryptedSecret: `encrypted-secret-${counter}`,
                iv: `iv-${counter}`,
                authTag: `auth-tag-${counter}`
            }
        };
    }

    /**
     * Create multiple test installations
     */
    static installations(count: number, overrides: Partial<Installation> = {}): Array<Omit<Installation, "createdAt" | "updatedAt" | "subscriptionPackageId" | "walletAddress" | "escrowAddress">> {
        return Array.from({ length: count }, () => this.installation(overrides));
    }

    /**
     * Create a test subscription package
     */
    static subscriptionPackage(overrides: Partial<SubscriptionPackage> = {}): Omit<SubscriptionPackage, "id" | "createdAt" | "updatedAt"> {
        return {
            name: "Test Package",
            description: "A test subscription package",
            maxTasks: 10,
            maxUsers: 5,
            paid: false,
            price: 0,
            active: true,
            ...overrides
        };
    }

    /**
     * Create a test permission
     */
    static permission(overrides: Partial<Permission> = {}): Omit<Permission, "createdAt" | "updatedAt"> {
        return {
            code: "TEST_PERMISSION",
            name: "Test Permission",
            isDefault: false,
            ...overrides
        };
    }

    /**
     * Create a test user installation permission
     */
    static userInstallationPermission(overrides: Partial<UserInstallationPermission> = {}): Omit<UserInstallationPermission, "id" | "assignedAt"> {
        return {
            userId: "test-user-1",
            installationId: `12345${Math.random().toString().slice(-3)}`,
            permissionCodes: ["VIEW_TASKS", "APPLY_TASKS"],
            assignedBy: "test-admin-user",
            ...overrides
        };
    }

    /**
     * Create a test transaction
     */
    static transaction(overrides: Partial<Transaction> = {}): Omit<Transaction, "id" | "doneAt"> {
        return {
            txHash: `test-tx-hash-${Date.now()}`,
            category: TransactionCategory.BOUNTY,
            amount: 100.0,
            taskId: null,
            sourceAddress: null,
            destinationAddress: null,
            asset: null,
            assetFrom: null,
            assetTo: null,
            fromAmount: null,
            toAmount: null,
            installationId: `12345${Math.random().toString().slice(-3)}`,
            userId: "test-user-1",
            ...overrides
        };
    }

    /**
     * Create a test task submission
     */
    static taskSubmission(overrides: Partial<TaskSubmission> = {}): Omit<TaskSubmission, "id" | "createdAt" | "updatedAt"> {
        return {
            userId: "test-user-1",
            taskId: "test-task-1",
            installationId: `12345${Math.random().toString().slice(-3)}`,
            pullRequest: "https://github.com/test/repo/pull/1",
            attachmentUrl: null,
            ...overrides
        };
    }

    /**
     * Create a test task activity
     */
    static taskActivity(overrides: Partial<TaskActivity> = {}): Omit<TaskActivity, "id" | "createdAt" | "updatedAt"> {
        return {
            taskId: "test-task-1",
            viewed: false,
            userId: "test-user-1",
            taskSubmissionId: null,
            ...overrides
        };
    }

    /**
     * Create a test AI review rule
     */
    static aiReviewRule(overrides: Partial<AIReviewRule> = {}): Omit<AIReviewRule, "id" | "createdAt" | "updatedAt"> {
        return {
            installationId: `12345${Math.random().toString().slice(-3)}`,
            name: "Test Code Quality Rule",
            description: "A test rule for code quality checks",
            ruleType: RuleType.CODE_QUALITY,
            severity: RuleSeverity.MEDIUM,
            pattern: ".*TODO.*",
            config: {
                enabled: true,
                threshold: 0.8,
                excludePatterns: ["test/**", "*.test.ts"]
            },
            active: true,
            ...overrides
        };
    }

    /**
     * Create a test AI review result
     */
    static aiReviewResult(overrides: Partial<AIReviewResult> = {}): Omit<AIReviewResult, "id" | "createdAt" | "updatedAt"> {
        return {
            installationId: `12345${Math.random().toString().slice(-3)}`,
            prNumber: 1,
            prUrl: "https://github.com/test/repo/pull/1",
            repositoryName: "test/repo",
            mergeScore: 85,
            rulesViolated: [
                {
                    ruleId: "test-rule-1",
                    ruleName: "Code Quality",
                    severity: "MEDIUM",
                    message: "Found TODO comments in code"
                }
            ],
            rulesPassed: [
                {
                    ruleId: "test-rule-2",
                    ruleName: "Security Check",
                    severity: "HIGH",
                    message: "No security vulnerabilities found"
                }
            ],
            suggestions: [
                {
                    file: "src/main.ts",
                    line: 42,
                    suggestion: "Consider removing TODO comment and implementing the feature",
                    severity: "MEDIUM"
                }
            ],
            reviewStatus: ReviewStatus.COMPLETED,
            commentId: null,
            contextAnalysisUsed: false,
            totalFilesInRepo: null,
            filesRecommendedByAI: null,
            filesFetched: null,
            fetchSuccessRate: null,
            contextQualityScore: null,
            processingTimeMs: null,
            contextMetrics: null,
            aiRecommendations: null,
            fetchedFilePaths: null,
            ...overrides
        };
    }

    /**
     * Create a test contribution summary
     */
    static contributionSummary(overrides: Partial<ContributionSummary> = {}): Omit<ContributionSummary, "id"> {
        return {
            tasksCompleted: 5,
            activeTasks: 2,
            totalEarnings: 500.0,
            userId: "test-user-1",
            ...overrides
        };
    }

    /**
     * Create a complete user with related data (user + contribution summary)
     */
    static userWithContributions(userOverrides: Partial<User> = {}, contributionOverrides: Partial<ContributionSummary> = {}) {
        const user = this.user(userOverrides);
        const contributions = this.contributionSummary({
            userId: user.userId,
            ...contributionOverrides
        });
        return { user, contributions };
    }

    /**
     * Create a complete task with related data (task + creator + installation)
     */
    static taskWithRelations(
        taskOverrides: Partial<Task> = {},
        creatorOverrides: Partial<User> = {},
        installationOverrides: Partial<Installation> = {}
    ) {
        const creator = this.user(creatorOverrides);
        const installation = this.installation(installationOverrides);
        const task = this.task({
            creatorId: creator.userId,
            installationId: installation.id,
            ...taskOverrides
        });
        return { task, creator, installation };
    }

    /**
     * Create a GitHub issue object for testing
     */
    static githubIssue(overrides: any = {}) {
        const counter = Date.now();
        return {
            id: counter.toString(),
            number: counter % 1000,
            title: `Test GitHub Issue ${counter}`,
            body: "This is a test GitHub issue created for testing purposes.",
            url: `https://github.com/test/repo/issues/${counter % 1000}`,
            state: "open",
            user: {
                login: "testuser",
                id: 12345,
                avatar_url: "https://github.com/testuser.png",
                html_url: "https://github.com/testuser"
            },
            labels: [
                { id: "1", name: "bug", color: "ff0000" },
                { id: "2", name: "enhancement", color: "00ff00" }
            ],
            locked: false,
            repository: {
                url: "https://github.com/user/repo"
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            bountyCommentId: "12345655",
            ...overrides
        };
    }

    /**
     * Create a GitHub pull request object for testing
     */
    static githubPullRequest(overrides: any = {}) {
        const counter = Date.now();
        return {
            id: counter,
            number: counter % 1000,
            title: `Test Pull Request ${counter}`,
            body: "This is a test pull request created for testing purposes.",
            html_url: `https://github.com/test/repo/pull/${counter % 1000}`,
            state: "open",
            user: {
                login: "testcontributor",
                id: 67890,
                avatar_url: "https://github.com/testcontributor.png",
                html_url: "https://github.com/testcontributor"
            },
            head: {
                ref: "feature-branch",
                sha: `abc123${counter}`,
                repo: {
                    name: "test-repo",
                    full_name: "test/repo",
                    html_url: "https://github.com/test/repo"
                }
            },
            base: {
                ref: "main",
                sha: `def456${counter}`,
                repo: {
                    name: "test-repo",
                    full_name: "test/repo",
                    html_url: "https://github.com/test/repo"
                }
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            merged_at: null,
            ...overrides
        };
    }

    /**
     * Reset all counters (useful for test isolation)
     */
    static resetCounters(): void {
        this.userCounter = 1;
        this.taskCounter = 1;
        this.installationCounter = 1;
        this.walletCounter = 1;
    }

    /**
     * Remove certain fields from an object
     */
    static filterData(data: Record<string, unknown>, omitFields: string[]) {
        const filteredData = data;
        const dataKeys = Object.keys(data);

        for (const key of dataKeys) {
            if (omitFields.includes(key)) {
                delete filteredData[key];
            }
        }

        return filteredData;
    }

    /**
     * Create realistic test data for a complete workflow scenario
     */
    static completeWorkflowScenario() {
        const subscriptionPackage = this.subscriptionPackage();
        const installation = this.installation({ subscriptionPackageId: "test-package-id" });
        const creator = this.user();
        const contributor = this.user();
        const task = this.task({
            creatorId: creator.userId,
            installationId: installation.id,
            status: TaskStatus.IN_PROGRESS,
            contributorId: contributor.userId
        });
        const taskSubmission = this.taskSubmission({
            userId: contributor.userId,
            taskId: "test-task-id",
            installationId: installation.id
        });
        const transaction = this.transaction({
            category: TransactionCategory.BOUNTY,
            taskId: "test-task-id",
            userId: contributor.userId,
            installationId: installation.id,
            amount: task.bounty
        });

        return {
            subscriptionPackage,
            installation,
            creator,
            contributor,
            task,
            taskSubmission,
            transaction
        };
    }
}
