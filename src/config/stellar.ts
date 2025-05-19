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
import { ErrorClass } from '../types/general';

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

export class StellarServiceError extends ErrorClass {
    constructor(message: string, details?: any) {
        super("StellarServiceError", details, message);
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
    async submitTransaction(account: AccountKeypair, buildingFunction: (tx: any) => any) {
        await stellar.submitWithFeeIncrease({
            sourceAddress: account,
            timeout: 30,
            baseFeeIncrease: 100,
            buildingFunction,
        });
    }

    async createWallet() {
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
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString('hex')
            };
        } catch (error) {
            throw new StellarServiceError("Failed to create wallet", error);
        }
    }

    async createWalletViaSponsor(sponsorSecret: string) {
        try {
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = account.createKeypair();

            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sponsorKeyPair),
            });

            const buildingFunction = (bldr: any) => bldr.createAccount(accountKeyPair);
            const txCreateAccount = txBuilder
                .sponsoring(new AccountKeypair(sponsorKeyPair), buildingFunction, accountKeyPair)
                .build();

            accountKeyPair.sign(txCreateAccount);
            txCreateAccount.sign(sponsorKeyPair);

            await stellar.submitTransaction(txCreateAccount);
        
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString('hex')
            };
        } catch (error) {
            throw new StellarServiceError("Failed to create wallet", error);
        }
    }

    async fundWallet(accountAddress: string) {
        try {
            await stellar.fundTestnetAccount(accountAddress);
            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to fund wallet", error);
        }
    }

    async addTrustLine(sourceSecret: string, assetId: StellarAssetId = usdcAssetId) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
    
            const assetTxBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            const txAddAssetSupport = assetTxBuilder.addAssetSupport(assetId).build();
            txAddAssetSupport.sign(sourceKeypair);
            await stellar.submitTransaction(txAddAssetSupport);

            return { txHash: txAddAssetSupport.hash().toString('hex') };
        } catch (error) {
            throw new StellarServiceError("Failed to add trustline", error);
        }
    }

    async addTrustLineViaSponsor(
        sponsorSecret: string, 
        accountSecret: string, 
        assetId: StellarAssetId = usdcAssetId
    ) {
        try {
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sponsorKeyPair),
            });

            const buildingFunction = (bldr: any) => bldr.addAssetSupport(assetId);
            const txAddAssetSupport = txBuilder
                .sponsoring(
                    new AccountKeypair(sponsorKeyPair), 
                    buildingFunction, 
                    new AccountKeypair(accountKeyPair)
                )
                .build();

            txAddAssetSupport.sign(accountKeyPair);
            txAddAssetSupport.sign(sponsorKeyPair);
            
            await stellar.submitTransaction(txAddAssetSupport);

            return { txHash: txAddAssetSupport.hash().toString('hex') };
        } catch (error) {
            throw new StellarServiceError("Failed to add trustline", error);
        }
    }

    async transferAsset(
        sourceSecret: string, 
        destinationAddress: string, 
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string
    ) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
    
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            
            const txPathPay = txBuilder
                .pathPay({
                    destinationAddress: destinationAddress,
                    sendAsset: sendAssetId,
                    destAsset: destAssetId,
                    sendAmount: amount,
                })
                .build();
                
            txPathPay.sign(sourceKeypair);
            await stellar.submitTransaction(txPathPay);

            return { txHash: txPathPay.hash().toString('hex') };
        } catch (error) {
            throw new StellarServiceError("Failed to transfer asset", error);
        }
    }

    async transferAssetViaSponsor(
        sponsorSecret: string, 
        accountSecret: string, 
        destinationAddress: string, 
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string
    ) {
        try {
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(accountKeyPair),
            });
            
            const txPathPay = txBuilder
                .pathPay({
                    destinationAddress: destinationAddress,
                    sendAsset: sendAssetId,
                    destAsset: destAssetId,
                    sendAmount: amount,
                })
                .build();

            txPathPay.sign(accountKeyPair);

            const feeBump = stellar.makeFeeBump({
                feeAddress: new AccountKeypair(sponsorKeyPair),
                transaction: txPathPay,
            });

            feeBump.sign(sponsorKeyPair);
            
            await stellar.submitTransaction(feeBump);

            return { 
                txHash: txPathPay.hash().toString('hex'),
                sponsorTxHash: feeBump.hash().toString('hex'),
            };
        } catch (error) {
            throw new StellarServiceError("Failed to add trustline", error);
        }
    }

    async swapAsset(
        sourceSecret: string, 
        amount: string,
        fromAssetId: StellarAssetId = xlmAssetId,
        toAssetId: StellarAssetId = usdcAssetId,
    ) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
    
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair),
            });
            
            const txSwap = txBuilder.swap(fromAssetId, toAssetId, amount).build();
                
            txSwap.sign(sourceKeypair);
            await stellar.submitTransaction(txSwap);

            return { txHash: txSwap.hash().toString('hex') };
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

    async buildPaymentTransactionStream(publicKey: string) {
        const stream = stellar.server
            .payments()
            .forAccount(publicKey)
            .cursor("now")
            .stream
        
        return stream
    }
}

export const stellarService = new StellarService();