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
    getTasksValidator,
    createTaskValidator,
    updateTaskBountyValidator,
    requestTimelineExtensionValidator,
    markAsCompleteValidator,
    validateCompletionValidator,
    deleteTaskValidator,
    acceptTaskApplicationValidator,
    replyTimelineModificationValidator,
    submitTaskApplicationValidator,
    getTaskActivitiesValidator,
    updateTaskTimelineValidator,
    addBountyCommentIdValidator,
    getInstallationTasksValidator,
    getContributorTasksValidator
} from "../validators/task.validator";
import { ENDPOINTS } from "../utilities/data";

export const taskRoutes = Router(

);

// Get all tasks
taskRoutes.get(
    ENDPOINTS.TASK.GET_ALL,
    getTasksValidator,
    getTasks as RequestHandler
);

// Get a specific task
taskRoutes.get(
    ENDPOINTS.TASK.GET_BY_ID,
    getTask as RequestHandler
);

// Create a new task
taskRoutes.post(
    ENDPOINTS.TASK.CREATE,
    createTaskValidator,
    createTask as RequestHandler
);

// Delete a task
taskRoutes.delete(
    ENDPOINTS.TASK.DELETE,
    deleteTaskValidator,
    deleteTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all tasks for an installation
taskRoutes.get(
    ENDPOINTS.TASK.INSTALLATION.GET_TASKS,
    getInstallationTasksValidator,
    getInstallationTasks as RequestHandler
);

// Get a specific task for an installation
taskRoutes.get(
    ENDPOINTS.TASK.INSTALLATION.GET_TASK,
    getInstallationTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all tasks for a contributor
taskRoutes.get(
    ENDPOINTS.TASK.CONTRIBUTOR.GET_TASKS,
    getContributorTasksValidator,
    getContributorTasks as RequestHandler
);

// Get a specific task for a contributor
taskRoutes.get(
    ENDPOINTS.TASK.CONTRIBUTOR.GET_TASK,
    getContributorTask as RequestHandler
);

// ============================================================================
// ============================================================================

// Get all activities for a task
taskRoutes.get(
    ENDPOINTS.TASK.ACTIVITIES.GET_ALL,
    getTaskActivitiesValidator,
    getTaskActivities as RequestHandler
);

// Mark a task activity as viewed
taskRoutes.patch(
    ENDPOINTS.TASK.ACTIVITIES.MARK_VIEWED,
    markActivityAsViewed as RequestHandler
);

// ============================================================================
// ============================================================================

// Add a bounty comment ID to a task
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].ADD_BOUNTY_COMMENT,
    addBountyCommentIdValidator,
    addBountyCommentId as RequestHandler
);

// Update task bounty
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].UPDATE_BOUNTY,
    updateTaskBountyValidator,
    updateTaskBounty as RequestHandler
);

// Update task timeline
taskRoutes.patch(
    ENDPOINTS.TASK["{TASKID}"].UPDATE_TIMELINE,
    updateTaskTimelineValidator,
    updateTaskTimeline as RequestHandler
);

// Submit a task application
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].APPLY,
    submitTaskApplicationValidator,
    submitTaskApplication as RequestHandler
);

// Accept a task application
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].ACCEPT_APPLICATION,
    acceptTaskApplicationValidator,
    acceptTaskApplication as RequestHandler
);

// Mark a task as complete
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].MARK_COMPLETE,
    markAsCompleteValidator,
    markAsComplete as RequestHandler
);

// Validate task completion
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].VALIDATE_COMPLETION,
    validateCompletionValidator,
    validateCompletion as RequestHandler
);

// Request a timeline extension
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].REQUEST_TIMELINE_EXTENSION,
    requestTimelineExtensionValidator,
    requestTimelineExtension as RequestHandler
);

// Reply to a timeline extension request
taskRoutes.post(
    ENDPOINTS.TASK["{TASKID}"].REPLY_TIMELINE_EXTENSION,
    replyTimelineModificationValidator,
    replyTimelineExtensionRequest as RequestHandler
);
