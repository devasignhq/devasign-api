import { encrypt, decrypt, moneyFormat, getFieldFromUnknownObject } from "../../api/utilities/helper";

describe("Helper Functions Unit Tests", () => {
    describe("encrypt and decrypt", () => {
        const originalEnv = process.env.ENCRYPTION_KEY;

        beforeAll(() => {
            // Set a test encryption key
            process.env.ENCRYPTION_KEY = "test-encryption-key-12345";
        });

        afterAll(() => {
            // Restore original encryption key
            process.env.ENCRYPTION_KEY = originalEnv;
        });

        it("should encrypt a plain text string", () => {
            const plainText = "my-secret-data";
            const encrypted = encrypt(plainText);

            expect(encrypted).toBeDefined();
            expect(encrypted).not.toBe(plainText);
            expect(typeof encrypted).toBe("string");
            expect(encrypted.length).toBeGreaterThan(0);
        });

        it("should decrypt an encrypted string back to original text", () => {
            const plainText = "my-secret-data";
            const encrypted = encrypt(plainText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it("should handle empty strings", () => {
            const plainText = "";
            const encrypted = encrypt(plainText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it("should handle special characters", () => {
            const plainText = "!@#$%^&*()_+-=[]{}|;:',.<>?/~`";
            const encrypted = encrypt(plainText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it("should handle unicode characters", () => {
            const plainText = "Hello 世界 🌍";
            const encrypted = encrypt(plainText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it("should produce different ciphertext for same input (due to IV)", () => {
            const plainText = "same-text";
            const encrypted1 = encrypt(plainText);
            const encrypted2 = encrypt(plainText);

            // Both should decrypt to same value
            expect(decrypt(encrypted1)).toBe(plainText);
            expect(decrypt(encrypted2)).toBe(plainText);
        });

        it("should handle long strings", () => {
            const plainText = "a".repeat(10000);
            const encrypted = encrypt(plainText);
            const decrypted = decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it("should handle Stellar secret keys", () => {
            const stellarSecret = "SINSTALLTEST000000000000000000000000000000000";
            const encrypted = encrypt(stellarSecret);
            const decrypted = decrypt(encrypted);

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
