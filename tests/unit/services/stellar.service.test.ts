import { StellarService } from '../../../api/services/stellar.service';
import { StellarServiceError } from '../../../api/config/stellar.config';
import { 
    MockStellarService, 
    StellarTestHelpers,
    createStellarServiceMock,
    mockAssetIds
} from '../../mocks/stellar.service.mock';

// Mock Stellar SDK
const mockKeypair = {
    publicKey: 'MOCK_PUBLIC_KEY',
    secretKey: 'MOCK_SECRET_KEY',
    sign: jest.fn()
};

const mockAccountKeypair = {
    keypair: mockKeypair,
    publicKey: 'MOCK_PUBLIC_KEY',
    secretKey: 'MOCK_SECRET_KEY'
};

const mockTransaction = {
    build: jest.fn().mockReturnThis(),
    sign: jest.fn(),
    hash: jest.fn().mockReturnValue(Buffer.from('mock_hash'))
};

const mockTxBuilder = {
    createAccount: jest.fn().mockReturnThis(),
    addAssetSupport: jest.fn().mockReturnThis(),
    transfer: jest.fn().mockReturnThis(),
    pathPay: jest.fn().mockReturnThis(),
    swap: jest.fn().mockReturnThis(),
    sponsoring: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue(mockTransaction)
};

const mockStellar = {
    transaction: jest.fn().mockResolvedValue(mockTxBuilder),
    submitTransaction: jest.fn().mockResolvedValue(undefined),
    submitWithFeeIncrease: jest.fn().mockResolvedValue(undefined),
    fundTestnetAccount: jest.fn().mockResolvedValue(undefined),
    makeFeeBump: jest.fn().mockReturnValue(mockTransaction),
    server: {
        payments: jest.fn().mockReturnThis(),
        forAccount: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnThis(),
        call: jest.fn().mockResolvedValue({ records: [] }),
        stream: {
            on: jest.fn(),
            close: jest.fn()
        }
    }
};

const mockAccount = {
    createKeypair: jest.fn().mockReturnValue(mockAccountKeypair),
    getInfo: jest.fn().mockResolvedValue({
        accountId: 'MOCK_ACCOUNT_ID',
        sequenceNumber: '123456789',
        balances: []
    })
};

jest.mock('@stellar/typescript-wallet-sdk', () => ({
    AccountKeypair: jest.fn().mockImplementation(() => mockAccountKeypair),
    Keypair: {
        fromSecret: jest.fn().mockReturnValue(mockKeypair)
    },
    NativeAssetId: jest.fn(),
    IssuedAssetId: jest.fn()
}));

jest.mock('../../../api/config/stellar.config', () => ({
    StellarServiceError: class extends Error {
        constructor(message: string, cause?: any) {
            super(message);
            this.name = 'StellarServiceError';
            this.stack = cause;
        }
    },
    stellar: mockStellar,
    account: mockAccount,
    usdcAssetId: mockAssetIds.usdc,
    xlmAssetId: mockAssetIds.xlm
}));

// Mock environment variables
const originalEnv = process.env;

