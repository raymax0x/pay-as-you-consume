# Phase 1 Smart Contracts - Vault + Streaming Wallet

This directory contains the core smart contracts for Phase 1 of the pay-per-use streaming content system.

## 📁 Contract Architecture

### Core Contracts

1. **YieldVault.sol** - ERC4626 compliant vault with yield generation
   - Tracks principal and yield separately for each user
   - Simulates 5% APY yield generation
   - Supports deposits, withdrawals, and yield accrual
   - Implements the `IYieldVault` interface required by StreamingWallet

2. **StreamingWallet.sol** - Pay-per-use content streaming contract
   - Tracks user consumption sessions (start, pause, resume, stop)
   - Calculates pro-rata costs based on time consumed
   - Deducts payments from yield first, then principal
   - Emits detailed events for payment tracking

3. **MockUSDC.sol** - Test USDC token (6 decimals like real USDC)
   - Used as the underlying asset for the vault
   - Includes mint functions for easy testing

## 🔧 Key Features

### Vault Features
- ✅ ERC4626 compliance for standardized vault interactions
- ✅ Principal vs yield tracking for granular payment deduction
- ✅ 5% APY simulation for realistic yield generation
- ✅ Time-based yield accrual calculations
- ✅ Safe withdrawal mechanisms with proper validation

### Streaming Wallet Features
- ✅ Session management (start, pause, resume, stop)
- ✅ Pro-rata payment calculation based on consumption time
- ✅ Yield-first payment deduction logic
- ✅ Content management by contract owner
- ✅ Comprehensive event emission for frontend integration

## 🧪 Testing

The system includes comprehensive test suites:

### YieldVault.t.sol
- Basic deposit/withdrawal functionality
- Yield generation and accrual over time
- Multiple user scenarios
- Edge cases and error conditions
- APY management and updates

### StreamingWalletIntegration.t.sol
- End-to-end integration between vault and streaming wallet
- Payment deduction from yield vs principal
- Multiple user streaming scenarios
- Pause/resume functionality
- Error handling and edge cases

## 🚀 Usage Example

```solidity
// 1. Deploy contracts
MockUSDC usdc = new MockUSDC();
YieldVault vault = new YieldVault(usdc, "Yield USDC", "yUSDC", 500); // 5% APY
StreamingWallet wallet = new StreamingWallet(address(vault));

// 2. User deposits into vault
usdc.approve(address(vault), 1000e6);
vault.deposit(1000e6, user); // Deposit 1000 USDC

// 3. Owner lists content
bytes32 contentId = keccak256("intro-to-defi");
wallet.listContent(contentId, 10e6, 3600); // 10 USDC for 1 hour

// 4. User approves wallet to spend from vault
usdc.approve(address(wallet), type(uint256).max);

// 5. User starts streaming
wallet.startStream(contentId);

// 6. User pauses/resumes as needed
wallet.pauseStream(contentId);
wallet.startStream(contentId); // Resume

// 7. User stops and pays
wallet.stopStream(contentId); // Automatically calculates and deducts payment
```

## 💡 How Payment Deduction Works

1. **Calculate Cost**: Based on `(consumedTime / totalDuration) * fullPrice`
2. **Check Yield**: Query user's available yield from vault
3. **Deduct Strategy**:
   - If `cost <= yield`: Deduct entirely from yield
   - If `cost > yield`: Use all yield + remaining from principal
4. **Execute Payment**: Call vault's `withdraw()` function
5. **Emit Events**: Track whether payment came from yield or principal

## 🔍 Events for Frontend Integration

### StreamingWallet Events
- `PaymentStreamStarted(user, contentId, startTime)`
- `PaymentStreamPaused(user, contentId, pauseTime, consumedDuration)`
- `PaymentStreamStopped(user, contentId, stopTime, totalDuration, amountDeducted)`
- `PaymentDeducted(user, contentId, amount, fromYield, remainingYield)`

### YieldVault Events
- `YieldGenerated(totalYield, timestamp)`
- `YieldWithdrawn(user, amount)`
- `PrincipalWithdrawn(user, amount)`

## 🛡️ Security Considerations

1. **Approval Required**: Users must approve StreamingWallet to spend their vault assets
2. **Insufficient Funds**: Transactions revert if user lacks sufficient principal + yield
3. **Reentrancy Protection**: Uses OpenZeppelin's battle-tested contracts
4. **Access Control**: Only contract owner can list content and modify APY
5. **Integer Math**: Uses safe math operations throughout

## 📦 Deployment

Use the provided deployment script:

```bash
forge script script/DeployContracts.s.sol --broadcast --rpc-url <RPC_URL>
```

This will deploy all contracts and set up initial test content.

## 🔗 Integration with Frontend

The contracts are designed to integrate seamlessly with the frontend:

1. **Real-time Cost Tracking**: Use `getCurrentCost()` to show live consumption costs
2. **Balance Queries**: Check `principalOf()` and `yieldOf()` for user balances
3. **Event Listening**: Subscribe to payment events for real-time updates
4. **Session Management**: Track streaming sessions via contract state

## 🎯 Phase 1 Completeness

This implementation fulfills all Phase 1 requirements:

- ✅ ERC4626 vault with deposit/withdrawal functionality
- ✅ Stablecoin support (MockUSDC with 6 decimals)
- ✅ Principal and yield querying functions
- ✅ 5% APY yield generation simulation
- ✅ Comprehensive test coverage
- ✅ StreamingWallet integration with yield-first payment logic
- ✅ Session tracking and dynamic billing
- ✅ Complete event emission for frontend integration
- ✅ Pay-per-use cost calculation based on consumption percentage