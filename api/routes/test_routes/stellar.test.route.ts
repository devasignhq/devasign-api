import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { body } from "express-validator";
import { encrypt } from "../../helper";
import { prisma } from "../../config/database.config";
import { xlmAssetId, usdcAssetId } from "../../config/stellar.config";
import { stellarService } from "../../services/stellar.service";

const router = Router();

// Create a new wallet
router.post("/wallet", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const wallet = await stellarService.createWallet();
        const encryptedSecret = encrypt(wallet.secretKey);

        res.status(201).json({
            message: "Wallet created successfully",
            data: { wallet, encryptedSecret }
        });
    } catch (error) {
        next(error);
    }
});

// Create a new wallet via sponsor
router.post("/wallet/sponsor",
    [
        body("sponsorSecret").notEmpty().withMessage("Secret key is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret } = req.body;
            const wallet = await stellarService.createWalletViaSponsor(sponsorSecret);
            res.status(201).json({
                message: "Wallet created successfully",
                data: wallet
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add trustline for USDC
router.post("/trustline",
    [
        body("secretKey").notEmpty().withMessage("Secret key is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { secretKey } = req.body;
            await stellarService.addTrustLine(secretKey);
            res.status(200).json({
                message: "USDC trustline added successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add trustline for USDC via sponsor
router.post("/trustline/sponsor",
    [
        body("sponsorSecret").notEmpty().withMessage("Sponsor key is required"),
        body("accountSecret").notEmpty().withMessage("Account key is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret, accountSecret } = req.body;
            await stellarService.addTrustLineViaSponsor(sponsorSecret, accountSecret);
            res.status(200).json({
                message: "USDC trustline added successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Fund a wallet
router.post("/fund",
    body("publicKey").notEmpty().withMessage("Public key is required"),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await stellarService.fundWallet(req.body.publicKey);
            res.status(200).json({
                message: "Wallet funded successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Transfer assets
router.post("/transfer",
    [
        body("sourceSecret").notEmpty().withMessage("Source secret key is required"),
        body("destinationAddress").notEmpty().withMessage("Destination public key is required"),
        body("amount").notEmpty().withMessage("Amount is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecret, destinationAddress, amount } = req.body;
            const result = await stellarService.transferAsset(
                sourceSecret,
                destinationAddress,
                xlmAssetId,
                xlmAssetId,
                amount
            );
            res.status(200).json({
                message: "Asset transferred successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Transfer assets via sponsor
router.post("/transfer/sponsor",
    [
        body("sponsorSecret").notEmpty().withMessage("Sponsor key is required"),
        body("accountSecret").notEmpty().withMessage("Account key is required"),
        body("destinationAddress").notEmpty().withMessage("Destination public key is required"),
        body("amount").notEmpty().withMessage("Amount is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret, accountSecret, destinationAddress, amount } = req.body;
            const result = await stellarService.transferAssetViaSponsor(
                sponsorSecret,
                accountSecret,
                destinationAddress,
                usdcAssetId,
                usdcAssetId,
                amount
            );
            res.status(200).json({
                message: "Asset transferred successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Swap assets
router.post("/swap",
    [
        body("sourceSecret").notEmpty().withMessage("Source secret key is required"),
        body("amount").notEmpty().withMessage("Amount is required")
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecret, amount } = req.body;
            const result = await stellarService.swapAsset(sourceSecret, amount);
            res.status(200).json({
                message: "Asset swapped successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get account info
router.get("/account/:publicKey", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountInfo = await stellarService.getAccountInfo(req.params.publicKey);
        res.status(200).json({
            message: "Account info retrieved successfully",
            data: accountInfo
        });
    } catch (error) {
        next(error);
    }
});

// Stream
router.get("/stream/:publicKey", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountToWatch = "GD6LFE72VUGGPYDAWOEL5I34JODO746PSEFBUCDZECXTVWB6VFLOPFUM";
        const accountInfo = await stellarService.buildPaymentTransactionStream(accountToWatch);

        console.log("--- Transaction Stream ---");

        accountInfo({
            onmessage: (payment: any) => {
                // The 'payment' object contains details about the payment operation.
                // We are interested in incoming payments, so we check the 'to' address.
                if (payment.type === "payment" && payment.to === accountToWatch) {
                    // Check if it's a native asset (XLM) or a credit asset
                    const assetType = payment.asset_type;
                    const assetCode = payment.asset_code || "XLM"; // Use XLM for native
                    const assetIssuer = payment.asset_issuer || ""; // Issuer for credit assets

                    console.log("--- Incoming Payment ---");
                    console.log(`Transaction ID: ${payment.transaction_hash}`);
                    console.log(`From: ${payment.from}`);
                    console.log(`To: ${payment.to}`);
                    console.log(`Amount: ${payment.amount} ${assetCode}`);
                    if (assetType !== "native") {
                        console.log(`Asset Issuer: ${assetIssuer}`);
                    }
                    console.log(`Timestamp: ${payment.created_at}`);
                    console.log("------------------------");
                }
            },
            onerror: (error: any) => {
                console.error("Error in stream:", error);
                // Implement reconnection logic here if needed
            }
        });

        console.log("--- Transaction Stream ---222");

        res.status(200).json({
            message: "Transaction stream started successfully"
        });
    } catch (error) {
        next(error);
    }
});

// Top ups
router.get("/topup/:publicKey", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await stellarService.getTopUpTransactions(req.params.publicKey);

        res.status(200).json({
            message: "Top up transactions retrieved successfully",
            data: transactions
        });
    } catch (error) {
        next(error);
    }
});

// Update all user wallets (for testnet resets)
router.patch("/wallets/users/update-all",
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Get all users
            const allUsers = await prisma.user.findMany({
                select: { 
                    userId: true, 
                    username: true,
                    walletAddress: true
                }
            });

            if (allUsers.length === 0) {
                return res.status(200).json({
                    message: "No users found to update",
                    data: { updated: 0, failed: 0 }
                });
            }

            const results = [];
            let successCount = 0;
            let failCount = 0;

            // Update each user's wallet
            for (const user of allUsers) {
                // Skip users who don't have a wallet address
                if (!user.walletAddress) continue;
                
                try {
                    // Create new wallet
                    const newWallet = await stellarService.createWallet();
                    const encryptedSecret = encrypt(newWallet.secretKey);

                    // Update user's wallet credentials
                    await prisma.user.update({
                        where: { userId: user.userId },
                        data: {
                            walletAddress: newWallet.publicKey,
                            walletSecret: encryptedSecret
                        }
                    });

                    console.log("user: ", user.userId, "Success", newWallet.publicKey);

                    results.push({
                        userId: user.userId,
                        username: user.username,
                        status: "success",
                        walletAddress: newWallet.publicKey,
                        txHash: newWallet.txHash
                    });
                    successCount++;
                } catch (error) {
                    results.push({
                        userId: user.userId,
                        username: user.username,
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error"
                    });
                    failCount++;
                }
            }

            res.status(200).json({
                message: `Wallet update completed. ${successCount} successful, ${failCount} failed.`,
                data: {
                    total: allUsers.length,
                    successful: successCount,
                    failed: failCount,
                    results
                }
            });
        } catch (error) {
            next(error);
        }
    }) as RequestHandler
);

// Update all installation wallets (for testnet resets)
router.patch("/wallets/installations/update-all",
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Get all installations
            const allInstallations = await prisma.installation.findMany({
                select: { 
                    id: true, 
                    account: true,
                    walletAddress: true,
                    escrowAddress: true
                }
            });
        
            if (allInstallations.length === 0) {
                return res.status(200).json({
                    message: "No installations found to update",
                    data: { updated: 0, failed: 0 }
                });
            }

            const results = [];
            let successCount = 0;
            let failCount = 0;

            // Update each installation's wallets
            for (const installation of allInstallations) {
                try {
                    // Create new installation wallet
                    const newInstallationWallet = await stellarService.createWallet();
                    const encryptedInstallationSecret = encrypt(newInstallationWallet.secretKey);

                    // Create new escrow wallet
                    const newEscrowWallet = await stellarService.createWallet();
                    const encryptedEscrowSecret = encrypt(newEscrowWallet.secretKey);

                    // Update installation's wallet credentials
                    await prisma.installation.update({
                        where: { id: installation.id },
                        data: {
                            walletAddress: newInstallationWallet.publicKey,
                            walletSecret: encryptedInstallationSecret,
                            escrowAddress: newEscrowWallet.publicKey,
                            escrowSecret: encryptedEscrowSecret
                        }
                    });

                    console.log("installation: ", installation.id, "Success", newInstallationWallet.publicKey, newEscrowWallet.publicKey);

                    results.push({
                        installationId: installation.id,
                        account: installation.account,
                        status: "success",
                        walletAddress: newInstallationWallet.publicKey,
                        escrowAddress: newEscrowWallet.publicKey,
                        installationTxHash: newInstallationWallet.txHash,
                        escrowTxHash: newEscrowWallet.txHash
                    });
                    successCount++;
                } catch (error) {
                    results.push({
                        installationId: installation.id,
                        account: installation.account,
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error"
                    });
                    failCount++;
                }
            }

            res.status(200).json({
                message: `Installation wallet update completed. ${successCount} successful, ${failCount} failed.`,
                data: {
                    total: allInstallations.length,
                    successful: successCount,
                    failed: failCount,
                    results
                }
            });
        } catch (error) {
            next(error);
        }
    }) as RequestHandler
);

export const stellarRoutes = router;
