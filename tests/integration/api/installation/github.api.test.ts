import request from "supertest";
import express, { RequestHandler } from "express";
import { TestDataFactory } from "../../../helpers/test-data-factory";
import { installationRoutes } from "../../../../api/routes/installation.route";
import { errorHandler } from "../../../../api/middlewares/error.middleware";
import { validateUser } from "../../../../api/middlewares/auth.middleware";
import { DatabaseTestHelper } from "../../../helpers/database-test-helper";
import { ENDPOINTS, STATUS_CODES } from "../../../../api/utilities/data";
import { mockFirebaseAuth } from "../../../mocks/firebase.service.mock";
import { getEndpointWithPrefix } from "../../../helpers/test-utils";

// Mock Firebase admin for authentication
jest.mock("../../../../api/config/firebase.config", () => {
    return {
        firebaseAdmin: {
            auth: () => (mockFirebaseAuth)
        }
    };
});

// Mock Octokit service for GitHub operations
jest.mock("../../../../api/services/octokit.service", () => ({
    OctokitService: {
        getInstallationRepositories: jest.fn(),
        getRepoIssuesWithSearch: jest.fn(),
        getRepoLabelsAndMilestones: jest.fn(),
        getBountyLabel: jest.fn(),
        createBountyLabel: jest.fn(),
        getPRDetails: jest.fn()
    }
}));

// Mock PR Analysis Service
jest.mock("../../../../api/services/ai-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        extractLinkedIssues: jest.fn(),
        fetchChangedFiles: jest.fn(),
        shouldAnalyzePR: jest.fn(),
        logExtractionResult: jest.fn(),
        logAnalysisDecision: jest.fn()
    }
}));

// Mock Stellar service for wallet operations
jest.mock("../../../../api/services/stellar.service", () => ({
    stellarService: {
        createWallet: jest.fn(),
        addTrustLineViaSponsor: jest.fn(),
        transferAssetViaSponsor: jest.fn()
    }
}));

// Mock helper utilities
function getFieldFromUnknownObject<T>(obj: unknown, field: string) {
    if (typeof obj !== "object" || !obj) {
        return undefined;
    }
    if (field in obj) {
        return (obj as Record<string, T>)[field];
    }
    return undefined;
}

jest.mock("../../../../api/utilities/helper", () => ({
    getFieldFromUnknownObject,
    encryptWallet: jest.fn().mockResolvedValue({
        encryptedDEK: "mockEncryptedDEK",
        encryptedSecret: "mockEncryptedSecret",
        iv: "mockIV",
        authTag: "mockAuthTag"
    }),
    decryptWallet: jest.fn().mockResolvedValue("STEST1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF12")
}));

