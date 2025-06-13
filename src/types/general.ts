// Enums
export enum TaskStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    MARKED_AS_COMPLETED = "MARKED_AS_COMPLETED",
    COMPLETED = "COMPLETED"
}

export enum TimelineType {
    WEEK = "WEEK",
    DAY = "DAY"
}

export enum CommentType {
    GENERAL = 'GENERAL',
    TIMELINE_MODIFICATION = 'TIMELINE_MODIFICATION'
}

export type AddressBook = {
    name: string;
    address: string;
}

export type User = {
    userId: string;
    username: string;
    walletAddress?: string;
    walletSecret?: string;
    balance: number;
    contributionSummary?: ContributionSummary;
    createdTasks: Task[];
    contributedTasks: Task[];
    installations: Installation[];
    addressBook: AddressBook[];
    createdAt: Date;
    updatedAt: Date;
}

export type ContributionSummary = {
    id: string;
    tasksTaken: number;
    tasksCompleted: number;
    averageRating: number;
    totalEarnings: number;
    userId: string;
    user: User;
}

export type Installation = {
    id: string;
    name: string;
    description: string;
    repoUrl: string;
    escrowAddress?: string;
    escrowSecret?: string;
    tasks: Task[];
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}

export type IssueLabel = {
    id: number;
    node_id: string;
    url: string;
    name: string;
    description: string | null;
    color: string;
    default: boolean;
}

export type Issue = {
    id: number;
    node_id: string;
    url: string;
    repository_url: string;
    html_url: string;
    number: number;
    state: string;
    state_reason?: string | null;
    title: string;
    body?: string | null;
}

export type Task = {
    id: string;
    creatorId: string;
    contributorId?: string;    
    installation: Installation;
    installationId: string;
    issue: Issue;
    timeline?: number;
    timelineType?: TimelineType;
    bounty: number;
    acceptedAt?: Date;
    completedAt?: Date;
    status: TaskStatus;
    settled: boolean;
    pullRequests: string[];
    creator: User;
    contributor?: User;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateTask = {
    repoUrl: string;
    installationId: string;
    issue: Issue;
    timeline?: number;
    timelineType?: TimelineType;
    bounty: string;
}

export class IssueFilters {
    labels?: string[];
    milestone?: string | "none" | "*";
    sort?: "created" | "updated" | "comments" = "created";
    direction?: "asc" | "desc" = "desc";
}

export type FilterTasks = {
    repoUrl?: string;
    issueTitle?: string;
    issueLabels?: string[];
    issueMilestone?: string;
}

export type CommentMetadata = {
    requestedTimeline: number;
    timelineType: TimelineType;
    reason?: string
}

export type Comment = {
    id?: string;
    userId: string;
    taskId: string;
    type?: CommentType;
    message: string;
    metadata?: CommentMetadata;
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