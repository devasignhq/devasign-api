import { param, query } from 'express-validator';

export const validateInstallationBasics = [
    param('installationId')
        .trim()
        .notEmpty()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string')
        .isLength({ min: 1 })
        .withMessage('Installation ID cannot be empty'),
    query('repoUrl')
        .notEmpty()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string')
        .matches(/^https:\/\/github\.com\/[\w\-\.]+\/[\w\-\.]+$/)
        .withMessage('Repository URL must be a valid GitHub repository URL'),
];

export const getInstallationRepositoriesValidator = [
    validateInstallationBasics[0]
];

export const getRepositoryIssuesValidator = [
    ...validateInstallationBasics,

    query('labels')
        .optional()
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Labels must be a comma-separated string'),
    query('milestone')
        .optional()
        .trim()
        .notEmpty()
        .isString()
        .withMessage('Milestone must be a string'),
    query('page')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('perPage')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1, max: 100 })
        .withMessage('Per page must be between 1 and 100')
];

export const getRepositoryResourcesValidator = validateInstallationBasics;

export const setBountyLabelValidator = validateInstallationBasics;