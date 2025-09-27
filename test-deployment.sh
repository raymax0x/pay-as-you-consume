#!/bin/bash

echo "🔍 Testing Pay-As-You-Consume Contract Deployment"
echo "=================================================="

RPC_URL="http://127.0.0.1:8545"
MOCK_USDC="0x5FbDB2315678afecb367f032d93F642f64180aa3"
YIELD_VAULT="0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
STREAMING_WALLET="0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9"
DEMO_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

echo ""
echo "📋 Contract Addresses:"
echo "MockUSDC: $MOCK_USDC"
echo "YieldVault: $YIELD_VAULT"
echo "StreamingWallet: $STREAMING_WALLET"
echo ""

echo "💰 Demo Account Balances:"
echo "Account: $DEMO_ACCOUNT"

# Check USDC balance (should be 1000 USDC = 1000000000 with 6 decimals)
echo -n "USDC Balance: "
USDC_BALANCE=$(cast call $MOCK_USDC "balanceOf(address)(uint256)" $DEMO_ACCOUNT --rpc-url $RPC_URL)
USDC_FORMATTED=$(echo "scale=2; $USDC_BALANCE / 1000000" | bc)
echo "${USDC_FORMATTED} USDC"

# Check principal in vault (should be 200 USDC = 200000000 with 6 decimals)
echo -n "Vault Principal: "
PRINCIPAL_BALANCE=$(cast call $YIELD_VAULT "principalOf(address)(uint256)" $DEMO_ACCOUNT --rpc-url $RPC_URL)
PRINCIPAL_FORMATTED=$(echo "scale=2; $PRINCIPAL_BALANCE / 1000000" | bc)
echo "${PRINCIPAL_FORMATTED} USDC"

# Check yield in vault (should be 40 USDC = 40000000 with 6 decimals)
echo -n "Vault Yield: "
YIELD_BALANCE=$(cast call $YIELD_VAULT "yieldOf(address)(uint256)" $DEMO_ACCOUNT --rpc-url $RPC_URL)
YIELD_FORMATTED=$(echo "scale=2; $YIELD_BALANCE / 1000000" | bc)
echo "${YIELD_FORMATTED} USDC"

echo ""
echo "📺 Content Information:"

# Check intro-to-defi content
CONTENT_ID=$(cast keccak "intro-to-defi")
echo "Content ID (intro-to-defi): $CONTENT_ID"
CONTENT_INFO=$(cast call $STREAMING_WALLET "contentInfo(bytes32)(uint128,uint64,bool)" $CONTENT_ID --rpc-url $RPC_URL)
echo "Content Info: $CONTENT_INFO"

echo ""
echo "✅ Deployment verification complete!"
echo ""
echo "🚀 Next Steps:"
echo "1. Open http://localhost:3000 in your browser"
echo "2. Connect wallet with one of these accounts:"
echo "   - $DEMO_ACCOUNT"
echo "   - 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "   - 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
echo "3. Make sure you're connected to Anvil (Chain ID: 31337)"
echo "4. Start streaming content and test blockchain payments!"