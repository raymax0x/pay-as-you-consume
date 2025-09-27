# Pay-As-You-Consume Backend API Documentation

## Overview

The Pay-As-You-Consume Backend provides RESTful APIs for managing streaming sessions, user balances, and content consumption with blockchain integration.

**Base URL:** `http://localhost:3001`

**Version:** 1.0.0

## Authentication

Currently, the API does not require authentication for session management. User identity is verified through Ethereum address validation.

## Rate Limiting

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Error Handling

All API responses follow a consistent error format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "statusCode": 400,
  "timestamp": "2023-12-01T10:00:00.000Z",
  "path": "/api/session/start"
}
```

## Health Check Endpoints

### GET /health

Basic health check for the service.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "version": "1.0.0",
  "environment": "development"
}
```

### GET /api/status

Detailed status check including database and blockchain connectivity.

**Response:**
```json
{
  "status": "operational",
  "timestamp": "2023-12-01T10:00:00.000Z",
  "services": {
    "database": "connected",
    "blockchain": "connected",
    "api": "operational"
  },
  "network": {
    "chainId": 11155111,
    "blockNumber": 12345678
  }
}
```

## Session Management APIs

### POST /api/session/start

Start a new streaming session for content consumption.

**Request Body:**
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
    "sessionId": "session_1234567890_abcdef123",
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
- `400` - Validation error or insufficient balance
- `404` - Content not found
- `409` - User already has active session for this content

### POST /api/session/pause

Pause an active streaming session.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abcdef123",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abcdef123",
    "status": "paused",
    "pausedAt": "2023-12-01T10:30:00.000Z",
    "activeDuration": 1800,
    "currentCost": "5000000"
  },
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

**Error Responses:**
- `400` - Session not active
- `403` - Unauthorized (wrong user)
- `404` - Session not found

### POST /api/session/resume

Resume a paused streaming session.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abcdef123",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abcdef123",
    "status": "active",
    "resumedAt": "2023-12-01T11:00:00.000Z",
    "totalPausedDuration": 300
  },
  "timestamp": "2023-12-01T11:00:00.000Z"
}
```

### POST /api/session/stop

Stop a streaming session and process payment.

**Request Body:**
```json
{
  "sessionId": "session_1234567890_abcdef123",
  "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
  "txHash": "0x1234567890abcdef..." // Optional: if frontend already executed tx
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abcdef123",
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

### GET /api/session/:sessionId

Get details of a specific session.

**Query Parameters:**
- `userAddress` (required) - Ethereum address of the user

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "session_1234567890_abcdef123",
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

### GET /api/session/user/:userAddress/active

Get all active sessions for a user.

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session_1234567890_abcdef123",
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

### GET /api/session/user/:userAddress/history

Get session history for a user.

**Query Parameters:**
- `limit` (optional) - Number of sessions to return (default: 50, max: 100)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "session_1234567890_abcdef123",
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

## User & Balance APIs

### GET /api/user/:userAddress/balance

Get user's balance information from the blockchain.

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

## Content APIs

### GET /api/content

Get all active content available for streaming.

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

## Data Types

### SessionStatus
- `ACTIVE` - Session is currently running
- `PAUSED` - Session is temporarily paused
- `COMPLETED` - Session finished successfully with payment
- `CANCELLED` - Session was cancelled by user
- `FAILED` - Session failed due to payment or technical issues

### Ethereum Address Format
- Must be a valid 42-character hexadecimal string starting with "0x"
- Example: `0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a`

### Token Amounts
- All token amounts are returned as strings in wei (smallest unit)
- 1 USDC = 1,000,000 wei (6 decimals)
- Example: "10000000" = 10.00 USDC

### Durations
- All durations are in seconds
- Example: 3600 = 1 hour

## Error Codes

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | Validation Error | Invalid request parameters |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Access denied |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource already exists or conflicting state |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Limit:** 100 requests per 15-minute window per IP
- **Headers returned:**
  - `X-RateLimit-Limit` - Request limit per window
  - `X-RateLimit-Remaining` - Requests remaining in current window
  - `X-RateLimit-Reset` - Time when the rate limit resets

When rate limit is exceeded:
```json
{
  "error": "Too Many Requests",
  "message": "Too many requests from this IP, please try again later.",
  "statusCode": 429,
  "timestamp": "2023-12-01T10:30:00.000Z"
}
```

## WebSocket Events (Future Enhancement)

The following WebSocket events are planned for real-time updates:

- `session:started` - When a session begins
- `session:paused` - When a session is paused
- `session:resumed` - When a session resumes
- `session:stopped` - When a session ends
- `payment:processed` - When payment is completed
- `balance:updated` - When user balance changes

## SDK Usage Examples

### JavaScript/TypeScript

```typescript
// Start a session
const startResponse = await fetch('/api/session/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userAddress: '0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a',
    contentId: 'intro-to-defi'
  })
});

const session = await startResponse.json();
console.log('Session started:', session.data.sessionId);

// Check user balance
const balanceResponse = await fetch('/api/user/0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a/balance');
const balance = await balanceResponse.json();
console.log('Total balance:', balance.data.formatted.total);
```

### cURL Examples

```bash
# Start a session
curl -X POST http://localhost:3001/api/session/start \
  -H "Content-Type: application/json" \
  -d '{
    "userAddress": "0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a",
    "contentId": "intro-to-defi"
  }'

# Get user balance
curl http://localhost:3001/api/user/0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a/balance

# Get active sessions
curl http://localhost:3001/api/session/user/0x742C4B0F8e6cD2E0b35e8eF6dbC66f5c6D4B9E8a/active
```

## Environment Setup

Required environment variables:

```bash
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/pay_as_you_consume_db"

# Blockchain
RPC_URL="https://sepolia.infura.io/v3/your-project-id"
PRIVATE_KEY="your-private-key"
NETWORK_ID=11155111
YIELD_VAULT_ADDRESS="0x..."
STREAMING_WALLET_ADDRESS="0x..."
MOCK_USDC_ADDRESS="0x..."

# Security
JWT_SECRET="your-secret-key"
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CORS_ORIGIN="http://localhost:3000"
```

## Development Setup

1. **Install Dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Set Up Database:**
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

3. **Start Development Server:**
   ```bash
   npm run dev
   ```

4. **Run Tests:**
   ```bash
   npm test
   ```

The API will be available at `http://localhost:3001` with full logging and hot-reload enabled.