import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { hardhat } from 'wagmi/chains';

// Anvil local chain configuration
const anvil = {
  id: 31337,
  name: 'Anvil',
  network: 'anvil',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    public: { http: ['http://127.0.0.1:8545'] },
    default: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Anvil', url: 'http://127.0.0.1:8545' },
  },
} as const;

const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'demo-project-id';

export const config = getDefaultConfig({
  appName: 'Pay-As-You-Consume DeFi Wallet',
  projectId: projectId,
  chains: [anvil, hardhat],
  ssr: true,
});