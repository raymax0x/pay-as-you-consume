'use client';

import { useAccount } from 'wagmi';
import { useUSDT, useYieldVault, formatUSDT } from '../hooks/useContracts';

export function UserBalance() {
  const { address, isConnected } = useAccount();
  const usdt = useUSDT();
  const vault = useYieldVault();

  // Read balances
  const usdtBalance = usdt.balanceOf(address!);
  const vaultShares = vault.balanceOf(address!);
  const principalBalance = vault.principalOf(address!);
  const yieldBalance = vault.yieldOf(address!);

  if (!isConnected || !address) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to view balances
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Your Balances
      </h3>

      <div className="space-y-3">
        {/* USDT Balance */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">USDT Balance:</span>
          <span className="font-medium text-gray-800 dark:text-white">
            {usdtBalance.data ? formatUSDT(usdtBalance.data) : '0.00'} USDT
          </span>
        </div>

        {/* Vault Shares */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Vault Shares:</span>
          <span className="font-medium text-gray-800 dark:text-white">
            {vaultShares.data ? formatUSDT(vaultShares.data) : '0.00'} yUSDT
          </span>
        </div>

        {/* Principal */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Principal:</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            {principalBalance.data ? formatUSDT(principalBalance.data) : '0.00'} USDT
          </span>
        </div>

        {/* Yield */}
        <div className="flex justify-between items-center">
          <span className="text-gray-600 dark:text-gray-400">Available Yield:</span>
          <span className="font-medium text-blue-600 dark:text-blue-400">
            {yieldBalance.data ? formatUSDT(yieldBalance.data) : '0.00'} USDT
          </span>
        </div>

        {/* Total */}
        <div className="border-t pt-3 mt-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-800 dark:text-white">Total in Vault:</span>
            <span className="font-bold text-purple-600 dark:text-purple-400">
              {principalBalance.data && yieldBalance.data
                ? formatUSDT(principalBalance.data + yieldBalance.data)
                : '0.00'} USDT
            </span>
          </div>
        </div>
      </div>

      {/* Loading states */}
      {(usdtBalance.isLoading || vaultShares.isLoading || principalBalance.isLoading || yieldBalance.isLoading) && (
        <div className="mt-4 text-center">
          <div className="inline-block w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading balances...</span>
        </div>
      )}

      {/* Error states */}
      {(usdtBalance.error || vaultShares.error || principalBalance.error || yieldBalance.error) && (
        <div className="mt-4 p-2 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-sm">
          Error loading balances. Make sure you're connected to the correct network.
        </div>
      )}
    </div>
  );
}