import { RequestHandler, Router } from "express";
import {
    createInstallation,
    updateInstallation,
    deleteInstallation,
    addTeamMember,
    getInstallation,
    getInstallations,
    removeTeamMember,
    updateTeamMemberPermissions
} from "../controllers/installation.controller";
import {
    getInstallationsValidator,
    createInstallationValidator,
    updateInstallationValidator,
    addTeamMemberValidator,
    removeTeamMemberValidator,
    updateTeamMemberPermissionsValidator,
    deleteInstallationValidator
} from "../validators/installation.validator";

export const installationRoutes = Router();

// Get all installations
installationRoutes.get("/", getInstallationsValidator, getInstallations as RequestHandler);

// Get a specific installation
installationRoutes.get("/:installationId", getInstallation as RequestHandler);

// Create a new installation
installationRoutes.post("/", createInstallationValidator, createInstallation as RequestHandler);

// Update an existing installation
installationRoutes.patch("/:installationId", updateInstallationValidator, updateInstallation as RequestHandler);

// Delete an installation
installationRoutes.delete("/:installationId", deleteInstallationValidator, deleteInstallation as RequestHandler);

// Add a team member to an installation
installationRoutes.post("/:installationId/team", addTeamMemberValidator, addTeamMember as RequestHandler);

// Update team member permissions
installationRoutes.patch("/:installationId/team/:userId", updateTeamMemberPermissionsValidator, updateTeamMemberPermissions as RequestHandler);

// Remove a team member from an installation
installationRoutes.delete("/:installationId/team/:userId", removeTeamMemberValidator, removeTeamMember as RequestHandler);
