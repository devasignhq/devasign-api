import { body, query, param } from 'express-validator';

export const getInstallationsValidator = [
    query('page')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Page must be a valid number');
            }
            return true;
        }),
    query('limit')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Page must be a valid number');
            }
            return true;
        }),
];

export const createInstallationValidator = [
    body('installationId')
        .exists()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string'),
];

export const updateInstallationValidator = [
    body('htmlUrl')
        .optional()
        .isString()
        .withMessage('HTML URL must be a string')
        .isURL()
        .withMessage('HTML URL must be a valid URL'),
    body('targetId')
        .optional()
        .isInt()
        .withMessage('Target ID must be an integer'),
    body('account')
        .optional()
        .isObject()
        .withMessage('Account must be an object')
        .custom((value) => {
            if (!value.login || !value.nodeId || !value.avatarUrl || !value.htmlUrl) {
                throw new Error('Account object must contain login, nodeId, avatarUrl, and htmlUrl');
            }
            return true;
        }),
];

export const addTeamMemberValidator = [
    param('id')
        .exists()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string'),
    body('username')
        .exists()
        .withMessage('Username is required')
        .isString()
        .withMessage('Username must be a string'),
    body('permissionCodes')
        .exists()
        .withMessage('Permission codes are required')
        .isArray({ min: 1 })
        .withMessage('Permission codes must be a non-empty array'),
    body('permissionCodes.*')
        .isString()
        .withMessage('Each permission code must be a string'),
    body('email')
        .optional()
        .isEmail()
        .withMessage('Email must be valid'),
];

export const updateTeamMemberPermissionsValidator = [
    param('id')
        .exists()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string'),
    param('userId')
        .exists()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
    body('permissionCodes')
        .exists()
        .withMessage('Permission codes are required')
        .isArray({ min: 1 })
        .withMessage('Permission codes must be a non-empty array'),
    body('permissionCodes.*')
        .isString()
        .withMessage('Each permission code must be a string'),
];

export const removeTeamMemberValidator = [
    param('id')
        .exists()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string'),
    param('userId')
        .exists()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
];