import { RequestHandler, Router } from "express";
import { 
    withdrawAsset, 
    swapAsset, 
    getWalletInfo,
    recordWalletTopups,
    getInstallationTransactions,
    getUserTransactions
} from "../controllers/wallet";
import {
    withdrawAssetSchema,
    swapAssetSchema,
    walletInstallationIdSchema,
    getInstallationTransactionsSchema,
    getUserTransactionsSchema
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

// Get user transactions
walletRoutes.get(
    ENDPOINTS.WALLET.TRANSACTIONS.GET_ALL_USER, 
    validateRequestParameters(getUserTransactionsSchema), 
    getUserTransactions as RequestHandler
);

// Get installation transactions
walletRoutes.get(
    ENDPOINTS.WALLET.TRANSACTIONS.GET_ALL_INSTALLATION, 
    validateRequestParameters(getInstallationTransactionsSchema), 
    getInstallationTransactions as RequestHandler
);

// Record wallet topups
walletRoutes.post(
    ENDPOINTS.WALLET.TRANSACTIONS.RECORD_TOPUPS, 
    validateRequestParameters(walletInstallationIdSchema), 
    recordWalletTopups as RequestHandler
);
