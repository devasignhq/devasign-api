import { Horizon, Asset, Networks } from "@stellar/stellar-sdk";

export const isMainnet = process.env.STELLAR_NETWORK === "public";

export const horizonUrl = isMainnet
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

export const networkPassphrase = isMainnet 
    ? Networks.PUBLIC 
    : Networks.TESTNET;

export const stellarServer = new Horizon.Server(horizonUrl);

export const anchorHomeDomain = isMainnet 
    ? "anchor.stellar.org" 
    : "testanchor.stellar.org";

export const xlmAsset = Asset.native();
export const usdcAsset = new Asset(
    "USDC",
    process.env.USDC_ASSET_ID!
);
