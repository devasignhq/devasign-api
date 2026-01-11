import { RequestHandler, Router } from "express";
import {
    createUser,
    updateAddressBook,
    getUser
} from "../controllers/user";
import {
    createUserSchema,
    getUserSchema,
    updateAddressBookSchema
} from "../schemas/user.schema";
import { ENDPOINTS } from "../utilities/data";
import { validateRequestParameters } from "../middlewares/request.middleware";

export const userRoutes = Router();

// Create a new user
userRoutes.post(
    ENDPOINTS.USER.CREATE,
    validateRequestParameters(createUserSchema),
    createUser as RequestHandler
);

// Get user
userRoutes.get(
    ENDPOINTS.USER.GET,
    validateRequestParameters(getUserSchema),
    getUser as RequestHandler
);

// Update user's address book
userRoutes.patch(
    ENDPOINTS.USER.UPDATE_ADDRESS_BOOK,
    validateRequestParameters(updateAddressBookSchema),
    updateAddressBook as RequestHandler
);
