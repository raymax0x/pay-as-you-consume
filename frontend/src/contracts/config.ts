import { Address, parseEther } from 'viem';
import { localhost } from 'viem/chains';

// Contract addresses from local deployment
export const contractAddresses = {
  [localhost.id]: {
    mockUSDT: '0x9A676e781A523b5d0C0e43731313A708CB607508' as Address,
    yieldVault: '0x0B306BF915C4d645ff596e518fAf3F9669b97016' as Address,
    streamingWalletV2: '0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1' as Address,
  },
  // Add Sepolia addresses later
  11155111: {
    mockUSDT: '0x0000000000000000000000000000000000000000' as Address,
    yieldVault: '0x0000000000000000000000000000000000000000' as Address,
    streamingWalletV2: '0x0000000000000000000000000000000000000000' as Address,
  },
} as const;

// Contract constants
export const USDT_DECIMALS = 6;
export const SAMPLE_CONTENT = {
  id: 'naruto-vs-pain',
  title: 'Naruto vs Pain - Epic Battle',
  description: 'Watch the legendary battle between Naruto and Pain from Naruto Shippuden',
  totalDuration: 180, // 3 minutes
  fullPrice: parseEther('5'), // 5 USDT (adjusted for 6 decimals)
  pricePerSecond: parseEther('5') / BigInt(180), // Price per second
  thumbnailUrl: 'https://i.pinimg.com/1200x/d4/3d/15/d43d15666abea20ec242bdb7c42e2499.jpg',
  videoUrl: '/naruto-vs-pain.mp4',
};

export function getContractAddress(chainId: number, contract: keyof typeof contractAddresses[31337]) {
  const addresses = contractAddresses[chainId as keyof typeof contractAddresses];
  if (!addresses) {
    throw new Error(`No contract addresses found for chain ${chainId}`);
  }
  return addresses[contract];
}