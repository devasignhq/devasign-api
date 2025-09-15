import { http, HttpResponse } from 'msw';

/**
 * MSW (Mock Service Worker) handlers for external API endpoints
 * Provides HTTP request mocking for integration tests
 * Requirements: 3.2, 4.4
 */

/**
 * GitHub API handlers
 */
export const githubHandlers = [
    // GitHub App Installation endpoints
    http.get('https://api.github.com/app/installations/:installationId', ({ params }) => {
        const { installationId } = params;

        return HttpResponse.json({
            id: parseInt(installationId as string),
            target_type: "User",
            account: {
                login: "test-user",
                id: 12345,
                avatar_url: "https://github.com/test-user.png",
                html_url: "https://github.com/test-user"
            },
            permissions: {
                issues: "write",
                pull_requests: "write",
                contents: "read"
            }
        });
    }),

    // GitHub GraphQL API
    http.post('https://api.github.com/graphql', async ({ request }) => {
        const body = await request.json() as any;
        const query = body.query;

        // Mock repository query
        if (query.includes('GetRepoDetails')) {
            return HttpResponse.json({
                data: {
                    repository: {
                        id: "repo_123",
                        databaseId: 123456,
                        name: "test-repo",
                        nameWithOwner: "test-org/test-repo",
                        owner: {
                            login: "test-org",
                            id: "org_123",
                            avatarUrl: "https://github.com/test-org.png",
                            url: "https://github.com/test-org"
                        },
                        isPrivate: false,
                        description: "A test repository",
                        url: "https://github.com/test-org/test-repo"
                    }
                }
            });
        }

        // Mock issues search
        if (query.includes('search')) {
            return HttpResponse.json({
                data: {
                    search: {
                        nodes: [
                            {
                                id: "issue_1",
                                number: 1,
                                title: "Test issue",
                                body: "This is a test issue",
                                url: "https://github.com/test-org/test-repo/issues/1",
                                state: "OPEN",
                                labels: {
                                    nodes: [
                                        {
                                            id: "label_1",
                                            name: "bug",
                                            color: "d73a4a"
                                        }
                                    ]
                                }
                            }
                        ],
                        pageInfo: {
                            hasNextPage: false,
                            endCursor: null
                        },
                        issueCount: 1
                    }
                }
            });
        }

        // Mock labels and milestones query
        if (query.includes('GetRepoLabelsAndMilestones')) {
            return HttpResponse.json({
                data: {
                    repository: {
                        labels: {
                            nodes: [
                                {
                                    id: "label_1",
                                    name: "bug",
                                    color: "d73a4a"
                                },
                                {
                                    id: "label_2",
                                    name: "enhancement",
                                    color: "a2eeef"
                                }
                            ]
                        },
                        milestones: {
                            nodes: [
                                {
                                    id: "milestone_1",
                                    number: 1,
                                    title: "v1.0.0"
                                }
                            ]
                        }
                    }
                }
            });
        }

        // Default GraphQL response
        return HttpResponse.json({
            data: {}
        });
    }),

    // GitHub REST API - Pull Requests
    http.get('https://api.github.com/repos/:owner/:repo/pulls/:prNumber', ({ params }) => {
        const { owner, repo, prNumber } = params;

        return HttpResponse.json({
            id: parseInt(prNumber as string),
            number: parseInt(prNumber as string),
            title: "Test Pull Request",
            body: "This is a test pull request",
            user: {
                login: "test-developer"
            },
            head: {
                sha: "abc123",
                ref: "feature-branch"
            },
            base: {
                sha: "def456",
                ref: "main"
            },
            state: "open",
            merged: false
        });
    }),

    // GitHub REST API - Pull Request Files
    http.get('https://api.github.com/repos/:owner/:repo/pulls/:prNumber/files', ({ params }) => {
        return HttpResponse.json([
            {
                filename: "src/components/Button.tsx",
                status: "modified",
                additions: 15,
                deletions: 5,
                changes: 20,
                patch: "@@ -10,7 +10,7 @@ export const Button = ({ children, onClick }) => {\n-  const handleClick = () => {\n+  const handleButtonClick = () => {\n     onClick();\n   };"
            },
            {
                filename: "src/utils/api.js",
                status: "added",
                additions: 50,
                deletions: 0,
                changes: 50,
                patch: "@@ -0,0 +1,50 @@\n+// New API utility functions\n+export const fetchData = async (url) => {\n+  // Implementation\n+};"
            }
        ]);
    }),

    // GitHub REST API - File Content
    http.get('https://api.github.com/repos/:owner/:repo/contents/:path*', ({ params }) => {
        const { path } = params;
        const content = `// Mock content for ${path}\nexport default function() {\n  return 'Hello World';\n}`;

        return HttpResponse.json({
            content: Buffer.from(content).toString('base64'),
            encoding: 'base64',
            name: (path as string).split('/').pop(),
            path: path,
            sha: "mock_sha_123"
        });
    }),

    // GitHub REST API - User lookup
    http.get('https://api.github.com/users/:username', ({ params }) => {
        const { username } = params;

        if (username === 'nonexistent-user') {
            return new HttpResponse(null, { status: 404 });
        }

        return HttpResponse.json({
            login: username,
            id: 12345,
            avatar_url: `https://github.com/${username}.png`,
            html_url: `https://github.com/${username}`
        });
    })
];

