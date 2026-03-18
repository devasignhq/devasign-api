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
        installationId: installationIdSchema.optional(),
        memo: z.string().refine((val) => {
            if (/^[0-9a-fA-F]{64}$/.test(val)) return true;
            if (/^\d+$/.test(val)) {
                try {
                    return BigInt(val) <= 18446744073709551615n;
                } catch { return false; }
            }
            return Buffer.byteLength(val, "utf8") >= 1 && Buffer.byteLength(val, "utf8") <= 28;
        }, "Invalid memo: must be a numeric ID, a 64-character hex hash, or text up to 28 bytes").optional()
    })
};

export const swapAssetSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    body: z.object({
        toAssetType: z.enum(["USDC", "XLM"]).optional(),
        amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
            message: "Amount must be a positive number"
        })
    })
};

export const getUserTransactionsSchema = {
    query: paginationSchema
};

export const getInstallationTransactionsSchema = {
    params: z.object({
        installationId: installationIdSchema
    }),
    query: z.object({
        ...paginationSchema.shape,
        categories: z.string().optional().refine((val) => {
            if (!val) return true;
            const splitCategories = val.split(",");
            return splitCategories.every(cat => Object.values(TransactionCategory).includes(cat as TransactionCategory));
        }, { message: "Invalid transaction category" })
    })
};
