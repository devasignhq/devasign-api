import {
    Keypair,
    Contract,
    rpc as SorobanRpc,
    TransactionBuilder,
    Networks,
    BASE_FEE,
    xdr,
    Address,
    nativeToScVal,
    scValToNative
} from "@stellar/stellar-sdk";

/**
 * Service for interacting with the task escrow smart contract.
 */
export class ContractService {
    // Soroban network configuration loaded from environment variables
    private static CONFIG = {
        network: process.env.STELLAR_NETWORK!,
        rpcUrl: process.env.STELLAR_RPC_URL!,
        networkPassphrase: Networks.TESTNET,
        contractId: process.env.TASK_ESCROW_CONTRACT_ID!,
        usdcContractId: process.env.USDC_CONTRACT_ID!
    };

    // Soroban RPC server instance for network communication
    private static server = new SorobanRpc.Server(this.CONFIG.rpcUrl);

    // Task escrow contract instance
    private static contract = new Contract(this.CONFIG.contractId);

    // USDC token contract instance for approval operations
    private static usdcContract = new Contract(this.CONFIG.usdcContractId);

    /**
     * Helper method to build, simulate, sign, and submit a Soroban transaction.
     */
    private static async submitTransaction(
        operation: xdr.Operation,
        signerKeypair: Keypair
    ) {
        // Fetch the account information from the network
        const account = await this.server.getAccount(signerKeypair.publicKey());

        // Build the transaction with the operation
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate the transaction to get resource estimates
        const simulated = await this.server.simulateTransaction(transaction);

        // Check for simulation errors
        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Simulation failed: ${simulated.error}`);
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
            throw new Error(`Transaction failed: ${response.errorResult}`);
        }

        // Poll for transaction confirmation
        let result = await this.server.getTransaction(response.hash);
        while (result.status === "NOT_FOUND") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            result = await this.server.getTransaction(response.hash);
        }

        // Verify transaction succeeded
        if (result.status === "FAILED") {
            throw new Error(`Transaction failed: ${result.resultXdr}`);
        }

        return result;
    }

    /**
     * Create an escrow with automatic USDC approval in a single operation.
     */
    public static async createEscrowWithApproval(
        creatorSecretKey: string,
        taskId: string,
        bountyAmount: bigint
    ): Promise<{ approvalTxHash: string; escrowTxHash: string }> {
        // First, approve the contract to spend USDC on behalf of the creator
        const approval = await this.approveUsdcSpending(
            creatorSecretKey,
            bountyAmount
        );

        // Then, create the escrow with the approved amount
        const escrow = await this.createEscrow(
            creatorSecretKey,
            taskId,
            bountyAmount
        );

        // Return both transaction hashes for tracking
        return {
            approvalTxHash: approval.txHash,
            escrowTxHash: escrow.txHash
        };
    }

    /**
     * Create a new escrow for a task on the smart contract.
     */
    public static async createEscrow(
        creatorSecretKey: string,
        taskId: string,
        bountyAmount: bigint
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair and address from the creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const creatorAddress = new Address(creatorKeypair.publicKey());

        // Build the contract call operation
        const operation = this.contract.call(
            "create_escrow",
            creatorAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(bountyAmount, { type: "i128" })
        );

        // Submit the transaction and wait for confirmation
        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Approve USDC spending by the escrow contract.
     */
    public static async approveUsdcSpending(
        userSecretKey: string,
        amount: bigint
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair from user's secret key
        const userKeypair = Keypair.fromSecret(userSecretKey);

        // Get the escrow contract address that will be approved to spend
        const contractAddress = new Address(this.CONFIG.contractId);

        // Calculate approval expiration (approximately 31 days from now)
        const ledger = await this.server.getLatestLedger();
        const expirationLedger = ledger.sequence + 535680; // ~31 days

        // Build the USDC approval operation
        const operation = this.usdcContract.call(
            "approve",
            new Address(userKeypair.publicKey()).toScVal(),
            contractAddress.toScVal(),
            nativeToScVal(amount, { type: "i128" }),
            nativeToScVal(expirationLedger, { type: "u32" })
        );

        // Submit the approval transaction
        const result = await this.submitTransaction(operation, userKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Retrieve escrow details for a specific task from the smart contract.
     */
    public static async getEscrow(taskId: string) {
        // Build the contract call operation
        const operation = this.contract.call(
            "get_escrow",
            nativeToScVal(taskId, { type: "string" })
        );

        // For read-only calls, use a dummy account for simulation
        const account = await this.server.getAccount(
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" // Any valid address works for simulation
        );

        // Build a transaction for simulation purposes only
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate the transaction to get the return value
        const simulated = await this.server.simulateTransaction(transaction);

        // Check for simulation errors
        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Failed to get escrow: ${simulated.error}`);
        }

        // Extract and return the escrow data
        const returnValue = simulated.result?.retval;
        if (!returnValue) {
            throw new Error("No return value from simulation");
        }

        return scValToNative(returnValue);
    }

    /**
     * Assign a contributor to a task in the escrow contract.
     * Only the task creator can assign a contributor.
     */
    public static async assignContributor(
        creatorSecretKey: string,
        taskId: string,
        contributorPublicKey: string
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        // Create address object for the contributor
        const contributorAddress = new Address(contributorPublicKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "assign_contributor",
            nativeToScVal(taskId, { type: "string" }),
            contributorAddress.toScVal()
        );

        // Submit the transaction
        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Mark a task as completed in the escrow contract.
     * Called by the contributor when they have finished the work.
     */
    public static async completeTask(
        contributorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair from contributor's secret key
        const contributorKeypair = Keypair.fromSecret(contributorSecretKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "complete_task",
            nativeToScVal(taskId, { type: "string" })
        );

        // Submit the transaction
        const result = await this.submitTransaction(operation, contributorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Approve task completion and release escrowed funds to the contributor.
     * Called by the task creator after verifying the work is satisfactory.
     */
    public static async approveCompletion(
        creatorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "approve_completion",
            nativeToScVal(taskId, { type: "string" })
        );

        // Submit the transaction to release funds
        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Initiate a dispute for a task.
     * Can be called by either the creator or contributor when there's a disagreement.
     */
    public static async disputeTask(
        disputingPartySecretKey: string,
        taskId: string,
        reason: string
    ): Promise<{ success: boolean; txHash: string }> {
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
        const result = await this.submitTransaction(operation, disputingPartyKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Resolve a dispute for a task (admin only).
     * Determines how the escrowed funds should be distributed after a dispute.
     */
    public static async resolveDispute(
        adminSecretKey: string,
        taskId: string,
        resolution: "PayContributor" | "RefundCreator" | { PartialPayment: bigint }
    ): Promise<{ success: boolean; txHash: string }> {
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
                nativeToScVal(resolution.PartialPayment, { type: "i128" })
            ]);
        }

        // Build the contract call operation with resolution
        const operation = this.contract.call(
            "resolve_dispute",
            nativeToScVal(taskId, { type: "string" }),
            resolutionScVal
        );

        // Submit the resolution transaction
        const result = await this.submitTransaction(operation, adminKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Request a refund from the escrow.
     * Called by the creator when no contributor has been assigned to the task.
     */
    public static async refund(
        creatorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        // Create keypair from creator's secret key
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        // Build the contract call operation
        const operation = this.contract.call(
            "refund",
            nativeToScVal(taskId, { type: "string" })
        );

        // Submit the refund transaction
        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Get the USDC balance for a specific Stellar address.
     */
    public static async getUsdcBalance(publicKey: string): Promise<bigint> {
        // Create address object from public key
        const address = new Address(publicKey);

        // Build the contract call operation
        const operation = this.contract.call("get_usdc_balance", address.toScVal());

        // Get account for simulation
        const account = await this.server.getAccount(publicKey);

        // Build transaction for simulation
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate the transaction to get the balance
        const simulated = await this.server.simulateTransaction(transaction);

        // Check for simulation errors
        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Failed to get balance: ${simulated.error}`);
        }

        // Extract and return the balance
        const returnValue = simulated.result?.retval;
        if (!returnValue) {
            throw new Error("No return value from simulation");
        }

        return scValToNative(returnValue) as bigint;
    }
}
