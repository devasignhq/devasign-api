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
    body('repoUrl')
        .exists()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string')
        .matches(/^https:\/\/github\.com\/[^/]+\/[^/]+$/)
        .withMessage('Invalid GitHub repository URL format')
];

export const updateProjectValidator = [
    param('id')
        .exists()
        .withMessage('Project ID is required'),
    body('repoUrl')
        .exists()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string')
        .matches(/^https:\/\/github\.com\/[^/]+\/[^/]+$/)
        .withMessage('Invalid GitHub repository URL format')
];

export const addTeamMembersValidator = [
    param('id')
        .exists()
        .withMessage('Project ID is required'),
    body('githubUsernames')
        .exists()
        .withMessage('GitHub usernames are required')
        .isArray()
        .withMessage('GitHub usernames must be an array')
        .custom((usernames: string[]) => {
            if (usernames.length === 0) return false;
            if (usernames.length > 10) return false;
            return usernames.every(username => typeof username === 'string' && username.length > 0);
        })
        .withMessage('Invalid GitHub usernames array format or size (1-10 required)')
];

export const getProjectIssuesValidator = [
    body('repoUrl')
        .exists()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string'),
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
    query('labels')
        .optional()
        .isString()
        .withMessage('Labels must be a comma-separated string'),
    query('milestone')
        .optional()
        .isString()
        .withMessage('Milestone must be a string'),
    query('sort')
        .optional()
        .isIn(['created', 'updated', 'comments'])
        .withMessage('Sort must be either created, updated, or comments'),
    query('direction')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Direction must be either asc or desc')
];