import { RequestHandler, Router } from "express";
import { 
    createUser, 
    updateUsername, 
    updateAddressBook, 
    getUser 
} from "../controllers/userController";
import { 
    getUserValidator,
    updateAddressBookValidator 
} from "../validators/userValidators";

export const userRoutes = Router();

// Create a new user
userRoutes.post("/", createUser as RequestHandler);

// Get user
userRoutes.get('/', getUserValidator, getUser as RequestHandler);

// Update user details
userRoutes.patch("/username", updateUsername as RequestHandler);

// Update user's address book
userRoutes.patch("/address-book", updateAddressBookValidator, updateAddressBook as RequestHandler);