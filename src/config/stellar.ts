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
    TransactionBuilder
} from '@stellar/typescript-wallet-sdk';
import axios, { AxiosInstance } from 'axios';

const customClient: AxiosInstance = axios.create({
    timeout: 2000,
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
    constructor(message: string, public readonly cause?: Error) {
        super(message);
        this.name = 'StellarServiceError';
    }
}

export class StellarService {
    private masterAccount: AccountKeypair;
    
    constructor() {
        if (!process.env.STELLAR_MASTER_SECRET_KEY || !process.env.STELLAR_MASTER_PUBLIC_KEY) {
            throw new StellarServiceError('Missing Stellar master account credentials in environment variables');
        }
    
        try {
            const keypair = Keypair.fromSecret(process.env.STELLAR_MASTER_SECRET_KEY);
            this.masterAccount = new AccountKeypair(keypair);
        } catch (error) {
            throw new StellarServiceError('Invalid Stellar master account credentials', error as Error);
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
            console.log(error)
            throw new Error(error as any);
        }
    }

    async fundWallet(accountPublicKey: string) {
        try {
            await stellar.fundTestnetAccount(accountPublicKey);
        } catch (error) {
            console.log(error)
            // throw new Error(error as any);
            return error as any;
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
        } catch (error) {
            console.log(error)
            // throw new Error(error as any);
            return error as any;
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
            throw new StellarServiceError(
                'Failed to transfer asset', 
                error instanceof Error ? error : undefined
            );
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
            throw new StellarServiceError(
                'Failed to swap asset', 
                error instanceof Error ? error : undefined
            );
        }
    }

    async getAccountInfo(publicKey: string) {
        try {
            const accountInfo = await account.getInfo({ accountAddress: publicKey });
            console.log(
                accountInfo.balances[0].asset_type + " = " +
                accountInfo.balances[0].balance
            )
            return accountInfo;
        } catch (error) {
            throw new StellarServiceError(
                'Failed to get account info', 
                error instanceof Error ? error : undefined
            );
        }
    }
}

export const stellarService = new StellarService();