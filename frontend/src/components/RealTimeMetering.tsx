'use client';

import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useStreamingWallet, formatUSDT } from '../hooks/useContracts';

interface RealTimeMeteringProps {
  sessionId: bigint | null;
  isActive: boolean;
  pricePerSecond: bigint;
}

export function RealTimeMetering({ sessionId, isActive, pricePerSecond }: RealTimeMeteringProps) {
  const { address } = useAccount();
  const streamingWallet = useStreamingWallet();

  const [localTime, setLocalTime] = useState(0);
  const [localCost, setLocalCost] = useState(0n);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get real data from contract
  const consumedTime = sessionId ? streamingWallet.getCurrentConsumedTime(sessionId) : null;
  const amountOwed = sessionId ? streamingWallet.getCurrentAmountOwed(sessionId) : null;

  // Start/stop local timer based on session state
  useEffect(() => {
    if (isActive && sessionId) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setLocalTime(elapsed);
          setLocalCost(BigInt(elapsed) * pricePerSecond);
        }
      }, 100); // Update every 100ms for smooth display
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, sessionId, pricePerSecond]);

  // Reset local counters when session changes
  useEffect(() => {
    if (!sessionId) {
      setLocalTime(0);
      setLocalCost(0n);
    }
  }, [sessionId]);

  if (!sessionId) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-800 dark:text-blue-200">
          Real-Time Metering
        </h4>
        <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Local Timer (Client-side) */}
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Client Time</div>
          <div className="text-lg font-mono font-bold text-blue-600 dark:text-blue-400">
            {formatTime(localTime)}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {formatUSDT(localCost)} USDT
          </div>
        </div>

        {/* Contract Data */}
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">On-Chain</div>
          <div className="text-lg font-mono font-bold text-purple-600 dark:text-purple-400">
            {consumedTime?.data ? formatTime(Number(consumedTime.data)) : '0:00'}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-300">
            {amountOwed?.data ? formatUSDT(amountOwed.data) : '0.00'} USDT
          </div>
        </div>
      </div>

      {/* Rate Information */}
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400">
          <span>Rate:</span>
          <span className="font-mono">{formatUSDT(pricePerSecond)} USDT/sec</span>
        </div>
        <div className="flex justify-between text-xs text-blue-600 dark:text-blue-400 mt-1">
          <span>Per Minute:</span>
          <span className="font-mono">{formatUSDT(pricePerSecond * 60n)} USDT/min</span>
        </div>
      </div>

      {/* Sync Status */}
      {consumedTime?.data && localTime > 0 && (
        <div className="mt-2 text-xs text-center">
          {Math.abs(localTime - Number(consumedTime.data)) <= 2 ? (
            <span className="text-green-600 dark:text-green-400">✓ In sync</span>
          ) : (
            <span className="text-yellow-600 dark:text-yellow-400">⚠ Syncing...</span>
          )}
        </div>
      )}
    </div>
  );
}