import { encryptWallet, decryptWallet, moneyFormat, getFieldFromUnknownObject } from "../../api/utilities/helper";
import { Wallet } from "../../prisma_client";

// Mock Google Cloud KMS
jest.mock("@google-cloud/kms", () => {
    return {
        KeyManagementServiceClient: jest.fn().mockImplementation(() => {
            return {
                cryptoKeyPath: jest.fn().mockReturnValue("projects/test/locations/test/keyRings/test/cryptoKeys/test"),
                encrypt: jest.fn().mockImplementation(async ({ plaintext }) => {
                    // Simulate KMS encryption by base64 encoding the plaintext
                    return [{ ciphertext: Buffer.from(plaintext).toString("base64") }];
                }),
                decrypt: jest.fn().mockImplementation(async ({ ciphertext }) => {
                    // Simulate KMS decryption by base64 decoding the ciphertext
                    return [{ plaintext: Buffer.from(ciphertext, "base64") }];
                })
            };
        })
    };
});

describe("Helper Functions Unit Tests", () => {
    describe("encryptWallet and decryptWallet", () => {
        const originalEnv = {
            GCP_PROJECT_ID: process.env.GCP_PROJECT_ID,
            GCP_LOCATION_ID: process.env.GCP_LOCATION_ID,
            GCP_KEY_RING_ID: process.env.GCP_KEY_RING_ID,
            GCP_KEY_ID: process.env.GCP_KEY_ID
        };

        beforeAll(() => {
            // Set test GCP environment variables
            process.env.GCP_PROJECT_ID = "test-project";
            process.env.GCP_LOCATION_ID = "test-location";
            process.env.GCP_KEY_RING_ID = "test-keyring";
            process.env.GCP_KEY_ID = "test-key";
        });

        afterAll(() => {
            // Restore original environment variables
            process.env.GCP_PROJECT_ID = originalEnv.GCP_PROJECT_ID;
            process.env.GCP_LOCATION_ID = originalEnv.GCP_LOCATION_ID;
            process.env.GCP_KEY_RING_ID = originalEnv.GCP_KEY_RING_ID;
            process.env.GCP_KEY_ID = originalEnv.GCP_KEY_ID;
        });

        it("should encrypt a Stellar wallet secret", async () => {
            const stellarSecret = "STEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123";
            const result = await encryptWallet(stellarSecret);

            expect(result).toBeDefined();
            expect(result.encryptedDEK).toBeDefined();
            expect(result.encryptedSecret).toBeDefined();
            expect(result.iv).toBeDefined();
            expect(result.authTag).toBeDefined();
            expect(typeof result.encryptedDEK).toBe("string");
            expect(typeof result.encryptedSecret).toBe("string");
            expect(typeof result.iv).toBe("string");
            expect(typeof result.authTag).toBe("string");
        });

        it("should decrypt an encrypted wallet back to original secret", async () => {
            const stellarSecret = "STEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123";
            const encrypted = await encryptWallet(stellarSecret);

            // Create a wallet object with a mock address
            const wallet: Wallet = {
                address: "GTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123",
                encryptedDEK: encrypted.encryptedDEK,
                encryptedSecret: encrypted.encryptedSecret,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                userId: null
            };

            const decrypted = await decryptWallet(wallet);
            expect(decrypted).toBe(stellarSecret);
        });

        it("should produce different encrypted outputs for same input (due to random IV and DEK)", async () => {
            const stellarSecret = "STEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123";
            const encrypted1 = await encryptWallet(stellarSecret);
            const encrypted2 = await encryptWallet(stellarSecret);

            // The encrypted values should be different
            expect(encrypted1.encryptedSecret).not.toBe(encrypted2.encryptedSecret);
            expect(encrypted1.iv).not.toBe(encrypted2.iv);
            expect(encrypted1.authTag).not.toBe(encrypted2.authTag);

            // But both should decrypt to the same value
            const wallet1: Wallet = {
                address: "GTEST1",
                encryptedDEK: encrypted1.encryptedDEK,
                encryptedSecret: encrypted1.encryptedSecret,
                iv: encrypted1.iv,
                authTag: encrypted1.authTag,
                userId: null
            };

            const wallet2: Wallet = {
                address: "GTEST2",
                encryptedDEK: encrypted2.encryptedDEK,
                encryptedSecret: encrypted2.encryptedSecret,
                iv: encrypted2.iv,
                authTag: encrypted2.authTag,
                userId: null
            };

            const decrypted1 = await decryptWallet(wallet1);
            const decrypted2 = await decryptWallet(wallet2);

            expect(decrypted1).toBe(stellarSecret);
            expect(decrypted2).toBe(stellarSecret);
        });

        it("should handle different Stellar secret formats", async () => {
            const secrets = [
                "SAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
                "SBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB",
                "SCZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ"
            ];

            for (const secret of secrets) {
                const encrypted = await encryptWallet(secret);
                const wallet: Wallet = {
                    address: `G${secret.substring(1)}`,
                    encryptedDEK: encrypted.encryptedDEK,
                    encryptedSecret: encrypted.encryptedSecret,
                    iv: encrypted.iv,
                    authTag: encrypted.authTag,
                    userId: null
                };
                const decrypted = await decryptWallet(wallet);
                expect(decrypted).toBe(secret);
            }
        });

        it("should handle special characters in secrets", async () => {
            const stellarSecret = "S!@#$%^&*()_+-=[]{}|;:',.<>?/~`ABCDEFGHIJKLMNOP";
            const encrypted = await encryptWallet(stellarSecret);
            const wallet: Wallet = {
                address: "GTEST",
                encryptedDEK: encrypted.encryptedDEK,
                encryptedSecret: encrypted.encryptedSecret,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                userId: null
            };
            const decrypted = await decryptWallet(wallet);
            expect(decrypted).toBe(stellarSecret);
        });

        it("should return all required encryption components", async () => {
            const stellarSecret = "STEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ123";
            const result = await encryptWallet(stellarSecret);

            // Verify all components are present and non-empty
            expect(result.encryptedDEK.length).toBeGreaterThan(0);
            expect(result.encryptedSecret.length).toBeGreaterThan(0);
            expect(result.iv.length).toBeGreaterThan(0);
            expect(result.authTag.length).toBeGreaterThan(0);

            // Verify IV is 24 characters (12 bytes in hex)
            expect(result.iv.length).toBe(24);

            // Verify authTag is 32 characters (16 bytes in hex)
            expect(result.authTag.length).toBe(32);
        });

        it("should handle empty string secret", async () => {
            const stellarSecret = "";
            const encrypted = await encryptWallet(stellarSecret);
            const wallet: Wallet = {
                address: "GTEST",
                encryptedDEK: encrypted.encryptedDEK,
                encryptedSecret: encrypted.encryptedSecret,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                userId: null
            };
            const decrypted = await decryptWallet(wallet);
            expect(decrypted).toBe(stellarSecret);
        });

        it("should handle unicode characters in secrets", async () => {
            const stellarSecret = "STEST世界🌍ABCDEFGHIJKLMNOPQRSTUVWXYZ123456";
            const encrypted = await encryptWallet(stellarSecret);
            const wallet: Wallet = {
                address: "GTEST",
                encryptedDEK: encrypted.encryptedDEK,
                encryptedSecret: encrypted.encryptedSecret,
                iv: encrypted.iv,
                authTag: encrypted.authTag,
                userId: null
            };
            const decrypted = await decryptWallet(wallet);
            expect(decrypted).toBe(stellarSecret);
        });
    });

    describe("moneyFormat", () => {
        it("should format number with default locale (en-US) and 2 decimals", () => {
            const result = moneyFormat(1234.56);
            expect(result).toBe("1,234.56");
        });

        it("should format number with German locale", () => {
            const result = moneyFormat(1234.56, "de-DE");
            expect(result).toBe("1.234,56");
        });

        it("should format number with custom decimal places", () => {
            const result = moneyFormat(1234.56, "en-US", 3);
            expect(result).toBe("1,234.560");
        });

        it("should format number without decimals when noDecimals is true", () => {
            const result = moneyFormat(1234.56, "en-US", 2, true);
            expect(result).toBe("1,235");
        });

        it("should handle string input", () => {
            const result = moneyFormat("1234.56");
            expect(result).toBe("1,234.56");
        });

        it("should handle bigint input", () => {
            const result = moneyFormat(BigInt(1234));
            expect(result).toBe("1,234.00");
        });

        it("should handle zero value", () => {
            const result = moneyFormat(0);
            expect(result).toBe("0.00");
        });

        it("should return '--' for null value", () => {
            const result = moneyFormat(null as any);
            expect(result).toBe("--");
        });

        it("should return '--' for undefined value", () => {
            const result = moneyFormat(undefined as any);
            expect(result).toBe("--");
        });

        it("should handle negative numbers", () => {
            const result = moneyFormat(-1234.56);
            expect(result).toBe("-1,234.56");
        });

        it("should handle very large numbers", () => {
            const result = moneyFormat(1234567890.12);
            expect(result).toBe("1,234,567,890.12");
        });

        it("should handle very small numbers", () => {
            const result = moneyFormat(0.01);
            expect(result).toBe("0.01");
        });

        it("should handle numbers with more decimals than specified", () => {
            const result = moneyFormat(1234.56789, "en-US", 2);
            expect(result).toBe("1,234.57");
        });

        it("should handle array of locales", () => {
            const result = moneyFormat(1234.56, ["en-US", "en-GB"]);
            expect(result).toBe("1,234.56");
        });

        it("should fallback to en-US for invalid locale", () => {
            const result = moneyFormat(1234.56, "invalid-locale");
            expect(result).toBe("1,234.56");
        });

        it("should handle French locale", () => {
            const result = moneyFormat(1234.56, "fr-FR");
            // French uses non-breaking space as thousands separator
            expect(result).toMatch(/1[\s\u00A0]234,56/);
        });

        it("should handle Japanese locale", () => {
            const result = moneyFormat(1234.56, "ja-JP");
            expect(result).toBe("1,234.56");
        });

        it("should format with 0 decimal places when specified", () => {
            const result = moneyFormat(1234.56, "en-US", 0);
            expect(result).toBe("1,235");
        });

        it("should format with 4 decimal places", () => {
            const result = moneyFormat(1234.5678, "en-US", 4);
            expect(result).toBe("1,234.5678");
        });

        it("should handle string with decimal", () => {
            const result = moneyFormat("9999.99");
            expect(result).toBe("9,999.99");
        });

        it("should handle noDecimals with rounding", () => {
            const result = moneyFormat(1234.89, "en-US", 2, true);
            expect(result).toBe("1,235");
        });
    });

    describe("getFieldFromUnknownObject", () => {
        it("should extract string field from object", () => {
            const obj: unknown = { name: "Alice", age: 30 };
            const result = getFieldFromUnknownObject<string>(obj, "name");
            expect(result).toBe("Alice");
        });

        it("should extract number field from object", () => {
            const obj: unknown = { name: "Alice", age: 30 };
            const result = getFieldFromUnknownObject<number>(obj, "age");
            expect(result).toBe(30);
        });

        it("should return undefined for non-existent field", () => {
            const obj: unknown = { name: "Alice", age: 30 };
            const result = getFieldFromUnknownObject<string>(obj, "email");
            expect(result).toBeUndefined();
        });

        it("should return undefined for null input", () => {
            const result = getFieldFromUnknownObject<string>(null, "name");
            expect(result).toBeUndefined();
        });

        it("should return undefined for undefined input", () => {
            const result = getFieldFromUnknownObject<string>(undefined, "name");
            expect(result).toBeUndefined();
        });

        it("should return undefined for primitive string input", () => {
            const result = getFieldFromUnknownObject<string>("not an object", "name");
            expect(result).toBeUndefined();
        });

        it("should return undefined for primitive number input", () => {
            const result = getFieldFromUnknownObject<string>(123, "name");
            expect(result).toBeUndefined();
        });

        it("should return undefined for primitive boolean input", () => {
            const result = getFieldFromUnknownObject<string>(true, "name");
            expect(result).toBeUndefined();
        });

        it("should extract nested object field", () => {
            const obj: unknown = { user: { name: "Alice", age: 30 } };
            const result = getFieldFromUnknownObject<{ name: string; age: number }>(obj, "user");
            expect(result).toEqual({ name: "Alice", age: 30 });
        });

        it("should extract array field", () => {
            const obj: unknown = { items: [1, 2, 3] };
            const result = getFieldFromUnknownObject<number[]>(obj, "items");
            expect(result).toEqual([1, 2, 3]);
        });

        it("should extract boolean field", () => {
            const obj: unknown = { isActive: true };
            const result = getFieldFromUnknownObject<boolean>(obj, "isActive");
            expect(result).toBe(true);
        });

        it("should extract null field value", () => {
            const obj: unknown = { value: null };
            const result = getFieldFromUnknownObject<null>(obj, "value");
            expect(result).toBeNull();
        });

        it("should handle empty object", () => {
            const obj: unknown = {};
            const result = getFieldFromUnknownObject<string>(obj, "name");
            expect(result).toBeUndefined();
        });

        it("should handle object with symbol keys", () => {
            const sym = Symbol("test");
            const obj: unknown = { [sym]: "value", name: "Alice" };
            const result = getFieldFromUnknownObject<string>(obj, "name");
            expect(result).toBe("Alice");
        });

        it("should extract field with special characters in name", () => {
            const obj: unknown = { "field-name": "value" };
            const result = getFieldFromUnknownObject<string>(obj, "field-name");
            expect(result).toBe("value");
        });

        it("should handle array as input", () => {
            const arr: unknown = ["a", "b", "c"];
            const result = getFieldFromUnknownObject<string>(arr, "0");
            expect(result).toBe("a");
        });

        it("should extract undefined field value", () => {
            const obj: unknown = { value: undefined };
            const result = getFieldFromUnknownObject<undefined>(obj, "value");
            expect(result).toBeUndefined();
        });
    });
});
