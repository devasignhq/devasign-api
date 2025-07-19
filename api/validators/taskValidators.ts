import { body, query, param } from 'express-validator';
import { CreateTask, TimelineType } from '../types/general';

export const getTasksValidator = [
    query('status')
        .optional()
        .isIn(['OPEN', 'IN_PROGRESS', 'MARKED_AS_COMPLETED', 'COMPLETED'])
        .withMessage('Invalid task status'),    
    query('installationId')
        .optional()
        .isString()
        .withMessage('Installation ID must be a string'),
    query('role')
        .optional()
        .isIn(['creator', 'contributor'])
        .withMessage('Role must be either creator or contributor'),
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
        .withMessage('Page must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Limit must be a valid number');
            }
            return true;
        }),
    query('sort')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort field must be either asc or desc'),
];

export const getInstallationTasksValidator = [
    param('installationId')
        .exists()
        .withMessage('Installation ID is required'),

    getTasksValidator[0],
    ...getTasksValidator.slice(2),
];

export const createTaskValidator = [
    body('payload')
        .exists()
        .withMessage('Task payload is required')
        .isObject()
        .withMessage('Task payload must be an object'),
    body('payload.repoUrl')
        .exists()
        .withMessage('Repository URL is required')
        .isString()
        .withMessage('Repository URL must be a string'),
    body('payload.installationId')
        .exists()
        .withMessage('Installation ID is required')
        .isString()
        .withMessage('Installation ID must be a string'),
    body('payload.issue') // TODO: Issue validation
        .exists()
        .withMessage('Issue details are required')
        .isObject()
        .withMessage('Issue must be an object'),
    body('payload.bounty')
        .exists()
        .withMessage('Bounty amount is required')
        .isString()
        .withMessage('Bounty must be a string')
        .custom((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0)
        .withMessage('Bounty must be a positive number'),
    body('payload.timeline')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Timeline must be a valid number');
            }
            return true;
        }),
    body('payload.timelineType')
        .optional()
        .isIn(Object.values(TimelineType))
        .withMessage('Invalid timeline type')
];

export const createManyTasksValidator = [
    body('installationId')
        .exists()
        .withMessage('Installation ID is required'),
    body('payload')
        .isArray()
        .withMessage('Payload must be an array')
        .custom((tasks: CreateTask[]) => {
            if (tasks.length === 0) {
                throw new Error('At least one task is required');
            }
            if (tasks.length > 50) {
                throw new Error('Maximum 50 tasks allowed per batch');
            }
            return true;
        }),
    body('payload.*.repoUrl')
        .exists()
        .withMessage('Repository URL is required for each task'),
    body('payload.*.issue')
        .exists()
        .withMessage('Issue details are required for each task'),
    body('payload.*.bounty')
        .exists()
        .withMessage('Bounty is required for each task')
        .isString()
        .withMessage('Bounty must be a string')
        .custom((value: string) => {
            const number = parseFloat(value);
            return !isNaN(number) && number > 0;
        })
        .withMessage('Bounty must be a positive number'),
    body('payload.*.timeline')
        .optional()
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Timeline must be a valid number');
            }
            return true;
        }),
    body('payload.*.timelineType')
        .optional()
        .isIn(Object.values(TimelineType))
        .withMessage('Invalid timeline type')
];

export const addBountyCommentIdValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('bountyCommentId')
        .trim()
        .notEmpty()
        .toInt() 
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Comment ID must be a valid number');
            }
            return true;
        }),
];

export const updateTaskBountyValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('newbounty')
        .exists()
        .withMessage('New bounty amount is required')
        .isString()
        .withMessage('Bounty must be a string')
        .custom((value) => !isNaN(parseFloat(value)) && parseFloat(value) > 0)
        .withMessage('Bounty must be a positive number')
];

export const updateTaskTimelineValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('timeline')
        .trim()
        .notEmpty()
        .toInt() 
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Timeline must be a valid number');
            }
            return true;
        }),
    body('timelineType')
        .isIn(Object.values(TimelineType))
        .withMessage('Invalid timeline type')
];

export const addTaskMessageValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('body')
        .exists()
        .withMessage('Body is required')
        .isString()
        .withMessage('Body must be a string')
        .trim()
        .notEmpty()
        .withMessage('Body cannot be empty'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
];

export const updateTaskMessageValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    param('messageId')
        .exists()
        .withMessage('Message ID is required'),
    body('body')
        .exists()
        .withMessage('Body is required')
        .isString()
        .withMessage('Body must be a string')
        .trim()
        .notEmpty()
        .withMessage('Body cannot be empty'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
];

export const markAsCompleteValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('pullRequest')
        .exists()
        .withMessage('Pull request url is required')
        .custom((url: string) => {
            const validUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/;
            try {
                new URL(url);
            } catch {
                throw new Error('Pull request must be a valid URL');
            }
            if (!validUrlPattern.test(url)) {
                throw new Error('Invalid pull request URL format. Must be a GitHub pull request');
            }
            return true;
        }),
    body('attachmentUrl')
        .optional()
        .isString()
        .withMessage('Attachment URL must be a string')
];

export const validateCompletionValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required')
];

export const deleteTaskValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required')
];

export const submitTaskApplicationValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required')
];

export const acceptTaskApplicationValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    param('contributorId')
        .exists()
        .withMessage('Contributor ID is required')
];

export const requestTimelineExtensionValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('githubUsername')
        .exists()
        .withMessage('Github username is required')
        .isString()
        .withMessage('Username must be a string')
        .trim()
        .withMessage('Username must be greater than 1 character'),
    body('requestedTimeline')
        .exists()
        .trim()
        .notEmpty()
        .toInt() 
        .withMessage('New timeline is required')
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('New timeline must be a valid number');
            }
            return true;
        }),
    body('timelineType')
        .exists()
        .withMessage('Timeline type is required')
        .isIn(Object.values(TimelineType))
        .withMessage('Invalid timeline type'),
    body('reason')
        .exists()
        .withMessage('Reason is required')
        .isString()
        .withMessage('Reason must be a string'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
];

export const replyTimelineModificationValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('accept')
        .exists()
        .withMessage('Acceptance status is required')
        .isBoolean()
        .withMessage('Acceptance status must be a boolean'),
    body('requestedTimeline')
        .if(body('accepted').equals('TRUE'))
        .exists()
        .trim()
        .notEmpty()
        .toInt() 
        .withMessage('New timeline is required')
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('New timeline must be a valid number');
            }
            return true;
        }),
    body('timelineType')
        .exists()
        .withMessage('Timeline type is required')
        .isIn(Object.values(TimelineType))
        .withMessage('Invalid timeline type'),
];


export const getTaskActivitiesValidator = [
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
        .withMessage('Page must be a positive integer')
        .custom((value) => {
            if (isNaN(value)) {
                throw new Error('Limit must be a valid number');
            }
            return true;
        }),
    query('sort')
        .optional()
        .isIn(['asc', 'desc'])
        .withMessage('Sort field must be either asc or desc'),
];