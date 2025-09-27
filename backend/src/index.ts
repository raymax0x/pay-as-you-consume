import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

// Import after env is loaded
import { config, rateLimitConfig, corsConfig } from './config';
import { logger, morganStream } from './utils/logger';

// Feature modules
import { sessionRoutes } from './session/routes';
import { userRoutes } from './user/routes';
import { contentRoutes } from './content/routes';

// Services
import { initializeDatabase, disconnectDatabase } from './database/service';
import { initializeBlockchain, getNetworkInfo } from './blockchain/service';

const app = express();

// Initialize services
const initServices = async () => {
  try {
    await initializeDatabase();
    initializeBlockchain();
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error });
    process.exit(1);
  }
};

// Setup middleware
const setupMiddleware = () => {
  // Security
  if (config.ENABLE_HELMET) {
    app.use(helmet());
  }

  // Compression
  if (config.ENABLE_COMPRESSION) {
    app.use(compression());
  }

  // CORS
  app.use(cors(corsConfig));

  // Rate limiting
  app.use('/api/', rateLimit(rateLimitConfig));

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Logging
  app.use(morgan('combined', { stream: morganStream }));

  // Request ID
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] ||
      Math.random().toString(36).substring(2, 15);
    res.setHeader('X-Request-ID', req.headers['x-request-id']);
    next();
  });
};

// Setup routes
const setupRoutes = () => {
  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV
    });
  });

  // API status
  app.get('/api/status', async (req, res) => {
    try {
      const networkInfo = await getNetworkInfo();
      res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        network: {
          chainId: networkInfo.chainId,
          blockNumber: networkInfo.blockNumber
        }
      });
    } catch (error) {
      logger.error('Status check failed', { error });
      res.status(503).json({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: 'Services unavailable'
      });
    }
  });

  // Feature routes
  app.use('/api/session', sessionRoutes);
  app.use('/api/user', userRoutes);
  app.use('/api/content', contentRoutes);

  // 404 handler
  app.use('*', (req, res) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    });
  });
};

// Error handling
const setupErrorHandling = () => {
  app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: config.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      timestamp: new Date().toISOString()
    });
  });
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    await disconnectDatabase();
    logger.info('Database disconnected');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown', { error });
    process.exit(1);
  }
};

// Start server
const startServer = async () => {
  try {
    await initServices();
    setupMiddleware();
    setupRoutes();
    setupErrorHandling();

    app.listen(config.PORT, () => {
      logger.info('Server started', {
        port: config.PORT,
        environment: config.NODE_ENV,
        networkId: config.NETWORK_ID
      });
    });

    // Handle shutdown signals
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

// Start the application
startServer();

export default app;