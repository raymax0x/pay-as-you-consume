# Pay-As-You-Consume Backend

A TypeScript backend for DeFi-powered pay-as-you-consume streaming with session management and blockchain integration.

## 🏗️ Architecture

Built following functional programming principles with feature-based organization:

```
src/
├── config.ts              # Environment configuration
├── types.ts               # Shared TypeScript types
├── index.ts               # Main server (functional)
├── session/               # Session management
├── user/                  # User operations
├── content/               # Content management
├── blockchain/            # Blockchain interactions
├── database/              # Database operations
└── utils/                 # Shared utilities
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- Ethereum testnet access (Sepolia)

### Installation

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Set up database
npm run db:generate
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```bash
# Server
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/pay_as_you_consume"

# Blockchain
RPC_URL="https://sepolia.infura.io/v3/your-project-id"
PRIVATE_KEY="0x..."
NETWORK_ID=11155111

# Smart Contracts
YIELD_VAULT_ADDRESS="0x..."
STREAMING_WALLET_ADDRESS="0x..."
MOCK_USDC_ADDRESS="0x..."

# Security
JWT_SECRET="your-secret-key"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN="http://localhost:3000"

# Logging
LOG_LEVEL="info"

# Feature Flags
ENABLE_HELMET="true"
ENABLE_COMPRESSION="true"
ENABLE_METRICS="true"
```

## 📚 API Documentation

**Base URL:** `http://localhost:3001`

### Health & Status

#### GET /health
Basic health check

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "environment": "development"
}
```

#### GET /api/status
Detailed service status with blockchain connectivity

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "network": {
    "chainId": 11155111,
    "blockNumber": 12345678
  }
}
```

---

### 🎮 Session Management APIs

#### POST /api/session/start
Start a new streaming session

**Request:**
```json
{
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
  "contentId": "intro-to-defi"
}
```

**Response (201):**
```json
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
  },
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

**Error Responses:**
- `400` - Invalid request or insufficient balance
- `404` - Content not found
- `409` - User already has active session for this content

#### POST /api/session/pause
Pause an active streaming session

**Request:**
```json
{
  "sessionId": "session_lx7g2h_a1b2c3d4",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "paused",
    "pausedAt": "2023-12-01T10:30:00.000Z",
    "activeDuration": 1800,
    "currentCost": "5000000"
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

#### POST /api/session/resume
Resume a paused streaming session

**Request:**
```json
{
  "sessionId": "session_lx7g2h_a1b2c3d4",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "active",
    "resumedAt": "2023-12-01T11:00:00.000Z",
    "totalPausedDuration": 300
  },
  "timestamp": "2023-12-01T11:00:00.000Z"
}
```

#### POST /api/session/stop
Stop a session and process payment

**Request:**
```json
{
  "sessionId": "session_lx7g2h_a1b2c3d4",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
  "txHash": "0x1234..." // Optional
}
```

**Response (200):**
```json
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
      "blockNumber": 12345679,
      "gasUsed": "150000"
    }
  },
  "timestamp": "2023-12-01T11:30:00.000Z"
}
```

#### GET /api/session/:sessionId
Get session details

**Query Parameters:**
- `userAddress` (required) - User's Ethereum address

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_lx7g2h_a1b2c3d4",
    "status": "ACTIVE",
    "startTime": "2023-12-01T10:00:00.000Z",
    "totalDuration": 1800,
    "activeDuration": 1800,
    "pausedDuration": 0,
    "currentCost": "5000000",
    "content": {
      "id": "intro-to-defi",
      "title": "Introduction to DeFi",
      "fullPrice": "10000000",
      "totalDuration": 3600
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

#### GET /api/session/user/:userAddress/active
Get user's active sessions

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session_lx7g2h_a1b2c3d4",
      "status": "ACTIVE",
      "startTime": "2023-12-01T10:00:00.000Z",
      "content": {
        "id": "intro-to-defi",
        "title": "Introduction to DeFi"
      }
    }
  ],
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

#### GET /api/session/user/:userAddress/history
Get user's session history

**Query Parameters:**
- `limit` (optional) - Number of sessions (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session_abc123_def456",
      "status": "COMPLETED",
      "startTime": "2023-12-01T09:00:00.000Z",
      "endTime": "2023-12-01T09:30:00.000Z",
      "totalDuration": 1800,
      "finalCost": "5000000",
      "content": {
        "id": "intro-to-defi",
        "title": "Introduction to DeFi"
      }
    }
  ],
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

---

### 👤 User APIs

