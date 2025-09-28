#!/bin/bash

# Simple deployment script that uses .env variables
# Make sure you have created .env file first (copy from env.example)

set -e

echo "🚀 Starting contract deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure your settings."
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$PRIVATE_KEY" ]; then
    echo "❌ PRIVATE_KEY not set in .env file"
    exit 1
fi

if [ -z "$RPC_URL" ]; then
    echo "❌ RPC_URL not set in .env file"
    exit 1
fi

echo "📋 Deployment Configuration:"
echo "   RPC URL: $RPC_URL"
echo "   Chain ID: ${CHAIN_ID:-31337}"
echo "   Yield APY: ${YIELD_APY:-500} basis points"

# Deploy contracts
echo "📄 Deploying contracts..."
forge script script/Deploy.s.sol:Deploy \
    --rpc-url "$RPC_URL" \
    --broadcast \
    --verify \
    -vvvv

echo "✅ Deployment complete!"
echo "📁 Check deployments/ directory for contract addresses"
echo "📋 Contract addresses have been written to deployments/.env.contracts"
