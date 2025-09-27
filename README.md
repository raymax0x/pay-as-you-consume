# Pay-As-You-Consume DeFi Wallet

A micropayment system where users deposit tokens into a DeFi yield vault and use the earned yield to pay only for what they consume.

## 🎯 Project Overview

**Core Value Proposition:**
- ⚡ Frictionless micropayments for digital content
- 💸 Capital efficiency through yield generation
- 🔄 Pay-per-use model (no subscriptions)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend App  │────│  Smart Contracts │────│  DeFi Protocol  │
│                 │    │                  │    │   (Aave V3)     │
│ - Wallet UI     │    │ - Vault (ERC4626)│    │                 │
│ - Content View  │    │ - Usage Tracker  │    │                 │
│ - Usage Meter   │    │ - Payment Stream │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Tech Stack

### Smart Contracts
- **Framework:** Foundry
- **Language:** Solidity ^0.8.26
- **Standards:** ERC-4626 (Tokenized Vaults)
- **Dependencies:** OpenZeppelin Contracts v5.4.0
- **Testing:** Foundry tests (21/21 passing)

### Frontend
- **Framework:** Next.js 14 with TypeScript
- **Web3 Library:** wagmi + viem
- **Wallet Connection:** RainbowKit or ConnectKit
- **Styling:** Tailwind CSS

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript
- **API:** RESTful endpoints for content management

## 🛠️ Setup & Development

### Prerequisites
- Node.js 18+
- Foundry
- Git

### Installation

1. **Clone & Install**
   ```bash
   git clone git@github.com:raymax0x/pay-as-you-consume.git
   cd pay-as-you-consume
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Fill in your environment variables
   ```

3. **Install Foundry Dependencies**
   ```bash
   cd contracts
   forge install
   forge build  # Verify everything compiles
   forge test   # Run test suite (should show 21/21 passing)
   ```

### Development Commands

```bash
# Start all services
npm run dev

# Individual services
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001

# Smart contracts
cd contracts
forge build          # Build contracts
forge test           # Run tests (21/21 passing)

# Testing
npm run test          # Run all tests
npm run test:frontend # Frontend tests
npm run test:backend  # Backend tests

# Building
npm run build         # Build all
npm run build:frontend
npm run build:backend
```

## 📁 Project Structure

```
pay-as-you-consume/
├── contracts/          # Foundry smart contracts
│   ├── src/           # Contract source files
│   ├── test/          # Contract tests
│   ├── script/        # Deployment scripts
│   └── foundry.toml   # Foundry config
├── frontend/          # Next.js application
│   ├── src/           # Source code
│   ├── public/        # Static assets
│   └── package.json
├── backend/           # Express API server
│   ├── src/           # TypeScript source
│   ├── dist/          # Compiled JavaScript
│   └── package.json
├── docs/              # Documentation
├── package.json       # Root workspace config
└── README.md
```

## 🔧 Smart Contract Deployment

```bash
# Deploy to Sepolia testnet
cd contracts
forge script script/DeployContracts.s.sol --rpc-url sepolia --broadcast

# Verify contracts on Etherscan
forge verify-contract --chain sepolia <contract-address> <contract-name>
```

## 🎯 Demo Flow

1. **Setup:** User connects wallet and deposits 100 USDC into YieldVault
2. **Instant Yield:** System automatically provides 20% instant yield (20 USDC available immediately)
3. **Content:** User starts streaming "intro-to-defi" content (10 USDC for 1 hour)
4. **Consumption:** After 30 minutes, user stops stream (5 USDC deducted from yield)
5. **Growth:** Remaining balance continues earning 5% APY
6. **Repeat:** User can stream more content using yield-first payment logic

## ✅ Current Implementation Status

### Phase 1: Smart Contracts (✅ COMPLETE)
- **YieldVault.sol**: ERC4626-compliant vault with principal/yield tracking
- **StreamingWallet.sol**: Pay-per-second content streaming with yield-first payments
- **MockUSDC.sol**: Testing token with instant yield functionality
- **Comprehensive Test Suite**: 21/21 tests passing

### Key Features Implemented
- 🏦 **ERC4626 Yield Vault**: Deposit USDC, earn 5% APY
- ⚡ **Instant Yield**: 20% immediate yield for testing/demos
- 📺 **Content Streaming**: Pay-per-second for digital content
- 💰 **Yield-First Payments**: Deduct from yield before touching principal
- 🧪 **Full Test Coverage**: Comprehensive Foundry test suite

### Smart Contract Addresses (Testnet)
*Contracts ready for deployment - addresses will be updated after deployment*

### Next Steps
- [ ] Frontend development (Next.js + wagmi)
- [ ] Backend API for content management
- [ ] Mainnet deployment
- [ ] Integration with real DeFi protocols

## 📚 Documentation

- [MVP Plan](./mvp-plan.md) - Detailed 4-week development plan
- [Smart Contract Docs](./docs/contracts.md) - Contract architecture & API
- [Frontend Guide](./docs/frontend.md) - UI components & Web3 integration
- [API Reference](./docs/api.md) - Backend API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🚀 Deployment

- **Frontend:** Vercel/Netlify
- **Backend:** Railway/Render
- **Contracts:** Ethereum Sepolia Testnet

---

**Let's build the future of micropayments! 🚀**