import { NextFunction, Request, Response } from "express";
import { prisma } from "../../config/database.config";
import { responseWrapper } from "../../utilities/helper";
import { STATUS_CODES } from "../../utilities/data";
import { AuthorizationError, NotFoundError } from "../../models/error.model";

/**
 * Add a user to the installation team.
 */
export const addTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId } = req.params;
    const userId = res.locals.userId;
    const { username, permissionCodes } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: {
                id: true,
                users: {
                    select: {
                        userId: true,
                        username: true
                    }
                }
            }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Check if user exists in our system
        const existingUser = await prisma.user.findFirst({
            where: { username },
            select: { userId: true }
        });

        let result: Record<string, unknown> = {};
        if (existingUser) {
            // Check if user is already a member of the installation
            const isAlreadyMember = installation.users.some(user => user.userId === existingUser.userId);
            if (isAlreadyMember) {
                return responseWrapper({
                    res,
                    status: STATUS_CODES.SERVER_ERROR,
                    data: { username, status: "already_member" },
                    message: "User is already a member of this installation"
                });
            }

            // Add user to installation
            await prisma.installation.update({
                where: { id: installationId },
                data: {
                    users: {
                        connect: { userId: existingUser.userId }
                    }
                }
            });

            // Assign permissions to user for this installation
            await prisma.userInstallationPermission.create({
                data: {
                    user: {
                        connect: { userId: existingUser.userId }
                    },
                    installation: {
                        connect: { id: installationId }
                    },
                    permissionCodes,
                    permissions: {
                        connect: (permissionCodes as string[]).map(code => ({ code }))
                    },
                    assignedBy: userId
                }
            });

            result = { username, status: "added" };
        } else {
            // const githubUserExists = await checkGithubUser(username);            
            // if (githubUserExists) {
            //     // Send invitation
            //     await sendInvitation(username, email);
            //     result = { username, status: "invited" };
            // }

            result = { username, status: "not_found" };
        }

        // Return result
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: result,
            message: "Team member added successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update info for a team member.
 */
export const updateTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, userId: memberId } = req.params;
    const userId = res.locals.userId;
    const { permissionCodes } = req.body;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to update permissions for this installation");
        }

        // Update team member permissions
        await prisma.userInstallationPermission.update({
            where: {
                userId_installationId: {
                    userId: memberId,
                    installationId
                }
            },
            data: {
                permissionCodes,
                assignedBy: userId,
                permissions: {
                    set: (permissionCodes as string[]).map(code => ({ code }))
                }
            }
        });

        // Return success message
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Permissions updated successfully"
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Remove a user from the installation team.
 */
export const removeTeamMember = async (req: Request, res: Response, next: NextFunction) => {
    const { installationId, userId: memberId } = req.params;
    const userId = res.locals.userId;

    try {
        // Get installation and verify it exists
        const installation = await prisma.installation.findUnique({
            where: { id: installationId },
            select: { users: { select: { userId: true } } }
        });

        if (!installation) {
            throw new NotFoundError("Installation not found");
        }

        // Only allow if the acting user is a team member
        const userIsTeamMember = installation.users.some(user => user.userId === userId);
        if (!userIsTeamMember) {
            throw new AuthorizationError("Not authorized to remove members from this installation");
        }

        // Remove user from installation
        await prisma.installation.update({
            where: { id: installationId },
            data: {
                users: {
                    disconnect: { userId: memberId }
                }
            }
        });

        // Delete user installation permissions
        await prisma.userInstallationPermission.delete({
            where: {
                userId_installationId: {
                    userId: memberId,
                    installationId
                }
            }
        });

        // Return success message
        responseWrapper({
            res,
            status: STATUS_CODES.SUCCESS,
            data: {},
            message: "Team member removed successfully"
        });
    } catch (error) {
        next(error);
    }
};
