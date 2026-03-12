import { Request, Response, NextFunction } from "express";
import { GitHubWebhookPayload } from "../../models/ai-review.model";
import { WorkflowIntegrationService } from "../pr-review/workflow-integration.service";
import { responseWrapper, stellarTimestampToDate } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { prisma } from "../../config/database.config";
import { dataLogger } from "../../config/logger.config";
import { OctokitService } from "../octokit.service";
import { stellarService } from "../stellar.service";
import { ContractService } from "../contract.service";
import { KMSService } from "../kms.service";
import { HorizonApi } from "../../models/horizonapi.model";
import { BOUNTY_LABEL, GitHubComment } from "../../models/github.model";

export class IssueCommentWebhookService {
    private static readonly AUTHORIZED_ASSOCIATIONS = ["OWNER", "MEMBER", "COLLABORATOR"];

    /**
     * Entry point for issue_comment events.
     * Routes to either PR review trigger or Bounty creation trigger.
     */
    static async handleIssueCommentEvent(req: Request, res: Response, next: NextFunction) {
        try {
            const { comment } = req.body;
            const commentBody: string = (comment?.body ?? "").trim();

            // Trigger PR review
            if (commentBody.toLowerCase() === "review") {
                return await this.handleReviewCommentTrigger(req, res, next);
            }

            // Trigger bounty creation
            const bountyMatch = commentBody.match(/^\/bounty\s+\$?(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s*(days?|weeks?)/i);
            if (bountyMatch) {
                return await this.handleBountyCommentTrigger(req, res, next, bountyMatch);
            }

            return responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: {},
                message: "Comment does not trigger any action - skipping"
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * When the comment body is exactly "review" (case-insensitive) and the comment
     * is posted on a pull request, it triggers a PR review regardless of whether
     * the PR has any linked issues.
     */
    static async handleReviewCommentTrigger(req: Request, res: Response, next: NextFunction) {
        try {
            const { comment, issue, repository, installation } = req.body;

            // Only act on PR comments (GitHub issues that are pull requests have a pull_request key)
            if (!issue.pull_request) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Comment is not on a pull request - skipping"
                });
            }

            // Only trigger when the comment body is exactly "review" (case-insensitive, trimmed)
            const commentBody: string = (comment.body ?? "").trim();
            if (commentBody.toLowerCase() !== "review") {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Comment body is not 'review' - skipping"
                });
            }

            const installationId = installation.id.toString();

            // Check if user has permission to trigger a review
            const authorAssociation = comment.author_association;

