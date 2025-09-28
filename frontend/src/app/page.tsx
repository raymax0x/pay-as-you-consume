'use client';

import { useState } from 'react';
import { WalletConnectButton } from "../components/WalletConnectButton";
import { UserBalance } from "../components/UserBalance";
import { QuickActions } from "../components/QuickActions";
import { StreamingSession } from "../components/StreamingSession";
import { RealTimeMetering } from "../components/RealTimeMetering";
import { SAMPLE_CONTENT } from "../contracts/config";

export default function Home() {
  const [activeSessionId, setActiveSessionId] = useState<bigint | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const handleSessionStart = (sessionId: bigint) => {
    setActiveSessionId(sessionId);
    setIsSessionActive(true);
  };

  return (
    <div className="font-sans min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Wallet Connection */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-blue-600">
              Pay-As-You-Consume
            </h1>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              DeFi Wallet
            </span>
          </div>
          <WalletConnectButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Balance and Actions */}
          <div className="space-y-6">
            <UserBalance />
            <QuickActions />
          </div>

          {/* Center Column - Streaming Session */}
          <div className="space-y-6">
            <StreamingSession onSessionStart={handleSessionStart} />
            {activeSessionId && (
              <RealTimeMetering
                sessionId={activeSessionId}
                isActive={isSessionActive}
                pricePerSecond={SAMPLE_CONTENT.pricePerSecond}
              />
            )}
          </div>

          {/* Right Column - Info Cards */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Yield Vault</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Deposit USDT and earn 5% APY. Use generated yield for streaming payments while preserving your principal.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.586a1 1 0 01.707.293l2.414 2.414a1 1 0 00.707.293H15M9 10v4a2 2 0 002 2h2a2 2 0 002-2v-4M9 10V8a2 2 0 012-2h2a2 2 0 012 2v2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Stream Content</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Pay per second for content consumption. Pause, resume, and only pay for what you actually watch.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Yield First</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Payments deducted from yield first, protecting your principal investment while maximizing utility.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4 mt-8">
        <div className="max-w-7xl mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Built with Next.js, Wagmi, and RainbowKit • Powered by DeFi</p>
        </div>
      </footer>
    </div>
  );
}
