import { KeyManagementServiceClient } from "@google-cloud/kms";
import crypto from "crypto";
import { Wallet } from "../../prisma_client";
import { KmsServiceError } from "../models/error.model";

// Set Google Cloud KMS environment variables
const PROJECT_ID = process.env.GCP_PROJECT_ID!;
const LOCATION_ID = process.env.GCP_LOCATION_ID!;
const KEY_RING_ID = process.env.GCP_KEY_RING_ID!;
const KEY_ID = process.env.GCP_KEY_ID!;

const client = new KeyManagementServiceClient();
const keyName = client.cryptoKeyPath(PROJECT_ID, LOCATION_ID, KEY_RING_ID, KEY_ID);

/**
 * Service for managing Google Cloud KMS encryption and decryption operations.
 */
export class KMSService {
    /**
     * Encrypts a Stellar wallet secret using envelope encryption.
     * 
     * Generates a random Data Encryption Key (DEK), encrypts the wallet secret with it,
     * and then encrypts the DEK using Google Cloud KMS.
     */
    static async encryptWallet(stellarSecret: string) {
        // Generate a random 32-byte Data Encryption Key (DEK)
        const plaintextDEK = crypto.randomBytes(32);

        let encryptedDEK;
        try {
            const [encryptResponse] = await client.encrypt({
                name: keyName,
                plaintext: plaintextDEK
            });
            encryptedDEK = encryptResponse.ciphertext;

            if (!encryptedDEK) {
                throw new KmsServiceError("Failed to encrypt DEK");
            }
        } catch (error) {
            throw new KmsServiceError("Failed to encrypt DEK", error);
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
    }

    /**
     * Decrypts a Stellar wallet secret using envelope encryption.
     * 
     * Decrypts the Data Encryption Key (DEK) using Google Cloud KMS,
     * and then uses the decrypted DEK to decrypt the wallet secret.
     */
    static async decryptWallet(wallet: Wallet) {
        const { encryptedDEK, encryptedSecret, iv, authTag } = wallet;

        let decryptResponse;
        try {
            // Decrypt the DEK using Google Cloud KMS
            const [decryptRes] = await client.decrypt({
                name: keyName,
                ciphertext: Buffer.from(encryptedDEK, "base64")
            });
            decryptResponse = decryptRes;
        } catch (error) {
            throw new KmsServiceError("Failed to decrypt DEK", error);
        }

        if (!decryptResponse.plaintext) {
            throw new KmsServiceError("Failed to decrypt DEK");
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
    }
}
