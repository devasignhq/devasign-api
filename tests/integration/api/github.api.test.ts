import request from "supertest";
import express from "express";
import { TestDataFactory } from "../../helpers/test-data-factory";
import { githubRoutes } from "../../../api/routes/github.route";
import { errorHandler } from "../../../api/middlewares/error.middleware";
import { DatabaseTestHelper } from "../../helpers/database-test-helper";
import { STATUS_CODES } from "../../../api/utilities/data";

// Mock Firebase admin for authentication
jest.mock("../../../api/config/firebase.config", () => ({
    firebaseAdmin: {
        auth: () => ({
            verifyIdToken: jest.fn()
        })
    }
}));

// Mock Octokit service for GitHub operations
jest.mock("../../../api/services/octokit.service", () => ({
    OctokitService: {
        getInstallationRepositories: jest.fn(),
        getRepoIssuesWithSearch: jest.fn(),
        getRepoLabelsAndMilestones: jest.fn(),
        getBountyLabel: jest.fn(),
        createBountyLabel: jest.fn(),
        getPRDetails: jest.fn()
    }
}));

// Mock PR Analysis service
jest.mock("../../../api/services/ai-review/pr-analysis.service", () => ({
    PRAnalysisService: {
        extractLinkedIssues: jest.fn(),
        fetchChangedFiles: jest.fn(),
        shouldAnalyzePR: jest.fn(),
        logExtractionResult: jest.fn(),
        logAnalysisDecision: jest.fn()
    }
}));

