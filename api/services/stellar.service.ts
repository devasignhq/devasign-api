import {
    Keypair,
    Asset,
    Memo,
    TransactionBuilder,
    Operation
} from "@stellar/stellar-sdk";
import {
    stellarServer,
    usdcAsset,
    xlmAsset,
    isMainnet,
    networkPassphrase
} from "../config/stellar.config.js";
import { HorizonApi } from "../models/horizonapi.model.js";
import { StellarServiceError } from "../models/error.model.js";
import { Env } from "../utils/env.js";

/**
 * Service for managing Stellar blockchain operations.
 * Handles wallet creation, asset transfers, trustlines, and account management on the Stellar network.
 * Supports both standard and sponsored transactions for fee-less operations.
 * 
 * TODO: Implement deeper error handling (e.g., swapAsset: "No trustline present")
 */
export class StellarService {
    private masterAccount: Keypair;
    readonly isMainnet: boolean;

    /**
     * Initialize the Stellar service with the master account credentials.
     * The master account is used to sponsor account creation and fund operations.
     */
    constructor() {
        const stellarMasterSecretKey = Env.stellarMasterSecretKey();
        // Verify required environment variables are present
        if (!stellarMasterSecretKey) {
            throw new StellarServiceError("Missing Stellar master account credentials in environment variables");
        }

        this.isMainnet = isMainnet;

        try {
            // Create keypair from the master secret key
            this.masterAccount = Keypair.fromSecret(stellarMasterSecretKey);
        } catch (error) {
            throw new StellarServiceError("Invalid Stellar master account credentials", error);
        }
    }

    /**
     * Helper method to deduct the Memo type automatically from a string value.
     */
    private createMemo(memoValue?: string): Memo {
        if (!memoValue) {
            return Memo.none();
        }

        // Check if it's a 64-character hex string (32-byte hash)
        if (/^[0-9a-fA-F]{64}$/.test(memoValue)) {
            return Memo.hash(memoValue);
        }

        // Check if it's a completely numeric string that fits in a 64-bit unsigned uint
        if (/^\d+$/.test(memoValue)) {
            try {
                const asBigInt = BigInt(memoValue);
                if (asBigInt <= 18446744073709551615n) {
                    return Memo.id(memoValue);
                }
            } catch {
                // Ignored, falls through to text
            }
        }

        // Fallback to text (max 28 bytes)
        if (Buffer.byteLength(memoValue, "utf8") <= 28) {
            return Memo.text(memoValue);
        }

        throw new StellarServiceError("Invalid memo format. Must be a 64-bit ID, a 64-character hex hash, or a text string up to 28 bytes.");
    }

