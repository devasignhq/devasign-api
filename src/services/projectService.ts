import axios from "axios";

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
}

// Helper function to send invitation email
export async function sendInvitation(username: string, projectName: string) {
    // TODO: Implement email service integration
    console.log(`Invitation sent to ${username} for project ${projectName}`);
}