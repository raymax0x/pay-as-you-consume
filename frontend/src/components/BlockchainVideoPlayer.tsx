'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount, useWaitForTransactionReceipt, useReadContract, useChainId } from 'wagmi';
import { useStreamingWallet, useYieldVault } from '../hooks/useContracts';
import { getContractAddress } from '../config/contracts';
import { StreamingWalletABI } from '../config/abis';

interface ContentInfo {
  id: string;
  contentId: string;
  title: string;
  description: string;
  fullPrice: string;
  totalDuration: number;
  category: string;
  thumbnailUrl?: string;
}

interface BlockchainVideoPlayerProps {
  content: ContentInfo;
}

export function BlockchainVideoPlayer({ content }: BlockchainVideoPlayerProps) {
  const { isConnected } = useAccount();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const streamingWallet = useStreamingWallet();
  const yieldVault = useYieldVault();

  // Destructure with defaults to avoid conditional hook calls
  const {
    startStream,
    pauseStream,
    stopStream,
    getContentId,
    isConnected: isStreamingConnected
  } = streamingWallet || {};

  const { refetchAll: refetchVault } = yieldVault || {};

  // Get contract addresses and user info
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const streamingWalletAddress = getContractAddress(chainId, 'StreamingWallet');
  const contentIdBytes = getContentId ? getContentId(content.contentId) : null;

  // Get session data from blockchain - always call hooks unconditionally
  const { data: sessionData, refetch: refetchSession } = useReadContract({
    address: streamingWalletAddress as `0x${string}`,
    abi: StreamingWalletABI,
    functionName: 'userSessions',
    args: userAddress && contentIdBytes ? [userAddress, contentIdBytes] : undefined,
    query: { enabled: !!userAddress && !!streamingWalletAddress && !!contentIdBytes }
  });

  // Get current cost from blockchain - always call hooks unconditionally
  const { data: blockchainCost, refetch: refetchCost } = useReadContract({
    address: streamingWalletAddress as `0x${string}`,
    abi: StreamingWalletABI,
    functionName: 'getCurrentCost',
    args: userAddress && contentIdBytes ? [userAddress, contentIdBytes] : undefined,
    query: {
      enabled: !!userAddress && !!streamingWalletAddress && !!contentIdBytes,
      refetchInterval: 1000
    }
  });

  // Get content info from blockchain - always call hooks unconditionally
  const { data: blockchainContentInfo, refetch: refetchContentInfo } = useReadContract({
    address: streamingWalletAddress as `0x${string}`,
    abi: StreamingWalletABI,
    functionName: 'contentInfo',
    args: contentIdBytes ? [contentIdBytes] : undefined,
    query: { enabled: !!streamingWalletAddress && !!contentIdBytes }
  });

  // Wait for transaction confirmation
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash as `0x${string}`,
    query: { enabled: !!txHash }
  });

  const formatPrice = (priceWei: string | bigint) => {
    const wei = typeof priceWei === 'string' ? BigInt(priceWei) : priceWei;
    return (Number(wei) / 1000000).toFixed(6);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Update timer based on blockchain session data
  useEffect(() => {
    if (sessionData && sessionData[0]) { // isActive
      const startTime = Number(sessionData[1]); // startTime
      const accumulatedTime = Number(sessionData[2]); // accumulatedTime
      const lastUpdateTime = Number(sessionData[3]); // lastUpdateTime

      const now = Math.floor(Date.now() / 1000);
      const currentSessionTime = accumulatedTime + (now - lastUpdateTime);
      setCurrentTime(currentSessionTime);
      setIsPlaying(true);

      // Update timer every second
      if (!intervalRef.current) {
        intervalRef.current = setInterval(() => {
          setCurrentTime(prev => prev + 1);
        }, 1000);
      }
    } else {
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionData]);

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess) {
      setTxHash(null);
      setLoading(false);
      setError(null);
      // Refetch session data
      refetchSession?.();
      refetchCost?.();
      refetchContentInfo?.();
      refetchVault?.();
    }
  }, [isTxSuccess, refetchSession, refetchCost, refetchContentInfo, refetchVault]);

  const handleStartStream = async () => {
    if (!userAddress || !isConnected || !isStreamingConnected) {
      setError('Please connect your wallet and ensure you\'re on Anvil network');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const hash = await startStream(content.contentId);
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Failed to start stream');
      setLoading(false);
    }
  };

  const handlePauseStream = async () => {
    if (!userAddress || !isConnected || !isStreamingConnected) return;

    setLoading(true);
    setError(null);

    try {
      const hash = await pauseStream(content.contentId);
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Failed to pause stream');
      setLoading(false);
    }
  };

  const handleStopStream = async () => {
    if (!userAddress || !isConnected || !isStreamingConnected) return;

    setLoading(true);
    setError(null);

    try {
      const hash = await stopStream(content.contentId);
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Failed to stop stream');
      setLoading(false);
    }
  };

  const isSessionActive = sessionData && sessionData[0]; // isActive

  // Get current cost from blockchain or calculate locally
  const currentCost = blockchainCost
    ? formatPrice(blockchainCost)
    : formatPrice((BigInt(content.fullPrice) * BigInt(currentTime)) / BigInt(content.totalDuration));

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Video Thumbnail/Player Area */}
      <div className="relative bg-gray-900 aspect-video flex items-center justify-center">
        {content.thumbnailUrl ? (
          <img
            src={content.thumbnailUrl}
            alt={content.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="text-white text-center">
            <div className="text-6xl mb-4">🎥</div>
            <h3 className="text-xl font-semibold">{content.title}</h3>
            <p className="text-gray-300 mt-2">{content.description}</p>
          </div>
        )}

        {/* Play overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <button
              onClick={handleStartStream}
              disabled={loading || !isConnected || isTxPending}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 disabled:opacity-50"
            >
              {loading || isTxPending ? (
                <div className="animate-spin w-8 h-8 border-2 border-gray-800 border-t-transparent rounded-full"></div>
              ) : (
                <div className="w-0 h-0 border-l-8 border-r-0 border-t-6 border-b-6 border-l-gray-800 border-t-transparent border-b-transparent ml-1"></div>
              )}
            </button>
          </div>
        )}

        {/* Playing indicator */}
        {isPlaying && (
          <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            🔴 LIVE - Blockchain Streaming
          </div>
        )}

        {/* Transaction pending indicator */}
        {(loading || isTxPending) && (
          <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm">
            ⏳ Transaction pending...
          </div>
        )}
      </div>

      {/* Controls and Info */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{content.title}</h2>
            <p className="text-gray-600 mt-1">{content.description}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>💰 Full Price: {formatPrice(content.fullPrice)} USDC</span>
              <span>⏱️ Duration: {formatDuration(content.totalDuration)}</span>
              <span>📂 {content.category}</span>
            </div>
          </div>
        </div>

        {/* Blockchain Session Info */}
        {sessionData && (
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-600">Blockchain Session</p>
                <p className="font-mono text-sm text-gray-800">
                  Start: {new Date(Number(sessionData[1]) * 1000).toLocaleTimeString()}
                </p>
                <p className="font-mono text-sm text-gray-800">
                  Accumulated: {Number(sessionData[2])}s
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-semibold ${
                  sessionData[0] ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {sessionData[0] ? 'ACTIVE' : 'PAUSED'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Blockchain Content Info */}
        {blockchainContentInfo && (
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <div className="text-sm">
              <p><strong>Blockchain Price:</strong> {formatPrice(blockchainContentInfo[0])} USDC</p>
              <p><strong>Duration:</strong> {Number(blockchainContentInfo[1])}s</p>
              <p><strong>Listed:</strong> {blockchainContentInfo[2] ? '✅ Yes' : '❌ No'}</p>
            </div>
          </div>
        )}

        {/* Timer and Cost */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">Time Watched</p>
            <p className="text-lg font-bold text-gray-800">{formatDuration(currentTime)}</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg text-center">
            <p className="text-sm text-gray-600">Current Cost</p>
            <p className="text-lg font-bold text-green-600">{currentCost} USDC</p>
            {blockchainCost && (
              <p className="text-xs text-gray-500">From blockchain</p>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Transaction Hash */}
        {txHash && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
            <p><strong>Transaction:</strong> {txHash.slice(0, 10)}...{txHash.slice(-8)}</p>
            <p>{isTxPending ? 'Confirming...' : 'Confirmed ✅'}</p>
          </div>
        )}

        {/* Controls */}
        <div className="flex gap-3">
          {!isSessionActive ? (
            <button
              onClick={handleStartStream}
              disabled={loading || !isConnected || !isStreamingConnected || isTxPending}
              className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isTxPending
                ? 'Starting...'
                : !isConnected
                  ? 'Connect Wallet to Start'
                  : !isStreamingConnected
                    ? 'Switch to Anvil Network'
                    : '▶️ Start Blockchain Streaming'
              }
            </button>
          ) : (
            <>
              <button
                onClick={handlePauseStream}
                disabled={loading || isTxPending}
                className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-yellow-700 disabled:opacity-50"
              >
                {loading || isTxPending ? 'Processing...' : '⏸️ Pause'}
              </button>
              <button
                onClick={handleStopStream}
                disabled={loading || isTxPending}
                className="bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading || isTxPending ? 'Processing...' : '⏹️ Stop & Pay'}
              </button>
            </>
          )}
        </div>

        {/* Blockchain Info */}
        <div className="mt-4 text-xs text-gray-500 text-center">
          🔗 Payments are processed on Anvil blockchain. Transactions deduct from your yield first, then principal.
        </div>
      </div>
    </div>
  );
}