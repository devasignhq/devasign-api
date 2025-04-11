import axios from "axios";
import type { Octokit } from "@octokit/rest";
import { ErrorClass, IssueFilters } from "../types/general";

// Helper function to send invitation email
export async function sendInvitation(username: string, projectName: string) {
    // TODO: Implement email service integration
    console.log(`Invitation sent to ${username} for project ${projectName}`);
};

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
        throw new ErrorClass(
            "OctakitError",
            error,
            `Failed to check GitHub user ${username}`
        );
    }
};

async function getOctokitInstance(githubToken: string): Promise<Octokit> {
    const { Octokit } = await import("@octokit/rest");
    return new Octokit({ auth: githubToken });
}

// Extract owner and repo from GitHub URL
// Example URL: https://github.com/owner/repo
function getOwnerAndRepo(repoUrl: string) {
    const [owner, repo] = repoUrl
        .replace("https://github.com/", "")
        .replace(".git", "")
        .split("/");

    return [owner, repo];
}

export async function getRepoDetails(repoUrl: string, githubToken: string) {
    const octokit = await getOctokitInstance(githubToken);
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
    const octokit = await getOctokitInstance(githubToken);
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

export async function getRepoLabels(repoUrl: string, githubToken: string) {
    const octokit = await getOctokitInstance(githubToken);
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

export async function getRepoMilestones(repoUrl: string, githubToken: string) {
    const octokit = await getOctokitInstance(githubToken);
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