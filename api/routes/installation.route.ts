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

installationRoutes.get("/", getInstallationsValidator, getInstallations as RequestHandler);
installationRoutes.get("/:id", getInstallation as RequestHandler);

installationRoutes.post("/", createInstallationValidator, createInstallation as RequestHandler);
installationRoutes.patch("/:id", updateInstallationValidator, updateInstallation as RequestHandler);
installationRoutes.delete("/:id", deleteInstallationValidator, deleteInstallation as RequestHandler);

// Team Members
installationRoutes.post("/:id/team", addTeamMemberValidator, addTeamMember as RequestHandler);
installationRoutes.patch("/:id/team/:userId", updateTeamMemberPermissionsValidator, updateTeamMemberPermissions as RequestHandler);
installationRoutes.delete("/:id/team/:userId", removeTeamMemberValidator, removeTeamMember as RequestHandler);
