import {
    Address,
    Contract,
    Keypair,
    nativeToScVal,
    scValToNative,
    rpc as SorobanRpc,
    TransactionBuilder,
    Networks,
    xdr
} from "@stellar/stellar-sdk";
import { Env } from "../utils/env.js";
import { EscrowContractError } from "../models/error.model.js";

/**
 * Service for interacting with the task escrow smart contract.
 */
export class ContractService {
    static {
        // Verify required environment variables are present
        const missing: string[] = [];
        if (!(Env.stellarNetwork() || "")) missing.push("STELLAR_NETWORK");
        if (!(Env.stellarRpcUrl() || "")) missing.push("STELLAR_RPC_URL");
        if (!Env.taskEscrowContractId()) missing.push("TASK_ESCROW_CONTRACT_ID");
        if (!Env.usdcContractId()) missing.push("USDC_CONTRACT_ID");
        if (!Env.stellarMasterPublicKey()) missing.push("STELLAR_MASTER_PUBLIC_KEY");
        if (missing.length > 0) {
            throw new EscrowContractError(`Missing required environment variables for ContractService: ${missing.join(", ")}`);
        }
    }

    // Soroban network configuration loaded from environment variables
    private static CONFIG = {
        network: ((Env.stellarNetwork(true) || "") || ""),
        rpcUrl: ((Env.stellarRpcUrl(true) || "") || ""),
        networkPassphrase: (Env.stellarNetwork() || "") === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
        contractId: Env.taskEscrowContractId(true)!,
        usdcContractId: Env.usdcContractId(true)!,
        masterPublicKey: Env.stellarMasterPublicKey(true)!,
        maxFee: Env.maxFee() || "1000000"
    };

    // Soroban RPC server instance for network communication
    private static server = new SorobanRpc.Server(this.CONFIG.rpcUrl, {
        timeout: 10000 // 10 seconds
    });

    // Task escrow contract instance
    private static contract = new Contract(this.CONFIG.contractId);

    // Map of contract error codes to user-friendly messages
    private static ERROR_CODES: Record<string, string> = {
        "1": "Task not found",
        "2": "Task already exists",
        "3": "Invalid task status",
        "4": "Contract not initialized",
        "10": "Unauthorized action",
        "11": "Caller is not the task creator",
        "12": "Caller is not the assigned contributor",
        "13": "Caller is not the admin",
        "14": "Caller must be creator or contributor",
        "20": "Contributor already assigned to this task",
        "21": "No contributor assigned to this task",
        "22": "Insufficient balance",
        "23": "Task is not completed",
        "24": "Task is not disputed",
        "25": "Task is already resolved",
        "26": "Cannot refund while contributor is assigned",
        "30": "Token transfer failed",
        "31": "Invalid token amount",
        "32": "Token contract not set",
        "40": "Invalid task ID format",
        "41": "Invalid address format",
        "42": "Invalid amount",
        "43": "Invalid dispute reason",
        "44": "Task ID cannot be empty",
        "45": "Task ID is too short",
        "46": "Task ID is too long",
        "47": "Task ID contains invalid characters",
        "48": "Amount is too small",
        "49": "Dispute reason is too short",
        "50": "Invalid issue URL",
        "51": "Contract operations paused"
    };

