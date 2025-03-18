import { RequestHandler, Router } from "express";
import { validateUser } from "../config/firebase";
import {
    createProject,
    updateProject,
    deleteProject,
    addTeamMembers
} from "../controllers/projectController";

export const projectRoutes = Router();

projectRoutes.post("/", validateUser as RequestHandler, createProject);
projectRoutes.put("/:id", validateUser as RequestHandler, updateProject);
projectRoutes.delete("/:id", 
    validateUser as RequestHandler, 
    deleteProject as RequestHandler
);
projectRoutes.post("/:id/team", 
    validateUser as RequestHandler, 
    addTeamMembers as RequestHandler
);