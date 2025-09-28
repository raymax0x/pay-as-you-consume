import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  arbitrum,
  base,
  localhost,
  mainnet,
  optimism,
  polygon,
  sepolia,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Pay-As-You-Consume DeFi Wallet',
  projectId: 'YOUR_PROJECT_ID', // Get from https://cloud.walletconnect.com
  chains: [
    localhost, // For local development
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
    sepolia, // For testing
  ],
  ssr: true, // If your dApp uses server side rendering (SSR)
});