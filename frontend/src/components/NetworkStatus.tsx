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
    <div className="bg-white border rounded-lg p-4 mb-4">
      <h4 className="font-semibold mb-3 text-gray-800">🔗 Network Status</h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${isAnvilConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">Anvil Connection</span>
          </div>
          <p className="text-gray-600 ml-5">
            {isAnvilConnected ? '✅ Connected to 127.0.0.1:8545' : '❌ Cannot reach Anvil'}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="font-medium">Wallet Connection</span>
          </div>
          <p className="text-gray-600 ml-5">
            {isConnected ? `✅ Connected via ${connector?.name}` : '❌ Wallet not connected'}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
            <span className="font-medium">Network</span>
          </div>
          <p className="text-gray-600 ml-5">
            {chainId ? `${getChainName(chainId)} (${chainId})` : 'Unknown'}
            {!isCorrectNetwork && chainId && (
              <span className="block text-yellow-600 mt-1">
                ⚠️ Please switch to Anvil (31337)
              </span>
            )}
          </p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-3 h-3 rounded-full ${blockNumber ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            <span className="font-medium">Block Height</span>
          </div>
          <p className="text-gray-600 ml-5">
            {blockNumber ? `#${blockNumber}` : 'Loading...'}
          </p>
        </div>
      </div>

      {address && (
        <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
          <p className="font-medium text-gray-700">Connected Address:</p>
          <p className="font-mono text-gray-600">{address}</p>
        </div>
      )}

      {!isAnvilConnected && (
        <div className="mt-4 p-3 bg-red-50 rounded text-sm">
          <p className="font-medium text-red-700">Anvil Connection Issues:</p>
          <ul className="text-red-600 mt-1 list-disc list-inside">
            <li>Make sure Anvil is running: <code>anvil --host 0.0.0.0 --port 8545</code></li>
            <li>Check if localhost/127.0.0.1:8545 is accessible</li>
            <li>Verify no firewall is blocking the connection</li>
          </ul>
        </div>
      )}

      {isConnected && !isCorrectNetwork && (
        <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
          <p className="font-medium text-yellow-700">Wrong Network:</p>
          <p className="text-yellow-600 mt-1">
            Please switch to Anvil network (Chain ID: 31337) in your wallet.
          </p>
        </div>
      )}
    </div>
  );
}