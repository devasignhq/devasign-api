import { Server, Networks, Keypair, Asset, Operation, TransactionBuilder } from 'stellar-sdk';

export class StellarService {
    private server: Server;
    private networkPassphrase: string;
    
    constructor() {
        this.server = new Server(process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org');
        this.networkPassphrase = process.env.STELLAR_NETWORK === 'public' 
            ? Networks.PUBLIC 
            : Networks.TESTNET;
    }

    async createWallet(): Promise<{ publicKey: string; secretKey: string }> {
        const keypair = Keypair.random();
        return {
            publicKey: keypair.publicKey(),
            secretKey: keypair.secret()
        };
    }

    async fundWallet(destinationKey: string, amount: string) {
        const sourceKeypair = Keypair.fromSecret(process.env.STELLAR_MASTER_KEY!);
        const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());
        
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: "100000", // 0.01 XLM
            networkPassphrase: this.networkPassphrase
        })
            .addOperation(Operation.payment({
                destination: destinationKey,
                asset: Asset.native(),
                amount: amount
            }))
            .setTimeout(30)
            .build();

        transaction.sign(sourceKeypair);
        return this.server.submitTransaction(transaction);
    }

    async transferToEscrow(
        sourceSecret: string, 
        escrowAccount: string, 
        amount: string
    ) {
        const sourceKeypair = Keypair.fromSecret(sourceSecret);
        const sourceAccount = await this.server.loadAccount(sourceKeypair.publicKey());
        
        const transaction = new TransactionBuilder(sourceAccount, {
            fee: "100000",
            networkPassphrase: this.networkPassphrase
        })
            .addOperation(Operation.payment({
                destination: escrowAccount,
                asset: Asset.native(),
                amount: amount
            }))
            .setTimeout(30)
            .build();

        transaction.sign(sourceKeypair);
        return this.server.submitTransaction(transaction);
    }

    async releaseFromEscrow(
        escrowSecret: string,
        destinationKey: string,
        amount: string
    ) {
        const escrowKeypair = Keypair.fromSecret(escrowSecret);
        const escrowAccount = await this.server.loadAccount(escrowKeypair.publicKey());
        
        const transaction = new TransactionBuilder(escrowAccount, {
            fee: "100000",
            networkPassphrase: this.networkPassphrase
        })
            .addOperation(Operation.payment({
                destination: destinationKey,
                asset: Asset.native(),
                amount: amount
            }))
            .setTimeout(30)
            .build();

        transaction.sign(escrowKeypair);
        return this.server.submitTransaction(transaction);
    }

    async getBalance(publicKey: string): Promise<string> {
        const account = await this.server.loadAccount(publicKey);
        const balance = account.balances.find(
            balance => balance.asset_type === 'native'
        );
        return balance?.balance || '0';
    }
}

export const stellarService = new StellarService();