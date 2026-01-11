import { IssueDto, IssueLabel } from "./github.model";

/**
 * Message types in task conversations
 */
export enum MessageType {
    GENERAL = "GENERAL",
    TIMELINE_MODIFICATION = "TIMELINE_MODIFICATION"
}

/**
 * Task issue data structure extending GitHub issue with bounty information
 */
export type TaskIssue = Omit<IssueDto, "labels"> & {
    labels: IssueLabel[];
    bountyCommentId?: string;
    bountyLabelId?: string;
}

/**
 * Data required to create a new task
 */
export type CreateTask = {
    installationId: string;
    issue: TaskIssue;
    timeline?: number;
    bounty: string;
    bountyLabelId: string;
}

/**
 * Filter criteria for querying tasks
 */
export type FilterTasks = {
    repoUrl?: string;
    issueTitle?: string;
    issueLabels?: string[];
}

/**
 * Additional metadata for timeline modification messages
 */
export type MessageMetadata = {
    requestedTimeline: number;
    reason?: string
}

/**
 * Message in a task conversation thread
 */
export type Message = {
    id?: string;
    userId: string;
    taskId: string;
    type?: MessageType;
    body: string;
    metadata?: MessageMetadata;
    attachments: string[];
    createdAt?: string;
    updatedAt?: string;
}

