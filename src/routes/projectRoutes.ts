import { RequestHandler, Router } from "express";
import {
    createProject,
    updateProject,
    deleteProject,
    addTeamMembers,
    getProjectIssues,
    getProjectMilestones,
    getProjectLabels,
    getProject,
    getProjects
} from "../controllers/projectController";
import {
    getProjectsValidator,
    createProjectValidator,
    updateProjectValidator,
    addTeamMembersValidator,
    getProjectIssuesValidator
} from "../validators/projectValidators";

export const projectRoutes = Router();

projectRoutes.get('/', getProjectsValidator, getProjects as RequestHandler);
projectRoutes.get('/:id', getProject as RequestHandler);

projectRoutes.post("/", createProjectValidator, createProject as RequestHandler);
projectRoutes.put("/:id", updateProjectValidator, updateProject as RequestHandler);
projectRoutes.delete("/:id", deleteProject as RequestHandler);
projectRoutes.post("/:id/team", addTeamMembersValidator, addTeamMembers as RequestHandler);

// GitHub repository related routes
projectRoutes.get("/issues", getProjectIssuesValidator, getProjectIssues as RequestHandler);
projectRoutes.get("/milestones", getProjectMilestones as RequestHandler);
projectRoutes.get("/labels", getProjectLabels as RequestHandler);