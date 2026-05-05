import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Tests for api/config/stellar.config.ts
 *
 * The stellar config exports top-level constants that are computed once at module
 * load time. To test both mainnet and testnet branches we mock the Env utility
 * and use dynamic imports so we can re-import the module with different env vars.
 */

// We need to mock Env before importing stellar config
vi.mock("../../api/utils/env.js", () => ({
    Env: {
        stellarNetwork: vi.fn(),
        usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
    }
}));

// Also mock the error model (imported transitively via env.ts)
vi.mock("../../api/models/error.model.js", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../api/models/error.model.js")>();
    return actual;
});

import { Env } from "../../api/utils/env.js";

describe("Stellar config", () => {
    describe("isMainnet", () => {
        it("should be true when STELLAR_NETWORK is 'public'", async () => {
            vi.mocked(Env.stellarNetwork).mockReturnValue("public");

            // Dynamically import and reset module to recompute constants
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("public"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.isMainnet).toBe(true);
        });

        it("should be false when STELLAR_NETWORK is 'testnet'", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.isMainnet).toBe(false);
        });

        it("should be false when STELLAR_NETWORK is not set (empty string)", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue(""),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.isMainnet).toBe(false);
        });

        it("should be false when STELLAR_NETWORK is undefined", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue(undefined),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.isMainnet).toBe(false);
        });
    });

    describe("horizonUrl", () => {
        it("should be mainnet horizon URL when isMainnet is true", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("public"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.horizonUrl).toBe("https://horizon.stellar.org");
        });

        it("should be testnet horizon URL when isMainnet is false", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.horizonUrl).toBe("https://horizon-testnet.stellar.org");
        });
    });

    describe("networkPassphrase", () => {
        it("should use PUBLIC network passphrase when isMainnet is true", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("public"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const { Networks } = await import("@stellar/stellar-sdk");
            const config = await import("../../api/config/stellar.config.js");
            expect(config.networkPassphrase).toBe(Networks.PUBLIC);
        });

        it("should use TESTNET network passphrase when isMainnet is false", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const { Networks } = await import("@stellar/stellar-sdk");
            const config = await import("../../api/config/stellar.config.js");
            expect(config.networkPassphrase).toBe(Networks.TESTNET);
        });

        it("public passphrase should differ from testnet passphrase", () => {
            const { Networks } = require("@stellar/stellar-sdk");
            expect(Networks.PUBLIC).not.toBe(Networks.TESTNET);
        });
    });

    describe("anchorHomeDomain", () => {
        it("should be 'anchor.stellar.org' on mainnet", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("public"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.anchorHomeDomain).toBe("anchor.stellar.org");
        });

        it("should be 'testanchor.stellar.org' on testnet", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.anchorHomeDomain).toBe("testanchor.stellar.org");
        });
    });

    describe("xlmAsset", () => {
        it("should be the native XLM asset", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const { Asset } = await import("@stellar/stellar-sdk");
            const config = await import("../../api/config/stellar.config.js");
            expect(config.xlmAsset.isNative()).toBe(true);
            expect(config.xlmAsset).toEqual(Asset.native());
        });

        it("should have XLM code", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.xlmAsset.getCode()).toBe("XLM");
        });
    });

    describe("usdcAsset", () => {
        it("should be a non-native asset with code USDC", async () => {
            const mockIssuer = "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP";
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue(mockIssuer)
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.usdcAsset.isNative()).toBe(false);
            expect(config.usdcAsset.getCode()).toBe("USDC");
        });

        it("should use the USDC_ASSET_ID as issuer", async () => {
            const mockIssuer = "GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP";
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue(mockIssuer)
                }
            }));
            const config = await import("../../api/config/stellar.config.js");
            expect(config.usdcAsset.getIssuer()).toBe(mockIssuer);
        });
    });

    describe("stellarServer", () => {
        it("should be a Horizon.Server instance", async () => {
            vi.resetModules();
            vi.mock("../../api/utils/env.js", () => ({
                Env: {
                    stellarNetwork: vi.fn().mockReturnValue("testnet"),
                    usdcAssetId: vi.fn().mockReturnValue("GDQOE23CFSUMSVQK4Y5JHPPYK73VYCNHZHA7ENKCV37P6SUEO6XQBKPP")
                }
            }));
            const { Horizon } = await import("@stellar/stellar-sdk");
            const config = await import("../../api/config/stellar.config.js");
            expect(config.stellarServer).toBeInstanceOf(Horizon.Server);
        });
    });
});
