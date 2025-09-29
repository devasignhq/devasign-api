import {
    StellarAssetId,
    NativeAssetId,
    IssuedAssetId
} from "@stellar/typescript-wallet-sdk";

/**
 * Mock Stellar Service for testing
 * Provides comprehensive mocks for blockchain operations
 */

/**
 * Mock wallet data for testing
 */
interface MockWallet {
    publicKey: string;
    secretKey: string;
    txHash: string;
}

/**
 * Mock transaction data
 */
interface MockTransaction {
    txHash: string;
    sponsorTxHash?: string;
}

/**
 * Mock account info structure
 */
interface MockAccountInfo {
    accountId: string;
    sequenceNumber: string;
    balances: Array<{
        asset_type: string;
        asset_code?: string;
        asset_issuer?: string;
        balance: string;
    }>;
}

/**
 * Mock Stellar Service class
 */
export class MockStellarService {
    private static mockWallets = new Map<string, MockWallet>();
    private static mockTransactions: MockTransaction[] = [];
    private static shouldSimulateError = false;
    private static errorType: "network" | "insufficient_funds" | "invalid_account" | "rate_limit" | null = null;
    private static transactionCounter = 1;

    /**
     * Mock createWallet method
     */
    static async createWallet(): Promise<MockWallet> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const publicKey = `MOCK_PUBLIC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const secretKey = `MOCK_SECRET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const txHash = this.generateTxHash();

        const wallet: MockWallet = {
            publicKey,
            secretKey,
            txHash
        };

