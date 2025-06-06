import { body, param } from 'express-validator';

export const withdrawAssetValidator = [
    body('walletAddress')
        .exists()
        .withMessage('Wallet address is required')
        .isString()
        .withMessage('Wallet address must be a string')
        .matches(/^G[A-Z0-9]{55}$/)
        .withMessage('Invalid Stellar wallet address format'),
    body('assetType')
        .optional()
        .isIn(['USDC', 'XLM'])
        .withMessage('Asset type must be either USDC or XLM'),
    body('amount')
        .exists()
        .withMessage('Amount is required')
        .isString()
        .withMessage('Amount must be a string')
        .custom((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0)
        .withMessage('Amount must be a positive number')
];

export const swapAssetValidator = [
    body('toAssetType')
        .optional()
        .isIn(['USDC', 'XLM'])
        .withMessage('Asset type must be either USDC or XLM'),
    body('amount')
        .exists()
        .withMessage('Amount is required')
        .isString()
        .withMessage('Amount must be a string')
        .custom((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0)
        .withMessage('Amount must be a positive number')
];

export const getProjectTransactionsValidator = [
    param('projectId')
        .exists()
        .withMessage('Project ID is required')
];