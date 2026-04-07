import { Request, Response, Router, RequestHandler, NextFunction } from "express";
import { cloudTasksService } from "../services/cloud-tasks.service";
import { paymentMiddlewareFromConfig } from "@x402/express";
import { HTTPFacilitatorClient, RoutesConfig } from "@x402/core/server";
import { ExactStellarScheme } from "@x402/stellar/exact/server";
import { ENDPOINTS, STATUS_CODES } from "../utilities/data";
import { responseWrapper } from "../utilities/helper";
import { ValidationError } from "../models/error.model";

const network = `stellar:${process.env.STELLAR_NETWORK === "testnet" ? "testnet" : "pubnet"}` as `${string}:${string}`;
const facilitatorUrl = process.env.X402_FACILITATOR_URL;
const payTo = process.env.X402_PAYEE_ADDRESS;
const facilitatorApiKey = process.env.X402_API_KEY;

// Initialize x402 facilitator client
const facilitatorClient = new HTTPFacilitatorClient({
    url: facilitatorUrl,
    createAuthHeaders: async () => {
        const headers = { Authorization: `Bearer ${facilitatorApiKey}` };
        return { verify: headers, settle: headers, supported: headers };
    }
});

export const agentRoutes = Router();

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
            const { prUrl } = req.body;

            // Validate PR URL
            const match = prUrl.match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/);
            if (!match) {
                throw new ValidationError("Please provide a valid GitHub Pull Request URL.");
            }
            // Optionally reconstruct a clean URL to pass to the job
            const cleanPrUrl = match[0];
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
