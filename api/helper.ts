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

/**
 * Formats a numeric value into a localized string representation with proper currency formatting.
 * 
 * This function takes a numeric input and converts it to a formatted string based on the specified locale.
 * It handles different numeric types and provides fallback formatting if the specified locale is invalid.
 * 
 * @param value - The numeric value to format. Can be a number, string, or bigint.
 * @param standard - The locale string (e.g., 'en-US') or array of locales for formatting.
 *                  Defaults to 'en-US' if not provided or if specified locale is invalid.
 * @param dec - The number of decimal places to show. Defaults to 2 if not specified.
 * @param noDecimals - If true, removes decimal formatting completely. If false, uses decimal places as specified by dec.
 * @returns A formatted string representation of the number. Returns "--" for null or undefined values.
 * 
 * @example
 * moneyFormat(1234.56) // Returns "1,234.56"
 * moneyFormat(1234.56, 'de-DE') // Returns "1.234,56"
 * moneyFormat(1234.56, 'en-US', 3) // Returns "1,234.560"
 * moneyFormat(1234.56, 'en-US', 2, true) // Returns "1,235"
 */
export function moneyFormat(
	value: number | string | bigint, 
	standard?: string | string[], 
	dec?: number,
	noDecimals?: boolean,
) {
	const options: Intl.NumberFormatOptions = noDecimals ? {} : {
		minimumFractionDigits: dec || 2,
		maximumFractionDigits: dec || 2,
	};
    try {
        // Use default locale if none provided or invalid
        const locale = standard || 'en-US';
        const nf = new Intl.NumberFormat(locale, options);
        return (value || value === 0) ? nf.format(Number(value)) : "--";
    } catch {
        // Fallback to basic locale if the provided one fails
        const nf = new Intl.NumberFormat('en-US', options);
        return (value || value === 0) ? nf.format(Number(value)) : "--";
    }
}