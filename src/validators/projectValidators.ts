import { body, query, param } from 'express-validator';

export const getProjectsValidator = [
    query('searchTerm')
        .optional()
        .isString()
        .withMessage('Search term must be a string'),
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

export const createProjectValidator = [
    body('name')
        .exists()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name must be a string'),
    query('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
];

export const connectRepositoryValidator = [
    body('repoUrl')
        .exists()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string')
        .matches(/^https:\/\/github\.com\/[^/]+\/[^/]+$/)
        .withMessage('Invalid GitHub repository URL format')
];

export const updateProjectValidator = [
    body('name')
        .exists()
        .withMessage('Name is required')
        .isString()
        .withMessage('Name must be a string'),
    query('description')
        .optional()
        .isString()
        .withMessage('Description must be a string'),
];

export const addTeamMemberValidator = [
    param('id')
        .exists()
        .withMessage('Project ID is required')
        .isString()
        .withMessage('Project ID must be a string'),
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
        .withMessage('Project ID is required')
        .isString()
        .withMessage('Project ID must be a string'),
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
        .withMessage('Project ID is required')
        .isString()
        .withMessage('Project ID must be a string'),
    param('userId')
        .exists()
        .withMessage('User ID is required')
        .isString()
        .withMessage('User ID must be a string'),
];