import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { stellarService, xlmAssetId } from '../config/stellar';

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
        // next(createError(500, 'Failed to create wallet'));
        res.status(601).json({ error });
    }
});

// Create a new wallet via sponsor
router.post('/wallet/sponsor',
    [
        body('secretKey').notEmpty().withMessage('Secret key is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { secretKey } = req.body;
            const wallet = await stellarService.createWalletViaSponsor(secretKey);
            res.status(201).json({
                message: 'Wallet created successfully',
                data: wallet
            });
        } catch (error) {
            // next(createError(500, 'Failed to create wallet'));
            res.status(601).json({ error });
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
            res.status(601).json({ error });
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
            res.status(601).json({ error });
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
            res.status(601).json({ error });
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
            res.status(601).json({ error });
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
            res.status(601).json({ error });
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
        res.status(601).json({ error });
    }
});

export const stellarRoutes = router;