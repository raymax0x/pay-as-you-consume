import streamingWallet from './abi/StreamingWallet.json';
import yieldVault from './abi/YieldVault.json';

export const StreamingWalletAbi = streamingWallet.abi as const;
export const YieldVaultAbi = yieldVault.abi as const;
