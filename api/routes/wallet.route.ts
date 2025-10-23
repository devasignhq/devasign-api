import { RequestHandler, Router } from "express";
import { 
    withdrawAsset, 
    swapAsset, 
    getWalletInfo, 
    getTransactions,
    recordWalletTopups
} from "../controllers/wallet";
import {
    withdrawAssetSchema,
    swapAssetSchema,
    walletInstallationIdSchema,
    getTransactionsSchema
} from "../schemas/wallet.schema";
import { ENDPOINTS } from "../utilities/data";
import { validateRequestParameters } from "../middlewares/request.middleware";

export const walletRoutes = Router();

// Get wallet info
walletRoutes.get(
    ENDPOINTS.WALLET.GET_ACCOUNT, 
    validateRequestParameters(walletInstallationIdSchema), 
    getWalletInfo as RequestHandler
);

// Withdraw asset
walletRoutes.post(
    ENDPOINTS.WALLET.WITHDRAW, 
    validateRequestParameters(withdrawAssetSchema), 
    withdrawAsset as RequestHandler
);

// Swap assets (XLM and USDC)
walletRoutes.post(
    ENDPOINTS.WALLET.SWAP, 
    validateRequestParameters(swapAssetSchema), 
    swapAsset as RequestHandler
);

// ============================================================================
// ============================================================================

// Get transactions
walletRoutes.get(
    ENDPOINTS.WALLET.TRANSACTIONS.GET_ALL, 
    validateRequestParameters(getTransactionsSchema), 
    getTransactions as RequestHandler
);

// Record wallet topups
walletRoutes.post(
    ENDPOINTS.WALLET.TRANSACTIONS.RECORD_TOPUPS, 
    validateRequestParameters(walletInstallationIdSchema), 
    recordWalletTopups as RequestHandler
);
