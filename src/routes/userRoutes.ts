import { RequestHandler, Router } from "express";
import { createUser, updateUser, updateAddressBook, getUser } from "../controllers/userController";import { 
    getUserValidator,
    updateUserValidator,
    updateAddressBookValidator 
} from "../validators/userValidators";

export const userRoutes = Router();

// Create a new user
userRoutes.post("/", createUser as RequestHandler);

// Get user
userRoutes.get('/', getUserValidator, getUser as RequestHandler);

// Update user details
userRoutes.put("/", updateUserValidator, updateUser as RequestHandler);

// Update user's address book
userRoutes.put("/address-book", updateAddressBookValidator, updateAddressBook as RequestHandler);