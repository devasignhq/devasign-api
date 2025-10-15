import { Prisma, PrismaClient } from "../../api/generated/client";
import { TestDataFactory } from "./test-data-factory";

/**
 * DatabaseTestUtilities provides utilities for database seeding, cleanup, and transaction management
 * Works with both SQLite and PostgreSQL test databases
 */
export class DatabaseTestUtilities {
    private client: PrismaClient;

    constructor(client: PrismaClient) {
        this.client = client;
    }

    /**
     * Seed database with comprehensive test data
     */
    async seedDatabase(): Promise<SeedData> {
        try {
            // Create subscription packages
            const subscriptionPackage = await this.client.subscriptionPackage.create({
                data: {
                    id: "test-package-id",
                    ...TestDataFactory.subscriptionPackage()
                }
            });

            const premiumPackage = await this.client.subscriptionPackage.create({
                data: {
                    id: "premium-package-id",
                    ...TestDataFactory.subscriptionPackage({
                        name: "Premium Package",
                        maxTasks: 50,
                        maxUsers: 20,
                        paid: true,
                        price: 99.99
                    })
                }
            });

            // Create permissions
            const permissions = await this.createPermissions();

            // Create users
            const users = await this.createUsers();

            // Create installations
            const installations = await this.createInstallations(subscriptionPackage.id);

            // Create user installation permissions
            const userPermissions = await this.createUserInstallationPermissions(
                users,
                installations,
                permissions
            );

            // Create tasks
            const tasks = await this.createTasks(users, installations);

            // Create task submissions
            const taskSubmissions = await this.createTaskSubmissions(users, tasks, installations);

            // Create transactions
            const transactions = await this.createTransactions(users, tasks, installations);

            // Create AI review rules and results
            const aiReviewRules = await this.createAIReviewRules(installations);
            const aiReviewResults = await this.createAIReviewResults(installations);

            // Create contribution summaries
            const contributionSummaries = await this.createContributionSummaries(users);

            console.log("✅ Database seeding completed successfully");

            return {
                subscriptionPackages: [subscriptionPackage, premiumPackage],
                permissions,
                users,
                installations,
                userPermissions,
                tasks,
                taskSubmissions,
                transactions,
                aiReviewRules,
                aiReviewResults,
                contributionSummaries
            };
        } catch (error) {
            console.error("❌ Failed to seed database:", error);
            throw error;
        }
    }

    /**
     * Create default permissions
     */
    private async createPermissions() {
        const permissionData = [
            { code: "ADMIN", name: "Administrator", isDefault: false },
            { code: "MANAGE_TASKS", name: "Manage Tasks", isDefault: true },
            { code: "VIEW_TASKS", name: "View Tasks", isDefault: true },
            { code: "APPLY_TASKS", name: "Apply to Tasks", isDefault: true },
            { code: "REVIEW_SUBMISSIONS", name: "Review Submissions", isDefault: false },
            { code: "MANAGE_USERS", name: "Manage Users", isDefault: false }
        ];

        const permissions = [];
        for (const data of permissionData) {
            const permission = await this.client.permission.create({ data });
            permissions.push(permission);
        }

        return permissions;
    }

    /**
     * Create test users with different roles
     */
    private async createUsers() {
        const userData = [
            TestDataFactory.user({
                userId: "admin-user-1",
                username: "admin",
                walletAddress: "GADMIN000000000000000000000000000000000000000000000",
                walletSecret: "SADMIN000000000000000000000000000000000000000000000"
            }),
            TestDataFactory.user({
                userId: "creator-user-1",
                username: "taskcreator",
                walletAddress: "GCREATOR00000000000000000000000000000000000000000000",
                walletSecret: "SCREATOR00000000000000000000000000000000000000000000"
            }),
            TestDataFactory.user({
                userId: "contributor-user-1",
                username: "contributor1",
                walletAddress: "GCONTRIB100000000000000000000000000000000000000000000",
                walletSecret: "SCONTRIB100000000000000000000000000000000000000000000"
            }),
            TestDataFactory.user({
                userId: "contributor-user-2",
                username: "contributor2",
                walletAddress: "GCONTRIB200000000000000000000000000000000000000000000",
                walletSecret: "SCONTRIB200000000000000000000000000000000000000000000"
            })
        ];

        const users = [];
        for (const data of userData) {
            const user = await this.client.user.create({
                data: {
                    ...data,
                    addressBook: data.addressBook as Prisma.InputJsonValue[]
                }
            });
            users.push(user);
        }

        return users;
    }

