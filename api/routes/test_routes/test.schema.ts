import * as z from "zod";

// Stellar test schemas
export const createWalletViaSponsorSchema = {
    body: z.object({
        sponsorSecret: z.string().min(1, "Secret key is required")
    })
};

export const addTrustLineSchema = {
    body: z.object({
        secretKey: z.string().min(1, "Secret key is required")
    })
};

export const addTrustLineViaSponsorSchema = {
    body: z.object({
        sponsorSecret: z.string().min(1, "Sponsor key is required"),
        accountSecret: z.string().min(1, "Account key is required")
    })
};

export const fundWalletSchema = {
    body: z.object({
        publicKey: z.string().min(1, "Public key is required")
    })
};

export const transferAssetSchema = {
    body: z.object({
        sourceSecret: z.string().min(1, "Source secret key is required"),
        destinationAddress: z.string().min(1, "Destination public key is required"),
        amount: z.string().min(1, "Amount is required")
    })
};

export const transferAssetViaSponsorSchema = {
    body: z.object({
        sponsorSecret: z.string().min(1, "Sponsor key is required"),
        accountSecret: z.string().min(1, "Account key is required"),
        destinationAddress: z.string().min(1, "Destination public key is required"),
        amount: z.string().min(1, "Amount is required")
    })
};

export const swapAssetSchema = {
    body: z.object({
        sourceSecret: z.string().min(1, "Source secret key is required"),
        amount: z.string().min(1, "Amount is required")
    })
};

export const getAccountInfoSchema = {
    params: z.object({
        publicKey: z.string().min(1, "Public key is required")
    })
};

// AI Services test schemas
export const groqChatSchema = {
    body: z.object({
        message: z.string().min(1, "Message is required"),
        model: z.string().optional()
    })
};

export const groqCodeReviewSchema = {
    body: z.object({
        code: z.string().min(1, "Code content is required"),
        language: z.string().optional(),
        filename: z.string().optional()
    })
};

export const groqTestModelsSchema = {
    body: z.object({
        prompt: z.string().min(1, "Prompt is required"),
        models: z.array(z.string()).optional()
    })
};

export const groqTestJsonSchema = {
    body: z.object({
        testPrompt: z.string().optional()
    })
};

export const manualAnalysisSchema = {
    body: z.object({
        installationId: z.string().min(1, "Installation ID is required"),
        repositoryName: z.string().min(1, "Repository name is required"),
        prNumber: z.number().int().min(1, "PR number must be a positive integer"),
        reason: z.string().optional()
    })
};

// General test schemas
export const createTestUserSchema = {
    params: z.object({
        id: z.string().min(1, "ID must be present")
    }),
    body: z.object({
        email: z.string().email("Email must be valid"),
        password: z.string().min(6, "Password must be at least 6 characters long"),
        name: z.string().min(1, "Name is required")
    })
};

export const encryptionSchema = {
    body: z.object({
        text: z.string().min(1, "Text to encrypt is required")
    })
};

export const decryptionSchema = {
    body: z.object({
        text: z.string().min(1, "Text to decrypt is required")
    })
};
