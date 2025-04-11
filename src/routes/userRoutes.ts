import { RequestHandler, Router } from "express";
import { createUser, updateUser, updateAddressBook } from "../controllers/userController";

export const userRoutes = Router();

// Create a new user
userRoutes.post("/", createUser as RequestHandler);

// Update user details
userRoutes.put("/", updateUser as RequestHandler);

// Update user's address book
userRoutes.put("/address-book", updateAddressBook as RequestHandler);