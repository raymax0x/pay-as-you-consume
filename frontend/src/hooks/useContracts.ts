'use client';

import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi';
import { formatUnits, parseUnits, keccak256, toHex } from 'viem';
import { YieldVaultABI, StreamingWalletABI, MockUSDCABI } from '../config/abis';
import { getContractAddress } from '../config/contracts';

export function useYieldVault() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'YieldVault');

  const { data: principalBalance, refetch: refetchPrincipal } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: YieldVaultABI,
    functionName: 'principalOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const { data: yieldBalance, refetch: refetchYield } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: YieldVaultABI,
    functionName: 'yieldOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const { data: vaultShares, refetch: refetchShares } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: YieldVaultABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const { writeContract: withdraw } = useWriteContract();

  const refetchAll = () => {
    refetchPrincipal();
    refetchYield();
    refetchShares();
  };

  const withdrawFromVault = async (amount: bigint) => {
    if (!address || !contractAddress) throw new Error('Not connected');

    return withdraw({
      address: contractAddress as `0x${string}`,
      abi: YieldVaultABI,
      functionName: 'withdraw',
      args: [amount, address, address]
    });
  };

  return {
    principalBalance: principalBalance ? formatUnits(principalBalance as bigint, 6) : '0',
    yieldBalance: yieldBalance ? formatUnits(yieldBalance as bigint, 6) : '0',
    totalBalance: principalBalance && yieldBalance
      ? formatUnits((principalBalance as bigint) + (yieldBalance as bigint), 6)
      : '0',
    vaultShares: vaultShares ? formatUnits(vaultShares as bigint, 18) : '0',
    withdrawFromVault,
    refetchAll,
    isConnected: !!address && !!contractAddress
  };
}

export function useStreamingWallet() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'StreamingWallet');

  const { writeContract: writeStream } = useWriteContract();

  const getContentId = (contentIdString: string) => {
    return keccak256(toHex(contentIdString));
  };

  const startStream = async (contentId: string) => {
    if (!address || !contractAddress) throw new Error('Not connected');

    const contentIdBytes = getContentId(contentId);
    return writeStream({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'startStream',
      args: [contentIdBytes]
    });
  };

  const pauseStream = async (contentId: string) => {
    if (!address || !contractAddress) throw new Error('Not connected');

    const contentIdBytes = getContentId(contentId);
    return writeStream({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'pauseStream',
      args: [contentIdBytes]
    });
  };

  const stopStream = async (contentId: string) => {
    if (!address || !contractAddress) throw new Error('Not connected');

    const contentIdBytes = getContentId(contentId);
    return writeStream({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'stopStream',
      args: [contentIdBytes]
    });
  };

  const getUserSession = (contentId: string) => {
    if (!address || !contractAddress) return null;

    const contentIdBytes = getContentId(contentId);
    return useReadContract({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'userSessions',
      args: [address, contentIdBytes],
      query: { enabled: !!address && !!contractAddress }
    });
  };

  const getCurrentCost = (contentId: string) => {
    if (!address || !contractAddress) return null;

    const contentIdBytes = getContentId(contentId);
    return useReadContract({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'getCurrentCost',
      args: [address, contentIdBytes],
      query: { enabled: !!address && !!contractAddress, refetchInterval: 1000 }
    });
  };

  const getContentInfo = (contentId: string) => {
    if (!contractAddress) return null;

    const contentIdBytes = getContentId(contentId);
    return useReadContract({
      address: contractAddress as `0x${string}`,
      abi: StreamingWalletABI,
      functionName: 'contentInfo',
      args: [contentIdBytes],
      query: { enabled: !!contractAddress }
    });
  };

  return {
    startStream,
    pauseStream,
    stopStream,
    getUserSession,
    getCurrentCost,
    getContentInfo,
    getContentId,
    isConnected: !!address && !!contractAddress
  };
}

export function useMockUSDC() {
  const { address } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId, 'MockUSDC');

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: MockUSDCABI,
    functionName: 'allowance',
    args: address && getContractAddress(chainId, 'StreamingWallet')
      ? [address, getContractAddress(chainId, 'StreamingWallet') as `0x${string}`]
      : undefined,
    query: { enabled: !!address && !!contractAddress }
  });

  const { writeContract: approve } = useWriteContract();

  const approveStreamingWallet = async (amount: string) => {
    if (!address || !contractAddress) throw new Error('Not connected');

    const streamingWalletAddress = getContractAddress(chainId, 'StreamingWallet');
    if (!streamingWalletAddress) throw new Error('StreamingWallet not found');

    const amountWei = parseUnits(amount, 6);
    return approve({
      address: contractAddress as `0x${string}`,
      abi: MockUSDCABI,
      functionName: 'approve',
      args: [streamingWalletAddress as `0x${string}`, amountWei]
    });
  };

  return {
    balance: balance ? formatUnits(balance as bigint, 6) : '0',
    allowance: allowance ? formatUnits(allowance as bigint, 6) : '0',
    approveStreamingWallet,
    refetchBalance,
    refetchAllowance,
    isConnected: !!address && !!contractAddress
  };
}