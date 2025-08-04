import { TimelineType } from "../generated/client";
import { IssueDto, IssueLabel } from "./github";

export enum MessageType {
    GENERAL = 'GENERAL',
    TIMELINE_MODIFICATION = 'TIMELINE_MODIFICATION'
}

export type AddressBook = {
    name: string;
    address: string;
}

export type TaskIssue = Omit<IssueDto, "labels"> & {
    labels: IssueLabel[];
    bountyCommentId?: string;
}

export type CreateTask = {
    installationId: string;
    issue: TaskIssue;
    timeline?: number;
    timelineType?: TimelineType;
    bounty: string;
    bountyLabelId: string;
}

export type FilterTasks = {
    repoUrl?: string;
    issueTitle?: string;
    issueLabels?: string[];
}

export class IssueFilters {
    title?: string;
    labels?: string[];
    milestone?: string | "none" | "*";
    sort?: "created" | "updated" | "comments" = "created";
    direction?: "asc" | "desc" = "desc";
}

export type MessageMetadata = {
    requestedTimeline: number;
    timelineType: TimelineType;
    reason?: string
}

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

export class ErrorClass {
    public readonly name: string;
    public readonly message: string;
    public readonly details?: any;

    constructor(name: string, details: any, message: string) {
        this.name = name;
        this.message = message;
        this.details = details;
    }

}
export class NotFoundErrorClass extends ErrorClass {
    constructor(message: string) {
        super("NotFoundError", null, message);
    }
}