        this.mockWallets.set(publicKey, wallet);
        return wallet;
    }

    /**
     * Mock createWalletViaSponsor method
     */
    static async createWalletViaSponsor(sponsorSecret: string): Promise<MockWallet> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        // Validate sponsor secret format
        if (!sponsorSecret.startsWith("MOCK_SECRET_")) {
            throw new Error("Invalid sponsor secret key format");
        }

        const publicKey = `SPONSORED_PUBLIC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const secretKey = `SPONSORED_SECRET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const txHash = this.generateTxHash();

        const wallet: MockWallet = {
            publicKey,
            secretKey,
            txHash
        };

        this.mockWallets.set(publicKey, wallet);
        return wallet;
    }

    /**
     * Mock fundWallet method
     */
    static async fundWallet(accountAddress: string): Promise<string> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        if (!this.mockWallets.has(accountAddress)) {
            throw new Error("Account not found");
        }

        return "SUCCESS";
    }

    /**
     * Mock addTrustLine method
     */
    static async addTrustLine(sourceSecret: string, _assetId?: StellarAssetId): Promise<MockTransaction> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        if (!sourceSecret.startsWith("MOCK_SECRET_") && !sourceSecret.startsWith("SPONSORED_SECRET_")) {
            throw new Error("Invalid secret key format");
        }

        const txHash = this.generateTxHash();
        const transaction: MockTransaction = { txHash };

        this.mockTransactions.push(transaction);
        return transaction;
    }

    /**
     * Mock addTrustLineViaSponsor method
     */
    static async addTrustLineViaSponsor(
        _sponsorSecret: string,
        _accountSecret: string,
        _assetId?: StellarAssetId
    ): Promise<MockTransaction> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const txHash = this.generateTxHash();
        const transaction: MockTransaction = { txHash };

        this.mockTransactions.push(transaction);
        return transaction;
    }

    /**
     * Mock transferAsset method
     */
    static async transferAsset(
        sourceSecret: string,
        destinationAddress: string,
        sendAssetId: StellarAssetId,
        destAssetId: StellarAssetId,
        amount: string
    ): Promise<MockTransaction> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        // Validate amount
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error("Invalid amount");
        }

        // Validate destination address
        if (!destinationAddress || destinationAddress.length < 10) {
            throw new Error("Invalid destination address");
        }

        const txHash = this.generateTxHash();
        const transaction: MockTransaction = { txHash };

        this.mockTransactions.push(transaction);
        return transaction;
    }

    /**
     * Mock transferAssetViaSponsor method
     */
    static async transferAssetViaSponsor(
        _sponsorSecret: string,
        _accountSecret: string,
        _destinationAddress: string,
        _sendAssetId: StellarAssetId,
        _destAssetId: StellarAssetId,
        _amount: string
    ): Promise<MockTransaction> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const txHash = this.generateTxHash();
        const sponsorTxHash = this.generateTxHash();

        const transaction: MockTransaction = {
            txHash,
            sponsorTxHash
        };

        this.mockTransactions.push(transaction);
        return transaction;
    }

    /**
     * Mock swapAsset method
     */
    static async swapAsset(
        _sourceSecret: string,
        amount: string,
        _fromAssetId?: StellarAssetId,
        _toAssetId?: StellarAssetId
    ): Promise<MockTransaction> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new Error("Invalid swap amount");
        }

        const txHash = this.generateTxHash();
        const transaction: MockTransaction = { txHash };

        this.mockTransactions.push(transaction);
        return transaction;
    }

    /**
     * Mock getAccountInfo method
     */
    static async getAccountInfo(publicKey: string): Promise<MockAccountInfo> {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        if (!this.mockWallets.has(publicKey)) {
            throw new Error("Account not found");
        }

        return {
            accountId: publicKey,
            sequenceNumber: "123456789",
            balances: [
                {
                    asset_type: "native",
                    balance: "1000.0000000"
                },
                {
                    asset_type: "credit_alphanum4",
                    asset_code: "USDC",
                    asset_issuer: "MOCK_USDC_ISSUER",
                    balance: "500.0000000"
                }
            ]
        };
    }

    /**
     * Mock getTopUpTransactions method
     */
    static async getTopUpTransactions(publicKey: string) {
        await this.simulateNetworkDelay();

        if (this.shouldSimulateError) {
            this.throwMockError();
        }

        return [
            {
                id: "mock_payment_1",
                type: "payment",
                to: publicKey,
                amount: "100.0000000",
                asset_type: "native",
                created_at: new Date().toISOString()
            },
            {
                id: "mock_payment_2",
                type: "path_payment_strict_receive",
                to: publicKey,
                amount: "50.0000000",
                asset_type: "credit_alphanum4",
                asset_code: "USDC",
                created_at: new Date(Date.now() - 86400000).toISOString()
            }
        ];
    }

    /**
     * Mock buildPaymentTransactionStream method
     */
    static async buildPaymentTransactionStream(_publicKey: string) {
        return {
            stream: {
                on: jest.fn(),
                close: jest.fn()
            }
        };
    }

    /**
     * Test utility methods
     */
    static simulateError(errorType: "network" | "insufficient_funds" | "invalid_account" | "rate_limit") {
        this.shouldSimulateError = true;
        this.errorType = errorType;
    }

    static clearErrorSimulation() {
        this.shouldSimulateError = false;
        this.errorType = null;
    }

    static clearMockData() {
        this.mockWallets.clear();
        this.mockTransactions.length = 0;
        this.transactionCounter = 1;
    }

    static getMockWallets() {
        return new Map(this.mockWallets);
    }

    static getMockTransactions() {
        return [...this.mockTransactions];
    }

    static addMockWallet(publicKey: string, wallet: MockWallet) {
        this.mockWallets.set(publicKey, wallet);
    }

    /**
     * Private helper methods
     */
    private static async simulateNetworkDelay() {
        // Simulate realistic network delay
        await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));
    }

    private static generateTxHash(): string {
        return `mock_tx_${this.transactionCounter++}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private static throwMockError() {
        switch (this.errorType) {
        case "network":
            throw new Error("Network connection failed");

        case "insufficient_funds":
            const insufficientFundsError = new Error("Insufficient funds");
            (insufficientFundsError as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: "tx_insufficient_balance"
                        }
                    }
                }
            };
            throw insufficientFundsError;

        case "invalid_account":
            const invalidAccountError = new Error("Account does not exist");
            (invalidAccountError as any).response = {
                status: 404,
                data: {
                    extras: {
                        result_codes: {
                            transaction: "tx_no_account"
                        }
                    }
                }
            };
            throw invalidAccountError;

        case "rate_limit":
            const rateLimitError = new Error("Rate limit exceeded");
            (rateLimitError as any).response = {
                status: 429,
                headers: {
                    "retry-after": "60"
                }
            };
            throw rateLimitError;

        default:
            throw new Error("Stellar service error");
        }
    }
}

/**
 * Jest mock factory for StellarService
 */
export const createStellarServiceMock = () => {
    return {
        createWallet: jest.fn().mockImplementation(MockStellarService.createWallet),
        createWalletViaSponsor: jest.fn().mockImplementation(MockStellarService.createWalletViaSponsor),
        fundWallet: jest.fn().mockImplementation(MockStellarService.fundWallet),
        addTrustLine: jest.fn().mockImplementation(MockStellarService.addTrustLine),
        addTrustLineViaSponsor: jest.fn().mockImplementation(MockStellarService.addTrustLineViaSponsor),
        transferAsset: jest.fn().mockImplementation(MockStellarService.transferAsset),
        transferAssetViaSponsor: jest.fn().mockImplementation(MockStellarService.transferAssetViaSponsor),
        swapAsset: jest.fn().mockImplementation(MockStellarService.swapAsset),
        getAccountInfo: jest.fn().mockImplementation(MockStellarService.getAccountInfo),
        getTopUpTransactions: jest.fn().mockImplementation(MockStellarService.getTopUpTransactions),
        buildPaymentTransactionStream: jest.fn().mockImplementation(MockStellarService.buildPaymentTransactionStream)
    };
};

/**
 * Mock asset IDs for testing
 */
export const mockAssetIds = {
    xlm: new NativeAssetId(),
    usdc: new IssuedAssetId("USDC", "MOCK_USDC_ISSUER"),
    custom: new IssuedAssetId("TEST", "MOCK_TEST_ISSUER")
};

/**
 * Test helper functions for Stellar mocking
 */
export const StellarTestHelpers = {
    /**
     * Creates a mock wallet for testing
     */
    createMockWallet: (overrides: Partial<MockWallet> = {}): MockWallet => ({
        publicKey: `MOCK_PUBLIC_${Date.now()}`,
        secretKey: `MOCK_SECRET_${Date.now()}`,
        txHash: `mock_tx_${Date.now()}`,
        ...overrides
    }),

    /**
     * Creates mock account info for testing
     */
    createMockAccountInfo: (publicKey: string, overrides: Partial<MockAccountInfo> = {}): MockAccountInfo => ({
        accountId: publicKey,
        sequenceNumber: "123456789",
        balances: [
            {
                asset_type: "native",
                balance: "1000.0000000"
            }
        ],
        ...overrides
    }),

    /**
     * Sets up Stellar mocks for testing
     */
    setupStellarMocks: () => {
        MockStellarService.clearMockData();
        MockStellarService.clearErrorSimulation();

        return {
            mockService: MockStellarService,
            mockAssetIds
        };
    },

    /**
     * Resets all Stellar mocks
     */
    resetStellarMocks: () => {
        MockStellarService.clearMockData();
        MockStellarService.clearErrorSimulation();
        jest.clearAllMocks();
    }
};
