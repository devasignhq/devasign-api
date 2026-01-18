import {
    AccountKeypair,
    Keypair,
    StellarAssetId,
    NativeAssetId,
    IssuedAssetId,
    SponsoringBuilder
} from "@stellar/typescript-wallet-sdk";
import {
    stellar,
    account,
    usdcAssetId,
    xlmAssetId
} from "../config/stellar.config";
import { Memo } from "@stellar/stellar-sdk";
import { HorizonApi } from "../models/horizonapi.model";
import { StellarServiceError } from "../models/error.model";

/**
 * Service for managing Stellar blockchain operations.
 * Handles wallet creation, asset transfers, trustlines, and account management on the Stellar network.
 * Supports both standard and sponsored transactions for fee-less operations.
 * 
 * TODO: Implement deeper error handling (e.g., swapAsset: "No trustline present")
 */
export class StellarService {
    private masterAccount: AccountKeypair;

    /**
     * Initialize the Stellar service with the master account credentials.
     * The master account is used to sponsor account creation and fund operations.
     */
    constructor() {
        // Verify required environment variables are present
        if (!process.env.STELLAR_MASTER_SECRET_KEY || !process.env.STELLAR_MASTER_PUBLIC_KEY) {
            throw new StellarServiceError("Missing Stellar master account credentials in environment variables");
        }

        try {
            // Create keypair from the master secret key
            const keypair = Keypair.fromSecret(process.env.STELLAR_MASTER_SECRET_KEY);
            this.masterAccount = new AccountKeypair(keypair);
        } catch (error) {
            throw new StellarServiceError("Invalid Stellar master account credentials", error);
        }
    }

    /**
     * Helper method to check if two Stellar assets are identical.
     * Compares both native (XLM) and issued assets (like USDC).
     */
    private isSameAsset(asset1: StellarAssetId, asset2: StellarAssetId): boolean {
        // Both assets are native XLM
        if (asset1 instanceof NativeAssetId && asset2 instanceof NativeAssetId) {
            return true;
        }

        // Both assets are issued assets - compare code and issuer
        if (asset1 instanceof IssuedAssetId && asset2 instanceof IssuedAssetId) {
            return asset1.code === asset2.code && asset1.issuer === asset2.issuer;
        }

        // Assets are of different types
        return false;
    }

