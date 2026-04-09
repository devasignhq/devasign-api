import swSdk from "@stellar/typescript-wallet-sdk";
const {
    ApplicationConfiguration,
    DefaultSigner,
    Wallet,
    StellarConfiguration,
    IssuedAssetId,
    NativeAssetId
} = swSdk;
import axios from "axios";

const customClient = axios.create({
    timeout: 20000
});
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const appConfig = new ApplicationConfiguration(DefaultSigner, customClient as any);

export const wallet = new Wallet({
    stellarConfiguration: process.env.STELLAR_NETWORK === "public" 
        ? StellarConfiguration.MainNet() 
        : StellarConfiguration.TestNet(),
    applicationConfiguration: appConfig
});

export const stellar = wallet.stellar();
export const account = stellar.account();
export const anchor = wallet.anchor({ 
    homeDomain: process.env.STELLAR_NETWORK === "public" 
        ? "anchor.stellar.org" 
        : "testanchor.stellar.org" 
});

export const xlmAssetId = new NativeAssetId();
export const usdcAssetId = new IssuedAssetId(
    "USDC",
    process.env.USDC_ASSET_ID!
);
