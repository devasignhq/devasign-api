import axios from "axios";
import { Octokit } from "@octokit/rest";
import { TaskIssue } from "../types";

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

export async function getRepoIssues(
    repoUrl: string, 
    githubToken: string,
    page: number = 1,
    perPage: number = 10
): Promise<{ issues: TaskIssue[], totalCount: number }> {
    const octokit = new Octokit({ auth: githubToken });
    
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
            sort: "created",
            direction: "desc"
        });

        const issues: TaskIssue[] = response.data.map(issue => ({
            title: issue.title,
            issueNumber: issue.number,
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