export const YieldVaultABI = [
  {
    "type": "function",
    "name": "principalOf",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "yieldOf",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalAssets",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {"name": "assets", "type": "uint256"},
      {"name": "receiver", "type": "address"},
      {"name": "owner", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "nonpayable"
  }
] as const;

export const StreamingWalletABI = [
  {
    "type": "function",
    "name": "startStream",
    "inputs": [{"name": "_contentId", "type": "bytes32"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "pauseStream",
    "inputs": [{"name": "_contentId", "type": "bytes32"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "stopStream",
    "inputs": [{"name": "_contentId", "type": "bytes32"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getCurrentCost",
    "inputs": [
      {"name": "_user", "type": "address"},
      {"name": "_contentId", "type": "bytes32"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "userSessions",
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "contentId", "type": "bytes32"}
    ],
    "outputs": [
      {"name": "isActive", "type": "bool"},
      {"name": "startTime", "type": "uint64"},
      {"name": "accumulatedTime", "type": "uint64"},
      {"name": "lastUpdateTime", "type": "uint64"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "contentInfo",
    "inputs": [{"name": "contentId", "type": "bytes32"}],
    "outputs": [
      {"name": "fullPrice", "type": "uint128"},
      {"name": "totalDuration", "type": "uint64"},
      {"name": "isListed", "type": "bool"}
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PaymentStreamStarted",
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "contentId", "type": "bytes32"},
      {"indexed": false, "name": "startTime", "type": "uint256"}
    ]
  },
  {
    "type": "event",
    "name": "PaymentStreamPaused",
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "contentId", "type": "bytes32"},
      {"indexed": false, "name": "pauseTime", "type": "uint256"},
      {"indexed": false, "name": "consumedDuration", "type": "uint256"}
    ]
  },
  {
    "type": "event",
    "name": "PaymentStreamStopped",
    "inputs": [
      {"indexed": true, "name": "user", "type": "address"},
      {"indexed": true, "name": "contentId", "type": "bytes32"},
      {"indexed": false, "name": "stopTime", "type": "uint256"},
      {"indexed": false, "name": "totalConsumedDuration", "type": "uint256"},
      {"indexed": false, "name": "amountDeducted", "type": "uint256"}
    ]
  }
] as const;

export const MockUSDCABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  }
] as const;