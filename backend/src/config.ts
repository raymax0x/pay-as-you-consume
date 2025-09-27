import { z } from 'zod';

const envSchema = z.object({
  // Server Configuration
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database Configuration
  DATABASE_URL: z.string().url(),

  // Blockchain Configuration
  RPC_URL: z.string().url(),
  PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid private key format'),
  NETWORK_ID: z.string().transform(Number),

  // Contract Addresses
  YIELD_VAULT_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  STREAMING_WALLET_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  MOCK_USDC_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),

  // Security & Rate Limiting
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),

  // Session Configuration
  SESSION_TIMEOUT_MINUTES: z.string().transform(Number).default('60'),
  MAX_ACTIVE_SESSIONS_PER_USER: z.string().transform(Number).default('5'),

  // Gas Configuration
  GAS_LIMIT: z.string().transform(Number).default('500000'),
  GAS_PRICE_GWEI: z.string().transform(Number).default('20'),
  MAX_GAS_PRICE_GWEI: z.string().transform(Number).default('100'),

  // Feature Flags
  ENABLE_METRICS: z.string().transform(val => val === 'true').default('true'),
  METRICS_INTERVAL_MINUTES: z.string().transform(Number).default('5'),
  ENABLE_HELMET: z.string().transform(val => val === 'true').default('true'),
  ENABLE_COMPRESSION: z.string().transform(val => val === 'true').default('true'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default('12'),
});

export const config = envSchema.parse(process.env);

export const blockchainConfig = {
  rpcUrl: config.RPC_URL,
  privateKey: config.PRIVATE_KEY,
  contracts: {
    yieldVault: config.YIELD_VAULT_ADDRESS,
    streamingWallet: config.STREAMING_WALLET_ADDRESS,
    mockUSDC: config.MOCK_USDC_ADDRESS,
  },
  networkId: config.NETWORK_ID,
};

export const rateLimitConfig = {
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
};

export const corsConfig = {
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};