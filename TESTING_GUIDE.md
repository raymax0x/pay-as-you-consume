# Pay-As-You-Consume Testing Guide

This guide provides step-by-step testing procedures for the complete DeFi streaming system across smart contracts, backend APIs, and frontend integration.

## 🏗️ Testing Architecture

```
Frontend (Next.js)
      ↓
Backend APIs (Express)
      ↓
Smart Contracts (Foundry)
      ↓
Blockchain (Sepolia Testnet)
```

## 📋 Prerequisites

### Environment Setup
- Node.js 18+
- Foundry installed
- PostgreSQL database
- Sepolia testnet ETH
- Infura/Alchemy RPC URL

### Test Accounts
You'll need 2 Ethereum addresses with Sepolia ETH:
- **Alice**: Primary test user
- **Bob**: Secondary test user for multi-user scenarios

---

## 🔨 Phase 1: Smart Contract Testing

### Setup & Deployment

```bash
cd contracts

# Build contracts
forge build

# Run comprehensive test suite
forge test -vv

# Deploy to Sepolia testnet
forge script script/DeployContracts.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
```

### Expected Results
```
Ran 2 test suites in 8.26ms: 21 tests passed, 0 failed
✅ YieldVault: 11/11 tests passing
✅ StreamingWallet: 10/10 tests passing
```

### Key Contract Functions to Verify

#### YieldVault Testing
```bash
# Test instant yield functionality
forge test --match-test testMintWithYield -vv

# Test deposit/withdrawal flow
forge test --match-test testWithdrawYieldOnly -vv

# Test yield generation over time
forge test --match-test testYieldGeneration -vv
```

#### StreamingWallet Testing
```bash
# Test session lifecycle
forge test --match-test testStartAndStopStream -vv

# Test payment from yield
forge test --match-test testStreamingWithInstantYield -vv

# Test multiple users
forge test --match-test testMultipleUsersCanStream -vv
```

### Manual Contract Testing (Optional)

If you want to test contracts manually:

```bash
# Connect to deployed contracts
cast call $YIELD_VAULT_ADDRESS "totalAssets()" --rpc-url $SEPOLIA_RPC_URL

# Check user balance
cast call $YIELD_VAULT_ADDRESS "yieldOf(address)" $USER_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Mint tokens with yield
cast send $MOCK_USDC_ADDRESS "mintWithYield(address,uint256)" $USER_ADDRESS 1000000000 --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY
```

---

## 🚀 Phase 2: Backend API Testing

### Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your contract addresses from Phase 1

# Set up database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

### Health Check Tests

```bash
# Test basic health
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "environment": "development"
}

# Test service status
curl http://localhost:3001/api/status

# Expected response:
{
  "status": "operational",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "network": {
    "chainId": 11155111,
    "blockNumber": 12345678
  }
}
```

### User Balance API Testing

```bash
# Replace with your test address
USER_ADDRESS="0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a"

# Test user balance endpoint
curl "http://localhost:3001/api/user/$USER_ADDRESS/balance"

# Expected response:
{
  "success": true,
  "data": {
    "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
    "yieldBalance": "200000000",
    "principalBalance": "1000000000",
    "totalBalance": "1200000000",
    "formatted": {
      "yield": "200.00 USDC",
      "principal": "1000.00 USDC",
      "total": "1200.00 USDC"
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### Content API Testing

```bash
# Get all available content
curl http://localhost:3001/api/content

