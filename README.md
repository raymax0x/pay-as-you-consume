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
- **Language:** Solidity ^0.8.19
- **Standards:** ERC-4626 (Tokenized Vaults)
- **DeFi Integration:** Aave V3
- **Testing:** Foundry tests

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
   ```

### Development Commands

```bash
# Start all services
npm run dev

# Individual services
npm run dev:frontend  # Frontend on http://localhost:3000
npm run dev:backend   # Backend on http://localhost:3001

# Smart contracts
npm run forge:build   # Build contracts
npm run forge:test    # Run tests
npm run test:contracts # Same as above

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
npm run forge:deploy

# Verify contracts
npm run forge:verify
```

## 🎯 Demo Flow

1. **Setup:** User connects wallet and deposits 100 USDC
2. **Investment:** Funds automatically deployed to Aave
3. **Content:** User starts watching 10-minute video (priced at 10 USDC)
4. **Consumption:** After 2 minutes, user pauses (2 USDC deducted from yield)
5. **Growth:** Remaining balance continues earning yield
6. **Repeat:** User can consume more content using same wallet

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