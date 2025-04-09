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
        body('sourceSecretKey').notEmpty().withMessage('Source secret key is required'),
        body('destinationPublicKey').notEmpty().withMessage('Destination public key is required'),
        body('amount').notEmpty().withMessage('Amount is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecretKey, destinationPublicKey, amount } = req.body;
            const result = await stellarService.transferAsset(
                sourceSecretKey,
                destinationPublicKey,
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
);

// Swap assets
router.post('/swap',
    [
        body('sourceSecretKey').notEmpty().withMessage('Source secret key is required'),
        body('amount').notEmpty().withMessage('Amount is required'),
    ],
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { sourceSecretKey, amount } = req.body;
            const result = await stellarService.swapAsset(sourceSecretKey, amount);
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