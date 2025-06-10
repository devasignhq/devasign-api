import { RequestHandler, Router } from "express";
import { 
    withdrawAsset, 
    swapAsset, 
    getWalletInfo, 
    getTransactions
} from "../controllers/walletController";
import {
    withdrawAssetValidator,
    swapAssetValidator,
    walletProjectIdValidator,
} from "../validators/walletValidators";

export const walletRoutes = Router();

// Get wallet info
walletRoutes.get("/account", walletProjectIdValidator, getWalletInfo as RequestHandler);

// Withdraw crypto
walletRoutes.post("/withdraw", withdrawAssetValidator, withdrawAsset as RequestHandler);

// Swap between XLM and USDC
walletRoutes.post("/swap", swapAssetValidator, swapAsset as RequestHandler);

// Get transactions
walletRoutes.get("/transactions", walletProjectIdValidator, getTransactions as RequestHandler);