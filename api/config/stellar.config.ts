import { 
    ApplicationConfiguration, 
    DefaultSigner, 
    Wallet, 
    StellarConfiguration,
    IssuedAssetId,
    NativeAssetId
} from "@stellar/typescript-wallet-sdk";
import axios, { AxiosInstance } from "axios";

const customClient: AxiosInstance = axios.create({
    timeout: 20000
});
const appConfig = new ApplicationConfiguration(DefaultSigner, customClient);

export const wallet = new Wallet({
    stellarConfiguration: StellarConfiguration.TestNet(),
    applicationConfiguration: appConfig
});

export const stellar = wallet.stellar();
export const account = stellar.account();
export const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });

export const xlmAssetId = new NativeAssetId();
export const usdcAssetId = new IssuedAssetId(
    "USDC",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"
);