describe('StellarService', () => {
    let stellarService: StellarService;

    beforeEach(() => {
        // Set up environment variables
        process.env = {
            ...originalEnv,
            STELLAR_MASTER_SECRET_KEY: 'MOCK_MASTER_SECRET_KEY',
            STELLAR_MASTER_PUBLIC_KEY: 'MOCK_MASTER_PUBLIC_KEY'
        };

        // Reset all mocks
        jest.clearAllMocks();
        StellarTestHelpers.resetStellarMocks();

        // Create service instance
        stellarService = new StellarService();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('constructor', () => {
        it('should initialize with master account credentials', () => {
            expect(() => new StellarService()).not.toThrow();
        });

        it('should throw error when master secret key is missing', () => {
            delete process.env.STELLAR_MASTER_SECRET_KEY;
            
            expect(() => new StellarService()).toThrow(StellarServiceError);
            expect(() => new StellarService()).toThrow('Missing Stellar master account credentials');
        });

        it('should throw error when master public key is missing', () => {
            delete process.env.STELLAR_MASTER_PUBLIC_KEY;
            
            expect(() => new StellarService()).toThrow(StellarServiceError);
        });

        it('should throw error when master secret key is invalid', () => {
            process.env.STELLAR_MASTER_SECRET_KEY = 'invalid_key';
            
            const { Keypair } = require('@stellar/typescript-wallet-sdk');
            Keypair.fromSecret.mockImplementation(() => {
                throw new Error('Invalid secret key');
            });
            
            expect(() => new StellarService()).toThrow(StellarServiceError);
            expect(() => new StellarService()).toThrow('Invalid Stellar master account credentials');
        });
    });    
describe('createWallet', () => {
        it('should create a new wallet successfully', async () => {
            // Arrange
            const expectedWallet = {
                publicKey: 'MOCK_PUBLIC_KEY',
                secretKey: 'MOCK_SECRET_KEY',
                txHash: 'mock_hash'
            };

            // Act
            const result = await stellarService.createWallet();

            // Assert
            expect(result).toEqual(expectedWallet);
            expect(mockAccount.createKeypair).toHaveBeenCalled();
            expect(mockStellar.transaction).toHaveBeenCalled();
            expect(mockTxBuilder.createAccount).toHaveBeenCalledWith(mockAccountKeypair);
            expect(mockTransaction.sign).toHaveBeenCalled();
            expect(mockStellar.submitTransaction).toHaveBeenCalledWith(mockTransaction);
        });

        it('should handle transaction submission errors', async () => {
            // Arrange
            const error = new Error('Transaction failed');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_failed'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.createWallet()).rejects.toThrow(StellarServiceError);
            await expect(stellarService.createWallet()).rejects.toThrow('Creation failed');
        });

        it('should handle network errors', async () => {
            // Arrange
            mockStellar.submitTransaction.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            await expect(stellarService.createWallet()).rejects.toThrow(StellarServiceError);
            await expect(stellarService.createWallet()).rejects.toThrow('Network error');
        });

        it('should handle unknown errors', async () => {
            // Arrange
            mockStellar.submitTransaction.mockRejectedValue({ unknown: 'error' });

            // Act & Assert
            await expect(stellarService.createWallet()).rejects.toThrow(StellarServiceError);
            await expect(stellarService.createWallet()).rejects.toThrow('Failed to create wallet');
        });
    });

    describe('createWalletViaSponsor', () => {
        it('should create a sponsored wallet successfully', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const expectedWallet = {
                publicKey: 'MOCK_PUBLIC_KEY',
                secretKey: 'MOCK_SECRET_KEY',
                txHash: 'mock_hash'
            };

            // Act
            const result = await stellarService.createWalletViaSponsor(sponsorSecret);

            // Assert
            expect(result).toEqual(expectedWallet);
            expect(mockTxBuilder.sponsoring).toHaveBeenCalled();
            expect(mockAccountKeypair.keypair.sign).toHaveBeenCalledWith(mockTransaction);
            expect(mockTransaction.sign).toHaveBeenCalled();
        });

        it('should handle sponsor transaction errors', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const error = new Error('Sponsor transaction failed');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_sponsor_failed'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.createWalletViaSponsor(sponsorSecret))
                .rejects.toThrow(StellarServiceError);
        });
    });

    describe('fundWallet', () => {
        it('should fund wallet successfully', async () => {
            // Arrange
            const accountAddress = 'MOCK_ACCOUNT_ADDRESS';

            // Act
            const result = await stellarService.fundWallet(accountAddress);

            // Assert
            expect(result).toBe('SUCCESS');
            expect(mockStellar.fundTestnetAccount).toHaveBeenCalledWith(accountAddress);
        });

        it('should handle funding errors', async () => {
            // Arrange
            const accountAddress = 'MOCK_ACCOUNT_ADDRESS';
            mockStellar.fundTestnetAccount.mockRejectedValue(new Error('Funding failed'));

            // Act & Assert
            await expect(stellarService.fundWallet(accountAddress))
                .rejects.toThrow(StellarServiceError);
            await expect(stellarService.fundWallet(accountAddress))
                .rejects.toThrow('Failed to fund wallet');
        });
    });

    describe('addTrustLine', () => {
        it('should add trustline successfully', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const expectedResult = { txHash: 'mock_hash' };

            // Act
            const result = await stellarService.addTrustLine(sourceSecret);

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockTxBuilder.addAssetSupport).toHaveBeenCalledWith(mockAssetIds.usdc);
            expect(mockTransaction.sign).toHaveBeenCalled();
            expect(mockStellar.submitTransaction).toHaveBeenCalledWith(mockTransaction);
        });

        it('should add trustline with custom asset', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const customAsset = mockAssetIds.custom;

            // Act
            await stellarService.addTrustLine(sourceSecret, customAsset);

            // Assert
            expect(mockTxBuilder.addAssetSupport).toHaveBeenCalledWith(customAsset);
        });

        it('should handle trustline creation errors', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const error = new Error('Trustline failed');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_trustline_failed'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.addTrustLine(sourceSecret))
                .rejects.toThrow(StellarServiceError);
            await expect(stellarService.addTrustLine(sourceSecret))
                .rejects.toThrow('Adding trustline failed');
        });
    });   
 describe('addTrustLineViaSponsor', () => {
        it('should add sponsored trustline successfully', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const accountSecret = 'ACCOUNT_SECRET_KEY';
            const expectedResult = { txHash: 'mock_hash' };

            // Act
            const result = await stellarService.addTrustLineViaSponsor(sponsorSecret, accountSecret);

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockTxBuilder.sponsoring).toHaveBeenCalled();
            expect(mockTransaction.sign).toHaveBeenCalledTimes(2); // Account and sponsor signatures
        });

        it('should handle sponsored trustline errors', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const accountSecret = 'ACCOUNT_SECRET_KEY';
            
            mockStellar.submitTransaction.mockRejectedValue(new Error('Sponsored trustline failed'));

            // Act & Assert
            await expect(stellarService.addTrustLineViaSponsor(sponsorSecret, accountSecret))
                .rejects.toThrow(StellarServiceError);
        });
    });

    describe('transferAsset', () => {
        it('should transfer same asset type successfully', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const sendAssetId = mockAssetIds.xlm;
            const destAssetId = mockAssetIds.xlm;
            const amount = '100.0';
            const expectedResult = { txHash: 'mock_hash' };

            // Act
            const result = await stellarService.transferAsset(
                sourceSecret, 
                destinationAddress, 
                sendAssetId, 
                destAssetId, 
                amount
            );

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockTxBuilder.transfer).toHaveBeenCalledWith(
                destinationAddress,
                sendAssetId,
                amount
            );
            expect(mockTxBuilder.pathPay).not.toHaveBeenCalled();
        });

        it('should use path payment for different asset types', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const sendAssetId = mockAssetIds.xlm;
            const destAssetId = mockAssetIds.usdc;
            const amount = '100.0';

            // Act
            await stellarService.transferAsset(
                sourceSecret, 
                destinationAddress, 
                sendAssetId, 
                destAssetId, 
                amount
            );

            // Assert
            expect(mockTxBuilder.pathPay).toHaveBeenCalledWith({
                destinationAddress,
                sendAsset: sendAssetId,
                destAsset: destAssetId,
                sendAmount: amount
            });
            expect(mockTxBuilder.transfer).not.toHaveBeenCalled();
        });

        it('should handle transfer errors', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const sendAssetId = mockAssetIds.xlm;
            const destAssetId = mockAssetIds.xlm;
            const amount = '100.0';

            const error = new Error('Transfer failed');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_insufficient_balance'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.transferAsset(
                sourceSecret, destinationAddress, sendAssetId, destAssetId, amount
            )).rejects.toThrow(StellarServiceError);
            await expect(stellarService.transferAsset(
                sourceSecret, destinationAddress, sendAssetId, destAssetId, amount
            )).rejects.toThrow('Transaction failed');
        });
    });

    describe('transferAssetViaSponsor', () => {
        it('should transfer asset with sponsor successfully', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const accountSecret = 'ACCOUNT_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const sendAssetId = mockAssetIds.xlm;
            const destAssetId = mockAssetIds.xlm;
            const amount = '100.0';
            const expectedResult = { 
                txHash: 'mock_hash',
                sponsorTxHash: 'mock_hash'
            };

            // Act
            const result = await stellarService.transferAssetViaSponsor(
                sponsorSecret,
                accountSecret,
                destinationAddress,
                sendAssetId,
                destAssetId,
                amount
            );

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockStellar.makeFeeBump).toHaveBeenCalled();
            expect(mockTransaction.sign).toHaveBeenCalledTimes(2); // Account and sponsor signatures
        });

        it('should handle sponsored transfer errors', async () => {
            // Arrange
            const sponsorSecret = 'SPONSOR_SECRET_KEY';
            const accountSecret = 'ACCOUNT_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const sendAssetId = mockAssetIds.xlm;
            const destAssetId = mockAssetIds.xlm;
            const amount = '100.0';

            mockStellar.submitTransaction.mockRejectedValue(new Error('Sponsored transfer failed'));

            // Act & Assert
            await expect(stellarService.transferAssetViaSponsor(
                sponsorSecret, accountSecret, destinationAddress, sendAssetId, destAssetId, amount
            )).rejects.toThrow(StellarServiceError);
        });
    });

    describe('swapAsset', () => {
        it('should swap assets successfully', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const amount = '100.0';
            const fromAssetId = mockAssetIds.xlm;
            const toAssetId = mockAssetIds.usdc;
            const expectedResult = { txHash: 'mock_hash' };

            // Act
            const result = await stellarService.swapAsset(sourceSecret, amount, fromAssetId, toAssetId);

            // Assert
            expect(result).toEqual(expectedResult);
            expect(mockTxBuilder.swap).toHaveBeenCalledWith(fromAssetId, toAssetId, amount);
            expect(mockTransaction.sign).toHaveBeenCalled();
            expect(mockStellar.submitTransaction).toHaveBeenCalledWith(mockTransaction);
        });

        it('should use default assets when not specified', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const amount = '100.0';

            // Act
            await stellarService.swapAsset(sourceSecret, amount);

            // Assert
            expect(mockTxBuilder.swap).toHaveBeenCalledWith(mockAssetIds.xlm, mockAssetIds.usdc, amount);
        });

        it('should handle swap errors', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const amount = '100.0';

            const error = new Error('Swap failed');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_swap_failed'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.swapAsset(sourceSecret, amount))
                .rejects.toThrow(StellarServiceError);
            await expect(stellarService.swapAsset(sourceSecret, amount))
                .rejects.toThrow('Swap transaction failed');
        });
    }); 
   describe('getAccountInfo', () => {
        it('should get account info successfully', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            const expectedAccountInfo = {
                accountId: 'MOCK_ACCOUNT_ID',
                sequenceNumber: '123456789',
                balances: []
            };

            // Act
            const result = await stellarService.getAccountInfo(publicKey);

            // Assert
            expect(result).toEqual(expectedAccountInfo);
            expect(mockAccount.getInfo).toHaveBeenCalledWith({ accountAddress: publicKey });
        });

        it('should handle account info errors', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            const error = new Error('Account not found');
            (error as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_no_account'
                        }
                    }
                }
            };

            mockAccount.getInfo.mockRejectedValue(error);

            // Act & Assert
            await expect(stellarService.getAccountInfo(publicKey))
                .rejects.toThrow(StellarServiceError);
            await expect(stellarService.getAccountInfo(publicKey))
                .rejects.toThrow('Get account failed');
        });

        it('should handle network errors for account info', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            mockAccount.getInfo.mockRejectedValue(new Error('Network error'));

            // Act & Assert
            await expect(stellarService.getAccountInfo(publicKey))
                .rejects.toThrow(StellarServiceError);
            await expect(stellarService.getAccountInfo(publicKey))
                .rejects.toThrow('Network error');
        });
    });

    describe('getTopUpTransactions', () => {
        it('should get incoming payment transactions', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            const mockPayments = {
                records: [
                    {
                        id: 'payment_1',
                        type: 'payment',
                        to: publicKey,
                        amount: '100.0',
                        asset_type: 'native'
                    },
                    {
                        id: 'payment_2',
                        type: 'path_payment_strict_receive',
                        to: publicKey,
                        amount: '50.0',
                        asset_type: 'credit_alphanum4'
                    },
                    {
                        id: 'payment_3',
                        type: 'payment',
                        to: 'OTHER_ADDRESS', // Should be filtered out
                        amount: '25.0',
                        asset_type: 'native'
                    }
                ]
            };

            mockStellar.server.call.mockResolvedValue(mockPayments);

            // Act
            const result = await stellarService.getTopUpTransactions(publicKey);

            // Assert
            expect(result).toHaveLength(2); // Only payments to the specified address
            expect(result[0].source_account).toBe(publicKey); // Todo: Update to '.to'
            expect(result[1].source_account).toBe(publicKey); // Todo: Update to '.to'
            expect(mockStellar.server.payments).toHaveBeenCalled();
            expect(mockStellar.server.forAccount).toHaveBeenCalledWith(publicKey);
            expect(mockStellar.server.order).toHaveBeenCalledWith('desc');
            expect(mockStellar.server.limit).toHaveBeenCalledWith(100);
        });

        it('should return empty array when no payments found', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            mockStellar.server.call.mockResolvedValue({ records: [] });

            // Act
            const result = await stellarService.getTopUpTransactions(publicKey);

            // Assert
            expect(result).toEqual([]);
        });

        it('should filter out non-incoming payments', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';
            const mockPayments = {
                records: [
                    {
                        id: 'payment_1',
                        type: 'create_account',
                        to: publicKey
                    },
                    {
                        id: 'payment_2',
                        type: 'manage_offer',
                        to: publicKey
                    }
                ]
            };

            mockStellar.server.call.mockResolvedValue(mockPayments);

            // Act
            const result = await stellarService.getTopUpTransactions(publicKey);

            // Assert
            expect(result).toEqual([]);
        });
    });

    describe('buildPaymentTransactionStream', () => {
        it('should build payment transaction stream', async () => {
            // Arrange
            const publicKey = 'MOCK_PUBLIC_KEY';

            // Act
            const result = await stellarService.buildPaymentTransactionStream(publicKey);

            // Assert
            expect(result).toBeDefined();
            expect(mockStellar.server.payments).toHaveBeenCalled();
            expect(mockStellar.server.forAccount).toHaveBeenCalledWith(publicKey);
            expect(mockStellar.server.cursor).toHaveBeenCalledWith('now');
        });
    });

    describe('Error Handling', () => {
        it('should handle Stellar SDK errors consistently', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const stellarError = new Error('Stellar SDK error');
            (stellarError as any).response = {
                status: 500,
                data: { message: 'Internal server error' }
            };

            mockStellar.submitTransaction.mockRejectedValue(stellarError);

            // Act & Assert
            await expect(stellarService.createWallet())
                .rejects.toThrow(StellarServiceError);
        });

        it('should handle network timeouts', async () => {
            // Arrange
            const timeoutError = new Error('Request timeout');
            mockStellar.transaction.mockRejectedValue(timeoutError);

            // Act & Assert
            await expect(stellarService.createWallet())
                .rejects.toThrow(StellarServiceError);
        });

        it('should preserve original error information', async () => {
            // Arrange
            const originalError = new Error('Original error message');
            (originalError as any).response = {
                status: 400,
                data: {
                    extras: {
                        result_codes: {
                            transaction: 'tx_failed'
                        }
                    }
                }
            };

            mockStellar.submitTransaction.mockRejectedValue(originalError);

            // Act & Assert
            try {
                await stellarService.createWallet();
            } catch (error) {
                expect(error).toBeInstanceOf(StellarServiceError);
                expect((error as any).message).toContain('Creation failed');
                expect((error as any).cause).toBe(originalError);
            }
        });
    });

    describe('Asset Comparison', () => {
        it('should correctly identify same native assets', async () => {
            // This tests the private isSameAsset method indirectly through transferAsset
            
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const xlmAsset1 = mockAssetIds.xlm;
            const xlmAsset2 = mockAssetIds.xlm;
            const amount = '100.0';

            // Act
            await stellarService.transferAsset(
                sourceSecret, 
                destinationAddress, 
                xlmAsset1, 
                xlmAsset2, 
                amount
            );

            // Assert - Should use transfer, not pathPay
            expect(mockTxBuilder.transfer).toHaveBeenCalled();
            expect(mockTxBuilder.pathPay).not.toHaveBeenCalled();
        });

        it('should correctly identify different asset types', async () => {
            // Arrange
            const sourceSecret = 'SOURCE_SECRET_KEY';
            const destinationAddress = 'DESTINATION_ADDRESS';
            const xlmAsset = mockAssetIds.xlm;
            const usdcAsset = mockAssetIds.usdc;
            const amount = '100.0';

            // Act
            await stellarService.transferAsset(
                sourceSecret, 
                destinationAddress, 
                xlmAsset, 
                usdcAsset, 
                amount
            );

            // Assert - Should use pathPay, not transfer
            expect(mockTxBuilder.pathPay).toHaveBeenCalled();
            expect(mockTxBuilder.transfer).not.toHaveBeenCalled();
        });
    });
});