import { ethers } from 'ethers';
import { blockchainConfig } from '../config';
import { NetworkInfo, PaymentResult } from '../types';
import { logger } from '../utils/logger';

// Contract ABIs
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

// Initialize provider and contracts
let provider: ethers.JsonRpcProvider;
let wallet: ethers.Wallet;
let yieldVault: ethers.Contract;
let streamingWallet: ethers.Contract;
let mockUSDC: ethers.Contract;

export const initializeBlockchain = () => {
  try {
    provider = new ethers.JsonRpcProvider(blockchainConfig.rpcUrl);
    wallet = new ethers.Wallet(blockchainConfig.privateKey, provider);

    yieldVault = new ethers.Contract(
      blockchainConfig.contracts.yieldVault,
      YIELD_VAULT_ABI,
      wallet
    );

    streamingWallet = new ethers.Contract(
      blockchainConfig.contracts.streamingWallet,
      STREAMING_WALLET_ABI,
      wallet
    );

    mockUSDC = new ethers.Contract(
      blockchainConfig.contracts.mockUSDC,
      MOCK_USDC_ABI,
      wallet
    );

    setupEventListeners();
    logger.info('Blockchain services initialized');
  } catch (error) {
    logger.error('Failed to initialize blockchain services', { error });
    throw error;
  }
};

const setupEventListeners = () => {
  streamingWallet.on('PaymentStreamStarted', (user: string, contentId: string, startTime: bigint) => {
    logger.info('Stream started event', { user, contentId: contentId.toString(), startTime: startTime.toString() });
  });

  streamingWallet.on('PaymentStreamStopped', (user: string, contentId: string, stopTime: bigint, duration: bigint, amount: bigint) => {
    logger.info('Stream stopped event', {
      user,
      contentId: contentId.toString(),
      stopTime: stopTime.toString(),
      duration: duration.toString(),
      amount: amount.toString()
    });
  });

  streamingWallet.on('PaymentDeducted', (user: string, contentId: string, amount: bigint, fromYield: boolean, remainingYield: bigint) => {
    logger.info('Payment deducted event', {
      user,
      contentId: contentId.toString(),
      amount: amount.toString(),
      fromYield,
      remainingYield: remainingYield.toString()
    });
  });
};

export const getUserYield = async (userAddress: string): Promise<string> => {
  try {
    const yield_ = await yieldVault.yieldOf(userAddress);
    return yield_.toString();
  } catch (error) {
    logger.error('Error getting user yield', { error, userAddress });
    throw new Error('Failed to get user yield');
  }
};

export const getUserPrincipal = async (userAddress: string): Promise<string> => {
  try {
    const principal = await yieldVault.principalOf(userAddress);
    return principal.toString();
  } catch (error) {
    logger.error('Error getting user principal', { error, userAddress });
    throw new Error('Failed to get user principal');
  }
};

export const getUserVaultBalance = async (userAddress: string): Promise<string> => {
  try {
    const balance = await yieldVault.balanceOf(userAddress);
    return balance.toString();
  } catch (error) {
    logger.error('Error getting user vault balance', { error, userAddress });
    throw new Error('Failed to get user vault balance');
  }
};

export const getCurrentCost = async (userAddress: string, contentId: string): Promise<string> => {
  try {
    const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
    const cost = await streamingWallet.getCurrentCost(userAddress, contentIdBytes32);
    return cost.toString();
  } catch (error) {
    logger.error('Error getting current cost', { error, userAddress, contentId });
    throw new Error('Failed to get current cost');
  }
};

export const getSessionInfo = async (userAddress: string, contentId: string) => {
  try {
    const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
    const session = await streamingWallet.userSessions(userAddress, contentIdBytes32);

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
};

export const getContentInfo = async (contentId: string) => {
  try {
    const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
    const content = await streamingWallet.contentInfo(contentIdBytes32);

    return {
      fullPrice: content[0].toString(),
      totalDuration: Number(content[1]),
      isListed: content[2]
    };
  } catch (error) {
    logger.error('Error getting content info', { error, contentId });
    throw new Error('Failed to get content info');
  }
};

export const startStream = async (userAddress: string, contentId: string) => {
  try {
    const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));
    const tx = await streamingWallet.startStream(contentIdBytes32);
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
};

export const stopStream = async (userAddress: string, contentId: string): Promise<PaymentResult> => {
  try {
    const contentIdBytes32 = ethers.keccak256(ethers.toUtf8Bytes(contentId));

    // Get current cost and balances before stopping
    const [currentCost, yieldBefore] = await Promise.all([
      getCurrentCost(userAddress, contentId),
      getUserYield(userAddress)
    ]);

    // Execute stop stream transaction
    const tx = await streamingWallet.stopStream(contentIdBytes32);
    const receipt = await tx.wait();

    // Get balance after to calculate what was deducted
    const yieldAfter = await getUserYield(userAddress);

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
};

export const checkUserBalance = async (userAddress: string, contentId: string) => {
  try {
    const [yield_, principal, contentInfo] = await Promise.all([
      getUserYield(userAddress),
      getUserPrincipal(userAddress),
      getContentInfo(contentId)
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
};

export const getNetworkInfo = async (): Promise<NetworkInfo> => {
  try {
    const [network, blockNumber, gasPrice] = await Promise.all([
      provider.getNetwork(),
      provider.getBlockNumber(),
      provider.getFeeData()
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
};

export const formatTokenAmount = (amountWei: string, decimals: number = 6): string => {
  try {
    return ethers.formatUnits(amountWei, decimals);
  } catch {
    return '0.00';
  }
};

export const parseTokenAmount = (amount: string, decimals: number = 6): string => {
  try {
    return ethers.parseUnits(amount.toString(), decimals).toString();
  } catch {
    return '0';
  }
};