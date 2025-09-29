import { 
    AccountKeypair,
    Keypair,
    StellarAssetId,
    NativeAssetId,
    IssuedAssetId,
    SponsoringBuilder
} from "@stellar/typescript-wallet-sdk";
import { 
    StellarServiceError,
    stellar,
    account,
    usdcAssetId,
    xlmAssetId
} from "../config/stellar.config";
import { HorizonApi } from "../models/horizonapi.model";

// TODO: Go deeper in error handling (ie swapAsset: "No trustline present")
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async submitTransaction(account: AccountKeypair, buildingFunction: (tx: any) => any) {
        await stellar.submitWithFeeIncrease({
            sourceAddress: account,
            timeout: 30,
            baseFeeIncrease: 100,
            buildingFunction
        });
    }

    // Helper method to check if two assets are the same
    private isSameAsset(asset1: StellarAssetId, asset2: StellarAssetId): boolean {
        if (asset1 instanceof NativeAssetId && asset2 instanceof NativeAssetId) {
            return true;
        }
        
        if (asset1 instanceof IssuedAssetId && asset2 instanceof IssuedAssetId) {
            return asset1.code === asset2.code && asset1.issuer === asset2.issuer;
        }
        
        return false;
    }

    async createWallet() {
        try {
            const accountKeyPair = account.createKeypair();
        
            const txBuilder = await stellar.transaction({
                sourceAddress: this.masterAccount
            });
            const txCreateAccount = txBuilder.createAccount(accountKeyPair).build();
            txCreateAccount.sign(this.masterAccount.keypair);
            await stellar.submitTransaction(txCreateAccount);
        
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString("hex")
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Creation failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
            throw new StellarServiceError("Failed to create wallet", error);
        }
    }

    async createWalletViaSponsor(sponsorSecret: string) {
        try {
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = account.createKeypair();

            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sponsorKeyPair)
            });

            const buildingFunction = (bldr: SponsoringBuilder) => bldr.createAccount(accountKeyPair);
            const txCreateAccount = txBuilder
                .sponsoring(new AccountKeypair(sponsorKeyPair), buildingFunction, accountKeyPair)
                .build();

            accountKeyPair.sign(txCreateAccount);
            txCreateAccount.sign(sponsorKeyPair);

            await stellar.submitTransaction(txCreateAccount);
        
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString("hex")
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Creation failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
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
                sourceAddress: new AccountKeypair(sourceKeypair)
            });
            const txAddAssetSupport = assetTxBuilder.addAssetSupport(assetId).build();
            txAddAssetSupport.sign(sourceKeypair);
            await stellar.submitTransaction(txAddAssetSupport);

            return { txHash: txAddAssetSupport.hash().toString("hex") };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Adding trustline failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
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
                sourceAddress: new AccountKeypair(sponsorKeyPair)
            });

            const buildingFunction = (bldr: SponsoringBuilder) => bldr.addAssetSupport(assetId);
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

            return { txHash: txAddAssetSupport.hash().toString("hex") };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Adding trustline failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
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
                sourceAddress: new AccountKeypair(sourceKeypair)
            });

            let transaction;
            
            // If sending the same asset type, use regular payment instead of path payment
            if (this.isSameAsset(sendAssetId, destAssetId)) {
                transaction = txBuilder
                    .transfer(
                        destinationAddress,
                        sendAssetId,
                        amount
                    )
                    .build();
            } else {
                // Use path payment for asset conversion
                transaction = txBuilder
                    .pathPay({
                        destinationAddress,
                        sendAsset: sendAssetId,
                        destAsset: destAssetId,
                        sendAmount: amount
                    })
                    .build();
            }

            transaction.sign(sourceKeypair);
            await stellar.submitTransaction(transaction);

            return { txHash: transaction.hash().toString("hex") };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Transaction failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
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
                sourceAddress: new AccountKeypair(accountKeyPair)
            });
            
            let transaction;
            
            // If sending the same asset type, use regular payment instead of path payment
            if (this.isSameAsset(sendAssetId, destAssetId)) {
                transaction = txBuilder
                    .transfer(
                        destinationAddress,
                        sendAssetId,
                        amount
                    )
                    .build();
            } else {
                // Use path payment for asset conversion
                transaction = txBuilder
                    .pathPay({
                        destinationAddress,
                        sendAsset: sendAssetId,
                        destAsset: destAssetId,
                        sendAmount: amount
                    })
                    .build();
            }

            transaction.sign(accountKeyPair);

            const feeBump = stellar.makeFeeBump({
                feeAddress: new AccountKeypair(sponsorKeyPair),
                transaction
            });

            feeBump.sign(sponsorKeyPair);
            
            await stellar.submitTransaction(feeBump);

            return { 
                txHash: transaction.hash().toString("hex"),
                sponsorTxHash: feeBump.hash().toString("hex")
            };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Transaction failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
            throw new StellarServiceError("Failed to transfer asset", error);
        }
    }

    async swapAsset(
        sourceSecret: string, 
        amount: string,
        fromAssetId: StellarAssetId = xlmAssetId,
        toAssetId: StellarAssetId = usdcAssetId
    ) {
        try {
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
    
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair)
            });
            
            const txSwap = txBuilder.swap(fromAssetId, toAssetId, amount).build();
                
            txSwap.sign(sourceKeypair);
            await stellar.submitTransaction(txSwap);

            return { txHash: txSwap.hash().toString("hex") };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Swap transaction failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
            throw new StellarServiceError("Failed to swap asset", error);
        }
    }

    async getAccountInfo(publicKey: string) {
        try {
            const accountInfo = await account.getInfo({ accountAddress: publicKey });
            return accountInfo;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Get account failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }
            
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }
            
            throw new StellarServiceError("Failed to get account info", error);
        }
    }

    async getTopUpTransactions(publicKey: string) {
        const allPayments = await stellar.server.payments()
            .forAccount(publicKey)
            .order("desc")
            .limit(100)
            .call();

        const incomingFunds = allPayments.records.filter(payment => {
            switch(payment.type as HorizonApi.OperationResponseType) {
            case "payment":
                return (payment as HorizonApi.PaymentOperationResponse).to === publicKey;
                
            case "path_payment_strict_receive":
                return (payment as HorizonApi.PathPaymentOperationResponse).to === publicKey;
                
            default:
                return false;
            }
        });

        return incomingFunds;
    }

    async buildPaymentTransactionStream(publicKey: string) {
        const stream = stellar.server
            .payments()
            .forAccount(publicKey)
            .cursor("now")
            .stream;
        
        return stream;
    }
}

export const stellarService = new StellarService();
