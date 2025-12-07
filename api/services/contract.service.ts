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

export class ContractService {
    // Configuration
    private static CONFIG = {
        network: process.env.STELLAR_NETWORK!,
        rpcUrl: process.env.STELLAR_RPC_URL!,
        networkPassphrase: Networks.TESTNET,
        contractId: process.env.TASK_ESCROW_CONTRACT_ID!,
        usdcContractId: process.env.USDC_CONTRACT_ID!
    };

    private static server = new SorobanRpc.Server(this.CONFIG.rpcUrl);
    private static contract = new Contract(this.CONFIG.contractId);
    private static usdcContract = new Contract(this.CONFIG.usdcContractId);

    /**
     * Helper to build and submit a transaction
     */
    private static async submitTransaction(
        operation: xdr.Operation,
        signerKeypair: Keypair
    ) {
        // Get account info
        const account = await this.server.getAccount(signerKeypair.publicKey());

        // Build transaction
        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        // Simulate to get the prepared transaction
        const simulated = await this.server.simulateTransaction(transaction);

        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Simulation failed: ${simulated.error}`);
        }

        // Prepare the transaction with resource estimates
        const prepared = SorobanRpc.assembleTransaction(
            transaction,
            simulated
        ).build();

        // Sign the transaction
        prepared.sign(signerKeypair);

        // Submit
        const response = await this.server.sendTransaction(prepared);

        if (response.status === "ERROR") {
            throw new Error(`Transaction failed: ${response.errorResult}`);
        }

        // Wait for confirmation
        let result = await this.server.getTransaction(response.hash);
        while (result.status === "NOT_FOUND") {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            result = await this.server.getTransaction(response.hash);
        }

        if (result.status === "FAILED") {
            throw new Error(`Transaction failed: ${result.resultXdr}`);
        }

        return result;
    }

    /**
     * Create escrow with automatic USDC approval
     */
    public static async createEscrowWithApproval(
        creatorSecretKey: string,
        taskId: string,
        bountyAmount: bigint
    ): Promise<{ approvalTxHash: string; escrowTxHash: string }> {
        // Approve USDC spending first
        const approval = await this.approveUsdcSpending(
            creatorSecretKey,
            bountyAmount
        );

        // Then create escrow
        const escrow = await this.createEscrow(
            creatorSecretKey,
            taskId,
            bountyAmount
        );

        return {
            approvalTxHash: approval.txHash,
            escrowTxHash: escrow.txHash
        };
    }

    /**
     * Create a new escrow for a task
     */
    public static async createEscrow(
        creatorSecretKey: string,
        taskId: string,
        bountyAmount: bigint
    ): Promise<{ success: boolean; txHash: string }> {
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const creatorAddress = new Address(creatorKeypair.publicKey());

        const operation = this.contract.call(
            "create_escrow",
            creatorAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(bountyAmount, { type: "i128" })
        );

        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Approve USDC spending (MUST be called before createEscrow)
     */
    public static async approveUsdcSpending(
        userSecretKey: string,
        amount: bigint
    ): Promise<{ success: boolean; txHash: string }> {
        const userKeypair = Keypair.fromSecret(userSecretKey);
        const contractAddress = new Address(this.CONFIG.contractId);

        // Get current ledger for expiration calculation
        const ledger = await this.server.getLatestLedger();
        const expirationLedger = ledger.sequence + 535680; // ~31 days

        const operation = this.usdcContract.call(
            "approve",
            new Address(userKeypair.publicKey()).toScVal(),
            contractAddress.toScVal(),
            nativeToScVal(amount, { type: "i128" }),
            nativeToScVal(expirationLedger, { type: "u32" })
        );

        const result = await this.submitTransaction(operation, userKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Get escrow details for a task
     */
    public static async getEscrow(taskId: string) {
        const operation = this.contract.call(
            "get_escrow",
            nativeToScVal(taskId, { type: "string" })
        );

        // For read-only calls, we just simulate
        const account = await this.server.getAccount(
            "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF" // Any valid address works for simulation
        );

        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        const simulated = await this.server.simulateTransaction(transaction);

        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Failed to get escrow: ${simulated.error}`);
        }

        // Extract the return value
        const returnValue = simulated.result?.retval;
        if (!returnValue) {
            throw new Error("No return value from simulation");
        }

        return scValToNative(returnValue);
    }

    /**
     * Assign a contributor to a task
     */
    public static async assignContributor(
        creatorSecretKey: string,
        taskId: string,
        contributorPublicKey: string
    ): Promise<{ success: boolean; txHash: string }> {
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);
        const contributorAddress = new Address(contributorPublicKey);

        const operation = this.contract.call(
            "assign_contributor",
            nativeToScVal(taskId, { type: "string" }),
            contributorAddress.toScVal()
        );

        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Mark a task as completed (called by contributor)
     */
    public static async completeTask(
        contributorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        const contributorKeypair = Keypair.fromSecret(contributorSecretKey);

        const operation = this.contract.call(
            "complete_task",
            nativeToScVal(taskId, { type: "string" })
        );

        const result = await this.submitTransaction(operation, contributorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Approve task completion and release funds (called by creator)
     */
    public static async approveCompletion(
        creatorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        const operation = this.contract.call(
            "approve_completion",
            nativeToScVal(taskId, { type: "string" })
        );

        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Initiate a dispute
     */
    public static async disputeTask(
        disputingPartySecretKey: string,
        taskId: string,
        reason: string
    ): Promise<{ success: boolean; txHash: string }> {
        const disputingPartyKeypair = Keypair.fromSecret(disputingPartySecretKey);
        const disputingPartyAddress = new Address(disputingPartyKeypair.publicKey());

        const operation = this.contract.call(
            "dispute_task",
            disputingPartyAddress.toScVal(),
            nativeToScVal(taskId, { type: "string" }),
            nativeToScVal(reason, { type: "string" })
        );

        const result = await this.submitTransaction(operation, disputingPartyKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Resolve a dispute (admin only)
     */
    public static async resolveDispute(
        adminSecretKey: string,
        taskId: string,
        resolution: "PayContributor" | "RefundCreator" | { PartialPayment: bigint }
    ): Promise<{ success: boolean; txHash: string }> {
        const adminKeypair = Keypair.fromSecret(adminSecretKey);

        // Build resolution ScVal
        let resolutionScVal: xdr.ScVal;
        if (resolution === "PayContributor") {
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("PayContributor")
            ]);
        } else if (resolution === "RefundCreator") {
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("RefundCreator")
            ]);
        } else {
            resolutionScVal = xdr.ScVal.scvVec([
                xdr.ScVal.scvSymbol("PartialPayment"),
                nativeToScVal(resolution.PartialPayment, { type: "i128" })
            ]);
        }

        const operation = this.contract.call(
            "resolve_dispute",
            nativeToScVal(taskId, { type: "string" }),
            resolutionScVal
        );

        const result = await this.submitTransaction(operation, adminKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Request a refund (called by creator when no contributor assigned)
     */
    public static async refund(
        creatorSecretKey: string,
        taskId: string
    ): Promise<{ success: boolean; txHash: string }> {
        const creatorKeypair = Keypair.fromSecret(creatorSecretKey);

        const operation = this.contract.call(
            "refund",
            nativeToScVal(taskId, { type: "string" })
        );

        const result = await this.submitTransaction(operation, creatorKeypair);

        return {
            success: true,
            txHash: result.txHash
        };
    }

    /**
     * Get USDC balance for an address
     */
    public static async getUsdcBalance(publicKey: string): Promise<bigint> {
        const address = new Address(publicKey);

        const operation = this.contract.call("get_usdc_balance", address.toScVal());

        const account = await this.server.getAccount(publicKey);

        const transaction = new TransactionBuilder(account, {
            fee: BASE_FEE,
            networkPassphrase: this.CONFIG.networkPassphrase
        })
            .addOperation(operation)
            .setTimeout(30)
            .build();

        const simulated = await this.server.simulateTransaction(transaction);

        if (SorobanRpc.Api.isSimulationError(simulated)) {
            throw new Error(`Failed to get balance: ${simulated.error}`);
        }

        const returnValue = simulated.result?.retval;
        if (!returnValue) {
            throw new Error("No return value from simulation");
        }

        return scValToNative(returnValue) as bigint;
    }
}
