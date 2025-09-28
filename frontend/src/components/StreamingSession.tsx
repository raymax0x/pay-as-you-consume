'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useStreamingWallet, formatUSDT } from '../hooks/useContracts';
import { SAMPLE_CONTENT } from '../contracts/config';

interface StreamingSessionProps {
  onSessionStart?: (sessionId: bigint) => void;
}

export function StreamingSession({ onSessionStart }: StreamingSessionProps) {
  const { address, isConnected } = useAccount();
  const streamingWallet = useStreamingWallet();

  const [isStarting, setIsStarting] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<bigint | null>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [consumedTime, setConsumedTime] = useState<bigint>(0n);
  const [amountOwed, setAmountOwed] = useState<bigint>(0n);

  // Get user's active sessions
  const activeSessions = streamingWallet.getUserActiveSessions(address!);

  // Get session data if we have an active session
  const currentSession = activeSessionId ? streamingWallet.getSession(activeSessionId) : null;
  const currentConsumedTime = activeSessionId ? streamingWallet.getCurrentConsumedTime(activeSessionId) : null;
  const currentAmountOwed = activeSessionId ? streamingWallet.getCurrentAmountOwed(activeSessionId) : null;

  // Update real-time data
  useEffect(() => {
    if (currentSession?.data) {
      setSessionData(currentSession.data);
    }
  }, [currentSession?.data]);

  useEffect(() => {
    if (currentConsumedTime?.data) {
      setConsumedTime(currentConsumedTime.data);
    }
  }, [currentConsumedTime?.data]);

  useEffect(() => {
    if (currentAmountOwed?.data) {
      setAmountOwed(currentAmountOwed.data);
    }
  }, [currentAmountOwed?.data]);

  // Check for active sessions on load
  useEffect(() => {
    if (activeSessions.data && activeSessions.data.length > 0) {
      setActiveSessionId(activeSessions.data[0]);
    }
  }, [activeSessions.data]);

  const handleStartSession = async () => {
    try {
      setIsStarting(true);
      const hash = await streamingWallet.startSession(
        SAMPLE_CONTENT.id,
        SAMPLE_CONTENT.pricePerSecond
      );

      // In a real app, you'd wait for the transaction to confirm
      // and then get the session ID from the event logs
      console.log('Session started with hash:', hash);
      onSessionStart?.(BigInt(1)); // Mock session ID for demo
    } catch (error) {
      console.error('Error starting session:', error);
    } finally {
      setIsStarting(false);
    }
  };

  const handlePauseSession = async () => {
    if (!activeSessionId) return;
    try {
      await streamingWallet.pauseSession(activeSessionId);
    } catch (error) {
      console.error('Error pausing session:', error);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSessionId) return;
    try {
      await streamingWallet.resumeSession(activeSessionId);
    } catch (error) {
      console.error('Error resuming session:', error);
    }
  };

  const handleStopSession = async () => {
    if (!activeSessionId) return;
    try {
      await streamingWallet.stopSession(activeSessionId, consumedTime);
      setActiveSessionId(null);
      setSessionData(null);
    } catch (error) {
      console.error('Error stopping session:', error);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to start streaming
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Streaming Session
      </h3>

      {!activeSessionId ? (
        // No active session - show start button
        <div className="space-y-4">
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <div className="flex items-center gap-4 mb-3">
              <img
                src={SAMPLE_CONTENT.thumbnailUrl}
                alt={SAMPLE_CONTENT.title}
                className="w-20 h-20 object-cover rounded-lg"
              />
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white">
                  {SAMPLE_CONTENT.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {SAMPLE_CONTENT.description}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {formatUSDT(SAMPLE_CONTENT.pricePerSecond)} USDT/second
                </p>
              </div>
            </div>
            <button
              onClick={handleStartSession}
              disabled={isStarting}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
            >
              {isStarting ? 'Starting...' : 'Start Streaming'}
            </button>
          </div>
        </div>
      ) : (
        // Active session - show controls and metrics
        <div className="space-y-4">
          {/* Session Info */}
          <div className="border border-blue-200 dark:border-blue-600 rounded-lg p-4 bg-blue-50 dark:bg-blue-900">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              Active Session #{activeSessionId.toString()}
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-600 dark:text-blue-400">Time Consumed:</span>
                <span className="ml-2 font-mono text-blue-800 dark:text-blue-200">
                  {consumedTime.toString()}s
                </span>
              </div>
              <div>
                <span className="text-blue-600 dark:text-blue-400">Amount Owed:</span>
                <span className="ml-2 font-mono text-blue-800 dark:text-blue-200">
                  {formatUSDT(amountOwed)} USDT
                </span>
              </div>
            </div>
          </div>

          {/* Session Controls */}
          <div className="flex gap-2">
            <button
              onClick={handlePauseSession}
              className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md transition-colors duration-200"
            >
              Pause
            </button>
            <button
              onClick={handleResumeSession}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200"
            >
              Resume
            </button>
            <button
              onClick={handleStopSession}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
            >
              Stop
            </button>
          </div>

          {/* Content Display */}
          <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
            <video
              src={SAMPLE_CONTENT.videoUrl}
              className="w-full rounded-lg"
              controls
              poster={SAMPLE_CONTENT.thumbnailUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      )}

      {/* Loading states */}
      {(activeSessions.isLoading || currentSession?.isLoading) && (
        <div className="mt-4 text-center">
          <div className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading session data...</span>
        </div>
      )}
    </div>
  );
}