    /**
     * Create test installations
     */
    private async createInstallations(subscriptionPackageId: string) {
        const installationData = [
            TestDataFactory.installation({
                id: "installation-1",
                htmlUrl: "https://github.com/test/repo1",
                targetId: 1001,
                account: {
                    login: "testorg1",
                    nodeId: "MDEwOlJlcG9zaXRvcnkxMDAx",
                    avatarUrl: "https://github.com/testorg1.png",
                    htmlUrl: "https://github.com/testorg1"
                },
                subscriptionPackageId
            }),
            TestDataFactory.installation({
                id: "installation-2",
                htmlUrl: "https://github.com/test/repo2",
                targetId: 1002,
                account: {
                    login: "testorg2",
                    nodeId: "MDEwOlJlcG9zaXRvcnkxMDAy",
                    avatarUrl: "https://github.com/testorg2.png",
                    htmlUrl: "https://github.com/testorg2"
                },
                subscriptionPackageId
            })
        ];

        const installations = [];
        for (const data of installationData) {
            const installation = await this.client.installation.create({
                data: {
                    ...data,
                    account: data.account as Prisma.InputJsonValue
                }
            });
            installations.push(installation);
        }

        return installations;
    }

    /**
     * Create user installation permissions
     */
    private async createUserInstallationPermissions(users: any[], installations: any[], permissions: any[]) {
        const userPermissions = [];

        // Admin user gets all permissions on all installations
        for (const installation of installations) {
            const userPermission = await this.client.userInstallationPermission.create({
                data: {
                    userId: users[0].userId, // admin user
                    installationId: installation.id,
                    permissionCodes: permissions.map(p => p.code),
                    assignedBy: "system"
                }
            });
            userPermissions.push(userPermission);
        }

        // Creator user gets task management permissions
        for (const installation of installations) {
            const userPermission = await this.client.userInstallationPermission.create({
                data: {
                    userId: users[1].userId, // creator user
                    installationId: installation.id,
                    permissionCodes: ["MANAGE_TASKS", "VIEW_TASKS", "REVIEW_SUBMISSIONS"],
                    assignedBy: users[0].userId
                }
            });
            userPermissions.push(userPermission);
        }

        // Contributors get basic permissions
        for (let i = 2; i < users.length; i++) {
            for (const installation of installations) {
                const userPermission = await this.client.userInstallationPermission.create({
                    data: {
                        userId: users[i].userId,
                        installationId: installation.id,
                        permissionCodes: ["VIEW_TASKS", "APPLY_TASKS"],
                        assignedBy: users[0].userId
                    }
                });
                userPermissions.push(userPermission);
            }
        }

        return userPermissions;
    }

