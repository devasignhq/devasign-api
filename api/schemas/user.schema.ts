import * as z from "zod";

export const createUserSchema = {
    query: z.object({
        skipWallet: z.literal("true").optional()
    }),
    body: z.object({
        githubUsername: z.string().min(1, "Username must be greater than 1 character")
    })
};

export const getUserSchema = {
    query: z.object({
        view: z.enum(["basic", "full"]).optional(),
        setWallet: z.literal("true").optional()
    })
};

export const updateUsernameSchema = {
    body: z.object({
        newUsername: z.string().min(1, "Username must be greater than 1 character")
    })
};

export const updateAddressBookSchema = {
    body: z.object({
        address: z.string().regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar address format"),
        name: z.string().min(1).max(50, "Name must be between 1 and 50 characters")
    })
};
