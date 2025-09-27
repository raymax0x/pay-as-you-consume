'use client';

import { useState } from 'react';
import { WalletConnection } from '../components/WalletConnection';
import { UserBalance } from '../components/UserBalance';
import { ContentCatalog } from '../components/ContentCatalog';
import { ModernVideoPlayer } from '../components/ModernVideoPlayer';
import { NetworkStatus } from '../components/NetworkStatus';
import { NetworkSwitcher } from '../components/NetworkSwitcher';

interface ContentInfo {
  id: string;
  contentId: string;
  title: string;
  description: string;
  fullPrice: string;
  totalDuration: number;
  category: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export default function Home() {
  const [selectedContent, setSelectedContent] = useState<ContentInfo | null>(null);

  return (
    <div className="min-h-screen bg-black">
      <NetworkSwitcher />
      {/* Header */}
      <header className="fixed top-0 w-full bg-black/80 backdrop-blur-md border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <h1 className="text-xl font-semibold text-white">
                PayStream
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <NetworkStatus />
              <UserBalance />
              <WalletConnection />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16">
        {/* Hero Section with Video Player */}
        <div className="relative">
          {selectedContent ? (
            <div className="relative w-full">
              <ModernVideoPlayer content={selectedContent} />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-8">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-end justify-between">
                    <div className="max-w-2xl">
                      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        {selectedContent.title}
                      </h1>
                      <p className="text-lg text-gray-300 mb-6">
                        {selectedContent.description}
                      </p>
                      <div className="flex items-center space-x-6 text-sm text-gray-400">
                        <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                          {selectedContent.category}
                        </span>
                        <span>{Math.floor(selectedContent.totalDuration / 60)}m</span>
                        <span>{(parseInt(selectedContent.fullPrice) / 1000000).toFixed(2)} USDC</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-[70vh] bg-gradient-to-br from-gray-900 via-black to-purple-900">
              <div className="absolute inset-0 bg-black/40"></div>
              <div className="relative z-10 flex items-center justify-center h-full">
                <div className="text-center max-w-3xl mx-auto px-6">
                  <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                    Stream & Earn
                  </h1>
                  <p className="text-xl text-gray-300 mb-8">
                    Pay only for what you watch. Earn yield while you stream.
                  </p>
                  <div className="flex justify-center">
                    <div className="w-24 h-24 border border-gray-600 rounded-full flex items-center justify-center cursor-pointer hover:border-white transition-all">
                      <div className="w-0 h-0 border-l-8 border-r-0 border-t-6 border-b-6 border-l-white border-t-transparent border-b-transparent ml-1"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <ContentCatalog
            onSelectContent={setSelectedContent}
            selectedContent={selectedContent || undefined}
          />
        </div>

        {/* Features Section */}
        <div className="bg-gray-900 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-white text-center mb-12">
              How it works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">💸</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Yield-First Payments</h3>
                <p className="text-gray-400">
                  Pay with your yield earnings first, preserving your principal deposit
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⏱️</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Pay-Per-Second</h3>
                <p className="text-gray-400">
                  Fair pricing based on actual consumption time, not fixed subscriptions
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🏦</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">DeFi Integration</h3>
                <p className="text-gray-400">
                  Your deposits earn 5% APY while you enjoy premium content
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