    /**
     * Create test tasks with different statuses
     */
    private async createTasks(users: any[], installations: any[]) {
        const tasks = [];

        // Create tasks for each installation
        for (const installation of installations) {
            // Open task
            const taskData = TestDataFactory.task({
                creatorId: users[1].userId, // creator user
                installationId: installation.id,
                issue: TestDataFactory.githubIssue({
                    title: `Open Task for ${installation.account.login}`,
                    number: 1
                })
            });
            const openTask = await this.client.task.create({
                data: {
                    ...taskData,
                    issue: taskData.issue as Prisma.InputJsonValue
                }
            });
            tasks.push(openTask);

            // In progress task
            const inProgressTaskData = TestDataFactory.task({
                creatorId: users[1].userId,
                contributorId: users[2].userId, // contributor 1
                installationId: installation.id,
                status: "IN_PROGRESS",
                acceptedAt: new Date(),
                issue: TestDataFactory.githubIssue({
                    title: `In Progress Task for ${installation.account.login}`,
                    number: 2
                })
            });
            const inProgressTask = await this.client.task.create({
                data: {
                    ...inProgressTaskData,
                    issue: inProgressTaskData.issue as Prisma.InputJsonValue
                }
            });
            tasks.push(inProgressTask);

            // Completed task
            const completedTaskData = TestDataFactory.task({
                creatorId: users[1].userId,
                contributorId: users[3].userId, // contributor 2
                installationId: installation.id,
                status: "COMPLETED",
                acceptedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
                completedAt: new Date(),
                settled: true,
                issue: TestDataFactory.githubIssue({
                    title: `Completed Task for ${installation.account.login}`,
                    number: 3
                })
            });
            const completedTask = await this.client.task.create({
                data: {
                    ...completedTaskData,
                    issue: completedTaskData.issue as Prisma.InputJsonValue
                }
            });
            tasks.push(completedTask);
        }

        return tasks;
    }

    /**
     * Create task submissions
     */
    private async createTaskSubmissions(_users: any[], tasks: any[], _installations: any[]) {
        const taskSubmissions = [];

        // Create submissions for in-progress and completed tasks
        const tasksWithSubmissions = tasks.filter(t => t.status !== "OPEN");

        for (const task of tasksWithSubmissions) {
            const submission = await this.client.taskSubmission.create({
                data: {
                    ...TestDataFactory.taskSubmission({
                        userId: task.contributorId,
                        taskId: task.id,
                        installationId: task.installationId,
                        pullRequest: `https://github.com/test/repo/pull/${task.issue.number}`
                    })
                }
            });
            taskSubmissions.push(submission);
        }

        return taskSubmissions;
    }

    /**
     * Create test transactions
     */
    private async createTransactions(_users: any[], tasks: any[], installations: any[]) {
        const transactions = [];

        // Create bounty transactions for completed tasks
        const completedTasks = tasks.filter(t => t.status === "COMPLETED");

        for (const task of completedTasks) {
            const transaction = await this.client.transaction.create({
                data: {
                    ...TestDataFactory.transaction({
                        category: "BOUNTY",
                        taskId: task.id,
                        userId: task.contributorId,
                        installationId: task.installationId,
                        amount: task.bounty,
                        txHash: `bounty-tx-${task.id}`
                    })
                }
            });
            transactions.push(transaction);
        }

        // Create some top-up transactions
        for (const installation of installations) {
            const data = TestDataFactory.transaction({
                category: "TOP_UP",
                installationId: installation.id,
                amount: 1000.0,
                asset: "USDC",
                sourceAddress: "GSOURCE000000000000000000000000000000000000000000000",
                txHash: `topup-tx-${installation.id}`
            });
            delete (data as any).userId;

            const topUpTransaction = await this.client.transaction.create({ data });
            transactions.push(topUpTransaction);
        }

        return transactions;
    }

    /**
     * Create AI review rules
     */
    private async createAIReviewRules(installations: any[]) {
        const aiReviewRules = [];

        for (const installation of installations) {
            const rules = [
                TestDataFactory.aiReviewRule({
                    installationId: installation.id,
                    name: "Code Quality Check",
                    ruleType: "CODE_QUALITY",
                    severity: "MEDIUM"
                }),
                TestDataFactory.aiReviewRule({
                    installationId: installation.id,
                    name: "Security Vulnerability Check",
                    ruleType: "SECURITY",
                    severity: "HIGH"
                }),
                TestDataFactory.aiReviewRule({
                    installationId: installation.id,
                    name: "Performance Analysis",
                    ruleType: "PERFORMANCE",
                    severity: "LOW"
                })
            ];

            for (const ruleData of rules) {
                const rule = await this.client.aIReviewRule.create({
                    data: {
                        ...ruleData,
                        config: ruleData.config as Prisma.InputJsonValue
                    }
                });
                aiReviewRules.push(rule);
            }
        }

        return aiReviewRules;
    }

