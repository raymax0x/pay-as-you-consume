'use client';

import { useState } from 'react';
import { WalletConnection } from '../components/WalletConnection';
import { UserBalance } from '../components/UserBalance';
import { ContentCatalog } from '../components/ContentCatalog';
import { BlockchainVideoPlayer } from '../components/BlockchainVideoPlayer';
import { NetworkStatus } from '../components/NetworkStatus';

interface ContentInfo {
  id: string;
  contentId: string;
  title: string;
  description: string;
  fullPrice: string;
  totalDuration: number;
  category: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Home() {
  const [selectedContent, setSelectedContent] = useState<ContentInfo | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">
                💰 Pay-As-You-Consume DeFi Wallet
              </h1>
            </div>
            <WalletConnection />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Stream Content. Pay Only for What You Watch.
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Deposit tokens into a DeFi yield vault and use your earned yield to pay for content consumption.
            No subscriptions, no waste – just fair, transparent micropayments.
          </p>
        </div>

        {/* Network Status */}
        <div className="mb-6">
          <NetworkStatus />
        </div>

        {/* Balance Display */}
        <div className="mb-8">
          <UserBalance />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Content Catalog */}
          <div className="lg:col-span-1">
            <ContentCatalog
              onSelectContent={setSelectedContent}
              selectedContent={selectedContent || undefined}
            />
          </div>

          {/* Video Player */}
          <div className="lg:col-span-2">
            {selectedContent ? (
              <BlockchainVideoPlayer content={selectedContent} />
            ) : (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <div className="text-6xl mb-4">🎬</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Select Content to Start Streaming
                </h3>
                <p className="text-gray-600">
                  Choose content from the catalog to begin your blockchain-powered pay-per-use streaming experience.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💸</div>
            <h3 className="text-lg font-semibold mb-2">Yield-First Payments</h3>
            <p className="text-gray-600">
              Pay with your yield earnings first, preserving your principal deposit
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⏱️</div>
            <h3 className="text-lg font-semibold mb-2">Pay-Per-Second</h3>
            <p className="text-gray-600">
              Fair pricing based on actual consumption time, not fixed subscriptions
            </p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-lg font-semibold mb-2">DeFi Integration</h3>
            <p className="text-gray-600">
              Your deposits earn 5% APY while you enjoy premium content
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-600">
            <p>Built for ETHGlobal • Powered by Ethereum, Aave V3, and ERC-4626</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