    /**
     * Create a new Stellar wallet funded by the master account.
     * The master account pays for the account creation and initial funding.
     * @returns The new wallet credentials and transaction hash
     */
    async createWallet() {
        try {
            // Generate a new random keypair for the wallet
            const accountKeyPair = Keypair.random();

            const sourceAccount = await stellarServer.loadAccount(this.masterAccount.publicKey());

            // Build the account creation transaction
            const txBuilder = new TransactionBuilder(sourceAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            });

            const txCreateAccount = txBuilder
                .addOperation(Operation.createAccount({
                    destination: accountKeyPair.publicKey(),
                    startingBalance: "1.5"
                }))
                .setTimeout(30)
                .build();

            // Sign the transaction with the master account
            txCreateAccount.sign(this.masterAccount);

            // Submit the transaction to the network
            await stellarServer.submitTransaction(txCreateAccount);

            // Return the new wallet credentials and transaction hash
            return {
                publicKey: accountKeyPair.publicKey(),
                secretKey: accountKeyPair.secret(),
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
                        errorData,
                        false
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
     * @param sponsorSecret - The secret key of the sponsor account
     * @returns The new wallet credentials
     */
    async createWalletViaSponsor(sponsorSecret: string) {
        try {
            // Create keypairs for both sponsor and new account
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.random();

            const sponsorAccount = await stellarServer.loadAccount(sponsorKeyPair.publicKey());

            // Build the sponsored transaction
            const txBuilder = new TransactionBuilder(sponsorAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            });

            const txCreateAccount = txBuilder
                .addOperation(Operation.beginSponsoringFutureReserves({
                    sponsoredId: accountKeyPair.publicKey()
                }))
                .addOperation(Operation.createAccount({
                    destination: accountKeyPair.publicKey(),
                    startingBalance: "0"
                }))
                .addOperation(Operation.endSponsoringFutureReserves({
                    source: accountKeyPair.publicKey()
                }))
                .setTimeout(30)
                .build();

            // Sign with both the new account and sponsor
            txCreateAccount.sign(sponsorKeyPair);
            txCreateAccount.sign(accountKeyPair);

            // Submit the sponsored transaction
            await stellarServer.submitTransaction(txCreateAccount);

            // Return the new wallet credentials
            return {
                publicKey: accountKeyPair.publicKey(),
                secretKey: accountKeyPair.secret(),
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
                        errorData,
                        false
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
     * @param accountAddress - The address of the wallet to fund
     * @returns A success message
     */
    async fundWallet(accountAddress: string) {
        if (this.isMainnet) {
            throw new StellarServiceError("Friendbot funding is only available on Testnet");
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);

        try {
            // Request funding from Friendbot
            const response = await fetch(
                `https://friendbot.stellar.org?addr=${encodeURIComponent(accountAddress)}`,
                { signal: controller.signal }
            );

            if (!response.ok) {
                throw new Error(`Friendbot failed with status ${response.status}`);
            }
            return "SUCCESS";
        } catch (error) {
            throw new StellarServiceError("Failed to fund wallet", error);
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Adds a trust line for a specific asset to a wallet on the Stellar network.
     * @param sourceSecret - The secret key of the wallet to add the trust line to.
     * @param asset - The ID of the asset to add the trust line for.
     * @returns The hash of the transaction.
     */
    async addTrustLine(sourceSecret: string, asset: Asset = usdcAsset) {
        try {
            // Create keypair from the source secret
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
            const sourceAccount = await stellarServer.loadAccount(sourceKeypair.publicKey());

            // Build the transaction to add asset support
            const txAddAssetSupport = new TransactionBuilder(sourceAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            })
                .addOperation(Operation.changeTrust({
                    asset
                }))
                .setTimeout(30)
                .build();

            // Sign the transaction with the source account
            txAddAssetSupport.sign(sourceKeypair);

            // Submit the transaction to the network
            await stellarServer.submitTransaction(txAddAssetSupport);

            // Return the transaction hash
            return { txHash: txAddAssetSupport.hash().toString("hex") };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Adding trustline failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData,
                        false
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
     * @param asset - The ID of the asset to add the trust line for.
     * @returns The hash of the transaction.
     */
    async addTrustLineViaSponsor(
        sponsorSecret: string,
        accountSecret: string,
        asset: Asset = usdcAsset
    ) {
        try {
            // Create keypairs for both sponsor and account
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            const sponsorAccount = await stellarServer.loadAccount(sponsorKeyPair.publicKey());

            // Build the sponsored transaction
            const txAddAssetSupport = new TransactionBuilder(sponsorAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            })
                .addOperation(Operation.beginSponsoringFutureReserves({
                    sponsoredId: accountKeyPair.publicKey()
                }))
                .addOperation(Operation.changeTrust({
                    asset,
                    source: accountKeyPair.publicKey()
                }))
                .addOperation(Operation.endSponsoringFutureReserves({
                    source: accountKeyPair.publicKey()
                }))
                .setTimeout(30)
                .build();

            // Sign with both the account and sponsor
            txAddAssetSupport.sign(accountKeyPair);
            txAddAssetSupport.sign(sponsorKeyPair);

            // Submit the sponsored transaction
            await stellarServer.submitTransaction(txAddAssetSupport);

            // Return the transaction hash
            return { txHash: txAddAssetSupport.hash().toString("hex") };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Adding trustline failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData,
                        false
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
     * @param sendAsset - The ID of the asset to transfer.
     * @param destAsset - The ID of the asset to receive.
     * @param amount - The amount of the asset to transfer.
     * @param memo - Optional memo to include with the transaction.
     * @returns The hash of the transaction.
     */
    async transferAsset(
        sourceSecret: string,
        destinationAddress: string,
        sendAsset: Asset,
        destAsset: Asset,
        amount: string,
        memo?: string
    ) {
        try {
            // Derive the source keypair from the provided secret.
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
            const sourceAccount = await stellarServer.loadAccount(sourceKeypair.publicKey());

            // Initialize a transaction builder for the source account.
            let txBuilder = new TransactionBuilder(sourceAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            }).setTimeout(30);

            const memoObj = this.createMemo(memo);
            if (memoObj.type !== "none") {
                txBuilder = txBuilder.addMemo(memoObj);
            }

            // Determine if it's a direct transfer or a path payment (if assets are different).
            if (sendAsset.equals(destAsset)) {
                // Build a direct transfer operation.
                txBuilder = txBuilder.addOperation(Operation.payment({
                    destination: destinationAddress,
                    asset: sendAsset,
                    amount
                }));
            } else {
                // Build a path payment operation for different assets.
                txBuilder = txBuilder.addOperation(Operation.pathPaymentStrictSend({
                    destination: destinationAddress,
                    sendAsset,
                    destAsset,
                    sendAmount: amount,
                    destMin: "0.0000001"
                }));
            }

            const transaction = txBuilder.build();

            // Sign the transaction with the source keypair.
            transaction.sign(sourceKeypair);
            // Submit the signed transaction to the Stellar network.
            await stellarServer.submitTransaction(transaction);

            // Return the hash of the submitted transaction.
            return { txHash: transaction.hash().toString("hex") };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Transaction failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData,
                        false
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
     * @param sendAsset - The ID of the asset to transfer.
     * @param destAsset - The ID of the asset to receive.
     * @param amount - The amount of the asset to transfer.
     * @param memo - Optional memo to include with the transaction.
     * @returns The hash of the transaction.
     */
    async transferAssetViaSponsor(
        sponsorSecret: string,
        accountSecret: string,
        destinationAddress: string,
        sendAsset: Asset,
        destAsset: Asset,
        amount: string,
        memo?: string
    ) {
        try {
            // Derive the sponsor and account keypair from the provided secret.
            const sponsorKeyPair = Keypair.fromSecret(sponsorSecret);
            const accountKeyPair = Keypair.fromSecret(accountSecret);

            const accountAccount = await stellarServer.loadAccount(accountKeyPair.publicKey());

            // Initialize a transaction builder for the source account.
            let txBuilder = new TransactionBuilder(accountAccount, {
                fee: "0",
                networkPassphrase
            }).setTimeout(30);

            const memoObj = this.createMemo(memo);
            if (memoObj.type !== "none") {
                txBuilder = txBuilder.addMemo(memoObj);
            }

            // Determine if it's a direct transfer or a path payment (if assets are different).
            if (sendAsset.equals(destAsset)) {
                // Build a direct transfer operation.
                txBuilder = txBuilder.addOperation(Operation.payment({
                    destination: destinationAddress,
                    asset: sendAsset,
                    amount
                }));
            } else {
                // Build a path payment operation for different assets.
                txBuilder = txBuilder.addOperation(Operation.pathPaymentStrictSend({
                    destination: destinationAddress,
                    sendAsset,
                    destAsset,
                    sendAmount: amount,
                    destMin: "0.0000001"
                }));
            }

            const transaction = txBuilder.build();

            // Sign the transaction with the account's keypair.
            transaction.sign(accountKeyPair);

            // Create a fee-bump transaction with the sponsor paying the fees.
            const baseFee = (await stellarServer.fetchBaseFee()).toString();
            const feeBump = TransactionBuilder.buildFeeBumpTransaction(
                sponsorKeyPair,
                baseFee,
                transaction,
                networkPassphrase
            );

            // Sign the fee-bump transaction with the sponsor's keypair.
            feeBump.sign(sponsorKeyPair);

            // Submit the signed fee-bump transaction to the Stellar network.
            await stellarServer.submitTransaction(feeBump);

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
                        errorData,
                        false
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
     * @param fromAsset - The ID of the asset to swap from.
     * @param toAsset - The ID of the asset to swap to.
     * @returns The hash of the transaction.
     */
    async swapAsset(
        sourceSecret: string,
        amount: string,
        fromAsset: Asset = xlmAsset,
        toAsset: Asset = usdcAsset
    ) {
        try {
            // Create a keypair from the source secret.
            const sourceKeypair = Keypair.fromSecret(sourceSecret);
            const sourceAccount = await stellarServer.loadAccount(sourceKeypair.publicKey());

            // Initialize a transaction builder for the source account.
            const txSwap = new TransactionBuilder(sourceAccount, {
                fee: (await stellarServer.fetchBaseFee()).toString(),
                networkPassphrase
            })
                .addOperation(Operation.pathPaymentStrictSend({
                    destination: sourceKeypair.publicKey(),
                    sendAsset: fromAsset,
                    sendAmount: amount,
                    destAsset: toAsset,
                    destMin: "0.0000001"
                }))
                .setTimeout(30)
                .build();

            // Sign the transaction with the source keypair.
            txSwap.sign(sourceKeypair);
            // Submit the swap transaction to the network.
            await stellarServer.submitTransaction(txSwap);

            const txHash = txSwap.hash().toString("hex");

            // Fetch effects to get the actual amount received
            const effects = await stellarServer.effects()
                .forTransaction(txHash)
                .call();

            // Find the account_credited effect for the destination asset
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const creditEffect = effects.records.find((effect: any) => {
                if (effect.type !== "account_credited") return false;

                if (toAsset.isNative()) {
                    return effect.asset_type === "native";
                } else {
                    return effect.asset_code === toAsset.code && effect.asset_issuer === toAsset.issuer;
                }
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
                        errorData,
                        false
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
            const accountInfo = await stellarServer.loadAccount(publicKey);
            return accountInfo;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            if (error.response?.status === 400) {
                const errorData = error.response?.data;
                if (errorData?.extras?.result_codes) {
                    throw new StellarServiceError(
                        `Get account failed: ${JSON.stringify(errorData.extras.result_codes)}`,
                        errorData,
                        false
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
     * @param publicKey - The public key of the wallet to retrieve transactions for
     * @returns An array of incoming payment transactions
     */
    async getTopUpTransactions(publicKey: string) {
        // Get all payments for the account
        const allPayments = await stellarServer.payments()
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
                case "path_payment_strict_send":
                    return (payment as HorizonApi.PaymentOperationResponse).to === publicKey;
                default:
                    return false;
            }
        });

        return incomingFunds;
    }
}

export const stellarService = new StellarService();
