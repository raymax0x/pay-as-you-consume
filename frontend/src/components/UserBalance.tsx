'use client';

import { useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useYieldVault, useMockUSDC } from '../hooks/useContracts';

export function UserBalance() {
  const { isConnected } = useAccount();
  const {
    principalBalance,
    yieldBalance,
    totalBalance,
    refetchAll: refetchVault,
    isConnected: isVaultConnected
  } = useYieldVault();

  const {
    balance: usdcBalance,
    refetchBalance: refetchUSDC,
    isConnected: isUSDCConnected
  } = useMockUSDC();

  useEffect(() => {
    if (isConnected && isVaultConnected && isUSDCConnected) {
      // Refresh every 10 seconds
      const interval = setInterval(() => {
        refetchVault();
        refetchUSDC();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isVaultConnected, isUSDCConnected, refetchVault, refetchUSDC]);

  if (!isConnected) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-600">Connect wallet to view balance</p>
      </div>
    );
  }

  if (!isVaultConnected || !isUSDCConnected) {
    return (
      <div className="bg-yellow-50 p-4 rounded-lg">
        <p className="text-yellow-700">⚠️ Make sure you're connected to Anvil (Chain ID: 31337)</p>
      </div>
    );
  }

  const handleRefresh = () => {
    refetchVault();
    refetchUSDC();
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Your Vault Balance</h3>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-sm text-gray-600">💰 Yield Available</p>
          <p className="text-xl font-bold text-green-600">
            {parseFloat(yieldBalance).toFixed(2)} USDC
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">🏦 Principal Deposit</p>
          <p className="text-xl font-bold text-blue-600">
            {parseFloat(principalBalance).toFixed(2)} USDC
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">📊 Vault Total</p>
          <p className="text-xl font-bold text-gray-800">
            {parseFloat(totalBalance).toFixed(2)} USDC
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">💳 Wallet USDC</p>
          <p className="text-xl font-bold text-purple-600">
            {parseFloat(usdcBalance).toFixed(2)} USDC
          </p>
        </div>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <div className="text-xs text-gray-500">
          🔗 Connected to Anvil • Last updated: {new Date().toLocaleTimeString()}
        </div>
        <button
          onClick={handleRefresh}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-xs"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}