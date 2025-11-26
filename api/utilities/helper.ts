import { KeyManagementServiceClient } from "@google-cloud/kms";
import crypto from "crypto";
import { Wallet } from "../../prisma_client";

// Set Google Cloud KMS environment variables
const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION_ID = process.env.GCP_LOCATION_ID!;
const KEY_RING_ID = process.env.GCP_KEY_RING_ID!;
const KEY_ID = process.env.GCP_KEY_ID!;

const client = new KeyManagementServiceClient();
const keyName = client.cryptoKeyPath(PROJECT_ID, LOCATION_ID, KEY_RING_ID, KEY_ID);

/**
 * Encrypts a Stellar wallet secret using envelope encryption.
 * 
 * Generates a random Data Encryption Key (DEK), encrypts the wallet secret with it,
 * and then encrypts the DEK using Google Cloud KMS.
 */
export const encryptWallet = async (stellarSecret: string) => {
    // Generate a random 32-byte Data Encryption Key (DEK)
    const plaintextDEK = crypto.randomBytes(32);

    // Encrypt the DEK using Google Cloud KMS
    const [encryptResponse] = await client.encrypt({
        name: keyName,
        plaintext: plaintextDEK
    });
    const encryptedDEK = encryptResponse.ciphertext;

    if (!encryptedDEK) {
        throw new Error("Failed to encrypt DEK");
    }

    // Encrypt the wallet secret using the plaintext DEK (AES-256-GCM)
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", plaintextDEK, iv);

    let encryptedSecret = cipher.update(stellarSecret, "utf8", "hex");
    encryptedSecret += cipher.final("hex");
    const authTag = cipher.getAuthTag().toString("hex");

    // Clear the plaintext DEK from memory for security
    plaintextDEK.fill(0);

    return {
        encryptedDEK: encryptedDEK.toString("base64"),
        encryptedSecret,
        iv: iv.toString("hex"),
        authTag
    };
};

/**
 * Decrypts a Stellar wallet secret using envelope encryption.
 * 
 * Decrypts the Data Encryption Key (DEK) using Google Cloud KMS,
 * and then uses the decrypted DEK to decrypt the wallet secret.
 */
export const decryptWallet = async (wallet: Wallet) => {
    const { encryptedDEK, encryptedSecret, iv, authTag } = wallet;

    // Decrypt the DEK using Google Cloud KMS
    const [decryptResponse] = await client.decrypt({
        name: keyName,
        ciphertext: Buffer.from(encryptedDEK, "base64")
    });

    if (!decryptResponse.plaintext) {
        throw new Error("Failed to decrypt DEK");
    }

    // Ensure plaintextDEK is a Buffer
    const plaintextDEK = typeof decryptResponse.plaintext === "string"
        ? Buffer.from(decryptResponse.plaintext)
        : Buffer.from(decryptResponse.plaintext);

    // Decrypt the wallet secret using the decrypted DEK
    const decipher = crypto.createDecipheriv("aes-256-gcm", plaintextDEK, Buffer.from(iv, "hex"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));

    let decryptedSecret = decipher.update(encryptedSecret, "hex", "utf8");
    decryptedSecret += decipher.final("utf8");

    // Clear the plaintext DEK from memory for security
    plaintextDEK.fill(0);

    return decryptedSecret;
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
