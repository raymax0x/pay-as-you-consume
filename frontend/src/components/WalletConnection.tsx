'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export function WalletConnection() {
  return (
    <div className="flex justify-end">
      <ConnectButton />
    </div>
  );
}