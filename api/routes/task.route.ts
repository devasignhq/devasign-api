import {
    RequestHandler,
    Router
} from "express";
import {
    createTask,
    updateTaskBounty,
    acceptTaskApplication,
    requestTimelineExtension,
    replyTimelineExtensionRequest,
    markAsComplete,
    validateCompletion,
    deleteTask,
    getTask,
    getTasks,
    submitTaskApplication,
    getTaskActivities,
    updateTaskTimeline,
    addBountyCommentId,
    getInstallationTask,
    getInstallationTasks,
    getContributorTasks,
    getContributorTask,
    markActivityAsViewed
} from "../controllers/task";
import {
    getTasksSchema,
    getTaskSchema,
    createTaskSchema,
    updateTaskBountySchema,
    requestTimelineExtensionSchema,
    markAsCompleteSchema,
    validateCompletionSchema,
    deleteTaskSchema,
    acceptTaskApplicationSchema,
    replyTimelineModificationSchema,
    submitTaskApplicationSchema,
    getTaskActivitiesSchema,
    updateTaskTimelineSchema,
    addBountyCommentIdSchema,
    getInstallationTasksSchema,
    getInstallationTaskSchema,
    getContributorTasksSchema,
    getContributorTaskSchema,
    markActivityAsViewedSchema
} from "../schemas/task.schema";
import { ENDPOINTS } from "../utilities/data";
import { validateRequestParameters } from "../middlewares/request.middleware";

export const taskRoutes = Router(

);

// Get all tasks
taskRoutes.get(
    ENDPOINTS.TASK.GET_ALL,
    validateRequestParameters(getTasksSchema),
    getTasks as RequestHandler
);

// Get a specific task
taskRoutes.get(
    ENDPOINTS.TASK.GET_BY_ID,
    validateRequestParameters(getTaskSchema),
    getTask as RequestHandler
);

// Create a new task
taskRoutes.post(
    ENDPOINTS.TASK.CREATE,
    validateRequestParameters(createTaskSchema),
    createTask as RequestHandler
);

// Delete a task
taskRoutes.delete(
    ENDPOINTS.TASK.DELETE,
    validateRequestParameters(deleteTaskSchema),
    deleteTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all tasks for an installation
taskRoutes.get(
    ENDPOINTS.TASK.INSTALLATION.GET_TASKS,
    validateRequestParameters(getInstallationTasksSchema),
    getInstallationTasks as RequestHandler
);

// Get a specific task for an installation
taskRoutes.get(
    ENDPOINTS.TASK.INSTALLATION.GET_TASK,
    validateRequestParameters(getInstallationTaskSchema),
    getInstallationTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all tasks for a contributor
taskRoutes.get(
    ENDPOINTS.TASK.CONTRIBUTOR.GET_TASKS,
    validateRequestParameters(getContributorTasksSchema),
    getContributorTasks as RequestHandler
);

// Get a specific task for a contributor
taskRoutes.get(
    ENDPOINTS.TASK.CONTRIBUTOR.GET_TASK,
    validateRequestParameters(getContributorTaskSchema),
    getContributorTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Add a bounty comment ID to a task
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].ADD_BOUNTY_COMMENT,
    validateRequestParameters(addBountyCommentIdSchema),
    addBountyCommentId as RequestHandler
);

// Update task bounty
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].UPDATE_BOUNTY,
    validateRequestParameters(updateTaskBountySchema),
    updateTaskBounty as RequestHandler
);

// Update task timeline
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].UPDATE_TIMELINE,
    validateRequestParameters(updateTaskTimelineSchema),
    updateTaskTimeline as RequestHandler
);

// Submit a task application
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].APPLY,
    validateRequestParameters(submitTaskApplicationSchema),
    submitTaskApplication as RequestHandler
);

// Accept a task application
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].ACCEPT_APPLICATION,
    validateRequestParameters(acceptTaskApplicationSchema),
    acceptTaskApplication as RequestHandler
);

// Mark a task as complete
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].MARK_COMPLETE,
    validateRequestParameters(markAsCompleteSchema),
    markAsComplete as RequestHandler
);

// Validate task completion
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].VALIDATE_COMPLETION,
    validateRequestParameters(validateCompletionSchema),
    validateCompletion as RequestHandler
);

// Request a timeline extension
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].REQUEST_TIMELINE_EXTENSION,
    validateRequestParameters(requestTimelineExtensionSchema),
    requestTimelineExtension as RequestHandler
);

// Reply to a timeline extension request
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].REPLY_TIMELINE_EXTENSION,
    validateRequestParameters(replyTimelineModificationSchema),
    replyTimelineExtensionRequest as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all activities for a task
taskRoutes.get(
    ENDPOINTS.TASK.ACTIVITIES.GET_ALL,
    validateRequestParameters(getTaskActivitiesSchema),
    getTaskActivities as RequestHandler
);

// Mark a task activity as viewed
taskRoutes.patch(
    ENDPOINTS.TASK.ACTIVITIES.MARK_VIEWED,
    validateRequestParameters(markActivityAsViewedSchema),
    markActivityAsViewed as RequestHandler
);