            // A review can be triggered by repo maintainers (OWNER, MEMBER, COLLABORATOR)
            if (!authorAssociation || !this.AUTHORIZED_ASSOCIATIONS.includes(authorAssociation.toUpperCase())) {
                dataLogger.info("Review comment ignored: User is not a repo maintainer", {
                    username: comment.user?.login,
                    authorAssociation,
                    prNumber: issue.number
                });

                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: `User is not authorized to trigger review (association: ${authorAssociation}) - skipping`
                });
            }

            // Check if installation exists and is active
            const activeInstallation = await prisma.installation.findUnique({
                where: { id: installationId },
                select: { id: true, status: true }
            });

            if (!activeInstallation || activeInstallation.status !== "ACTIVE") {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Installation is not active or not found - skipping"
                });
            }

            dataLogger.info(
                "'review' comment detected on PR - triggering manual review",
                {
                    prNumber: issue.number,
                    repository: repository.full_name,
                    commenter: comment.user?.login
                }
            );

            // Fetch the full PR object from the GitHub API
            const repositoryName = repository.full_name;
            const prNumber: number = issue.number;

            const octokit = await OctokitService.getOctokit(installationId);
            const [owner, repo] = OctokitService.getOwnerAndRepo(repositoryName);
            const { data: pull_request } = await octokit.rest.pulls.get({
                owner,
                repo,
                pull_number: prNumber
            });

            // Check for draft PRs
            if (pull_request?.draft) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Skipping draft PR"
                });
            }

            // Validate that the PR is targeting the default branch
            const targetBranch = pull_request.base.ref;
            let defaultBranch = pull_request.base.repo?.default_branch;

            // Fetch the default branch from the API if not available on the payload
            if (!defaultBranch) {
                try {
                    defaultBranch = await OctokitService.getDefaultBranch(installationId, repositoryName);
                } catch (error) {
                    // Non-fatal — log and continue
                    dataLogger.warn(
                        "Failed to validate default branch for 'review' trigger, continuing with processing",
                        {
                            repositoryName,
                            targetBranch,
                            error: error instanceof Error ? error.message : String(error)
                        }
                    );
                }
            }

            // If PR is not targeting the default branch, skip it
            if (defaultBranch && targetBranch !== defaultBranch) {
                dataLogger.info(
                    "PR skipped - not targeting default branch",
                    {
                        prNumber,
                        repositoryName,
                        targetBranch,
                        defaultBranch,
                        reason: "not_default_branch"
                    }
                );
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "PR not targeting default branch - skipping review",
                    meta: { prNumber, repositoryName, targetBranch, defaultBranch, reason: "not_default_branch" }
                });
            }

            // Build an explicit GitHubWebhookPayload — no req.body mutation needed.
            // manualTrigger: true signals downstream services to bypass the linked-issues check.
            const payload: GitHubWebhookPayload = {
                action: "opened",
                number: prNumber,
                pull_request: pull_request as unknown as GitHubWebhookPayload["pull_request"],
                repository,
                installation,
                manualTrigger: true
            };

            // Process the webhook workflow
            const workflowService = WorkflowIntegrationService.getInstance();
            const result = await workflowService.processWebhookWorkflow(payload);

            // If the workflow failed, return an error response
            if (!result.success) {
                dataLogger.error("Failed to process 'review' comment trigger", { payload, result });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SERVER_ERROR,
                    data: { timestamp: new Date().toISOString() },
                    message: result.error || "Failed to process review trigger"
                });
            }

            // If the workflow failed to create a job, return an error response
            if (result.reason && !result.jobId) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {
                        prNumber,
                        repositoryName,
                        timestamp: new Date().toISOString()
                    },
                    message: result.reason
                });
            }

            // Return a response indicating that the job was created
            responseWrapper({
                res,
                status: STATUS_CODES.BACKGROUND_JOB,
                data: {
                    jobId: result.jobId,
                    installationId: result.prData?.installationId,
                    repositoryName: result.prData?.repositoryName,
                    prNumber: result.prData?.prNumber,
                    prUrl: result.prData?.prUrl,
                    linkedIssuesCount: result.prData?.linkedIssues.length || 0,
                    changedFilesCount: result.prData?.changedFiles.length || 0,
                    eligibleForAnalysis: true,
                    status: "queued",
                    timestamp: new Date().toISOString()
                },
                message: "PR webhook processed successfully - analysis queued"
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * Handles bounty creation triggered by comments with format /bounty $300 2 days
     */
    static async handleBountyCommentTrigger(req: Request, res: Response, next: NextFunction, match: RegExpMatchArray) {
        try {
            const { comment, issue, repository, installation } = req.body;

            // Only act on regular issue comments (GitHub issues that are pull requests have a pull_request key)
            if (issue.pull_request) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Comment is on a pull request - skipping bounty creation"
                });
            }

            // Only trigger bounty creation when the parent issue is explicitly open
            if (issue.state !== "open") {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Issue is not open - skipping bounty creation"
                });
            }

            // Check if user has permission to create a bounty
            const authorAssociation = comment.author_association;

            // A bounty can be created by repo maintainers (OWNER, MEMBER, COLLABORATOR)
            if (!authorAssociation || !this.AUTHORIZED_ASSOCIATIONS.includes(authorAssociation.toUpperCase())) {
                dataLogger.info("Bounty comment ignored: User is not a repo maintainer", {
                    username: comment.user?.login,
                    authorAssociation,
                    issueNumber: issue.number
                });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: `User is not authorized to create bounties (association: ${authorAssociation}) - skipping`
                });
            }

            // Validate the commenter is actively registered as a user inside DevAsign
            const creator = await prisma.user.findUnique({
                where: { username: comment.user.login }
            });

            if (!creator) {
                dataLogger.info("Bounty comment ignored: Creator not found in DevAsign", { username: comment.user?.login });
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Commenter is not a registered user on DevAsign - skipping bounty creation"
                });
            }

            const installationId = installation.id.toString();

            // Check if installation exists, is active, and possesses an active wallet
            const activeInstallation = await prisma.installation.findUnique({
                where: {
                    id: installationId,
                    users: { some: { userId: creator.userId } }
                },
                select: { id: true, status: true, wallet: true }
            });

            if (!activeInstallation || activeInstallation.status !== "ACTIVE" || !activeInstallation.wallet) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: {},
                    message: "Installation is not active or wallet missing - skipping"
                });
            }

            // Parse the command matches for bounty amount, timeline value and unit definitions
            const amount = parseFloat(match[1]);
            const timelineValue = parseFloat(match[2]);
            const timelineType = match[3].toLowerCase();

            // Compute equivalent numerical constraints in days
            let timelineInDays = timelineValue;
            if (timelineType.startsWith("week")) timelineInDays *= 7;
            timelineInDays = Math.round(timelineInDays);

            // Return success before processing since task creation takes time
            responseWrapper({
                res,
                status: STATUS_CODES.SUCCESS,
                data: {},
                message: "Bounty comment recognized - processing in background"
            });

            // Process escrow and task creation asynchronously
            (async () => {
                try {
                    type USDCBalance = HorizonApi.BalanceLineAsset<"credit_alphanum12">;

                    // Verify installation wallet has sufficient USDC balance
                    const accountInfo = await stellarService.getAccountInfo(activeInstallation.wallet!.address);
                    const usdcAsset = accountInfo.balances.find(
                        (asset): asset is USDCBalance => "asset_code" in asset && asset.asset_code === "USDC"
                    ) as USDCBalance;

                    // If installation wallet has insufficient USDC balance, log error, post failure comment and return
                    if (!usdcAsset || parseFloat(usdcAsset.balance) < amount) {
                        dataLogger.info("Insufficient USDC balance", { installationId, amount });
                        await this.bountyFailureComment(
                            installationId,
                            repository.full_name,
                            issue.number,
                            "Your USDC balance is insufficient to create this bounty"
                        );
                        return;
                    }

                    // Decrypt installation wallet secret
                    const decryptedInstallationWalletSecret = await KMSService.decryptWallet(activeInstallation.wallet!);

                    // Retrieve or create bounty tracking label inside the referenced repository
                    let bountyLabelId;
                    try {
                        const label = await OctokitService.getBountyLabel(repository.node_id, installationId);
                        bountyLabelId = label.id;
                    } catch {
                        const labels = await OctokitService.createBountyLabels(repository.node_id, installationId);
                        const label = labels.find(l => l.name === BOUNTY_LABEL);
                        if (label) bountyLabelId = label.id;
                    }

                    // If bounty label is not found and cannot be created, log error, post failure comment and return
                    if (!bountyLabelId) {
                        dataLogger.error("Failed to get or create bounty label", { repo: repository.full_name });
                        await this.bountyFailureComment(installationId, repository.full_name, issue.number);
                        return;
                    }

                    // Create task
                    const task = await prisma.task.create({
                        data: {
                            bounty: amount,
                            timeline: timelineInDays,
                            issue: {
                                id: issue.node_id,
                                number: issue.number,
                                title: issue.title,
                                body: issue.body,
                                url: issue.html_url,
                                state: issue.state,
                                labels: (issue.labels || []).map((l: { node_id: string; name: string; color: string; description: string | null }) => ({
                                    id: l.node_id,
                                    name: l.name,
                                    color: l.color,
                                    description: l.description
                                })),
                                locked: issue.locked,
                                repository: { url: repository.html_url },
                                createdAt: issue.created_at,
                                updatedAt: issue.updated_at
                            },
                            installation: {
                                connect: { id: installationId }
                            },
                            creator: {
                                connect: { userId: creator.userId }
                            }
                        }
                    });

                    // Forward smart contract interaction parameters initializing the actual deposit timeline over Soroban
                    let escrowResult;
                    try {
                        escrowResult = await ContractService.createEscrow(
                            decryptedInstallationWalletSecret,
                            task.id,
                            issue.html_url,
                            amount
                        );
                    } catch (error) {
                        // If escrow creation fails, log, rollback task creation and post failure comment
                        dataLogger.error(
                            "Failed to create escrow on smart contract",
                            { issueId: issue.id, installationId, error }
                        );

                        try {
                            await prisma.task.delete({ where: { id: task.id } });
                        } catch (error) {
                            dataLogger.error(
                                "Failed to rollback task creation",
                                { taskId: task.id, installationId, issueId: issue.id, error }
                            );
                        }
                        
                        await this.bountyFailureComment(installationId, repository.full_name, issue.number);
                        return;
                    }

                    // Confirm success asynchronously via Github comment matching requested design context
                    let bountyComment;
                    try {
                        bountyComment = await OctokitService.addBountyLabelAndCreateBountyComment(
                            installationId,
                            issue.node_id,
                            bountyLabelId,
                            OctokitService.customBountyMessage(amount.toString(), task.id)
                        );
                    } catch (error) {
                        const partialData = (error as { data?: { addComment?: { commentEdge?: { node?: GitHubComment } } } })?.data;
                        if (partialData?.addComment?.commentEdge?.node) {
                            // Comment was posted successfully despite warning/error (adding the bounty label failed)
                            bountyComment = partialData.addComment.commentEdge.node;
                            dataLogger.warn(
                                "Bounty comment created. Failed to add bounty label on issue",
                                { taskId: task.id, issueId: issue.id, installationId, error }
                            );
                        } else {
                            // Log error, post failure comment and continue
                            dataLogger.info(
                                "Failed to either post bounty comment or add bounty label",
                                { taskId: task.id, issueId: issue.id, installationId, error }
                            );
                            await this.bountyFailureComment(
                                installationId,
                                repository.full_name,
                                issue.number,
                                "Bounty was created but there was an issue while posting the bounty comment or adding the bounty label on issue"
                            );
                        }
                    }

                    await prisma.$transaction([
                        // Update task status, escrow transaction hash and issue bindings with bounty comment id
                        prisma.task.update({
                            where: { id: task.id },
                            data: {
                                status: "OPEN",
                                issue: {
                                    ...(typeof task.issue === "object" && task.issue !== null ? task.issue as object : {}),
                                    bountyLabelId,
                                    ...(bountyComment && { bountyCommentId: bountyComment.id })
                                },
                                escrowTransactions: {
                                    push: { txHash: escrowResult.txHash, method: "creation" }
                                }
                            }
                        }),
                        // Record bounty transaction
                        prisma.transaction.create({
                            data: {
                                txHash: escrowResult.txHash,
                                category: "BOUNTY",
                                amount,
                                task: { connect: { id: task.id } },
                                installation: { connect: { id: installationId } },
                                doneAt: stellarTimestampToDate(escrowResult.result.createdAt)
                            }
                        })
                    ]);

                    dataLogger.info(
                        "Bounty task created successfully",
                        { taskId: task.id, issueId: issue.id, installationId }
                    );
                } catch (err) {
                    // Log error and post failure comment
                    dataLogger.error(
                        "Error in async bounty task creation",
                        { error: err, issueId: issue.id, installationId }
                    );
                    await this.bountyFailureComment(installationId, repository.full_name, issue.number);
                }
            })();

        } catch (error) {
            next(error);
        }
    }

    /**
     * Posts a comment on an issue to indicate that bounty creation has failed.
     * @param installationId - The ID of the installation
     * @param repositoryName - The name of the repository
     * @param issueNumber - The number of the issue
     * @param error - The error message to post (optional)
     */
    private static async bountyFailureComment(
        installationId: string,
        repositoryName: string,
        issueNumber: number,
        error?: string
    ) {
        try {
            await OctokitService.createComment(
                installationId,
                repositoryName,
                issueNumber,
                error || "Bounty creation failed due to an internal error. Please try again on the DevAsign dashboard."
            );
        } catch (error) {
            dataLogger.error(
                "Failed to post bounty failure comment",
                { error, installationId, repositoryName, issueNumber }
            );
            return error;
        }
    }
}