    /**
     * Create a new Stellar wallet funded by the master account.
     * The master account pays for the account creation and initial funding.
     */
    async createWallet() {
        try {
            // Generate a new random keypair for the wallet
            const accountKeyPair = account.createKeypair();

            // Build the account creation transaction
            const txBuilder = await stellar.transaction({
                sourceAddress: this.masterAccount
            });
            const txCreateAccount = txBuilder.createAccount(accountKeyPair).build();

            // Sign the transaction with the master account
            txCreateAccount.sign(this.masterAccount.keypair);

            // Submit the transaction to the network
            await stellar.submitTransaction(txCreateAccount);

            // Return the new wallet credentials and transaction hash
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString("hex")
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // Handle specific error responses from Horizon
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Creation failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData
                    );
                }
            }

            // Handle general errors
            if (error.message) {
                throw new StellarServiceError(error.message, error);
            }

            throw new StellarServiceError("Failed to create wallet", error);
        }
    }

    /**
     * Create a new Stellar wallet with sponsored reserves.
     * The sponsor account pays for the account creation, allowing fee-less wallet creation.
     */
    async createWalletViaSponsor(sponsorSecret: string) {
        try {
            // Create keypairs for both sponsor and new account
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = account.createKeypair();

            // Build the sponsored transaction
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sponsorKeyPair)
            });

            // Define the sponsoring operation
            const buildingFunction = (bldr: SponsoringBuilder) => bldr.createAccount(accountKeyPair);
            const txCreateAccount = txBuilder
                .sponsoring(new AccountKeypair(sponsorKeyPair), buildingFunction, accountKeyPair)
                .build();

            // Sign with both the new account and sponsor
            accountKeyPair.sign(txCreateAccount);
            txCreateAccount.sign(sponsorKeyPair);

            // Submit the sponsored transaction
            await stellar.submitTransaction(txCreateAccount);

            // Return the new wallet credentials
            return {
                publicKey: accountKeyPair.publicKey,
                secretKey: accountKeyPair.secretKey,
                txHash: txCreateAccount.hash().toString("hex")
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // Handle specific error responses
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

    /**
     * Fund a wallet on the Stellar testnet using Friendbot.
     * Only works on testnet - provides free XLM for testing purposes.
     */
    async fundWallet(_accountAddress: string) {
        throw new StellarServiceError("Friendbot funding is only available on Testnet");
    }

    /**
     * Adds a trust line for a specific asset to a wallet on the Stellar network.
     * @param sourceSecret - The secret key of the wallet to add the trust line to.
     * @param assetId - The ID of the asset to add the trust line for.
     * @returns The hash of the transaction.
     */
    async addTrustLine(sourceSecret: string, assetId: StellarAssetId = usdcAssetId) {
        try {
            // Create keypair from the source secret
            const sourceKeypair = Keypair.fromSecret(sourceSecret);

            // Build the transaction to add asset support
            const assetTxBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair)
            });
            const txAddAssetSupport = assetTxBuilder.addAssetSupport(assetId).build();

            // Sign the transaction with the source account
            txAddAssetSupport.sign(sourceKeypair);

            // Submit the transaction to the network
            await stellar.submitTransaction(txAddAssetSupport);

            // Return the transaction hash
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

    /**
     * Adds a trust line for a specific asset to a wallet on the Stellar network via sponsorship.
     * @param sponsorSecret - The secret key of the sponsor account.
     * @param accountSecret - The secret key of the wallet to add the trust line to.
     * @param assetId - The ID of the asset to add the trust line for.
     * @returns The hash of the transaction.
     */
    async addTrustLineViaSponsor(
        sponsorSecret: string,
        accountSecret: string,
        assetId: StellarAssetId = usdcAssetId
    ) {
        try {
            // Create keypairs for both sponsor and account
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            // Build the sponsored transaction
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sponsorKeyPair)
            });

            // Define the sponsoring operation
            const buildingFunction = (bldr: SponsoringBuilder) => bldr.addAssetSupport(assetId);
            const txAddAssetSupport = txBuilder
                .sponsoring(
                    new AccountKeypair(sponsorKeyPair),
                    buildingFunction,
                    new AccountKeypair(accountKeyPair)
                )
                .build();

            // Sign with both the account and sponsor
            txAddAssetSupport.sign(accountKeyPair);
            txAddAssetSupport.sign(sponsorKeyPair);

            // Submit the sponsored transaction
            await stellar.submitTransaction(txAddAssetSupport);

            // Return the transaction hash
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

    /**
     * Transfers an asset from one wallet to another on the Stellar network.
     * @param sourceSecret - The secret key of the wallet to transfer the asset from.
     * @param destinationAddress - The address of the wallet to transfer the asset to.
     * @param sendAssetId - The ID of the asset to transfer.
     * @param destAssetId - The ID of the asset to receive.
     * @param amount - The amount of the asset to transfer.
     * @param memo - Optional memo to include with the transaction.
     * @returns The hash of the transaction.
     */
    async transferAsset(
        sourceSecret: string,
        destinationAddress: string,
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string,
        memo?: string
    ) {
        try {
            // Derive the source keypair from the provided secret.
            const sourceKeypair = Keypair.fromSecret(sourceSecret);

            // Initialize a transaction builder for the source account.
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair)
            });

            let transaction;

            // Determine if it's a direct transfer or a path payment (if assets are different).
            if (this.isSameAsset(sendAssetId, destAssetId)) {
                // Build a direct transfer operation.
                transaction = txBuilder
                    .transfer(
                        destinationAddress,
                        sendAssetId,
                        amount
                    )
                    .setMemo(Memo.text(memo || ""))
                    .build();
            } else {
                // Build a path payment operation for different assets.
                transaction = txBuilder
                    .pathPay({
                        destinationAddress,
                        sendAsset: sendAssetId,
                        destAsset: destAssetId,
                        sendAmount: amount
                    })
                    .setMemo(Memo.text(memo || ""))
                    .build();
            }

            // Sign the transaction with the source keypair.
            transaction.sign(sourceKeypair);
            // Submit the signed transaction to the Stellar network.
            await stellar.submitTransaction(transaction);

            // Return the hash of the submitted transaction.
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

    /**
     * Transfers an asset from one wallet to another on the Stellar network via sponsorship.
     * @param sponsorSecret - The secret key of the sponsor account.
     * @param accountSecret - The secret key of the wallet to transfer the asset from.
     * @param destinationAddress - The address of the wallet to transfer the asset to.
     * @param sendAssetId - The ID of the asset to transfer.
     * @param destAssetId - The ID of the asset to receive.
     * @param amount - The amount of the asset to transfer.
     * @param memo - Optional memo to include with the transaction.
     * @returns The hash of the transaction.
     */
    async transferAssetViaSponsor(
        sponsorSecret: string,
        accountSecret: string,
        destinationAddress: string,
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string,
        memo?: string
    ) {
        try {
            // Derive the sponsor and account keypair from the provided secret.
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            // Initialize a transaction builder for the source account.
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(accountKeyPair)
            });

            let transaction;

            // Determine if it's a direct transfer or a path payment (if assets are different).
            if (this.isSameAsset(sendAssetId, destAssetId)) {
                // Build a direct transfer operation.
                transaction = txBuilder
                    .transfer(
                        destinationAddress,
                        sendAssetId,
                        amount
                    )
                    .setMemo(Memo.text(memo || ""))
                    .build();
            } else {
                // Build a path payment operation for different assets.
                transaction = txBuilder
                    .pathPay({
                        destinationAddress,
                        sendAsset: sendAssetId,
                        destAsset: destAssetId,
                        sendAmount: amount
                    })
                    .setMemo(Memo.text(memo || ""))
                    .build();
            }

            // Sign the transaction with the account's keypair.
            transaction.sign(accountKeyPair);

            // Create a fee-bump transaction with the sponsor paying the fees.
            const feeBump = stellar.makeFeeBump({
                feeAddress: new AccountKeypair(sponsorKeyPair),
                transaction
            });

            // Sign the fee-bump transaction with the sponsor's keypair.
            feeBump.sign(sponsorKeyPair);

            // Submit the signed fee-bump transaction to the Stellar network.
            await stellar.submitTransaction(feeBump);

            // Return the hash of both the original transaction and the fee-bump transaction.
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

    /**
     * Swaps an asset for another on the Stellar network.
     * @param sourceSecret - The secret key of the wallet to swap the asset from.
     * @param amount - The amount of the asset to swap.
     * @param fromAssetId - The ID of the asset to swap from.
     * @param toAssetId - The ID of the asset to swap to.
     * @returns The hash of the transaction.
     */
    async swapAsset(
        sourceSecret: string,
        amount: string,
        fromAssetId: StellarAssetId = xlmAssetId,
        toAssetId: StellarAssetId = usdcAssetId
    ) {
        try {
            // Create a keypair from the source secret.
            const sourceKeypair = Keypair.fromSecret(sourceSecret);

            // Initialize a transaction builder for the source account.
            const txBuilder = await stellar.transaction({
                sourceAddress: new AccountKeypair(sourceKeypair)
            });

            // Build the swap transaction.
            const txSwap = txBuilder.swap(fromAssetId, toAssetId, amount).build();

            // Sign the transaction with the source keypair.
            txSwap.sign(sourceKeypair);
            // Submit the swap transaction to the network.
            await stellar.submitTransaction(txSwap);

            const txHash = txSwap.hash().toString("hex");

            // Fetch effects to get the actual amount received
            const effects = await stellar.server.effects()
                .forTransaction(txHash)
                .call();

            // Find the account_credited effect for the destination asset
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const creditEffect = effects.records.find((effect: any) => {
                if (effect.type !== "account_credited") return false;

                if (toAssetId instanceof NativeAssetId) {
                    return effect.asset_type === "native";
                } else if (toAssetId instanceof IssuedAssetId) {
                    return effect.asset_code === toAssetId.code && effect.asset_issuer === toAssetId.issuer;
                }
                return false;
            });

            if (!creditEffect) {
                throw new Error("Swap successful but could not verify received amount");
            }

            // Return the hash of the swap transaction and the received amount
            return {
                txHash,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                receivedAmount: (creditEffect as any).amount
            };
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

    /**
     * Retrieves information about a wallet on the Stellar network.
     * @param publicKey - The public key of the wallet to retrieve information for.
     * @returns The account information.
     */
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

    /**
     * Retrieve all incoming payment transactions for a wallet.
     * Filters payment history to show only funds received by the account.
     */
    async getTopUpTransactions(publicKey: string) {
        // Get all payments for the account
        const allPayments = await stellar.server.payments()
            .forAccount(publicKey)
            .order("desc")
            .limit(100)
            .call();

        // Filter payments to incoming funds only
        const incomingFunds = allPayments.records.filter(payment => {
            switch (payment.type as HorizonApi.OperationResponseType) {
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
}

export const stellarService = new StellarService();
