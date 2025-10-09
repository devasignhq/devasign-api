import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

export const encrypt = (text: string): string => {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (ciphertext: string): string => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
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
    noDecimals?: boolean
) {
    const options: Intl.NumberFormatOptions = noDecimals ? {} : {
        minimumFractionDigits: dec || 2,
        maximumFractionDigits: dec || 2
    };
    try {
        // Use default locale if none provided or invalid
        const locale = standard || "en-US";
        const nf = new Intl.NumberFormat(locale, options);
        return (value || value === 0) ? nf.format(Number(value)) : "--";
    } catch {
        // Fallback to basic locale if the provided one fails
        const nf = new Intl.NumberFormat("en-US", options);
        return (value || value === 0) ? nf.format(Number(value)) : "--";
    }
}

/**
 * Safely extracts a field value from an object of unknown type.
 * 
 * This function performs runtime type checking to verify that the input is an object
 * and contains the specified field before attempting to access it.
 * 
 * @template T - The expected type of the field value
 * @param obj - The object to extract the field from
 * @param field - The name of the field to retrieve
 * @returns The value of the field cast to type T, or undefined if the object is not
 *          an object type or doesn't contain the specified field
 * 
 * @example
 * const data: unknown = { name: "Alice", age: 30 };
 * const name = getFieldFromUnknownObject<string>(data, "name"); // "Alice"
 * const missing = getFieldFromUnknownObject<string>(data, "email"); // undefined
 */
export function getFieldFromUnknownObject<T>(obj: unknown, field: string) {
    if (typeof obj === "object" && field in obj!) {
        return (obj as Record<string, T>)[field];
    }
    return undefined;
}

export const STATUS_CODES = {
    /**200 */
    GET: 200,
    /**201 */
    POST: 201,
    /**200 */
    PATCH: 200,
    /**200 */
    PUT: 200,
    /**204 */
    DELETE: 204,

    /**202 */
    PARTIAL_SUCCESS: 202,
    /**204 */
    NO_CONTENT: 204,
    /**429 */
    RATE_LIMIT: 429,
    /**408 */
    TIMEOUT: 408,

    /**400 */
    UNAUTHENTICATED: 400,
    /**403 */
    UNAUTHORIZED: 403,
    /**401 */
    SERVER_ERROR: 401,
    /**404 */
    NOT_FOUND: 404,
    /**407 */
    BAD_PAYLOAD: 407,
    /**500 */
    UNKNOWN: 500
};