describe("Installation GitHub API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockFirebaseAuth: jest.Mock;
    let mockOctokitService: any;
    let mockPRAnalysisService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with installation routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use(ENDPOINTS.INSTALLATION.PREFIX, (req, res, next) => {
            req.body = {
                ...req.body,
                currentUser: {
                    uid: req.headers["x-test-user-id"] || "test-user-1",
                    admin: req.headers["x-test-admin"] === "true"
                },
                userId: req.headers["x-test-user-id"] || "test-user-1"
            };
            next();
        });

        app.use(ENDPOINTS.INSTALLATION.PREFIX, installationRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { firebaseAdmin } = await import("../../../../api/config/firebase.config");
        mockFirebaseAuth = firebaseAdmin.auth().verifyIdToken as jest.Mock;

        const { OctokitService } = await import("../../../../api/services/octokit.service");
        mockOctokitService = OctokitService;

        const { PRAnalysisService } = await import("../../../../api/services/ai-review/pr-analysis.service");
        mockPRAnalysisService = PRAnalysisService;
    });

    beforeEach(async () => {
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirebaseAuth.mockResolvedValue({
            uid: "test-user-1",
            admin: false
        });

        mockOctokitService.getInstallationRepositories.mockResolvedValue([
            {
                id: 123456,
                name: "test-repo",
                full_name: "test-org/test-repo",
                html_url: "https://github.com/test-org/test-repo",
                description: "Test repository"
            }
        ]);

        mockOctokitService.getRepoIssuesWithSearch.mockResolvedValue({
            issues: [
                {
                    number: 1,
                    title: "Test Issue",
                    state: "open",
                    labels: []
                }
            ],
            hasMore: false
        });

        mockOctokitService.getRepoLabelsAndMilestones.mockResolvedValue({
            labels: [
                { id: 1, name: "bug", color: "d73a4a" },
                { id: 2, name: "enhancement", color: "a2eeef" }
            ],
            milestones: [
                { number: 1, title: "v1.0", state: "open" }
            ]
        });

        mockOctokitService.getBountyLabel.mockResolvedValue(null);
        mockOctokitService.createBountyLabel.mockResolvedValue({
            id: 999,
            name: "bounty",
            color: "00ff00"
        });

        mockOctokitService.getPRDetails.mockResolvedValue({
            number: 1,
            title: "Test PR",
            body: "Fixes #1",
            html_url: "https://github.com/test-org/test-repo/pull/1",
            user: { login: "test-user" },
            draft: false
        });

        mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
            {
                number: 1,
                url: "https://github.com/test-org/test-repo/issues/1",
                linkType: "fixes",
                title: "Test Issue",
                body: "Issue body",
                labels: []
            }
        ]);

        mockPRAnalysisService.fetchChangedFiles.mockResolvedValue([
            {
                filename: "test.ts",
                status: "modified",
                additions: 10,
                deletions: 5,
                patch: "@@ -1,5 +1,10 @@\n+new code"
            }
        ]);

        mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(true);
        mockPRAnalysisService.logExtractionResult.mockImplementation(() => {});
        mockPRAnalysisService.logAnalysisDecision.mockImplementation(() => {});

        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_REPOSITORIES"])} - Get Installation Repositories`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should get installation repositories successfully", async () => {
            const response = await request(app)
                .get(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_REPOSITORIES"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        id: 123456,
                        name: "test-repo",
                        full_name: "test-org/test-repo"
                    })
                ])
            );

            expect(mockOctokitService.getInstallationRepositories).toHaveBeenCalledWith("12345678");
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_ISSUES"])} - Get Repository Issues`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should get repository issues successfully", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_ISSUES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test-org/test-repo`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        number: 1,
                        title: "Test Issue"
                    })
                ]),
                hasMore: false,
                pagination: expect.objectContaining({
                    page: 1,
                    perPage: 30
                })
            });
        });

        it("should support pagination parameters", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_ISSUES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test-org/test-repo&page=2&perPage=10`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body.pagination).toMatchObject({
                page: 2,
                perPage: 10
            });
        });

        it("should support filtering by labels", async () => {
            await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_ISSUES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test-org/test-repo&labels=bug,enhancement`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(mockOctokitService.getRepoIssuesWithSearch).toHaveBeenCalledWith(
                "https://github.com/test-org/test-repo",
                "12345678",
                expect.objectContaining({
                    labels: ["bug", "enhancement"]
                }),
                1,
                30
            );
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_RESOURCES"])} - Get Repository Resources`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should get repository labels and milestones successfully", async () => {
            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_RESOURCES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test-org/test-repo`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                labels: expect.arrayContaining([
                    expect.objectContaining({
                        id: 1,
                        name: "bug"
                    }),
                    expect.objectContaining({
                        id: 2,
                        name: "enhancement"
                    })
                ]),
                milestones: expect.arrayContaining([
                    expect.objectContaining({
                        number: 1,
                        title: "v1.0"
                    })
                ])
            });
        });
    });

    describe(`GET ${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "SET_BOUNTY_LABEL"])} - Get or Create Bounty Label`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should return existing bounty label if it exists", async () => {
            mockOctokitService.getBountyLabel.mockResolvedValue({
                id: 888,
                name: "bounty",
                color: "00ff00"
            });

            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "SET_BOUNTY_LABEL"])
                    .replace(":installationId", "12345678")}?repositoryId=123456`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                valid: true,
                bountyLabel: expect.objectContaining({
                    id: 888,
                    name: "bounty"
                })
            });

            expect(mockOctokitService.createBountyLabel).not.toHaveBeenCalled();
        });

        it("should create bounty label if it does not exist", async () => {
            mockOctokitService.getBountyLabel.mockResolvedValue(null);

            const response = await request(app)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "SET_BOUNTY_LABEL"])
                    .replace(":installationId", "12345678")}?repositoryId=123456`)
                .set("x-test-user-id", "user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                valid: true,
                bountyLabel: expect.objectContaining({
                    id: 999,
                    name: "bounty"
                })
            });

            expect(mockOctokitService.createBountyLabel).toHaveBeenCalledWith("123456", "12345678");
        });
    });

    describe(`POST ${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])} - Trigger Manual PR Analysis`, () => {
        let testInstallation: any;

        beforeEach(async () => {
            const user = TestDataFactory.user({ userId: "user-1" });
            await prisma.user.create({
                data: { ...user, contributionSummary: { create: {} } }
            });

            testInstallation = TestDataFactory.installation({ id: "12345678" });
            await prisma.installation.create({
                data: {
                    ...testInstallation,
                    users: {
                        connect: { userId: "user-1" }
                    },
                    wallet: TestDataFactory.createWalletRelation(),
                    escrow: TestDataFactory.createWalletRelation()
                }
            });
        });

        it("should trigger PR analysis successfully", async () => {
            const analysisData = {
                repositoryName: "test-org/test-repo",
                prNumber: 1
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(analysisData)
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR analysis triggered successfully",
                data: expect.objectContaining({
                    installationId: "12345678",
                    repositoryName: "test-org/test-repo",
                    prNumber: 1,
                    prUrl: "https://github.com/test-org/test-repo/pull/1",
                    title: "Test PR",
                    author: "test-user",
                    isDraft: false,
                    linkedIssuesCount: 1,
                    changedFilesCount: 1,
                    eligibleForAnalysis: true,
                    triggerType: "manual",
                    triggeredBy: "user-1"
                })
            });

            expect(mockOctokitService.getPRDetails).toHaveBeenCalledWith("12345678", "test-org/test-repo", 1);
            expect(mockPRAnalysisService.extractLinkedIssues).toHaveBeenCalled();
            expect(mockPRAnalysisService.fetchChangedFiles).toHaveBeenCalled();
        });

        it("should return 404 when PR not found", async () => {
            mockOctokitService.getPRDetails.mockResolvedValue(null);

            const analysisData = {
                repositoryName: "test-org/test-repo",
                prNumber: 999
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(analysisData)
                .expect(STATUS_CODES.NOT_FOUND);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining("PR #999 not found")
            });
        });

        it("should return error when PR is not eligible for analysis", async () => {
            mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(false);
            mockOctokitService.getPRDetails.mockResolvedValue({
                number: 1,
                title: "Draft PR",
                body: "",
                html_url: "https://github.com/test-org/test-repo/pull/1",
                user: { login: "test-user" },
                draft: true
            });

            const analysisData = {
                repositoryName: "test-org/test-repo",
                prNumber: 1
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(analysisData)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining("PR not eligible for analysis")
            });
        });

        it("should handle GitHub API errors gracefully", async () => {
            mockOctokitService.getPRDetails.mockRejectedValue({
                status: 403,
                message: "API rate limit exceeded"
            });

            const analysisData = {
                repositoryName: "test-org/test-repo",
                prNumber: 1
            };

            const response = await request(app)
                .post(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])
                    .replace(":installationId", "12345678"))
                .set("x-test-user-id", "user-1")
                .send(analysisData)
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body.message).toBe("API rate limit exceeded");
            expect(response.body.code).toBe("GITHUB_API_ERROR");
        });
    });

    describe("Authentication and Authorization", () => {
        it("should require authentication for all GitHub endpoints", async () => {
            const appWithoutAuth = express();
            appWithoutAuth.use(express.json());
            appWithoutAuth.use(
                ENDPOINTS.INSTALLATION.PREFIX, 
                validateUser as RequestHandler, 
                installationRoutes
            );
            appWithoutAuth.use(errorHandler);
            
            await request(appWithoutAuth)
                .get(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_REPOSITORIES"])
                    .replace(":installationId", "12345678"))
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_ISSUES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test/repo`)
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "GET_RESOURCES"])
                    .replace(":installationId", "12345678")}?repoUrl=https://github.com/test/repo`)
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .get(`${getEndpointWithPrefix(["INSTALLATION", "GITHUB", "SET_BOUNTY_LABEL"])
                    .replace(":installationId", "12345678")}?repositoryId=123`)
                .expect(STATUS_CODES.UNAUTHENTICATED);

            await request(appWithoutAuth)
                .post(getEndpointWithPrefix(["INSTALLATION", "GITHUB", "ANALYZE_PR"])
                    .replace(":installationId", "12345678"))
                .send({ repositoryName: "test/repo", prNumber: 1 })
                .expect(STATUS_CODES.UNAUTHENTICATED);
        });
    });
});
