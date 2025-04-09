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
        const keypair = new Keypair({
            type: "ed25519",
            secretKey: process.env.STELLAR_MASTER_SECRET_KEY as string,
            publicKey: process.env.STELLAR_MASTER_PUBLIC_KEY as string,
        });

        this.masterAccount = new AccountKeypair(keypair);
    }

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
        
            // Create account transaction
            const txBuilder = await stellar.transaction({
                sourceAddress: this.masterAccount,
            });
            const txCreateAccount = txBuilder.createAccount(accountKeyPair).build();
            txCreateAccount.sign(this.masterAccount.keypair);
            await this.submitTransaction(this.masterAccount, txCreateAccount);
            // await stellar.submitTransaction(txCreateAccount);
        
            // Add asset support transaction
            const assetTxBuilder = await stellar.transaction({
                sourceAddress: accountKeyPair,
            });
            const txAddAssetSupport = assetTxBuilder.addAssetSupport(usdcAssetId).build();
            txAddAssetSupport.sign(accountKeyPair.keypair);
            await this.submitTransaction(accountKeyPair, txAddAssetSupport);
            // await stellar.submitTransaction(txAddAssetSupport);
        
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey
            };
        } catch (error) {
            throw new StellarServiceError(
                'Failed to create wallet', 
                error instanceof Error ? error : undefined
            );
        }
    }

    async fundWallet(accountPublicKey: string) {
        await stellar.fundTestnetAccount(accountPublicKey);
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
            await this.submitTransaction(new AccountKeypair(sourceKeypair), txPathPay);
            // await stellar.submitTransaction(txPathPay);

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
            await this.submitTransaction(new AccountKeypair(sourceKeypair), txSwap);
            // await stellar.submitTransaction(txSwap);

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