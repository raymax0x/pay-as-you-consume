'use client';

import { useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, formatUnits, parseUnits } from 'viem';
import { getContractAddress, USDT_DECIMALS } from '../contracts/config';

// Import ABIs
import MockUSDTABI from '../contracts/abi/MockUSDT.json';
import YieldVaultABI from '../contracts/abi/YieldVault.json';
import StreamingWalletV2ABI from '../contracts/abi/StreamingWalletV2.json';

export function useContracts() {
  const chainId = useChainId();

  const contracts = {
    mockUSDT: {
      address: getContractAddress(chainId, 'mockUSDT'),
      abi: MockUSDTABI,
    },
    yieldVault: {
      address: getContractAddress(chainId, 'yieldVault'),
      abi: YieldVaultABI,
    },
    streamingWalletV2: {
      address: getContractAddress(chainId, 'streamingWalletV2'),
      abi: StreamingWalletV2ABI,
    },
  };

  return contracts;
}

// Hook for USDT operations
export function useUSDT() {
  const contracts = useContracts();
  const { writeContract } = useWriteContract();

  const balanceOf = (address: Address) => useReadContract({
    ...contracts.mockUSDT,
    functionName: 'balanceOf',
    args: [address],
  });

  const publicMint = async (amount: bigint) => {
    return writeContract({
      ...contracts.mockUSDT,
      functionName: 'publicMint',
      args: [amount],
    });
  };

  const approve = async (spender: Address, amount: bigint) => {
    return writeContract({
      ...contracts.mockUSDT,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  return {
    ...contracts.mockUSDT,
    balanceOf,
    publicMint,
    approve,
  };
}

// Hook for Yield Vault operations
export function useYieldVault() {
  const contracts = useContracts();
  const { writeContract } = useWriteContract();

  const balanceOf = (address: Address) => useReadContract({
    ...contracts.yieldVault,
    functionName: 'balanceOf',
    args: [address],
  });

  const principalOf = (address: Address) => useReadContract({
    ...contracts.yieldVault,
    functionName: 'principalOf',
    args: [address],
  });

  const yieldOf = (address: Address) => useReadContract({
    ...contracts.yieldVault,
    functionName: 'yieldOf',
    args: [address],
  });

  const totalAssets = () => useReadContract({
    ...contracts.yieldVault,
    functionName: 'totalAssets',
    args: [],
  });

  const deposit = async (assets: bigint, receiver: Address) => {
    return writeContract({
      ...contracts.yieldVault,
      functionName: 'deposit',
      args: [assets, receiver],
    });
  };

  const withdraw = async (assets: bigint, receiver: Address, owner: Address) => {
    return writeContract({
      ...contracts.yieldVault,
      functionName: 'withdraw',
      args: [assets, receiver, owner],
    });
  };

  return {
    ...contracts.yieldVault,
    balanceOf,
    principalOf,
    yieldOf,
    totalAssets,
    deposit,
    withdraw,
  };
}

// Hook for Streaming Wallet operations
export function useStreamingWallet() {
  const contracts = useContracts();
  const { writeContract } = useWriteContract();

  const getSession = (sessionId: bigint) => useReadContract({
    ...contracts.streamingWalletV2,
    functionName: 'getSession',
    args: [sessionId],
  });

  const getCurrentConsumedTime = (sessionId: bigint) => useReadContract({
    ...contracts.streamingWalletV2,
    functionName: 'getCurrentConsumedTime',
    args: [sessionId],
  });

  const getCurrentAmountOwed = (sessionId: bigint) => useReadContract({
    ...contracts.streamingWalletV2,
    functionName: 'getCurrentAmountOwed',
    args: [sessionId],
  });

  const getUserActiveSessions = (user: Address) => useReadContract({
    ...contracts.streamingWalletV2,
    functionName: 'getUserActiveSessions',
    args: [user],
  });

  const startSession = async (contentId: string, pricePerSecond: bigint) => {
    const contentIdBytes = `0x${Buffer.from(contentId).toString('hex').padEnd(64, '0')}` as `0x${string}`;
    return writeContract({
      ...contracts.streamingWalletV2,
      functionName: 'startSession',
      args: [contentIdBytes, pricePerSecond],
    });
  };

  const pauseSession = async (sessionId: bigint) => {
    return writeContract({
      ...contracts.streamingWalletV2,
      functionName: 'pauseSession',
      args: [sessionId],
    });
  };

  const resumeSession = async (sessionId: bigint) => {
    return writeContract({
      ...contracts.streamingWalletV2,
      functionName: 'resumeSession',
      args: [sessionId],
    });
  };

  const stopSession = async (sessionId: bigint, consumedSec: bigint) => {
    return writeContract({
      ...contracts.streamingWalletV2,
      functionName: 'stopSession',
      args: [sessionId, consumedSec],
    });
  };

  return {
    ...contracts.streamingWalletV2,
    getSession,
    getCurrentConsumedTime,
    getCurrentAmountOwed,
    getUserActiveSessions,
    startSession,
    pauseSession,
    resumeSession,
    stopSession,
  };
}

// Utility function to format USDT amounts
export function formatUSDT(amount: bigint): string {
  return formatUnits(amount, USDT_DECIMALS);
}

// Utility function to parse USDT amounts
export function parseUSDT(amount: string): bigint {
  return parseUnits(amount, USDT_DECIMALS);
}