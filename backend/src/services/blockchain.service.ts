import { ethers } from 'ethers';
import { BlockchainConfig, ContractAddresses, StreamStartedEvent, StreamStoppedEvent, PaymentDeductedEvent } from '../types';
import logger from '../utils/logger';

// Contract ABIs - simplified for essential functions
const YIELD_VAULT_ABI = [
  'function yieldOf(address user) external view returns (uint256)',
  'function principalOf(address user) external view returns (uint256)',
  'function balanceOf(address user) external view returns (uint256)',
  'function totalAssets() external view returns (uint256)',
  'function withdraw(uint256 assets, address receiver, address owner) external returns (uint256)',
  'function deposit(uint256 assets, address receiver) external returns (uint256)',
  'event YieldWithdrawn(address indexed user, uint256 amount)',
  'event PrincipalWithdrawn(address indexed user, uint256 amount)'
];

const STREAMING_WALLET_ABI = [
  'function startStream(bytes32 contentId) external',
  'function pauseStream(bytes32 contentId) external',
  'function stopStream(bytes32 contentId) external',
  'function getCurrentCost(address user, bytes32 contentId) external view returns (uint256)',
  'function userSessions(address user, bytes32 contentId) external view returns (bool isActive, uint64 startTime, uint64 accumulatedTime, uint64 lastUpdateTime)',
  'function contentInfo(bytes32 contentId) external view returns (uint128 fullPrice, uint64 totalDuration, bool isListed)',
  'event PaymentStreamStarted(address indexed user, bytes32 indexed contentId, uint256 startTime)',
  'event PaymentStreamStopped(address indexed user, bytes32 indexed contentId, uint256 stopTime, uint256 totalConsumedDuration, uint256 amountDeducted)',
  'event PaymentDeducted(address indexed user, bytes32 indexed contentId, uint256 amount, bool fromYield, uint256 remainingYield)'
];

