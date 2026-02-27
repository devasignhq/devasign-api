import { RequestHandler, Router } from "express";
import {
    createUser,
    updateAddressBook,
    getUser,
    generateSumsubSdkToken
} from "../controllers/user";
import { createUserSchema, updateAddressBookSchema } from "../schemas/user.schema";
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
userRoutes.get(ENDPOINTS.USER.GET, getUser as RequestHandler);

// Update user's address book
userRoutes.patch(
    ENDPOINTS.USER.UPDATE_ADDRESS_BOOK,
    validateRequestParameters(updateAddressBookSchema),
    updateAddressBook as RequestHandler
);

// Generate Sumsub SDK token
userRoutes.get(
    ENDPOINTS.USER.SUMSUB_TOKEN,
    generateSumsubSdkToken as RequestHandler
);
