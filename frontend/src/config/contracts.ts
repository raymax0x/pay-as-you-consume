export const CONTRACTS = {
  31337: { // Anvil
    MockUSDC: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    YieldVault: '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
    StreamingWallet: '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  }
} as const;

export const getContractAddress = (chainId: number, contractName: keyof typeof CONTRACTS[31337]) => {
  return CONTRACTS[chainId as keyof typeof CONTRACTS]?.[contractName];
};