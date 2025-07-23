import CryptoJS from 'crypto-js';
import { Request, Response,  NextFunction } from "express";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

export const encrypt = (text: string): string => {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};

export const dynamicRoute = (req: Request, res: Response, next: NextFunction) => {
    res.set({
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
    });
    next();
};

export const localhostOnly = (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('origin') || req.get('host');
    const referer = req.get('referer');

    // Allow requests with no origin (direct API calls, curl, etc.)
    if (!origin && !referer) {
        return next();
    }

    // Check if origin or referer contains localhost
    const isLocalhost = (url: string) => {
        return url.includes('localhost') || url.includes('127.0.0.1') || url.includes('::1');
    };

    if ((origin && isLocalhost(origin)) || (referer && isLocalhost(referer))) {
        return next();
    }

    res.status(403).json({
        error: "Access denied. This endpoint is only available from localhost."
    });
    return;
};