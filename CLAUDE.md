# Pay-As-You-Consume DeFi Wallet

A micropayment system where users deposit tokens into a DeFi yield vault and use the earned yield to pay only for what they consume.

## Tech Stack
- Smart Contracts: Solidity ^0.8.19, Hardhat/Foundry, ERC-4626
- Frontend: Next.js 14, TypeScript, wagmi + viem
- DeFi: Aave V3 integration
- Testnet: Ethereum Sepolia

## Development Commands
- Smart contracts: `cd contracts && npm test`
- Frontend: `cd frontend && npm run dev`
- Deploy: `cd contracts && npm run deploy:sepolia`

## Project Structure
- `/contracts` - Smart contract development (Hardhat/Foundry)
- `/frontend` - Next.js application
- `/docs` - Documentation and specs
