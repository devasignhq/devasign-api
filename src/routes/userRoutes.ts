import { RequestHandler, Router } from "express";
import { createUser, updateUser, updateAddressBook } from "../controllers/userController";

export const userRoutes = Router();

// Create a new user
userRoutes.post("/", createUser);

// Update user details
userRoutes.put("/", updateUser);

// Update user's address book
userRoutes.put("/address-book", updateAddressBook as RequestHandler);