    /**
     * Create AI review results
     */
    private async createAIReviewResults(installations: any[]) {
        const aiReviewResults = [];

        for (const installation of installations) {
            const results = [
                TestDataFactory.aiReviewResult({
                    installationId: installation.id,
                    prNumber: 1,
                    repositoryName: `${installation.account.login  }/repo`,
                    mergeScore: 85
                }),
                TestDataFactory.aiReviewResult({
                    installationId: installation.id,
                    prNumber: 2,
                    repositoryName: `${installation.account.login  }/repo`,
                    mergeScore: 92,
                    reviewStatus: "COMPLETED"
                })
            ];

            for (const resultData of results) {
                const result = await this.client.aIReviewResult.create({
                    data: {
                        ...resultData,
                        rulesViolated: resultData.rulesViolated as Prisma.InputJsonValue,
                        rulesPassed: resultData.rulesPassed as Prisma.InputJsonValue,
                        suggestions: resultData.suggestions as Prisma.InputJsonValue,
                        contextMetrics: resultData.contextMetrics as Prisma.InputJsonValue,
                        aiRecommendations: resultData.aiRecommendations as Prisma.InputJsonValue,
                        fetchedFilePaths: resultData.fetchedFilePaths as Prisma.InputJsonValue
                    }
                });
                aiReviewResults.push(result);
            }
        }

        return aiReviewResults;
    }

    /**
     * Create contribution summaries for users
     */
    private async createContributionSummaries(users: any[]) {
        const contributionSummaries = [];

        // Create summaries for contributor users
        for (let i = 2; i < users.length; i++) {
            const summary = await this.client.contributionSummary.create({
                data: {
                    ...TestDataFactory.contributionSummary({
                        userId: users[i].userId,
                        tasksCompleted: i === 2 ? 3 : 1, // contributor 1 has more completed tasks
                        activeTasks: i === 2 ? 2 : 1,
                        totalEarnings: i === 2 ? 300.0 : 100.0
                    })
                }
            });
            contributionSummaries.push(summary);
        }

        return contributionSummaries;
    }

    /**
     * Clean up all test data from database
     */
    async cleanupDatabase(): Promise<void> {
        try {
            // Delete in reverse dependency order to avoid foreign key constraints
            await this.client.taskActivity.deleteMany();
            await this.client.taskSubmission.deleteMany();
            await this.client.transaction.deleteMany();
            await this.client.aIReviewResult.deleteMany();
            await this.client.aIReviewRule.deleteMany();
            await this.client.userInstallationPermission.deleteMany();
            await this.client.task.deleteMany();
            await this.client.contributionSummary.deleteMany();
            await this.client.user.deleteMany();
            await this.client.installation.deleteMany();
            await this.client.subscriptionPackage.deleteMany();
            await this.client.permission.deleteMany();

            console.log("✅ Database cleanup completed");
        } catch (error) {
            console.error("❌ Failed to cleanup database:", error);
            throw error;
        }
    }

    /**
     * Reset database to clean state and reseed with fresh data
     */
    async resetAndSeed(): Promise<SeedData> {
        await this.cleanupDatabase();
        return await this.seedDatabase();
    }

    /**
     * Execute a function within a database transaction that will be rolled back
     * Useful for test isolation without affecting other tests
     */
    async withTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
        let result: T;
        let shouldRollback = false;

