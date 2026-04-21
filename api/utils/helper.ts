import { Response } from "express";

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
    const decimal = (noDecimals || dec === 0)
        ? 0
        : dec || 2;

    const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: decimal,
        maximumFractionDigits: decimal
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
    if (typeof obj !== "object" || !obj) {
        return undefined;
    }
    if (field in obj) {
        return (obj as Record<string, T>)[field];
    }
    return undefined;
}

/**
 * Converts a Stellar timestamp (seconds since epoch) to a JavaScript Date object.
 * 
 * Stellar timestamps are typically `number` or `bigint` representing seconds.
 * This function converts them to milliseconds and creates a `Date` object.
 * 
 * @param timestamp - The Stellar timestamp in seconds (can be number or bigint).
 * @returns A Date object representing the given Stellar timestamp.
 */
export function stellarTimestampToDate(timestamp: number | bigint): Date {
    // Convert bigint to number if needed
    const timestampSeconds = typeof timestamp === "bigint"
        ? Number(timestamp)
        : timestamp;

    // Stellar timestamps are in seconds, JavaScript Date expects milliseconds
    return new Date(timestampSeconds * 1000);
}

/**
 * Wrapper function for sending responses.
 * 
 * @param res - The Express response object
 * @param status - The HTTP status code to send
 * @param data - The data to send in the response
 * @param message - Optional message to send in the response
 * @param warning - Optional warning message to send in the response
 * @param meta - Optional meta data to send in the response
 * @returns The response object
 */
export function responseWrapper({
    res,
    status,
    data,
    pagination,
    message = "Request completed successfully",
    warning,
    meta
}: {
    res: Response;
    status: number;
    data: unknown;
    pagination?: { hasMore: boolean };
    message?: string;
    warning?: string;
    meta?: Record<string, unknown>;
}) {
    return res.status(status).json({
        data,
        message,
        ...(pagination && { pagination }),
        ...(warning && { warning }),
        ...(meta && { meta })
    });
}
