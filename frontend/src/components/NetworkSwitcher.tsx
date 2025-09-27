'use client';

import { useEffect } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';

const ANVIL_CHAIN_ID = 31337;

export function NetworkSwitcher() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  const addAnvilNetwork = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x7a69', // 31337 in hex
            chainName: 'Anvil',
            nativeCurrency: {
              name: 'Ether',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['http://127.0.0.1:8545'],
            blockExplorerUrls: null,
          }],
        });
      } catch (error) {
        console.error('Failed to add Anvil network:', error);
      }
    }
  };

  const switchToAnvil = async () => {
    try {
      if (switchChain) {
        switchChain({ chainId: ANVIL_CHAIN_ID });
      } else {
        // Fallback to direct MetaMask request
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x7a69' }],
        });
      }
    } catch (error: any) {
      // If the chain hasn't been added, add it
      if (error.code === 4902) {
        await addAnvilNetwork();
      }
    }
  };

  useEffect(() => {
    if (isConnected && chainId !== ANVIL_CHAIN_ID) {
      switchToAnvil();
    }
  }, [isConnected, chainId]);

  if (!isConnected || chainId === ANVIL_CHAIN_ID) {
    return null;
  }

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-black px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-3">
        <span className="text-sm font-medium">Wrong Network</span>
        <button
          onClick={switchToAnvil}
          className="bg-black text-yellow-400 px-3 py-1 rounded text-sm hover:bg-gray-800 transition-colors"
        >
          Switch to Anvil
        </button>
      </div>
    </div>
  );
}