const MOCK_USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)'
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private yieldVault: ethers.Contract;
  private streamingWallet: ethers.Contract;
  private mockUSDC: ethers.Contract;
  private config: BlockchainConfig;

  constructor(config: BlockchainConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);

    // Initialize contracts
    this.yieldVault = new ethers.Contract(
      config.contracts.yieldVault,
      YIELD_VAULT_ABI,
      this.wallet
    );

    this.streamingWallet = new ethers.Contract(
      config.contracts.streamingWallet,
      STREAMING_WALLET_ABI,
      this.wallet
    );

    this.mockUSDC = new ethers.Contract(
      config.contracts.mockUSDC,
      MOCK_USDC_ABI,
      this.wallet
    );

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for blockchain events
   */
  private setupEventListeners(): void {
    // Listen for payment stream events
    this.streamingWallet.on('PaymentStreamStarted', (user: string, contentId: string, startTime: bigint) => {
      logger.info('Stream started event', { user, contentId: contentId.toString(), startTime: startTime.toString() });
    });

    this.streamingWallet.on('PaymentStreamStopped', (user: string, contentId: string, stopTime: bigint, duration: bigint, amount: bigint) => {
      logger.info('Stream stopped event', {
        user,
        contentId: contentId.toString(),
        stopTime: stopTime.toString(),
        duration: duration.toString(),
        amount: amount.toString()
      });
    });

    this.streamingWallet.on('PaymentDeducted', (user: string, contentId: string, amount: bigint, fromYield: boolean, remainingYield: bigint) => {
      logger.info('Payment deducted event', {
        user,
        contentId: contentId.toString(),
        amount: amount.toString(),
        fromYield,
        remainingYield: remainingYield.toString()
      });
    });
  }

  /**
   * Get user's yield balance
   */
  async getUserYield(userAddress: string): Promise<string> {
    try {
      const yield_ = await this.yieldVault.yieldOf(userAddress);
      return yield_.toString();
    } catch (error) {
      logger.error('Error getting user yield', { error, userAddress });
      throw new Error('Failed to get user yield');
    }
  }

  /**
   * Get user's principal balance
   */
  async getUserPrincipal(userAddress: string): Promise<string> {
    try {
      const principal = await this.yieldVault.principalOf(userAddress);
      return principal.toString();
    } catch (error) {
      logger.error('Error getting user principal', { error, userAddress });
      throw new Error('Failed to get user principal');
    }
  }

  /**
   * Get user's total vault balance (shares)
   */
  async getUserVaultBalance(userAddress: string): Promise<string> {
    try {
      const balance = await this.yieldVault.balanceOf(userAddress);
      return balance.toString();
    } catch (error) {
      logger.error('Error getting user vault balance', { error, userAddress });
      throw new Error('Failed to get user vault balance');
    }
  }

  /**
   * Get current cost for an active session
   */
  async getCurrentCost(userAddress: string, contentId: string): Promise<string> {
    try {
      const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
      const cost = await this.streamingWallet.getCurrentCost(userAddress, contentIdBytes32);
      return cost.toString();
    } catch (error) {
      logger.error('Error getting current cost', { error, userAddress, contentId });
      throw new Error('Failed to get current cost');
    }
  }

  /**
   * Get session information from blockchain
   */
  async getSessionInfo(userAddress: string, contentId: string): Promise<{
    isActive: boolean;
    startTime: number;
    accumulatedTime: number;
    lastUpdateTime: number;
  }> {
    try {
      const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
      const session = await this.streamingWallet.userSessions(userAddress, contentIdBytes32);

      return {
        isActive: session[0],
        startTime: Number(session[1]),
        accumulatedTime: Number(session[2]),
        lastUpdateTime: Number(session[3])
      };
    } catch (error) {
      logger.error('Error getting session info', { error, userAddress, contentId });
      throw new Error('Failed to get session info');
    }
  }

  /**
   * Get content information from blockchain
   */
  async getContentInfo(contentId: string): Promise<{
    fullPrice: string;
    totalDuration: number;
    isListed: boolean;
  }> {
    try {
      const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
      const content = await this.streamingWallet.contentInfo(contentIdBytes32);

      return {
        fullPrice: content[0].toString(),
        totalDuration: Number(content[1]),
        isListed: content[2]
      };
    } catch (error) {
      logger.error('Error getting content info', { error, contentId });
      throw new Error('Failed to get content info');
    }
  }

  /**
   * Start a streaming session (calls smart contract)
   */
  async startStream(userAddress: string, contentId: string): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    try {
      const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));

      // Use a wallet with the user's address for the transaction
      // Note: In production, this would be signed by the user's wallet, not the server
      const tx = await this.streamingWallet.startStream(contentIdBytes32);
      const receipt = await tx.wait();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Error starting stream', { error, userAddress, contentId });
      throw new Error('Failed to start stream');
    }
  }

  /**
   * Stop a streaming session and process payment
   */
  async stopStream(userAddress: string, contentId: string): Promise<{
    txHash: string;
    blockNumber: number;
    gasUsed: string;
    finalCost: string;
    paidFromYield: string;
    paidFromPrincipal: string;
  }> {
    try {
      const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));

      // Get current cost before stopping
      const currentCost = await this.getCurrentCost(userAddress, contentId);

      // Get user balances before payment
      const yieldBefore = await this.getUserYield(userAddress);

      // Execute stop stream transaction
      const tx = await this.streamingWallet.stopStream(contentIdBytes32);
      const receipt = await tx.wait();

      // Get user balances after payment to calculate what was deducted
      const yieldAfter = await this.getUserYield(userAddress);

      const yieldUsed = (BigInt(yieldBefore) - BigInt(yieldAfter)).toString();
      const principalUsed = (BigInt(currentCost) - BigInt(yieldUsed)).toString();

      return {
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        finalCost: currentCost,
        paidFromYield: yieldUsed,
        paidFromPrincipal: principalUsed > '0' ? principalUsed : '0'
      };
    } catch (error) {
      logger.error('Error stopping stream', { error, userAddress, contentId });
      throw new Error('Failed to stop stream');
    }
  }

  /**
   * Check if user has sufficient balance for content
   */
  async checkUserBalance(userAddress: string, contentId: string): Promise<{
    hasSufficientBalance: boolean;
    totalBalance: string;
    yieldBalance: string;
    principalBalance: string;
    contentPrice: string;
  }> {
    try {
      const [yield_, principal, contentInfo] = await Promise.all([
        this.getUserYield(userAddress),
        this.getUserPrincipal(userAddress),
        this.getContentInfo(contentId)
      ]);

      const totalBalance = (BigInt(yield_) + BigInt(principal)).toString();
      const hasSufficientBalance = BigInt(totalBalance) >= BigInt(contentInfo.fullPrice);

      return {
        hasSufficientBalance,
        totalBalance,
        yieldBalance: yield_,
        principalBalance: principal,
        contentPrice: contentInfo.fullPrice
      };
    } catch (error) {
      logger.error('Error checking user balance', { error, userAddress, contentId });
      throw new Error('Failed to check user balance');
    }
  }

  /**
   * Get network information
   */
  async getNetworkInfo(): Promise<{
    chainId: number;
    blockNumber: number;
    gasPrice: string;
  }> {
    try {
      const [network, blockNumber, gasPrice] = await Promise.all([
        this.provider.getNetwork(),
        this.provider.getBlockNumber(),
        this.provider.getFeeData()
      ]);

      return {
        chainId: Number(network.chainId),
        blockNumber,
        gasPrice: gasPrice.gasPrice?.toString() || '0'
      };
    } catch (error) {
      logger.error('Error getting network info', { error });
      throw new Error('Failed to get network info');
    }
  }

  /**
   * Calculate cost per second for content
   */
  calculateCostPerSecond(fullPrice: string, totalDuration: number): string {
    return (BigInt(fullPrice) / BigInt(totalDuration)).toString();
  }

  /**
   * Calculate total cost for duration
   */
  calculateCostForDuration(fullPrice: string, totalDuration: number, consumedDuration: number): string {
    const costPerSecond = this.calculateCostPerSecond(fullPrice, totalDuration);
    return (BigInt(costPerSecond) * BigInt(consumedDuration)).toString();
  }

  /**
   * Format wei to readable format
   */
  formatTokenAmount(amountWei: string, decimals: number = 6): string {
    return ethers.formatUnits(amountWei, decimals);
  }

  /**
   * Parse readable format to wei
   */
  parseTokenAmount(amount: string, decimals: number = 6): string {
    return ethers.parseUnits(amount, decimals).toString();
  }
}