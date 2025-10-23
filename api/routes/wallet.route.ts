import { RequestHandler, Router } from "express";
import { 
    withdrawAsset, 
    swapAsset, 
    getWalletInfo, 
    getTransactions,
    recordWalletTopups
} from "../controllers/wallet";
import {
    withdrawAssetValidator,
    swapAssetValidator,
    walletInstallationIdValidator
} from "../validators/wallet.validator";
import { ENDPOINTS } from "../utilities/endpoints";

export const walletRoutes = Router();

// Get wallet info
walletRoutes.get(
    ENDPOINTS.WALLET.GET_ACCOUNT, 
    walletInstallationIdValidator, 
    getWalletInfo as RequestHandler
);

// Withdraw asset
walletRoutes.post(
    ENDPOINTS.WALLET.WITHDRAW, 
    withdrawAssetValidator, 
    withdrawAsset as RequestHandler
);

// Swap assets (XLM and USDC)
walletRoutes.post(
    ENDPOINTS.WALLET.SWAP, 
    swapAssetValidator, 
    swapAsset as RequestHandler
);

// ============================================================================
// ============================================================================

// Get transactions
walletRoutes.get(
    ENDPOINTS.WALLET.TRANSACTIONS.GET_ALL, 
    walletInstallationIdValidator, 
    getTransactions as RequestHandler
);

// Record wallet topups
walletRoutes.post(
    ENDPOINTS.WALLET.TRANSACTIONS.RECORD_TOPUPS, 
    walletInstallationIdValidator, 
    recordWalletTopups as RequestHandler
);