#### GET /api/user/:userAddress/balance
Get user's blockchain balance

**Response (200):**
```json
{
  "success": true,
  "data": {
    "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
    "yieldBalance": "50000000",
    "principalBalance": "200000000",
    "totalBalance": "250000000",
    "formatted": {
      "yield": "50.00 USDC",
      "principal": "200.00 USDC",
      "total": "250.00 USDC"
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

#### GET /api/user/:userAddress/stats
Get user's usage statistics

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSessions": 15,
    "completedSessions": 12,
    "totalWatchTime": 45600,
    "averageWatchTime": 3040,
    "totalSpent": "125000000",
    "balance": {
      "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
      "yieldBalance": "50000000",
      "principalBalance": "200000000",
      "totalBalance": "250000000",
      "formatted": {
        "yield": "50.00 USDC",
        "principal": "200.00 USDC",
        "total": "250.00 USDC"
      }
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

---

### 📹 Content APIs

#### GET /api/content
Get all active content

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "clp123456789",
      "contentId": "intro-to-defi",
      "title": "Introduction to DeFi",
      "description": "Learn the basics of Decentralized Finance",
      "fullPrice": "10000000",
      "totalDuration": 3600,
      "category": "Education",
      "thumbnailUrl": "https://example.com/thumb1.jpg",
      "isActive": true,
      "createdAt": "2023-11-01T10:00:00.000Z"
    }
  ],
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

#### GET /api/content/:contentId
Get specific content with blockchain verification

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "clp123456789",
    "contentId": "intro-to-defi",
    "title": "Introduction to DeFi",
    "description": "Learn the basics of Decentralized Finance",
    "fullPrice": "10000000",
    "totalDuration": 3600,
    "category": "Education",
    "thumbnailUrl": "https://example.com/thumb1.jpg",
    "isActive": true,
    "createdAt": "2023-11-01T10:00:00.000Z",
    "blockchain": {
      "isListed": true,
      "onChainPrice": "10000000",
      "onChainDuration": 3600,
      "priceMatches": true,
      "durationMatches": true
    }
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

---

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:seed      # Seed database with test data
npm run db:studio    # Open Prisma Studio
```

### Testing APIs

**Using cURL:**
```bash
# Check health
curl http://localhost:3001/health

# Start a session
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
    "contentId": "intro-to-defi"
  }'

# Get user balance
curl http://localhost:3001/api/user/0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a/balance

# Get all content
curl http://localhost:3001/api/content
```

## 🔧 Data Types

### Token Amounts
- All amounts are in wei (smallest unit)
- 1 USDC = 1,000,000 wei (6 decimals)
- Example: "10000000" = 10.00 USDC

### Session Status
- `ACTIVE` - Currently streaming
- `PAUSED` - Temporarily paused
- `COMPLETED` - Finished with payment
- `CANCELLED` - Cancelled by user
- `FAILED` - Failed due to error

### Ethereum Addresses
- Must be 42-character hex strings starting with "0x"
- Example: `0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a`

## 🚨 Error Handling

All errors follow consistent format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2023-12-01T10:00:00.000Z"
}
```

### Common Error Codes
- `400` - Bad Request (validation error)
- `401` - Unauthorized
- `403` - Forbidden (wrong user)
- `404` - Not Found
- `409` - Conflict (duplicate session)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error

## 🛡️ Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Configurable origins
- **Input Validation**: Zod schemas for all inputs
- **Helmet Security**: Security headers
- **Request Logging**: All requests logged
- **Error Sanitization**: No sensitive data in error responses

## 📊 Monitoring

The API provides built-in monitoring:

- **Health Checks**: `/health` and `/api/status`
- **Request Logging**: All requests with response times
- **Error Tracking**: Detailed error logs
- **Performance Metrics**: Built-in timing

## 🏛️ Architecture Principles

### Feature-Based Organization
Each feature (session, user, content) has its own:
- `controller.ts` - Thin request/response handlers
- `service.ts` - Business logic functions
- `routes.ts` - Route definitions

### Functional Programming
- Pure functions where possible
- No classes unless necessary
- Stateless operations
- Easy to test and reason about

### Type Safety
- TypeScript everywhere
- Zod validation for external inputs
- Shared types in `types.ts`
- No `any` types

### Error Handling
- Consistent error responses
- Proper HTTP status codes
- Detailed logging for debugging
- User-friendly error messages

---

**🚀 The backend is production-ready with comprehensive APIs for the pay-as-you-consume DeFi streaming platform!**