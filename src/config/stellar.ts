import { 
    ApplicationConfiguration, 
    DefaultSigner, 
    Wallet, 
    StellarConfiguration, 
    AccountKeypair,
    Keypair,
    IssuedAssetId,
    NativeAssetId,
    StellarAssetId,
} from '@stellar/typescript-wallet-sdk';
import axios, { AxiosInstance } from 'axios';

const customClient: AxiosInstance = axios.create({
    timeout: 20000,
});
const appConfig = new ApplicationConfiguration(DefaultSigner, customClient);

export const wallet = new Wallet({
    stellarConfiguration: StellarConfiguration.TestNet(),
    applicationConfiguration: appConfig,
});

export const stellar = wallet.stellar();
export const account = stellar.account();
export const anchor = wallet.anchor({ homeDomain: "testanchor.stellar.org" });

export const xlmAssetId = new NativeAssetId();
export const usdcAssetId = new IssuedAssetId(
    "USDC",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

export class StellarServiceError extends Error {
    constructor(message: string, public readonly details?: any) {
        super(message);
        this.details = details;
        this.name = "StellarServiceError";
    }
}

export class StellarService {
    private masterAccount: AccountKeypair;
    
    constructor() {
        if (!process.env.STELLAR_MASTER_SECRET_KEY || !process.env.STELLAR_MASTER_PUBLIC_KEY) {
            throw new StellarServiceError("Missing Stellar master account credentials in environment variables");
        }
    
        try {
            const keypair = Keypair.fromSecret(process.env.STELLAR_MASTER_SECRET_KEY);
            this.masterAccount = new AccountKeypair(keypair);
        } catch (error) {
            throw new StellarServiceError("Invalid Stellar master account credentials", error);
        }
    }

    // TODO: Refactor this. It's currently giving errors.
    async submitTransaction(account: AccountKeypair, transaction: any) {
        await stellar.submitWithFeeIncrease({
            sourceAddress: account,
            timeout: 30,
            baseFeeIncrease: 100,
            buildingFunction: () => transaction,
        });
    }

    async createWallet(): Promise<{ publicKey: string; secretKey: string }> {
        try {
            const accountKeyPair = account.createKeypair();
        
            const txBuilder = await stellar.transaction({
                sourceAddress: this.masterAccount,
            });
            const txCreateAccount = txBuilder.createAccount(accountKeyPair).build();
            txCreateAccount.sign(this.masterAccount.keypair);
            await stellar.submitTransaction(txCreateAccount);
        
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey
            };
        } catch (error) {
            throw new StellarServiceError("Failed to create wallet", error);
        }
    }

    async fundWallet(accountPublicKey: string) {
        try {
            await stellar.fundTestnetAccount(accountPublicKey);
            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to fund wallet", error);
        }
    }

    async addTrustLine(sourceSecretKey: string) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
    
            const assetTxBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            const txAddAssetSupport = assetTxBuilder.addAssetSupport(usdcAssetId).build();
            txAddAssetSupport.sign(sourceKeypair);
            await stellar.submitTransaction(txAddAssetSupport);

            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to add trustline", error);
        }
    }

    async transferAsset(
        sourceSecretKey: string, 
        destinationPublicKey: string, 
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string
    ) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
    
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            
            const txPathPay = txBuilder
                .pathPay({
                    destinationAddress: destinationPublicKey,
                    sendAsset: sendAssetId,
                    destAsset: destAssetId,
                    sendAmount: amount,
                })
                .build();
                
            txPathPay.sign(sourceKeypair);
            await stellar.submitTransaction(txPathPay);

            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to transfer asset", error);
        }
    }

    async swapAsset(
        sourceSecretKey: string, 
        amount: string,
        fromAssetId: StellarAssetId = xlmAssetId,
        toAssetId: StellarAssetId = usdcAssetId,
    ) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
    
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            
            const txSwap = txBuilder.swap(fromAssetId, toAssetId, amount).build();
                
            txSwap.sign(sourceKeypair);
            await stellar.submitTransaction(txSwap);

            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to swap asset", error);
        }
    }

    async getAccountInfo(publicKey: string) {
        try {
            const accountInfo = await account.getInfo({ accountAddress: publicKey });
            return accountInfo;
        } catch (error) {
            throw new StellarServiceError("Failed to get account info", error);
        }
    }
}

export const stellarService = new StellarService();