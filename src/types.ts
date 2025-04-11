// Enums
export enum TaskStatus {
    OPEN = "OPEN",
    IN_PROGRESS = "IN_PROGRESS",
    MARKED_AS_COMPLETED = "MARKED_AS_COMPLETED",
    COMPLETED = "COMPLETED",
    HOLD = "HOLD"
}

export enum TimelineType {
    WEEK = "WEEK",
    DAY = "DAY"
}

export type AddressBook = {
    address: string;
    network: string;
    memo: string;
    asset: string;
}

export type User = {
    userId: string;
    username: string;
    walletPublicKey?: string;
    walletSecretKey?: string;
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
    escrowPublicKey?: string;
    escrowSecretKey?: string;
    tasks: Task[];
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}

export type Task = {
    id: string;
    creatorId: string;
    contributorId?: string;
    project: Project;
    projectId: string;
    issueUrl: string;
    issueNumber: number;
    issueTitle: string;
    issueLabel?: string;
    timeline?: number;
    timelineType: TimelineType;
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

export class IssueFilters {
    labels?: string[];
    milestone?: string | "none" | "*";
    sort?: "created" | "updated" | "comments" = "created";
    direction?: "asc" | "desc" = "desc";
}

export type IssueLabel = {
    id: number;
    name: string;
    color: string;
}