/**
 * Groq AI API handlers
 */
export const groqHandlers = [
    // Groq Chat Completions
    http.post('https://api.groq.com/openai/v1/chat/completions', async ({ request }) => {
        const body = await request.json() as any;
        const messages = body.messages;

        // Simulate different responses based on request content
        const userMessage = messages.find((m: any) => m.role === 'user')?.content || '';

        let mockResponse;

        if (userMessage.includes('security') || userMessage.includes('vulnerability')) {
            // Security-focused response
            mockResponse = {
                mergeScore: 25,
                codeQuality: {
                    codeStyle: 70,
                    testCoverage: 60,
                    documentation: 65,
                    security: 15,
                    performance: 70,
                    maintainability: 60
                },
                suggestions: [
                    {
                        file: "src/auth/middleware.js",
                        lineNumber: 28,
                        type: "fix",
                        severity: "high",
                        description: "JWT token validation is missing",
                        suggestedCode: "if (!jwt.verify(token, process.env.JWT_SECRET)) { throw new Error('Invalid token'); }",
                        reasoning: "Authentication bypass vulnerability detected"
                    }
                ],
                summary: "Critical security vulnerabilities found. Do not merge until security issues are resolved.",
                confidence: 0.95
            };
        } else if (userMessage.includes('test') || userMessage.includes('coverage')) {
            // Test-focused response
            mockResponse = {
                mergeScore: 85,
                codeQuality: {
                    codeStyle: 90,
                    testCoverage: 95,
                    documentation: 85,
                    security: 90,
                    performance: 80,
                    maintainability: 85
                },
                suggestions: [
                    {
                        file: "src/components/Button.test.tsx",
                        type: "improvement",
                        severity: "low",
                        description: "Add edge case tests for disabled state",
                        reasoning: "Comprehensive testing improves reliability"
                    }
                ],
                summary: "Excellent test coverage and code quality. Ready for merge.",
                confidence: 0.92
            };
        } else {
            // Default response
            mockResponse = {
                mergeScore: 75,
                codeQuality: {
                    codeStyle: 80,
                    testCoverage: 70,
                    documentation: 75,
                    security: 85,
                    performance: 75,
                    maintainability: 80
                },
                suggestions: [
                    {
                        file: "src/components/Button.tsx",
                        lineNumber: 42,
                        type: "improvement",
                        severity: "medium",
                        description: "Consider using React.memo to optimize re-renders",
                        suggestedCode: "export const Button = React.memo(({ children, onClick }) => {",
                        reasoning: "This component receives props that don't change frequently"
                    }
                ],
                summary: "Good code quality with minor improvement opportunities.",
                confidence: 0.85
            };
        }

        return HttpResponse.json({
            choices: [
                {
                    message: {
                        content: JSON.stringify(mockResponse)
                    },
                    finish_reason: "stop"
                }
            ],
            usage: {
                prompt_tokens: 1000,
                completion_tokens: 500,
                total_tokens: 1500
            }
        });
    }),

    // Groq Rate Limit Error
    http.post('https://api.groq.com/openai/v1/chat/completions', ({ request }) => {
        // This handler can be activated for testing rate limits
        return new HttpResponse(null, {
            status: 429,
            headers: {
                'retry-after': '60'
            }
        });
    }, { once: false })
];

