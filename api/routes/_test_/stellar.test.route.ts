import { Router, Request, Response, NextFunction, RequestHandler } from "express";
import { prisma } from "../../config/database.config.js";
import { xlmAsset } from "../../config/stellar.config.js";
import { stellarService } from "../../services/stellar.service.js";
import { validateRequestParameters } from "../../middlewares/request.middleware.js";
import {
    createWalletViaSponsorSchema,
    addTrustLineSchema,
    addTrustLineViaSponsorSchema,
    fundWalletSchema,
    transferAssetSchema,
    transferAssetViaSponsorSchema,
    swapAssetSchema,
    getAccountInfoSchema
} from "./test.schema.js";
import { KMSService } from "../../services/kms.service.js";
import { STATUS_CODES } from "../../utils/data.js";

const router = Router();

// Create a new wallet
router.post("/wallet", async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const wallet = await stellarService.createWallet();

        res.status(STATUS_CODES.CREATED).json({
            message: "Wallet created successfully",
            data: wallet
        });
    } catch (error) {
        next(error);
    }
});

// Create a new wallet via sponsor
router.post("/wallet/sponsor",
    validateRequestParameters(createWalletViaSponsorSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret } = req.body;
            const wallet = await stellarService.createWalletViaSponsor(sponsorSecret);
            res.status(STATUS_CODES.CREATED).json({
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
    validateRequestParameters(addTrustLineSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { secretKey } = req.body;
            await stellarService.addTrustLine(secretKey);
            res.status(STATUS_CODES.SUCCESS).json({
                message: "USDC trustline added successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add trustline for USDC via sponsor
router.post("/trustline/sponsor",
    validateRequestParameters(addTrustLineViaSponsorSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret, accountSecret } = req.body;
            await stellarService.addTrustLineViaSponsor(sponsorSecret, accountSecret);
            res.status(STATUS_CODES.SUCCESS).json({
                message: "USDC trustline added successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Fund a wallet
router.post("/fund",
    validateRequestParameters(fundWalletSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await stellarService.fundWallet(req.body.publicKey);
            res.status(STATUS_CODES.SUCCESS).json({
                message: "Wallet funded successfully"
            });
        } catch (error) {
            next(error);
        }
    }
);

// Transfer assets
router.post("/transfer",
    validateRequestParameters(transferAssetSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecret, destinationAddress, amount } = req.body;
            const result = await stellarService.transferAsset(
                sourceSecret,
                destinationAddress,
                xlmAsset,
                xlmAsset,
                amount
            );
            res.status(STATUS_CODES.SUCCESS).json({
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
    validateRequestParameters(transferAssetViaSponsorSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret, accountSecret, destinationAddress, amount } = req.body;
            const result = await stellarService.transferAssetViaSponsor(
                sponsorSecret,
                accountSecret,
                destinationAddress,
                xlmAsset,
                xlmAsset,
                amount
            );
            res.status(STATUS_CODES.SUCCESS).json({
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
    validateRequestParameters(swapAssetSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecret, amount } = req.body;
            const result = await stellarService.swapAsset(sourceSecret, amount);
            res.status(STATUS_CODES.SUCCESS).json({
                message: "Asset swapped successfully",
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get account info
router.get("/account/:publicKey",
    validateRequestParameters(getAccountInfoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const accountInfo = await stellarService.getAccountInfo(req.params.publicKey);
            res.status(STATUS_CODES.SUCCESS).json({
                message: "Account info retrieved successfully",
                data: accountInfo
            });
        } catch (error) {
            next(error);
        }
    }
);

// Top ups
router.get("/topup/:publicKey",
    validateRequestParameters(getAccountInfoSchema),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const transactions = await stellarService.getTopUpTransactions(req.params.publicKey);

            res.status(STATUS_CODES.SUCCESS).json({
                message: "Top up transactions retrieved successfully",
                data: transactions
            });
        } catch (error) {
            next(error);
        }
    }
);

// Update all user wallets (for testnet resets)
router.patch("/wallets/users/update-all",
    (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Get all users
            const allUsers = await prisma.user.findMany({
                select: {
                    userId: true,
                    username: true,
                    wallet: {
                        select: {
                            address: true
                        }
                    }
                }
            });

            if (allUsers.length === 0) {
                return res.status(STATUS_CODES.SUCCESS).json({
                    message: "No users found to update",
                    data: { updated: 0, failed: 0 }
                });
            }

            const results = [];
            let successCount = 0;
            let failCount = 0;

            // Update each user's wallet
            for (const user of allUsers) {
                // Skip users who don't have a wallet
                if (!user.wallet) continue;

                try {
                    // Create new wallet
                    const newWallet = await stellarService.createWallet();
                    const encryptedSecret = await KMSService.encryptWallet(newWallet.secretKey);

                    // Use transaction to delete old wallet and create new one
                    await prisma.$transaction(async (tx) => {
                        // Delete old wallet
                        await tx.wallet.delete({
                            where: { address: user.wallet!.address }
                        });

                        // Create new wallet and update user
                        await tx.user.update({
                            where: { userId: user.userId },
                            data: {
                                wallet: {
                                    create: {
                                        address: newWallet.publicKey,
                                        ...encryptedSecret
                                    }
                                }
                            }
                        });
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
                    console.log("user: ", user.userId, "Failed", error);
                    results.push({
                        userId: user.userId,
                        username: user.username,
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error"
                    });
                    failCount++;
                }
            }

            res.status(STATUS_CODES.SUCCESS).json({
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
                    wallet: { select: { address: true } }
                }
            });

            if (allInstallations.length === 0) {
                return res.status(STATUS_CODES.SUCCESS).json({
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
                    const encryptedInstallationSecret = await KMSService.encryptWallet(newInstallationWallet.secretKey);

                    // Use transaction to delete old wallets and create new ones
                    await prisma.$transaction(async (tx) => {
                        // Delete old wallets
                        // await tx.wallet.delete({
                        //     where: { address: installation.wallet!.address }
                        // });

                        // Create new wallets and update installation
                        await tx.installation.update({
                            where: { id: installation.id },
                            data: {
                                wallet: {
                                    create: {
                                        address: newInstallationWallet.publicKey,
                                        ...encryptedInstallationSecret
                                    }
                                }
                            }
                        });
                    });

                    console.log("installation: ", installation.id, "Success", newInstallationWallet.publicKey);

                    results.push({
                        installationId: installation.id,
                        account: installation.account,
                        status: "success",
                        walletAddress: newInstallationWallet.publicKey,
                        installationTxHash: newInstallationWallet.txHash
                    });
                    successCount++;
                } catch (error) {
                    console.log("installation: ", installation.id, "Failed", error);
                    results.push({
                        installationId: installation.id,
                        account: installation.account,
                        status: "failed",
                        error: error instanceof Error ? error.message : "Unknown error"
                    });
                    failCount++;
                }
            }

            res.status(STATUS_CODES.SUCCESS).json({
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
