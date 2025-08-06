import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { stellarService, usdcAssetId, xlmAssetId } from '../config/stellar.config';

const router = Router();

// Create a new wallet
router.post('/wallet', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const wallet = await stellarService.createWallet();
        res.status(201).json({
            message: 'Wallet created successfully',
            data: wallet
        });
    } catch (error) {
        next(error);
    }
});

// Create a new wallet via sponsor
router.post('/wallet/sponsor',
    [
        body('sponsorSecret').notEmpty().withMessage('Secret key is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret } = req.body;
            const wallet = await stellarService.createWalletViaSponsor(sponsorSecret);
            res.status(201).json({
                message: 'Wallet created successfully',
                data: wallet
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add trustline for USDC
router.post('/trustline',
    [
        body('secretKey').notEmpty().withMessage('Secret key is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { secretKey } = req.body;
            await stellarService.addTrustLine(secretKey);
            res.status(200).json({
                message: 'USDC trustline added successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// Add trustline for USDC via sponsor
router.post('/trustline/sponsor',
    [
        body('sponsorSecret').notEmpty().withMessage('Sponsor key is required'),
        body('accountSecret').notEmpty().withMessage('Account key is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sponsorSecret, accountSecret } = req.body;
            await stellarService.addTrustLineViaSponsor(sponsorSecret, accountSecret);
            res.status(200).json({
                message: 'USDC trustline added successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// Fund a wallet
router.post('/fund', 
    body('publicKey').notEmpty().withMessage('Public key is required'),
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await stellarService.fundWallet(req.body.publicKey);
            res.status(200).json({
                message: 'Wallet funded successfully'
            });
        } catch (error) {
            next(error);
        }
    }
);

// Transfer assets
router.post('/transfer',
    [
        body('sourceSecret').notEmpty().withMessage('Source secret key is required'),
        body('destinationAddress').notEmpty().withMessage('Destination public key is required'),
        body('amount').notEmpty().withMessage('Amount is required'),
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
                message: 'Asset transferred successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
)

// Transfer assets via sponsor
router.post('/transfer/sponsor',
    [
        body('sponsorSecret').notEmpty().withMessage('Sponsor key is required'),
        body('accountSecret').notEmpty().withMessage('Account key is required'),
        body('destinationAddress').notEmpty().withMessage('Destination public key is required'),
        body('amount').notEmpty().withMessage('Amount is required'),
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
                message: 'Asset transferred successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Swap assets
router.post('/swap',
    [
        body('sourceSecret').notEmpty().withMessage('Source secret key is required'),
        body('amount').notEmpty().withMessage('Amount is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecret, amount } = req.body;
            const result = await stellarService.swapAsset(sourceSecret, amount);
            res.status(200).json({
                message: 'Asset swapped successfully',
                data: result
            });
        } catch (error) {
            next(error);
        }
    }
);

// Get account info
router.get('/account/:publicKey', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountInfo = await stellarService.getAccountInfo(req.params.publicKey);
        res.status(200).json({
            message: 'Account info retrieved successfully',
            data: accountInfo
        });
    } catch (error) {
        next(error);
    }
});

// Stream
router.get('/stream/:publicKey', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const accountToWatch = "GD6LFE72VUGGPYDAWOEL5I34JODO746PSEFBUCDZECXTVWB6VFLOPFUM"
        const accountInfo = await stellarService.buildPaymentTransactionStream(accountToWatch);

        console.log('--- Transaction Stream ---');

        accountInfo({
            onmessage: (payment: any) => {
                // The 'payment' object contains details about the payment operation.
                // We are interested in incoming payments, so we check the 'to' address.
                if (payment.type === 'payment' && payment.to === accountToWatch) {
                    // Check if it's a native asset (XLM) or a credit asset
                    const assetType = payment.asset_type;
                    const assetCode = payment.asset_code || 'XLM'; // Use XLM for native
                    const assetIssuer = payment.asset_issuer || ''; // Issuer for credit assets

                    console.log('--- Incoming Payment ---');
                    console.log(`Transaction ID: ${payment.transaction_hash}`);
                    console.log(`From: ${payment.from}`);
                    console.log(`To: ${payment.to}`);
                    console.log(`Amount: ${payment.amount} ${assetCode}`);
                    if (assetType !== 'native') {
                        console.log(`Asset Issuer: ${assetIssuer}`);
                    }
                    console.log(`Timestamp: ${payment.created_at}`);
                    console.log('------------------------');
                }
            },
            onerror: (error: any) => {
                console.error('Error in stream:', error);
                // Implement reconnection logic here if needed
            },
        })

        console.log('--- Transaction Stream ---222');

        res.status(200).json({
            message: 'Transaction stream started successfully',
        });
    } catch (error) {
        next(error);
    }
});

// Top ups
router.get('/topup/:publicKey', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const transactions = await stellarService.getTopUpTransactions(req.params.publicKey);

        res.status(200).json({
            message: 'Top up transactions retrieved successfully',
            data: transactions
        });
    } catch (error) {
        next(error);
    }
});

export const stellarRoutes = router;