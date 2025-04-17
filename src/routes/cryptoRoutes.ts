import { RequestHandler, Router } from "express";
import { 
    withdrawCrypto, 
    swapCrypto, 
    getWalletInfo 
} from "../controllers/cryptoController";

export const cryptoRoutes = Router();

// Get wallet info
cryptoRoutes.get("/wallet", getWalletInfo as RequestHandler);

// Withdraw crypto
cryptoRoutes.post("/withdraw", withdrawCrypto as RequestHandler);

// Swap between XLM and USDC
cryptoRoutes.post("/swap", swapCrypto as RequestHandler);