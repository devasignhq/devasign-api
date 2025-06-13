import axios from "axios";
import { Octokit } from "@octokit/rest";
import { ErrorClass, IssueFilters } from "../types/general";

// Helper function to send invitation email
export async function sendInvitation(username: string, email: string) {
    // TODO: Implement email service integration
    console.log(`Invitation sent to ${username} for installation ${email}`);
};

// Helper function to check if GitHub user exists
export async function checkGithubUser(username: string): Promise<boolean> {
    const octokit = new Octokit({ auth: process.env.GITHUB_ACCESS_TOKEN });

    try {
        const response = await octokit.rest.users.getByUsername({
            username,
        });

        return response.status === 200;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            `Failed to check GitHub user ${username}`
        );
    }
};

// Extract owner and repo from GitHub URL
// Example URL: https://github.com/owner/repo
function getOwnerAndRepo(repoUrl: string) {
    const [owner, repo] = repoUrl
        .split("https://github.com/")[1]
        .split("/");

    return [owner, repo];
}

export async function getRepoDetails(repoUrl: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.repos.get({
            owner,
            repo,
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to fetch repository details"
        );
    }
};

export async function getRepoIssues(
    repoUrl: string,
    githubToken: string,
    page: number = 1,
    perPage: number = 10,
    filters?: IssueFilters
) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.listForRepo({
            owner,
            repo,
            state: "open",
            per_page: perPage,
            page,
            ...filters,
            labels: filters?.labels?.join(','),
            milestone: filters?.milestone
        });

        const issues = response.data.filter(issue => issue.pull_request === null);

        return issues;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to fetch repository issues"
        );
    }
};

export async function getRepoIssue(
    repoUrl: string,
    githubToken: string,
    issueNumber: number
) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.get({
            owner,
            repo,
            issue_number: issueNumber,
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            `Failed to fetch issue number ${issueNumber}`
        );
    }
};

export async function updateRepoIssue(
    repoUrl: string,
    githubToken: string,
    issueNumber: number,
    title?: string,
    body?: string,
    labels?: string[],
    assignees?: string[],
    state?: "open" | "closed",
    state_reason?: string,
) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.update({
            owner,
            repo,
            issue_number: issueNumber,
            title,
            body,
            state,
            state_reason,
            labels,
            assignees
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            `Failed to fetch issue number ${issueNumber}`
        );
    }
};

export async function getRepoLabels(repoUrl: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.listLabelsForRepo({
            owner,
            repo,
            per_page: 100,
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to fetch repository labels"
        );
    }
};

export async function createBountyLabel(repoUrl: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.createLabel({
            owner,
            repo,
            name: "💵 Bounty",
            color: "85BB65",
            description: "Issues with a monetary reward"
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to create bounty label"
        );
    }
};

export async function getBountyLabel(repoUrl: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.getLabel({
            owner,
            repo,
            name: "💵 Bounty",
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to get bounty label"
        );
    }
};

export async function getRepoMilestones(repoUrl: string, githubToken: string) {
    const octokit = new Octokit({ auth: githubToken });
    const [owner, repo] = getOwnerAndRepo(repoUrl);

    try {
        const response = await octokit.issues.listMilestones({
            owner,
            repo,
            state: "open",
            per_page: 100,
            sort: "due_on",
            direction: "asc"
        });

        return response.data;
    } catch (error) {
        throw new ErrorClass(
            "OctakitError",
            error,
            "Failed to fetch repository milestones"
        );
    }
}