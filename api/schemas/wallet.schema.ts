import * as z from "zod";
import { installationIdSchema, paginationSchema } from "./index.schema";
import { TransactionCategory } from "../../prisma_client";

export const walletInstallationIdSchema = {
    query: z.object({
        installationId: installationIdSchema.optional()
    })
};

export const withdrawAssetSchema = {
    body: z.object({
        walletAddress: z.string().regex(/^G[A-Z0-9]{55}$/, "Invalid Stellar wallet address format"),
        assetType: z.enum(["USDC", "XLM"]).optional(),
        amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Amount must be a positive number"
        }),
        installationId: installationIdSchema.optional()
    })
};

export const swapAssetSchema = {
    body: z.object({
        toAssetType: z.enum(["USDC", "XLM"]).optional(),
        amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Amount must be a positive number"
        }),
        equivalentAmount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Equivalent amount must be a positive number"
        }),
        installationId: installationIdSchema.optional()
    })
};

export const getTransactionsSchema = {
    query: z.object({
        ...walletInstallationIdSchema.query.shape,
        ...paginationSchema.shape,
        categories: z.string().optional().refine((val) => {
            if (!val) return true;
            const splitCategories = val.split(",");
            return splitCategories.every(cat => Object.values(TransactionCategory).includes(cat as TransactionCategory));
        }, { message: "Invalid transaction category" })
    })
};