# Expected response:
{
  "success": true,
  "data": [
    {
      "id": "clp123456789",
      "contentId": "intro-to-defi",
      "title": "Introduction to DeFi",
      "fullPrice": "10000000",
      "totalDuration": 3600,
      "isActive": true
    }
  ],
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

### Session Management API Testing

#### Test 1: Start Session
```bash
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "'$USER_ADDRESS'",
    "contentId": "intro-to-defi"
  }'

# Expected response (201):
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "active",
    "startTime": "2023-12-01T10:00:00.000Z",
    "estimatedCost": "10000000",
    "content": {
      "id": "intro-to-defi",
      "title": "Introduction to DeFi",
      "fullPrice": "10000000",
      "totalDuration": 3600
    }
  }
}

# Save the sessionId for next tests
SESSION_ID="session_lx7g2h_a1b2c3d4"
```

#### Test 2: Pause Session
```bash
curl -X POST http://localhost:3001/api/session/pause \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "userAddress": "'$USER_ADDRESS'"
  }'

# Expected response (200):
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "paused",
    "pausedAt": "2023-12-01T10:30:00.000Z",
    "activeDuration": 1800,
    "currentCost": "5000000"
  }
}
```

#### Test 3: Resume Session
```bash
curl -X POST http://localhost:3001/api/session/resume \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "userAddress": "'$USER_ADDRESS'"
  }'

# Expected response (200):
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "active",
    "resumedAt": "2023-12-01T11:00:00.000Z"
  }
}
```

#### Test 4: Get Session Details
```bash
curl "http://localhost:3001/api/session/$SESSION_ID?userAddress=$USER_ADDRESS"

# Expected response (200):
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "ACTIVE",
    "startTime": "2023-12-01T10:00:00.000Z",
    "totalDuration": 1800,
    "activeDuration": 1800,
    "currentCost": "5000000",
    "content": {
      "id": "intro-to-defi",
      "title": "Introduction to DeFi"
    }
  }
}
```

#### Test 5: Stop Session
```bash
curl -X POST http://localhost:3001/api/session/stop \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "'$SESSION_ID'",
    "userAddress": "'$USER_ADDRESS'"
  }'

# Expected response (200):
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "completed",
    "endTime": "2023-12-01T11:30:00.000Z",
    "totalDuration": 5400,
    "finalCost": "15000000",
    "payment": {
      "fromYield": "15000000",
      "fromPrincipal": "0",
      "txHash": "0x1234567890abcdef...",
      "blockNumber": 12345679
    }
  }
}
```

#### Test 6: Get User Session History
```bash
curl "http://localhost:3001/api/session/user/$USER_ADDRESS/history"

# Expected response:
{
  "success": true,
  "data": [
    {
      "sessionId": "session_lx7g2h_a1b2c3d4",
      "status": "COMPLETED",
      "startTime": "2023-12-01T10:00:00.000Z",
      "endTime": "2023-12-01T11:30:00.000Z",
      "totalDuration": 5400,
      "finalCost": "15000000"
    }
  ]
}
```

### Error Testing

#### Test Invalid Address
```bash
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "invalid-address",
    "contentId": "intro-to-defi"
  }'

# Expected response (400):
{
  "error": "Request Failed",
  "message": "Invalid Ethereum address",
  "statusCode": 400,
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

#### Test Rate Limiting
```bash
# Make 101 requests quickly to test rate limiting
for i in {1..101}; do
  curl http://localhost:3001/health &
done
wait

# Expected after 100 requests (429):
{
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later.",
  "statusCode": 429,
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

---

## 🌐 Phase 3: Frontend Integration Testing

### Setup Frontend (When Available)

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local
# Edit with backend URL and contract addresses

# Start development server
npm run dev
```

### Frontend Test Scenarios

#### Test 1: Wallet Connection
1. Open http://localhost:3000
2. Click "Connect Wallet"
3. Select MetaMask
4. Confirm connection
5. Verify address appears in UI

#### Test 2: Balance Display
1. After wallet connection
2. Verify balance loads automatically
3. Check that yield and principal are displayed correctly
4. Values should match backend API response

#### Test 3: Content Browsing
1. Navigate to content library
2. Verify content loads from backend API
3. Check content details (title, price, duration)
4. Verify "Start Streaming" button is available

#### Test 4: Streaming Session
1. Click "Start Streaming" on content
2. Verify session starts successfully
3. Check real-time cost calculation
4. Test pause/resume functionality
5. Verify stop and payment processing

#### Test 5: Session History
1. Navigate to user profile/history
2. Verify past sessions are displayed
3. Check session details and costs
4. Verify pagination if many sessions

### Frontend Error Scenarios

#### Test Insufficient Balance
1. Use account with low balance
2. Try to start expensive content
3. Verify error message displays
4. Check that session doesn't start

#### Test Network Issues
1. Disconnect from internet briefly
2. Try to perform actions
3. Verify appropriate error messages
4. Test reconnection behavior

---

## 🧪 End-to-End Testing Scenarios

### Scenario 1: New User Journey
1. **Setup**: Fresh wallet with test ETH
2. **Mint**: Use MockUSDC.mintWithYield() to get tokens
3. **Browse**: View available content via frontend
4. **Stream**: Start streaming session
5. **Use**: Let session run for a few minutes
6. **Pause**: Pause and resume session
7. **Stop**: End session and verify payment
8. **History**: Check session appears in history

### Scenario 2: Multi-User Testing
1. **Setup**: Two different wallets (Alice, Bob)
2. **Concurrent**: Both start different content simultaneously
3. **Verify**: Sessions are independent
4. **Cross-check**: Ensure no interference between users
5. **Payment**: Both complete sessions and verify separate payments

### Scenario 3: Edge Case Testing
1. **Zero Duration**: Start and immediately stop session
2. **Long Session**: Run session for extended period
3. **Network Issues**: Test with unstable connection
4. **Contract Limits**: Test system boundaries
5. **Error Recovery**: Test error handling and recovery

---

## 📊 Testing Checklist

### Smart Contracts ✅
- [ ] All 21 tests pass
- [ ] Deployment successful
- [ ] Contract addresses recorded
- [ ] Instant yield functionality works
- [ ] Payment flow from yield to principal works

### Backend APIs ✅
- [ ] Health check responds
- [ ] Service status shows "operational"
- [ ] User balance API returns correct data
- [ ] Content API lists available content
- [ ] Session start/pause/resume/stop cycle works
- [ ] Session history retrieval works
- [ ] Error handling works correctly
- [ ] Rate limiting activates after 100 requests

### Frontend Integration
- [ ] Wallet connection works
- [ ] Balance display accurate
- [ ] Content browsing functional
- [ ] Streaming session UI works
- [ ] Real-time cost updates
- [ ] Session history displays
- [ ] Error messages clear and helpful

### End-to-End Flows
- [ ] New user can complete full journey
- [ ] Multiple users can stream simultaneously
- [ ] Edge cases handled gracefully
- [ ] Error recovery works
- [ ] Payment processing reliable

---

## 🚨 Troubleshooting

### Common Issues

#### Backend Won't Start
```bash
# Check environment variables
cat .env

# Check database connection
npm run db:migrate

# Check contract addresses are valid
curl http://localhost:3001/api/status
```

#### Contract Calls Failing
```bash
# Check network connection
cast block latest --rpc-url $SEPOLIA_RPC_URL

# Verify contract addresses
cast code $YIELD_VAULT_ADDRESS --rpc-url $SEPOLIA_RPC_URL

# Check account has ETH for gas
cast balance $USER_ADDRESS --rpc-url $SEPOLIA_RPC_URL
```

#### Session API Errors
```bash
# Check user has sufficient balance
curl "http://localhost:3001/api/user/$USER_ADDRESS/balance"

# Verify content exists
curl http://localhost:3001/api/content

# Check for active sessions
curl "http://localhost:3001/api/session/user/$USER_ADDRESS/active"
```

### Debug Logs

Enable debug logging:
```bash
# Backend
LOG_LEVEL=debug npm run dev

# Contracts
forge test -vvv
```

---

## 📈 Performance Testing

### Load Testing (Optional)

Test API performance:
```bash
# Install Apache Bench
apt-get install apache2-utils

# Test health endpoint
ab -n 1000 -c 10 http://localhost:3001/health

# Test balance endpoint
ab -n 100 -c 5 "http://localhost:3001/api/user/$USER_ADDRESS/balance"
```

Expected results:
- Health endpoint: >1000 req/sec
- Balance endpoint: >100 req/sec
- Session operations: >50 req/sec

---

**🎯 Following this guide ensures the complete pay-as-you-consume system works correctly across all layers!**