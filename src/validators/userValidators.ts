import { body, param, query } from 'express-validator';

// Validator for GET /:userId
export const getUserValidator = [
    query('view')
        .optional()
        .isIn(['basic', 'full', 'profile'])
        .withMessage('View must be either basic, full, or profile')
];

export const createUserValidator = [
    body('githubUsername')
        .exists()
        .withMessage('Github username is required')
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .withMessage('Username must be greater than 1 character')
]

export const updateUsernameValidator = [
    body('githubUsername')
        .exists()
        .withMessage('Github username is required')
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .withMessage('Username must be greater than 1 character')
]

// Validator for PUT /address-book
export const updateAddressBookValidator = [
    body('address')
        .exists()
        .withMessage('Address is required')
        .isString()
        .withMessage('Address must be a string')
        .matches(/^G[A-Z0-9]{55}$/)
        .withMessage('Invalid Stellar address format'),
    body('name')
        .exists()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name must be a string')
        .trim()
        .isLength({ min: 1, max: 50 })
        .withMessage('Name must be between 1 and 50 characters')
];