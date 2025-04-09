import axios from "axios";
import type { Octokit } from "@octokit/rest";
import { Issue, IssueFilters, IssueLabel, Milestone } from "../types";

// Helper function to check if GitHub user exists
export async function checkGithubUser(username: string): Promise<boolean> {
    try {
        const response = await axios.get(`https://api.github.com/users/${username}`, {
            headers: {
                Authorization: `token ${process.env.GITHUB_ACCESS_TOKEN}`
            }
        });
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

// Helper function to send invitation email
export async function sendInvitation(username: string, projectName: string) {
    // TODO: Implement email service integration
    console.log(`Invitation sent to ${username} for project ${projectName}`);
};

async function getOctokitInstance(githubToken: string): Promise<Octokit> {
    const { Octokit } = await import("@octokit/rest");
    return new Octokit({ auth: githubToken });
}

export async function getRepoIssues(
    repoUrl: string,
    githubToken: string,
    page: number = 1,
    perPage: number = 10,
    filters?: IssueFilters
): Promise<{ issues: Issue[], totalCount: number }> {
    const octokit = await getOctokitInstance(githubToken);

    // Extract owner and repo from GitHub URL
    // Example URL: https://github.com/owner/repo
    const [owner, repo] = repoUrl
        .replace("https://github.com/", "")
        .replace(".git", "")
        .split("/");

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

        const issues: Issue[] = response.data.map(issue => ({
            title: issue.title,
            number: issue.number,
            link: issue.html_url
        }));

        return {
            issues,
            totalCount: response.data.length
        };
    } catch (error) {
        throw new Error("Failed to fetch repository issues");
    }
};

export async function getRepoLabels(
    repoUrl: string,
    githubToken: string,
    page: number = 1,
    perPage: number = 10
): Promise<{ labels: IssueLabel[], totalCount: number }> {
    const octokit = await getOctokitInstance(githubToken);

    const [owner, repo] = repoUrl
        .replace("https://github.com/", "")
        .replace(".git", "")
        .split("/");

    try {
        const response = await octokit.issues.listLabelsForRepo({
            owner,
            repo,
            per_page: perPage,
            page
        });

        const labels: IssueLabel[] = response.data.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color
        }));

        return {
            labels,
            totalCount: response.data.length
        };
    } catch (error) {
        throw new Error("Failed to fetch repository labels");
    }
};

export async function getRepoMilestones(
    repoUrl: string,
    githubToken: string,
    page: number = 1,
    perPage: number = 10,
    direction: "asc" | "desc" = "asc"
): Promise<{ milestones: Milestone[], totalCount: number }> {
    const octokit = await getOctokitInstance(githubToken);

    // Extract owner and repo from GitHub URL
    const [owner, repo] = repoUrl
        .replace("https://github.com/", "")
        .replace(".git", "")
        .split("/");

    try {
        const response = await octokit.issues.listMilestones({
            owner,
            repo,
            state: "open",
            per_page: perPage,
            page,
            sort: "due_on",
            direction
        });

        const milestones: Milestone[] = response.data.map(milestone => ({
            number: milestone.number,
            title: milestone.title,
            description: milestone.description,
            dueDate: milestone.due_on,
            link: milestone.html_url
        }));

        return {
            milestones,
            totalCount: response.data.length
        };
    } catch (error) {
        throw new Error("Failed to fetch repository milestones");
    }
}