        try {
            await this.client.$transaction(async (tx: any) => {
                result = await fn(tx);
                shouldRollback = true;
                throw new Error("ROLLBACK_FOR_TEST_ISOLATION");
            });
        } catch (error: unknown) {
            if (shouldRollback && error instanceof Error && error.message === "ROLLBACK_FOR_TEST_ISOLATION") {
                return result!;
            }
            throw error;
        }

        return result!;
    }

    /**
     * Create a minimal dataset for quick tests
     */
    async seedMinimalData(): Promise<MinimalSeedData> {
        try {
            // Create basic subscription package
            const subscriptionPackage = await this.client.subscriptionPackage.create({
                data: {
                    id: "minimal-package-id",
                    ...TestDataFactory.subscriptionPackage({
                        name: "Minimal Package"
                    })
                }
            });

            // Create basic permissions
            const permission = await this.client.permission.create({
                data: TestDataFactory.permission({
                    code: "VIEW_TASKS",
                    name: "View Tasks",
                    isDefault: true
                })
            });

            // Create one user
            const userData = TestDataFactory.user({
                userId: "minimal-user-1",
                username: "minimaluser"
            });
            const user = await this.client.user.create({
                data: {
                    ...userData,
                    addressBook: userData.addressBook as Prisma.InputJsonValue[]
                }
            });

            // Create one installation
            const installationData = TestDataFactory.installation({
                id: "minimal-installation-1",
                subscriptionPackageId: subscriptionPackage.id
            });
            const installation = await this.client.installation.create({
                data: {
                    ...installationData,
                    account: installationData.account as Prisma.InputJsonValue
                }
            });

            // Create one task
            const taskData = TestDataFactory.task({
                creatorId: user.userId,
                installationId: installation.id
            });
            const task = await this.client.task.create({
                data: {
                    ...taskData,
                    issue: taskData.issue as Prisma.InputJsonValue
                }
            });

            console.log("✅ Minimal database seeding completed");

            return {
                subscriptionPackage,
                permission,
                user,
                installation,
                task
            };
        } catch (error) {
            console.error("❌ Failed to seed minimal data:", error);
            throw error;
        }
    }

    /**
     * Check if database is empty
     */
    async isDatabaseEmpty(): Promise<boolean> {
        try {
            const userCount = await this.client.user.count();
            const taskCount = await this.client.task.count();
            const installationCount = await this.client.installation.count();

            return userCount === 0 && taskCount === 0 && installationCount === 0;
        } catch (error) {
            console.error("❌ Failed to check if database is empty:", error);
            return false;
        }
    }

    /**
     * Get database statistics for debugging
     */
    async getDatabaseStats(): Promise<DatabaseStats> {
        try {
            const stats = {
                users: await this.client.user.count(),
                tasks: await this.client.task.count(),
                installations: await this.client.installation.count(),
                subscriptionPackages: await this.client.subscriptionPackage.count(),
                permissions: await this.client.permission.count(),
                transactions: await this.client.transaction.count(),
                taskSubmissions: await this.client.taskSubmission.count(),
                aiReviewRules: await this.client.aIReviewRule.count(),
                aiReviewResults: await this.client.aIReviewResult.count()
            };

            console.log("📊 Database Statistics:", stats);
            return stats;
        } catch (error) {
            console.error("❌ Failed to get database stats:", error);
            throw error;
        }
    }
}

// Type definitions for return values
export interface SeedData {
    subscriptionPackages: any[];
    permissions: any[];
    users: any[];
    installations: any[];
    userPermissions: any[];
    tasks: any[];
    taskSubmissions: any[];
    transactions: any[];
    aiReviewRules: any[];
    aiReviewResults: any[];
    contributionSummaries: any[];
}

export interface MinimalSeedData {
    subscriptionPackage: any;
    permission: any;
    user: any;
    installation: any;
    task: any;
}

export interface DatabaseStats {
    users: number;
    tasks: number;
    installations: number;
    subscriptionPackages: number;
    permissions: number;
    transactions: number;
    taskSubmissions: number;
    aiReviewRules: number;
    aiReviewResults: number;
}
