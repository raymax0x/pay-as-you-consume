'use client';

import * as React from 'react';
import {
  RainbowKitProvider,
  getDefaultWallets,
  getDefaultConfig,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  polygon,
  optimism,
  arbitrum,
  base,
  sepolia,
} from 'wagmi/chains';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';

const { wallets } = getDefaultWallets();

const config = getDefaultConfig({
  appName: 'Pay-As-You-Consume DeFi Wallet',
  projectId: 'YOUR_PROJECT_ID', // TODO: Replace with actual WalletConnect project ID
  wallets,
  chains: [
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia, // For testing
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}