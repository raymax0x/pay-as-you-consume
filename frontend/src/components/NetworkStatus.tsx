'use client';

import { useAccount, useChainId, useBlockNumber } from 'wagmi';
import { useEffect, useState } from 'react';

export function NetworkStatus() {
  const { address, isConnected, connector } = useAccount();
  const chainId = useChainId();
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const [isAnvilConnected, setIsAnvilConnected] = useState(false);

  useEffect(() => {
    // Test direct connection to Anvil
    const testAnvilConnection = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8545', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_chainId',
            params: [],
            id: 1
          })
        });
        const data = await response.json();
        setIsAnvilConnected(data.result === '0x7a69'); // 31337 in hex
      } catch (error) {
        setIsAnvilConnected(false);
      }
    };

    testAnvilConnection();
    const interval = setInterval(testAnvilConnection, 5000);
    return () => clearInterval(interval);
  }, []);

  const getChainName = (id: number) => {
    switch (id) {
      case 31337: return 'Anvil';
      case 1: return 'Ethereum Mainnet';
      case 11155111: return 'Sepolia';
      default: return `Chain ${id}`;
    }
  };

  const isCorrectNetwork = chainId === 31337;

  return (
    <div className="flex items-center space-x-4 text-sm">
      <div className="flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${isConnected && isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`}></span>
        <span className="text-gray-300">Wallet</span>
      </div>

      <div className="flex items-center space-x-2">
        <span className={`w-2 h-2 rounded-full ${isAnvilConnected && isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
        <span className="text-gray-300">
          {chainId ? getChainName(chainId) : 'Anvil'}
        </span>
      </div>

      {blockNumber && (
        <div className="text-gray-400">
          #{blockNumber.toString()}
        </div>
      )}
    </div>
  );
}