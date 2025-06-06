import { RequestHandler, Router } from "express";
import { 
    withdrawAsset, 
    swapAsset, 
    getWalletInfo, 
    getProjectTransactions,
    getPersonalTransactions
} from "../controllers/walletController";
import {
    withdrawAssetValidator,
    swapAssetValidator,
    getProjectTransactionsValidator
} from "../validators/walletValidators";

export const walletRoutes = Router();

// Get wallet info
walletRoutes.get("/account", getWalletInfo as RequestHandler);

// Withdraw crypto
walletRoutes.post("/withdraw", withdrawAssetValidator, withdrawAsset as RequestHandler);

// Swap between XLM and USDC
walletRoutes.post("/swap", swapAssetValidator, swapAsset as RequestHandler);

// Get transactions
walletRoutes.get("/transactions/:projectId", getProjectTransactionsValidator, getProjectTransactions as RequestHandler);
walletRoutes.get("/transactions/me", getPersonalTransactions as RequestHandler);