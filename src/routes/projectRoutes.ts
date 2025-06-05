import { RequestHandler, Router } from "express";
import {
    createProject,
    updateProject,
    deleteProject,
    addTeamMember,
    getProject,
    getProjects,
    connectRepository,
    removeTeamMember,
    updateTeamMemberPermissions
} from "../controllers/projectController";
import {
    getProjectsValidator,
    createProjectValidator,
    updateProjectValidator,
    addTeamMemberValidator,
    connectRepositoryValidator,
    removeTeamMemberValidator,
    updateTeamMemberPermissionsValidator
} from "../validators/projectValidators";

export const projectRoutes = Router();

projectRoutes.get('/', getProjectsValidator, getProjects as RequestHandler);
projectRoutes.get('/:id', getProject as RequestHandler);

projectRoutes.post("/", createProjectValidator, createProject as RequestHandler);
projectRoutes.post( "/:id/connect-repo", connectRepositoryValidator, connectRepository as RequestHandler);
projectRoutes.patch("/:id", updateProjectValidator, updateProject as RequestHandler);
projectRoutes.delete("/:id", deleteProject as RequestHandler);

// Team Members
projectRoutes.post("/:id/team", addTeamMemberValidator, addTeamMember as RequestHandler);
projectRoutes.patch("/:id/team/:userId", updateTeamMemberPermissionsValidator, updateTeamMemberPermissions as RequestHandler);
projectRoutes.delete("/:id/team/:userId", removeTeamMemberValidator, removeTeamMember as RequestHandler);