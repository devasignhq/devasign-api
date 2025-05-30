import { RequestHandler, Router } from "express";
import { 
    createUser, 
    updateUsername, 
    updateAddressBook, 
    getUser 
} from "../controllers/userController";
import { 
    createUserValidator,
    getUserValidator,
    updateAddressBookValidator, 
    updateUsernameValidator
} from "../validators/userValidators";

export const userRoutes = Router();

// Create a new user
userRoutes.post("/", createUserValidator, createUser as RequestHandler);

// Get user
userRoutes.get('/', getUserValidator, getUser as RequestHandler);

// Update user details
userRoutes.patch("/username", updateUsernameValidator, updateUsername as RequestHandler);

// Update user's address book
userRoutes.patch("/address-book", updateAddressBookValidator, updateAddressBook as RequestHandler);