import { body, query, param } from 'express-validator';
import { CreateTask, TimelineType } from '../types/general';

export const getTasksValidator = [
    query('status')
        .optional()
        .isIn(['OPEN', 'IN_PROGRESS', 'MARKED_AS_COMPLETED', 'COMPLETED'])
        .withMessage('Invalid task status'),
    query('projectId')
        .optional()
        .isString()
        .withMessage('Project ID must be a string'),
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
];

export const createTaskValidator = [
    body('payload')
        .exists()
        .withMessage('Task payload is required')
        .isObject()
        .withMessage('Task payload must be an object'),
    body('payload.projectId')
        .exists()
        .withMessage('Project ID is required')
        .isString()
        .withMessage('Project ID must be a string'),
    body('payload.issue')
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
    body('projectId')
        .exists()
        .withMessage('Project ID is required'),
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

export const requestTimelineModificationValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('newTimeline')
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
    body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string')
];

export const addTaskCommentValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('message')
        .exists()
        .withMessage('Message is required')
        .isString()
        .withMessage('Message must be a string')
        .trim()
        .notEmpty()
        .withMessage('Message cannot be empty'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array'),
];

export const markAsCompleteValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('pullRequests')
        .exists()
        .withMessage('Pull requests are required')
        .isArray()
        .withMessage('Pull requests must be an array')
        .custom((urls: string[]) => {
            const validUrlPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+$/;
            return urls.every(url => validUrlPattern.test(url));
        })
        .withMessage('Invalid pull request URL format. Must be GitHub pull request URLs')
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

export const acceptTaskValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required')
];

export const replyTimelineModificationValidator = [
    param('id')
        .exists()
        .withMessage('Task ID is required'),
    body('accepted')
        .exists()
        .withMessage('Acceptance status is required')
        .isIn(['TRUE', 'FALSE'])
        .withMessage('Acceptance status must be TRUE or FALSE'),
    body('newTimeline')
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
    body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array')
];