    /**
     * Helper to parse contract errors from simulation or transaction results.
     * @param details - The error details string or object
     * @param defaultMessage - The default message to return if parsing fails
     * @returns The parsed error message or the default message
     */
    private static parseContractError(details: unknown, defaultMessage: string): string {
        try {
            const errorString = typeof details === "string" ? details : JSON.stringify(details);

            // Match Error(Contract, #Code) pattern
            const match = errorString.match(/Error\(Contract,\s*#(\d+)\)/);

            if (match && match[1]) {
                const code = match[1];
                const cleanMessage = this.ERROR_CODES[code];
                if (cleanMessage) {
                    return cleanMessage;
                }
            }
        } catch {
            // If parsing fails, ignore and return default
        }
        return defaultMessage;
    }

    /**
     * Helper method to convert an amount to stroops.
     * @param amount - The amount to convert
     * @returns The amount in stroops as a BigInt
     */
    private static convertToStroops(amount: number) {
        return BigInt(amount * 10_000_000);
    }

    /**
     * Helper method to build, simulate, sign, and submit a Soroban transaction.
     * @param operation - The operation to include in the transaction
     * @param signerKeypair - The keypair to sign the transaction with
     * @param functionCaller - The name of the calling function for logging purposes
     * @returns The result of the submitted transaction
     */
    private static async submitTransaction(
        operation: xdr.Operation,
        signerKeypair: Keypair,
        functionCaller: string
    ) {
        // Fetch the account information from the network
        const account = await this.server.getAccount(signerKeypair.publicKey());

        // Build the transaction with the operation
        const transaction = new TransactionBuilder(account, {
            fee: this.CONFIG.maxFee, // 1,000,000 stroops
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate the transaction to get resource estimates
        const simulated = await this.server.simulateTransaction(transaction);

        // Check for simulation errors
        if (SorobanRpc.Api.isSimulationError(simulated)) {
            const errorMessage = this.parseContractError(simulated.error, `[${functionCaller}] Submit transaction simulation failed`);
            throw new EscrowContractError(errorMessage, simulated.error);
        }

        // Prepare the transaction with accurate resource estimates from simulation
        const prepared = SorobanRpc.assembleTransaction(
            transaction,
            simulated
        ).build();

        // Sign the prepared transaction
        prepared.sign(signerKeypair);

        // Submit the signed transaction to the network
        const response = await this.server.sendTransaction(prepared);

        // Check for submission errors
        if (response.status === "ERROR") {
            const errorMessage = this.parseContractError(response.errorResult, `[${functionCaller}] Submit transaction failed`);
            throw new EscrowContractError(errorMessage, response.errorResult);
        }

        // Poll for transaction confirmation with a timeout
        let result = await this.server.getTransaction(response.hash);
        let attempts = 0;
        const maxAttempts = 30; // 30 seconds total

        while (result.status === "NOT_FOUND" && attempts < maxAttempts) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            result = await this.server.getTransaction(response.hash);
            attempts++;
        }

        if (result.status === "NOT_FOUND") {
            throw new EscrowContractError("Transaction polling timed out. The transaction might still succeed on-chain.");
        }

        // Verify transaction succeeded
        if (result.status === "FAILED") {
            const errorMessage = this.parseContractError(result.resultXdr, `[${functionCaller}] Submit transaction failed`);
            throw new EscrowContractError(errorMessage, result.resultXdr);
        }

        return result;
    }

    /**
     * Create a new escrow for a task on the smart contract.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the task
     * @param issueUrl - The URL of the GitHub issue
     * @param bountyAmount - The bounty amount in USDC
     * @returns An object containing success status, result, and transaction hashes
     */
    public static async createEscrow(
        creatorSecretKey: string,
        taskId: string,
        issueUrl: string,
        bountyAmount: number
    ) {
        // Convert bounty amount to stroops and create keypair and address from the creator's secret key
        const bountyAmountInStroops = this.convertToStroops(bountyAmount);
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const creatorAddress = new Address(creatorKeypair.publicKey());

        // Build the contract call operation
        const operation = this.contract.call(
            "create_escrow",
            creatorAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(issueUrl, { type: "string" }),
            nativeToScVal(bountyAmountInStroops, { type: "i128" })
        );

        // Submit the transaction and wait for confirmation
        const result = await this.submitTransaction(operation, creatorKeypair, "createEscrow");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Retrieve escrow details for a specific task from the smart contract.
     * @param taskId - The ID of the task to retrieve
     * @returns The escrow details
     */
    public static async getEscrow(taskId: string) {
        // Build the contract call operation
        const operation = this.contract.call(
            "get_escrow",
            nativeToScVal(taskId, { type: "string" })
        );

        // For read-only calls, use a dummy account for simulation
        const account = await this.server.getAccount(
            this.CONFIG.masterPublicKey
        );

        // Build a transaction for simulation purposes only
        const transaction = new TransactionBuilder(account, {
            fee: this.CONFIG.maxFee, // 1,000,000 stroops
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate the transaction to get the return value
        const simulated = await this.server.simulateTransaction(transaction);

        // Check for simulation errors
        if (SorobanRpc.Api.isSimulationError(simulated)) {
            const errorMessage = this.parseContractError(simulated.error, `Failed to get escrow: ${simulated.error}`);
            throw new EscrowContractError(errorMessage, simulated.error);
        }

        // Extract and return the escrow data
        const returnValue = simulated.result?.retval;
        if (!returnValue) {
            throw new EscrowContractError("No return value from simulation");
        }

        return scValToNative(returnValue);
    }

    /**
     * Assign a contributor to a task in the escrow contract.
     * Only the task creator can assign a contributor.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the task
     * @param contributorPublicKey - The public key of the assigned contributor
     * @returns An object containing success status, result, and transaction hash
     */
    public static async assignContributor(
        creatorSecretKey: string,
        taskId: string,
        contributorPublicKey: string
    ) {
        // Create keypair and address from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const contributorAddress = new Address(contributorPublicKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "assign_contributor",
            nativeToScVal(taskId, { type: "string" }),
            contributorAddress.toScVal()
        );

        // Submit the transaction
        const result = await this.submitTransaction(operation, creatorKeypair, "assignContributor");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Increase the bounty amount for a task.
     * Called by the task creator.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the task
     * @param amount - The amount to increase the bounty by
     * @returns An object containing success status, result, and transaction hashes
     */
    public static async increaseBounty(
        creatorSecretKey: string,
        taskId: string,
        amount: number
    ) {
        // Convert amount to stroops and create keypair and address from the creator's secret key
        const amountInStroops = this.convertToStroops(amount);
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const creatorAddress = new Address(creatorKeypair.publicKey());

        // Build the contract call operation
        const operation = this.contract.call(
            "increase_bounty",
            creatorAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(amountInStroops, { type: "i128" })
        );

        // Submit the transaction
        const result = await this.submitTransaction(operation, creatorKeypair, "increaseBounty");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Decrease the bounty amount for a task.
     * Called by the task creator.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the task
     * @param amount - The amount to decrease the bounty by
     * @returns An object containing success status, result, and transaction hash
     */
    public static async decreaseBounty(
        creatorSecretKey: string,
        taskId: string,
        amount: number
    ) {
        // Convert amount to stroops and create keypair and address from the creator's secret key
        const amountInStroops = this.convertToStroops(amount);
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const creatorAddress = new Address(creatorKeypair.publicKey());

        // Build the contract call operation
        const operation = this.contract.call(
            "decrease_bounty",
            creatorAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(amountInStroops, { type: "i128" })
        );

        // Submit the transaction
        const result = await this.submitTransaction(operation, creatorKeypair, "decreaseBounty");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Approve task completion and release escrowed funds to the contributor.
     * Called by the task creator after verifying the work is satisfactory.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the completed task
     * @returns An object containing success status, result, and transaction hash
     */
    public static async approveCompletion(creatorSecretKey: string, taskId: string) {
        // Create keypair from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "approve_completion",
            nativeToScVal(taskId, { type: "string" })
        );

        // Submit the transaction to release funds
        const result = await this.submitTransaction(operation, creatorKeypair, "approveCompletion");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Initiate a dispute for a task.
     * Can be called by either the creator or contributor when there's a disagreement.
     * @param disputingPartySecretKey - The secret key of the disputing party
     * @param taskId - The ID of the disputed task
     * @param reason - The reason for the dispute
     * @returns An object containing success status, result, and transaction hash
     */
    public static async disputeTask(
        disputingPartySecretKey: string,
        taskId: string,
        reason: string
    ) {
        // Create keypair from the disputing party's secret key
        const disputingPartyKeypair = Keypair.fromSecret(disputingPartySecretKey);
        const disputingPartyAddress = new Address(disputingPartyKeypair.publicKey());

        // Build the contract call operation with dispute reason
        const operation = this.contract.call(
            "dispute_task",
            disputingPartyAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(reason, { type: "string" })
        );

        // Submit the dispute transaction
        const result = await this.submitTransaction(operation, disputingPartyKeypair, "disputeTask");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Resolve a dispute for a task (admin only).
     * Determines how the escrowed funds should be distributed after a dispute.
     * @param adminSecretKey - The secret key of the admin resolving the dispute
     * @param taskId - The ID of the task
     * @param resolution - The resolution decision
     * @returns An object containing success status, result, and transaction hash
     */
    public static async resolveDispute(
        adminSecretKey: string,
        taskId: string,
        resolution: "PayContributor" | "RefundCreator" | { PartialPayment: number }
    ) {
        // Create keypair from admin's secret key
        const adminKeypair = Keypair.fromSecret(adminSecretKey);

        // Build the resolution value based on the decision
        let resolutionScVal: xdr.ScVal;
        if (resolution === "PayContributor") {
            // Full payment to contributor
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("PayContributor")
            ]);
        } else if (resolution === "RefundCreator") {
            // Full refund to creator
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("RefundCreator")
            ]);
        } else {
            // Partial payment split between parties
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("PartialPayment"),
                nativeToScVal(this.convertToStroops(resolution.PartialPayment), { type: "i128" })
            ]);
        }

        // Build the contract call operation with resolution
        const operation = this.contract.call(
            "resolve_dispute",
            nativeToScVal(taskId, { type: "string" }),
            resolutionScVal
        );

        // Submit the resolution transaction
        const result = await this.submitTransaction(operation, adminKeypair, "resolveDispute");

        return { success: true, result, txHash: result.txHash };
    }

    /**
     * Request a refund from the escrow.
     * Called by the creator when no contributor has been assigned to the task.
     * @param creatorSecretKey - The secret key of the task creator
     * @param taskId - The ID of the task
     * @returns An object containing success status, result, and transaction hash
     */
    public static async refund(creatorSecretKey: string, taskId: string) {
        // Create keypair from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "refund",
            nativeToScVal(taskId, { type: "string" })
        );

        // Submit the refund transaction
        const result = await this.submitTransaction(operation, creatorKeypair, "refund");

        return { success: true, result, txHash: result.txHash };
    }
}
