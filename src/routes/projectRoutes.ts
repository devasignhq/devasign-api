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

export const projectRoutes = Router();

projectRoutes.get('/', getProjects as RequestHandler);
projectRoutes.get('/:id', getProject as RequestHandler);

projectRoutes.post("/", createProject as RequestHandler);
projectRoutes.put("/:id", updateProject as RequestHandler);
projectRoutes.delete("/:id", deleteProject as RequestHandler);
projectRoutes.post("/:id/team", addTeamMembers as RequestHandler);

// GitHub repository related routes
projectRoutes.get("/issues", getProjectIssues as RequestHandler);
projectRoutes.get("/milestones", getProjectMilestones as RequestHandler);
projectRoutes.get("/labels", getProjectLabels as RequestHandler);