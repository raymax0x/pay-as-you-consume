import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock data
const mockContent = [
  {
    id: "clp123456789",
    contentId: "intro-to-defi",
    title: "Introduction to DeFi",
    description: "Learn the basics of Decentralized Finance and how it's revolutionizing traditional banking",
    fullPrice: "10000000", // 10 USDC in wei (6 decimals)
    totalDuration: 3600, // 1 hour
    category: "Education",
    thumbnailUrl: "https://via.placeholder.com/640x360?text=Intro+to+DeFi",
    isActive: true,
    createdAt: "2023-11-01T10:00:00.000Z"
  },
  {
    id: "clp234567890",
    contentId: "yield-farming-guide",
    title: "Yield Farming Masterclass",
    description: "Advanced strategies for maximizing returns in DeFi protocols",
    fullPrice: "15000000", // 15 USDC
    totalDuration: 2700, // 45 minutes
    category: "Advanced",
    thumbnailUrl: "https://via.placeholder.com/640x360?text=Yield+Farming",
    isActive: true,
    createdAt: "2023-11-02T10:00:00.000Z"
  },
  {
    id: "clp345678901",
    contentId: "smart-contracts-101",
    title: "Smart Contracts 101",
    description: "Understanding the building blocks of blockchain applications",
    fullPrice: "8000000", // 8 USDC
    totalDuration: 2400, // 40 minutes
    category: "Beginner",
    thumbnailUrl: "https://via.placeholder.com/640x360?text=Smart+Contracts",
    isActive: true,
    createdAt: "2023-11-03T10:00:00.000Z"
  }
];

// Mock sessions store
const sessions: { [key: string]: any } = {};
let sessionCounter = 1;

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    network: {
      chainId: 11155111,
      blockNumber: 20123456
    }
  });
});

app.get('/api/content', (req, res) => {
  res.json({
    success: true,
    data: mockContent,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/user/:userAddress/balance', (req, res) => {
  const { userAddress } = req.params;

  // Mock balance data
  const mockBalance = {
    yieldBalance: "20000000", // 20 USDC yield
    principalBalance: "100000000", // 100 USDC principal
    totalBalance: "120000000", // 120 USDC total
    formatted: {
      yield: "20.00 USDC",
      principal: "100.00 USDC",
      total: "120.00 USDC"
    }
  };

  res.json({
    success: true,
    data: {
      userAddress,
      ...mockBalance
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/session/start', (req, res) => {
  const { userAddress, contentId } = req.body;

  if (!userAddress || !contentId) {
    return res.status(400).json({
      success: false,
      message: 'userAddress and contentId are required'
    });
  }

  const content = mockContent.find(c => c.contentId === contentId);
  if (!content) {
    return res.status(404).json({
      success: false,
      message: 'Content not found'
    });
  }

  const sessionId = `session_${Date.now()}_${sessionCounter++}`;
  const session = {
    sessionId,
    userAddress,
    contentId,
    status: 'active',
    startTime: new Date().toISOString(),
    lastUpdateTime: new Date().toISOString(),
    accumulatedTime: 0
  };

  sessions[sessionId] = session;

  return res.status(201).json({
    success: true,
    data: {
      sessionId,
      status: 'active',
      startTime: session.startTime,
      estimatedCost: content.fullPrice,
      content
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/session/pause', (req, res) => {
  const { sessionId, userAddress } = req.body;

  const session = sessions[sessionId];
  if (!session || session.userAddress !== userAddress) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized'
    });
  }

  if (session.status !== 'active') {
    return res.status(400).json({
      success: false,
      message: 'Session is not active'
    });
  }

  const now = new Date();
  const lastUpdate = new Date(session.lastUpdateTime);
  const elapsedTime = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);

  session.status = 'paused';
  session.accumulatedTime += elapsedTime;
  session.lastUpdateTime = now.toISOString();

  return res.json({
    success: true,
    data: {
      sessionId,
      status: 'paused',
      pausedAt: now.toISOString(),
      activeDuration: session.accumulatedTime,
      currentCost: Math.floor((session.accumulatedTime / 3600) * 10000000).toString() // Mock cost calculation
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/session/resume', (req, res) => {
  const { sessionId, userAddress } = req.body;

  const session = sessions[sessionId];
  if (!session || session.userAddress !== userAddress) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized'
    });
  }

  if (session.status !== 'paused') {
    return res.status(400).json({
      success: false,
      message: 'Session is not paused'
    });
  }

  session.status = 'active';
  session.lastUpdateTime = new Date().toISOString();

  return res.json({
    success: true,
    data: {
      sessionId,
      status: 'active',
      resumedAt: session.lastUpdateTime,
      totalPausedDuration: 0 // Mock value
    },
    timestamp: new Date().toISOString()
  });
});

app.post('/api/session/stop', (req, res) => {
  const { sessionId, userAddress } = req.body;

  const session = sessions[sessionId];
  if (!session || session.userAddress !== userAddress) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized'
    });
  }

  const now = new Date();
  let totalDuration = session.accumulatedTime;

  if (session.status === 'active') {
    const lastUpdate = new Date(session.lastUpdateTime);
    const elapsedTime = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    totalDuration += elapsedTime;
  }

  const finalCost = Math.floor((totalDuration / 3600) * 10000000).toString(); // Mock cost calculation

  // Clean up session
  delete sessions[sessionId];

  return res.json({
    success: true,
    data: {
      sessionId,
      status: 'completed',
      endTime: now.toISOString(),
      totalDuration,
      finalCost,
      payment: {
        fromYield: finalCost,
        fromPrincipal: "0",
        txHash: "0x" + Math.random().toString(16).substring(2, 66), // Mock tx hash
        blockNumber: 20123456,
        gasUsed: "150000"
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { userAddress } = req.query;

  const session = sessions[sessionId];
  if (!session || session.userAddress !== userAddress) {
    return res.status(404).json({
      success: false,
      message: 'Session not found or unauthorized'
    });
  }

  const content = mockContent.find(c => c.contentId === session.contentId);
  let currentCost = "0";
  let activeDuration = session.accumulatedTime;

  if (session.status === 'active') {
    const now = new Date();
    const lastUpdate = new Date(session.lastUpdateTime);
    const elapsedTime = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
    activeDuration += elapsedTime;
  }

  currentCost = Math.floor((activeDuration / 3600) * 10000000).toString();

  return res.json({
    success: true,
    data: {
      sessionId,
      status: session.status.toUpperCase(),
      startTime: session.startTime,
      totalDuration: activeDuration,
      activeDuration,
      pausedDuration: 0,
      currentCost,
      content
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/session/user/:userAddress/active', (req, res) => {
  const { userAddress } = req.params;

  const activeSessions = Object.values(sessions)
    .filter((session: any) => session.userAddress === userAddress && session.status === 'active')
    .map((session: any) => {
      const content = mockContent.find(c => c.contentId === session.contentId);
      return {
        sessionId: session.sessionId,
        status: session.status.toUpperCase(),
        startTime: session.startTime,
        content: content ? {
          id: content.contentId,
          title: content.title
        } : null
      };
    });

  return res.json({
    success: true,
    data: activeSessions,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server started on port ${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

export default app;