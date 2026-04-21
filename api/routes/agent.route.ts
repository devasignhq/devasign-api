import { Request, Response, Router, RequestHandler, NextFunction } from "express";
import { cloudTasksService } from "../services/cloud-tasks.service.js";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient, RoutesConfig } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { ENDPOINTS, STATUS_CODES } from "../utils/data.js";
import { responseWrapper } from "../utils/helper.js";
import { ValidationError } from "../models/error.model.js";

// const network = `stellar:${process.env.STELLAR_NETWORK === "testnet" ? "testnet" : "pubnet"}` as `${string}:${string}`;
const network = "stellar:testnet" as `${string}:${string}`;
const facilitatorUrl = process.env.X402_FACILITATOR_URL;
const payTo = process.env.X402_PAYEE_ADDRESS;
const facilitatorApiKey = process.env.X402_API_KEY;

export const agentRoutes = Router();

if (facilitatorUrl && payTo && facilitatorApiKey) {
    // Initialize x402 facilitator client
    const facilitatorClient = new HTTPFacilitatorClient({
        url: facilitatorUrl,
        createAuthHeaders: async () => {
            const headers = { Authorization: `Bearer ${facilitatorApiKey}` };
            return { verify: headers, settle: headers, supported: headers };
        }
    });

    // Validate PR URL before payment middleware is executed
    agentRoutes.post(
        ENDPOINTS.AGENT.REVIEW,
        ((req: Request, res: Response, next: NextFunction) => {
            const { prUrl } = req.body;

            // Validate PR URL
            const match = prUrl?.match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/);
            if (!match) {
                return next(new ValidationError("Please provide a valid GitHub Pull Request URL."));
            }

            // Store clean URL in locals for the later handler
            res.locals.cleanPrUrl = match[0];

            // TODO: add checks for: public repo, not forked, not archived, not empty

            next();
        }) as RequestHandler
    );

    // Setup x402 payment middleware for the review agent endpoint
    agentRoutes.use(
        paymentMiddlewareFromConfig(
            {
                [`POST ${ENDPOINTS.AGENT.REVIEW}`]: {
                    accepts: {
                        scheme: "exact",
                        price: "$0.50",
                        network,
                        payTo
                    },
                    description: "Pull request review",
                    mimeType: "application/json"
                }
            } as RoutesConfig,
            facilitatorClient,
            [{ network, server: new ExactStellarScheme() }]
        )
    );

    // Protected endpoint handler
    agentRoutes.post(
        ENDPOINTS.AGENT.REVIEW,
        (async (req: Request, res: Response, next: NextFunction) => {
            try {
                const { cleanPrUrl } = res.locals;
                const taskId = await cloudTasksService.addManualPRAnalysisJob(cleanPrUrl);

                responseWrapper({
                    res,
                    status: STATUS_CODES.SUCCESS,
                    data: { success: true, taskId },
                    message: "Review in progress. A comment will be posted by our bot."
                });
            } catch (error) {
                next(error);
            }
        }) as unknown as RequestHandler
    );
} else {
    agentRoutes.post(ENDPOINTS.AGENT.REVIEW, (req: Request, res: Response) => {
        responseWrapper({
            res,
            status: STATUS_CODES.SERVER_ERROR,
            data: {},
            message: "Agent features are not configured on this server."
        });
    });
}
