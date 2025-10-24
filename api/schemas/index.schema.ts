import * as z from "zod";

export const cuidSchema = z.string().length(25, "Invalid ID");
export const userIdSchema = z.string().length(28, "Invalid User ID");
export const installationIdSchema = z.string().length(8, "Invalid Installation ID");

export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1, "Page must be a positive integer").optional(),
    limit: z.coerce.number().int().min(1).max(100, "Limit must be between 1 and 100").optional(),
    sort: z.enum(["asc", "desc"]).optional()
});
