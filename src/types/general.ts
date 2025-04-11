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
    projects: Project[];
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

export type Project = {
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
    name: string;
    color: string;
}

export type Issue = {
    url: string;
    number: number;
    title: string;
    label?: IssueLabel;
}

export type Task = {
    id: string;
    creatorId: string;
    contributorId?: string;
    project: Project;
    projectId: string;
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
    projectId: string;
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

export class ErrorClass extends Error {
    constructor(
        name: string, 
        public readonly details: any,
        message: string, 
    ) {
        super(message);
        this.name = name;
        this.details = details;
    }
}