import { 
    ApplicationConfiguration, 
    DefaultSigner, 
    Wallet, 
    StellarConfiguration, 
    AccountKeypair,
    Keypair,
    IssuedAssetId,
    NativeAssetId
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

const usdcAsset = new IssuedAssetId(
    "USDC",
    "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

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

    async createWallet(): Promise<{ publicKey: string; secretKey: string }> {
        const accountKeyPair = account.createKeypair();

        const txBuilder = await stellar.transaction({
            sourceAddress: this.masterAccount,
        });

        const txCreateAccount = txBuilder.createAccount(accountKeyPair).build();
        const txAddAssetSupport = txBuilder.addAssetSupport(usdcAsset).build();

        return {
            publicKey: accountKeyPair.publicKey,
            secretKey: accountKeyPair.secretKey
        };
    }

    async fundWallet(accountPublicKey: string, amount: string) {
        await stellar.fundTestnetAccount(accountPublicKey);
    }

    async transferUSDC(
        sourceSecretKey: string, 
        destinationPublicKey: string, 
        amount: string
    ) {
        const sourceKeypair = Keypair.fromSecret(sourceSecretKey);

        const txBuilder = await stellar.transaction({
            sourceAddress: new AccountKeypair(sourceKeypair),
        });
        
        const txn = txBuilder
            .pathPay({
                destinationAddress: destinationPublicKey,
                sendAsset: usdcAsset,
                destAsset: usdcAsset,
                sendAmount: amount,
            })
            .build();
    
        // return this.server.submitTransaction(transaction);
    }

    async transferXLM(
        sourceSecretKey: string, 
        destinationPublicKey: string, 
        amount: string
    ) {
        const sourceKeypair = Keypair.fromSecret(sourceSecretKey);

        const txBuilder = await stellar.transaction({
            sourceAddress: new AccountKeypair(sourceKeypair),
        });
        
        const txn = txBuilder
            .pathPay({
                destinationAddress: destinationPublicKey,
                sendAsset: new NativeAssetId(),
                destAsset: usdcAsset,
                sendAmount: amount,
            })
            .build();
    
        // return this.server.submitTransaction(transaction);
    }

    async swapXLMToUSDC(sourceSecretKey: string, amount: string) {
        const sourceKeypair = Keypair.fromSecret(sourceSecretKey);

        const txBuilder = await stellar.transaction({
            sourceAddress: new AccountKeypair(sourceKeypair),
        });
        
        const txn = txBuilder.swap(new NativeAssetId(), usdcAsset, amount).build();

        // return this.server.submitTransaction(transaction);
    }

    async getBalance(publicKey: string): Promise<string> {
        return '0';
    }
}

export const stellarService = new StellarService();