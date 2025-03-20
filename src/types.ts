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

export enum AcceptanceCriteria {
    APPLICATION = "APPLICATION",
    ANYONE = "ANYONE",
    BENCHMARK = "BENCHMARK"
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
    contributionSummary?: ContributionSummary;
    createdTasks: Task[];
    contributedTasks: Task[];
    projects: Project[];
    appliedTasks: Task[];
    escrowFunds: number;
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
    tasks: Task[];
    users: User[];
    createdAt: Date;
    updatedAt: Date;
}

export type Issue = {
    number: number;
    title: string;
    link: string;
}

export type Milestone = {
    number: number;
    title: string;
    description: string | null;
    dueDate: string | null;
    link: string;
    issues?: Issue[];
}

export type Task = {
    id: string;
    creatorId: string;
    contributorId?: string;
    project: Project;
    projectId: string;
    title?: string;
    description?: string;
    issues: Issue[];
    milestones: Milestone[];
    timeline: number;
    timelineType: TimelineType;
    bounty: number;
    acceptanceCriteria: AcceptanceCriteria;
    applications: User[];
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

// Stored in Firebase
export type Comment = {
    id: string;
    userId: string;
    taskId: string;
    message: string;
    attachments: string[];
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