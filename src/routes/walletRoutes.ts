import { RequestHandler, Router } from "express";
import { 
    withdrawCrypto, 
    swapCrypto, 
    getWalletInfo 
} from "../controllers/walletController";
import {
    withdrawCryptoValidator,
    swapCryptoValidator
} from "../validators/walletValidators";

export const walletRoutes = Router();

// Get wallet info
walletRoutes.get("/wallet", getWalletInfo as RequestHandler);

// Withdraw crypto
walletRoutes.post("/withdraw", withdrawCryptoValidator, withdrawCrypto as RequestHandler);

// Swap between XLM and USDC
walletRoutes.post("/swap", swapCryptoValidator, swapCrypto as RequestHandler);