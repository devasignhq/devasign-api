import { RequestHandler, Router } from "express";
import { 
    withdrawCrypto, 
    swapCrypto, 
    getWalletInfo 
} from "../controllers/cryptoController";
import {
    withdrawCryptoValidator,
    swapCryptoValidator
} from "../validators/cryptoValidators";

export const cryptoRoutes = Router();

// Get wallet info
cryptoRoutes.get("/wallet", getWalletInfo as RequestHandler);

// Withdraw crypto
cryptoRoutes.post("/withdraw", withdrawCryptoValidator, withdrawCrypto as RequestHandler);

// Swap between XLM and USDC
cryptoRoutes.post("/swap", swapCryptoValidator, swapCrypto as RequestHandler);