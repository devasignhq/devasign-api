import { body, query, param } from 'express-validator';
import { TimelineType } from '../types/general';

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
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
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
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer'),
    body('payload.timelineType')
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
        .withMessage('New timeline is required')
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer'),
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
        .withMessage('New timeline is required when accepting the request')
        .isInt({ min: 1 })
        .withMessage('Timeline must be a positive integer'),
    body('reason')
        .optional()
        .isString()
        .withMessage('Reason must be a string'),
    body('attachments')
        .optional()
        .isArray()
        .withMessage('Attachments must be an array')
];