describe("GitHub API Integration Tests", () => {
    let app: express.Application;
    let prisma: any;
    let mockOctokitService: any;
    let mockPRAnalysisService: any;

    beforeAll(async () => {
        prisma = await DatabaseTestHelper.setupTestDatabase();

        // Setup Express app with github routes
        app = express();
        app.use(express.json());

        // Mock authentication middleware for testing
        app.use("/github", (req, res, next) => {
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

        app.use("/github", githubRoutes);
        app.use(errorHandler);

        // Setup mocks
        const { OctokitService } = await import("../../../api/services/octokit.service");
        mockOctokitService = OctokitService;

        const { PRAnalysisService } = await import("../../../api/services/ai-review/pr-analysis.service");
        mockPRAnalysisService = PRAnalysisService;
    });

    beforeEach(async () => {
        // Reset database
        await DatabaseTestHelper.resetDatabase(prisma);
        await DatabaseTestHelper.seedDatabase(prisma);

        // Create test user and installation
        const testUser = TestDataFactory.user({ userId: "test-user-1" });
        await prisma.user.create({
            data: {
                ...testUser,
                contributionSummary: { create: {} }
            }
        });

        const testInstallation = TestDataFactory.installation({ id: "12345" });
        await prisma.installation.create({
            data: {
                ...testInstallation,
                users: {
                    connect: { userId: "test-user-1" }
                }
            }
        });

        // Reset mocks
        jest.clearAllMocks();

        // Setup default mock implementations
        mockOctokitService.getInstallationRepositories.mockResolvedValue([
            {
                id: 1,
                name: "test-repo",
                full_name: "test/test-repo",
                private: false,
                html_url: "https://github.com/test/test-repo"
            }
        ]);

        mockOctokitService.getRepoIssuesWithSearch.mockResolvedValue({
            issues: [
                TestDataFactory.githubIssue({ number: 1, title: "Test Issue 1" }),
                TestDataFactory.githubIssue({ number: 2, title: "Test Issue 2" })
            ],
            hasMore: false
        });

        mockOctokitService.getRepoLabelsAndMilestones.mockResolvedValue({
            labels: [
                { name: "bug", color: "ff0000" },
                { name: "enhancement", color: "00ff00" }
            ],
            milestones: [
                { title: "v1.0", number: 1 }
            ]
        });

        mockOctokitService.getBountyLabel.mockResolvedValue(null);
        mockOctokitService.createBountyLabel.mockResolvedValue({
            id: 123,
            name: "bounty",
            color: "ffd700"
        });

        mockOctokitService.getPRDetails.mockResolvedValue({
            number: 1,
            title: "Test PR",
            body: "Closes #1",
            html_url: "https://github.com/test/repo/pull/1",
            user: { login: "testuser" },
            draft: false
        });

        mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([
            { 
                number: 1, 
                title: "Test Issue", 
                body: "Issue body",
                url: "https://github.com/test/repo/issues/1", 
                linkType: "closes",
                labels: [{ name: "bug", description: "Bug label" }]
            }
        ]);

        mockPRAnalysisService.fetchChangedFiles.mockResolvedValue([
            { filename: "test.ts", status: "modified", additions: 10, deletions: 5, patch: "diff content" }
        ]);

        mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(true);
        mockPRAnalysisService.logExtractionResult.mockReturnValue(undefined);
        mockPRAnalysisService.logAnalysisDecision.mockReturnValue(undefined);

        // Reset test data factory counters
        TestDataFactory.resetCounters();
    });

    afterAll(async () => {
        await prisma.$disconnect();
    });

    describe("GET /github/installations/:installationId/repositories - Get Installation Repositories", () => {
        it("should get repositories for installation", async () => {
            const response = await request(app)
                .get("/github/installations/12345/repositories")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toEqual([
                expect.objectContaining({
                    id: 1,
                    name: "test-repo",
                    full_name: "test/test-repo"
                })
            ]);

            expect(mockOctokitService.getInstallationRepositories).toHaveBeenCalledWith("12345");
        });

        it("should return error when user not authorized for installation", async () => {
            const otherUser = TestDataFactory.user({ userId: "other-user", username: "other-user" });
            await prisma.user.create({
                data: {
                    ...otherUser,
                    contributionSummary: { create: {} }
                }
            });

            await request(app)
                .get("/github/installations/12345/repositories")
                .set("x-test-user-id", "other-user")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });

    describe("GET /github/installations/:installationId/issues - Get Repository Issues", () => {
        it("should get issues with filters and pagination", async () => {
            const response = await request(app)
                .get("/github/installations/12345/issues")
                .query({
                    repoUrl: "https://github.com/test/test-repo",
                    title: "Test",
                    labels: ["bug"],
                    sort: "created",
                    direction: "desc",
                    page: 1,
                    perPage: 30
                })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                issues: expect.arrayContaining([
                    expect.objectContaining({
                        number: expect.any(Number),
                        title: expect.any(String)
                    })
                ]),
                hasMore: false,
                pagination: {
                    page: 1,
                    perPage: 30
                }
            });

            expect(mockOctokitService.getRepoIssuesWithSearch).toHaveBeenCalled();
        });

        it("should use default pagination values", async () => {
            await request(app)
                .get("/github/installations/12345/issues")
                .query({ repoUrl: "https://github.com/test/test-repo" })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(mockOctokitService.getRepoIssuesWithSearch).toHaveBeenCalledWith(
                "https://github.com/test/test-repo",
                "12345",
                expect.any(Object),
                1,
                30
            );
        });
    });

    describe("GET /github/installations/:installationId/resources - Get Repository Resources", () => {
        it("should get labels and milestones for repository", async () => {
            const response = await request(app)
                .get("/github/installations/12345/resources")
                .query({ repoUrl: "https://github.com/test/test-repo" })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                labels: expect.arrayContaining([
                    expect.objectContaining({
                        name: expect.any(String),
                        color: expect.any(String)
                    })
                ]),
                milestones: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.any(String),
                        number: expect.any(Number)
                    })
                ])
            });

            expect(mockOctokitService.getRepoLabelsAndMilestones).toHaveBeenCalledWith(
                "https://github.com/test/test-repo",
                "12345"
            );
        });
    });

    describe("GET /github/installations/:installationId/set-bounty-label - Get or Create Bounty Label", () => {
        it("should return existing bounty label", async () => {
            mockOctokitService.getBountyLabel.mockResolvedValue({
                id: 123,
                name: "bounty",
                color: "ffd700"
            });

            const response = await request(app)
                .get("/github/installations/12345/set-bounty-label")
                .query({ repositoryId: "test/test-repo" })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                valid: true,
                bountyLabel: expect.objectContaining({
                    id: 123,
                    name: "bounty"
                })
            });

            expect(mockOctokitService.createBountyLabel).not.toHaveBeenCalled();
        });

        it("should create bounty label when it does not exist", async () => {
            mockOctokitService.getBountyLabel.mockResolvedValue(null);

            const response = await request(app)
                .get("/github/installations/12345/set-bounty-label")
                .query({ repositoryId: "test/test-repo" })
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.SUCCESS);

            expect(response.body).toMatchObject({
                valid: true,
                bountyLabel: expect.objectContaining({
                    id: 123,
                    name: "bounty"
                })
            });

            expect(mockOctokitService.createBountyLabel).toHaveBeenCalledWith(
                "test/test-repo",
                "12345"
            );
        });
    });

    describe("POST /github/installations/:installationId/analyze-pr - Manual PR Analysis", () => {
        it("should trigger manual PR analysis successfully", async () => {
            const response = await request(app)
                .post("/github/installations/12345/analyze-pr")
                .set("x-test-user-id", "test-user-1")
                .send({
                    repositoryName: "test/repo",
                    prNumber: 1
                })
                .expect(STATUS_CODES.BACKGROUND_JOB);

            expect(response.body).toMatchObject({
                success: true,
                message: "PR analysis triggered successfully",
                data: expect.objectContaining({
                    installationId: "12345",
                    repositoryName: "test/repo",
                    prNumber: 1,
                    prUrl: "https://github.com/test/repo/pull/1",
                    linkedIssuesCount: 1,
                    changedFilesCount: 1,
                    eligibleForAnalysis: true,
                    triggerType: "manual",
                    triggeredBy: "test-user-1"
                }),
                timestamp: expect.any(String)
            });

            expect(mockOctokitService.getPRDetails).toHaveBeenCalledWith("12345", "test/repo", 1);
            expect(mockPRAnalysisService.extractLinkedIssues).toHaveBeenCalled();
            expect(mockPRAnalysisService.fetchChangedFiles).toHaveBeenCalled();
        });

        it("should return error when PR not found", async () => {
            mockOctokitService.getPRDetails.mockResolvedValue(null);

            const response = await request(app)
                .post("/github/installations/12345/analyze-pr")
                .set("x-test-user-id", "test-user-1")
                .send({
                    repositoryName: "test/repo",
                    prNumber: 999
                })
                .expect(STATUS_CODES.NOT_FOUND);

            expect(response.body).toMatchObject({
                success: false,
                error: "PR #999 not found in repository test/repo"
            });
        });

        it("should return error when PR not eligible for analysis", async () => {
            mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(false);
            mockOctokitService.getPRDetails.mockResolvedValue({
                number: 1,
                title: "Test PR",
                body: "No issue links",
                html_url: "https://github.com/test/repo/pull/1",
                user: { login: "testuser" },
                draft: false
            });
            mockPRAnalysisService.extractLinkedIssues.mockResolvedValue([]);

            const response = await request(app)
                .post("/github/installations/12345/analyze-pr")
                .set("x-test-user-id", "test-user-1")
                .send({
                    repositoryName: "test/repo",
                    prNumber: 1
                })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining("PR not eligible for analysis")
            });
        });

        it("should handle draft PRs", async () => {
            mockOctokitService.getPRDetails.mockResolvedValue({
                number: 1,
                title: "Test PR",
                body: "Closes #1",
                html_url: "https://github.com/test/repo/pull/1",
                user: { login: "testuser" },
                draft: true
            });
            mockPRAnalysisService.shouldAnalyzePR.mockReturnValue(false);

            const response = await request(app)
                .post("/github/installations/12345/analyze-pr")
                .set("x-test-user-id", "test-user-1")
                .send({
                    repositoryName: "test/repo",
                    prNumber: 1
                })
                .expect(STATUS_CODES.SERVER_ERROR);

            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining("PR not eligible for analysis")
            });
        });

        it("should handle GitHub API errors", async () => {
            mockOctokitService.getPRDetails.mockRejectedValue({
                status: 404,
                message: "Not Found"
            });

            const response = await request(app)
                .post("/github/installations/12345/analyze-pr")
                .set("x-test-user-id", "test-user-1")
                .send({
                    repositoryName: "test/repo",
                    prNumber: 1
                })
                .expect(STATUS_CODES.NOT_FOUND);

            expect(response.body).toMatchObject({
                success: false,
                error: "PR #1 not found in repository test/repo"
            });
        });
    });

    describe("Error Handling", () => {
        it("should handle Octokit service errors gracefully", async () => {
            mockOctokitService.getInstallationRepositories.mockRejectedValue(
                new Error("GitHub API error")
            );

            await request(app)
                .get("/github/installations/12345/repositories")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNKNOWN);
        });

        it("should handle missing installation", async () => {
            await request(app)
                .get("/github/installations/99999/repositories")
                .set("x-test-user-id", "test-user-1")
                .expect(STATUS_CODES.UNAUTHORIZED);
        });
    });
});
