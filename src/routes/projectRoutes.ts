import { RequestHandler, Router } from "express";
import {
    createProject,
    updateProject,
    deleteProject,
    addTeamMembers,
    getProjectIssues,
    getProjectMilestones,
    getProjectLabels
} from "../controllers/projectController";

export const projectRoutes = Router();

projectRoutes.post("/", createProject);
projectRoutes.put("/:id", updateProject);
projectRoutes.delete("/:id", deleteProject as RequestHandler);
projectRoutes.post("/:id/team", addTeamMembers as RequestHandler);

// GitHub repository related routes
projectRoutes.get("/:id/issues", getProjectIssues as RequestHandler);
projectRoutes.get("/:id/milestones", getProjectMilestones as RequestHandler);
projectRoutes.get("/:id/labels", getProjectLabels as RequestHandler);