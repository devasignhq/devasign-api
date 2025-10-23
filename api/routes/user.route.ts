import { RequestHandler, Router } from "express";
import {
    createUser,
    updateUsername,
    updateAddressBook,
    getUser
} from "../controllers/user";
import {
    createUserValidator,
    getUserValidator,
    updateAddressBookValidator,
    updateUsernameValidator
} from "../validators/user.validator";
import { ENDPOINTS } from "../utilities/data";

export const userRoutes = Router();

// Create a new user
userRoutes.post(
    ENDPOINTS.USER.CREATE,
    createUserValidator,
    createUser as RequestHandler
);

// Get user
userRoutes.get(
    ENDPOINTS.USER.GET,
    getUserValidator,
    getUser as RequestHandler
);

// Update user username
userRoutes.patch(
    ENDPOINTS.USER.UPDATE_USERNAME,
    updateUsernameValidator,
    updateUsername as RequestHandler
);

// Update user's address book
userRoutes.patch(
    ENDPOINTS.USER.UPDATE_ADDRESS_BOOK,
    updateAddressBookValidator,
    updateAddressBook as RequestHandler
);
