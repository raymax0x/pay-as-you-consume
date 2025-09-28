'use client';

import { useState } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { useUSDT, useYieldVault, parseUSDT } from '../hooks/useContracts';

export function QuickActions() {
  const { address, isConnected } = useAccount();
  const usdt = useUSDT();
  const vault = useYieldVault();

  const [mintAmount, setMintAmount] = useState('100');
  const [depositAmount, setDepositAmount] = useState('50');
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);

  const txReceipt = useWaitForTransactionReceipt({
    hash: txHash || undefined,
  });

  if (!isConnected || !address) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to perform actions
        </p>
      </div>
    );
  }

  const handleMintUSDT = async () => {
    try {
      setIsLoading(true);
      const amount = parseUSDT(mintAmount);
      const hash = await usdt.publicMint(amount);
      setTxHash(hash);
    } catch (error) {
      console.error('Error minting USDT:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDepositToVault = async () => {
    try {
      setIsLoading(true);
      const amount = parseUSDT(depositAmount);

      // First approve the vault to spend USDT
      const approveHash = await usdt.approve(vault.address, amount);
      setTxHash(approveHash);

      // Wait for approval to confirm
      // Note: In a real app, you'd wait for this transaction to confirm before proceeding
      setTimeout(async () => {
        try {
          const depositHash = await vault.deposit(amount, address);
          setTxHash(depositHash);
        } catch (error) {
          console.error('Error depositing to vault:', error);
        }
      }, 2000);

    } catch (error) {
      console.error('Error approving/depositing:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
        Quick Actions
      </h3>

      <div className="space-y-4">
        {/* Mint USDT */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 dark:text-white mb-2">
            1. Mint Test USDT
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Amount (USDT)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
            <button
              onClick={handleMintUSDT}
              disabled={isLoading || !mintAmount}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
            >
              {isLoading ? 'Minting...' : 'Mint'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Mint test USDT tokens for development
          </p>
        </div>

        {/* Deposit to Vault */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 dark:text-white mb-2">
            2. Deposit to Yield Vault
          </h4>
          <div className="flex gap-2">
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="Amount (USDT)"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            />
            <button
              onClick={handleDepositToVault}
              disabled={isLoading || !depositAmount}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
            >
              {isLoading ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Deposit USDT to earn yield and enable streaming
          </p>
        </div>

        {/* Start Streaming */}
        <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 dark:text-white mb-2">
            3. Start Streaming
          </h4>
          <button
            disabled={true}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-md transition-colors duration-200"
          >
            Start Naruto vs Pain (Coming Soon)
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Stream content and pay per second from your yield
          </p>
        </div>
      </div>

      {/* Transaction Status */}
      {txHash && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
          <div className="flex items-center gap-2">
            {txReceipt.isLoading && (
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            )}
            <span className="text-sm text-blue-700 dark:text-blue-300">
              {txReceipt.isLoading ? 'Transaction pending...' :
               txReceipt.isSuccess ? 'Transaction confirmed!' :
               txReceipt.isError ? 'Transaction failed' : 'Transaction submitted'}
            </span>
          </div>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-mono">
            {txHash}
          </p>
        </div>
      )}
    </div>
  );
}