/**
 * Stellar Network handlers
 */
export const stellarHandlers = [
    // Stellar Horizon - Account Info
    http.get('https://horizon-testnet.stellar.org/accounts/:accountId', ({ params }) => {
        const { accountId } = params;

        return HttpResponse.json({
            account_id: accountId,
            sequence: "123456789",
            balances: [
                {
                    asset_type: "native",
                    balance: "1000.0000000"
                },
                {
                    asset_type: "credit_alphanum4",
                    asset_code: "USDC",
                    asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
                    balance: "500.0000000"
                }
            ]
        });
    }),

    // Stellar Horizon - Payments
    http.get('https://horizon-testnet.stellar.org/accounts/:accountId/payments', ({ params }) => {
        const { accountId } = params;

        return HttpResponse.json({
            records: [
                {
                    id: "payment_1",
                    type: "payment",
                    to: accountId,
                    amount: "100.0000000",
                    asset_type: "native",
                    created_at: new Date().toISOString()
                },
                {
                    id: "payment_2",
                    type: "path_payment_strict_receive",
                    to: accountId,
                    amount: "50.0000000",
                    asset_type: "credit_alphanum4",
                    asset_code: "USDC",
                    created_at: new Date(Date.now() - 86400000).toISOString()
                }
            ]
        });
    }),

    // Stellar Horizon - Submit Transaction
    http.post('https://horizon-testnet.stellar.org/transactions', async ({ request }) => {
        const formData = await request.formData();
        const tx = formData.get('tx');

        return HttpResponse.json({
            hash: `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ledger: 12345,
            envelope_xdr: tx,
            result_xdr: "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA=",
            result_meta_xdr: "AAAAAQAAAAIAAAADAAAAAwAAAAA="
        });
    }),

    // Stellar Friendbot - Fund Account
    http.get('https://friendbot.stellar.org', ({ request }) => {
        const url = new URL(request.url);
        const addr = url.searchParams.get('addr');

        if (!addr) {
            return new HttpResponse(null, { status: 400 });
        }

        return HttpResponse.json({
            hash: `friendbot_tx_${Date.now()}`,
            ledger: 12345,
            envelope_xdr: "mock_envelope",
            result_xdr: "AAAAAAAAAGQAAAAAAAAAAQAAAAAAAAABAAAAAAAAAAA="
        });
    })
];

/**
 * Firebase handlers (for external Firebase calls if any)
 */
export const firebaseHandlers = [
    // Firebase Auth - Token Verification
    http.post('https://identitytoolkit.googleapis.com/v1/accounts:lookup', async ({ request }) => {
        const body = await request.json() as any;
        const idToken = body.idToken;

        if (!idToken || idToken === 'invalid_token') {
            return new HttpResponse(null, { status: 400 });
        }

        return HttpResponse.json({
            users: [
                {
                    localId: "test_user_123",
                    email: "test@example.com",
                    emailVerified: true,
                    displayName: "Test User"
                }
            ]
        });
    })
];

/**
 * Error simulation handlers
 * These can be used to test error handling scenarios
 */
export const errorHandlers = [
    // Network timeout simulation
    http.get('https://api.github.com/timeout-test', () => {
        return new Promise(() => {
            // Never resolves - simulates timeout
        });
    }),

    // Rate limit simulation
    http.get('https://api.github.com/rate-limit-test', () => {
        return new HttpResponse(null, {
            status: 429,
            headers: {
                'x-ratelimit-remaining': '0',
                'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 3600)
            }
        });
    }),

    // Server error simulation
    http.get('https://api.github.com/server-error-test', () => {
        return new HttpResponse(null, { status: 500 });
    })
];

/**
 * Combined handlers for all external APIs
 */
export const handlers = [
    ...githubHandlers,
    ...groqHandlers,
    ...stellarHandlers,
    ...firebaseHandlers,
    ...errorHandlers
];