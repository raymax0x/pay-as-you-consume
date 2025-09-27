import Joi from 'joi';

// Ethereum address validation pattern
const ethereumAddressPattern = /^0x[a-fA-F0-9]{40}$/;

// Common schemas
const ethereumAddressSchema = Joi.string()
  .pattern(ethereumAddressPattern)
  .required()
  .messages({
    'string.pattern.base': 'Invalid Ethereum address format'
  });

const sessionIdSchema = Joi.string()
  .min(10)
  .max(50)
  .required()
  .messages({
    'string.min': 'Session ID must be at least 10 characters long',
    'string.max': 'Session ID must not exceed 50 characters'
  });

const contentIdSchema = Joi.string()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.min': 'Content ID is required',
    'string.max': 'Content ID must not exceed 100 characters'
  });

const transactionHashSchema = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{64}$/)
  .optional()
  .messages({
    'string.pattern.base': 'Invalid transaction hash format'
  });

// Start Session Validation
export const validateStartSession = (data: any) => {
  const schema = Joi.object({
    userAddress: ethereumAddressSchema,
    contentId: contentIdSchema,
    userAgent: Joi.string().max(500).optional(),
    ipAddress: Joi.string().ip().optional()
  });

  return schema.validate(data);
};

// Pause Session Validation
export const validatePauseSession = (data: any) => {
  const schema = Joi.object({
    sessionId: sessionIdSchema,
    userAddress: ethereumAddressSchema
  });

  return schema.validate(data);
};

// Resume Session Validation
export const validateResumeSession = (data: any) => {
  const schema = Joi.object({
    sessionId: sessionIdSchema,
    userAddress: ethereumAddressSchema
  });

  return schema.validate(data);
};

// Stop Session Validation
export const validateStopSession = (data: any) => {
  const schema = Joi.object({
    sessionId: sessionIdSchema,
    userAddress: ethereumAddressSchema,
    txHash: transactionHashSchema
  });

  return schema.validate(data);
};

// Content Validation
export const validateContent = (data: any) => {
  const schema = Joi.object({
    contentId: contentIdSchema,
    title: Joi.string().min(1).max(200).required(),
    description: Joi.string().max(1000).optional(),
    fullPrice: Joi.string().pattern(/^\d+$/).required().messages({
      'string.pattern.base': 'Full price must be a valid number string (wei)'
    }),
    totalDuration: Joi.number().integer().min(1).max(86400).required().messages({
      'number.min': 'Total duration must be at least 1 second',
      'number.max': 'Total duration must not exceed 24 hours (86400 seconds)'
    }),
    category: Joi.string().max(50).optional(),
    thumbnailUrl: Joi.string().uri().max(500).optional(),
    isActive: Joi.boolean().optional().default(true)
  });

  return schema.validate(data);
};

// User Address Validation
export const validateUserAddress = (address: string) => {
  return ethereumAddressSchema.validate(address);
};

// Query Parameters Validation
export const validatePaginationQuery = (query: any) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).optional().default(50),
    offset: Joi.number().integer().min(0).optional().default(0),
    sortBy: Joi.string().valid('createdAt', 'updatedAt', 'totalDuration', 'finalCost').optional().default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').optional().default('desc')
  });

  return schema.validate(query);
};

// Session Status Filter Validation
export const validateSessionStatusFilter = (status: any) => {
  const schema = Joi.string().valid('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED', 'FAILED').optional();
  return schema.validate(status);
};

// Blockchain Configuration Validation
export const validateBlockchainConfig = (config: any) => {
  const schema = Joi.object({
    rpcUrl: Joi.string().uri().required(),
    privateKey: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required().messages({
      'string.pattern.base': 'Invalid private key format'
    }),
    contracts: Joi.object({
      yieldVault: ethereumAddressSchema,
      streamingWallet: ethereumAddressSchema,
      mockUSDC: ethereumAddressSchema
    }).required(),
    networkId: Joi.number().integer().min(1).required()
  });

  return schema.validate(config);
};

// Environment Variables Validation
export const validateEnvironmentVariables = (env: any) => {
  const schema = Joi.object({
    PORT: Joi.number().integer().min(1).max(65535).default(3001),
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    DATABASE_URL: Joi.string().uri().required(),
    RPC_URL: Joi.string().uri().required(),
    PRIVATE_KEY: Joi.string().pattern(/^0x[a-fA-F0-9]{64}$/).required(),
    NETWORK_ID: Joi.number().integer().min(1).required(),
    YIELD_VAULT_ADDRESS: ethereumAddressSchema,
    STREAMING_WALLET_ADDRESS: ethereumAddressSchema,
    MOCK_USDC_ADDRESS: ethereumAddressSchema,
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    RATE_LIMIT_WINDOW_MS: Joi.number().integer().min(1000).default(900000),
    RATE_LIMIT_MAX_REQUESTS: Joi.number().integer().min(1).default(100),
    CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    SESSION_TIMEOUT_MINUTES: Joi.number().integer().min(1).default(60),
    MAX_ACTIVE_SESSIONS_PER_USER: Joi.number().integer().min(1).default(5),
    GAS_LIMIT: Joi.number().integer().min(21000).default(500000),
    GAS_PRICE_GWEI: Joi.number().min(1).default(20),
    MAX_GAS_PRICE_GWEI: Joi.number().min(1).default(100),
    ENABLE_METRICS: Joi.boolean().default(true),
    METRICS_INTERVAL_MINUTES: Joi.number().integer().min(1).default(5),
    BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
    ENABLE_HELMET: Joi.boolean().default(true),
    ENABLE_COMPRESSION: Joi.boolean().default(true)
  });

  return schema.validate(env, { allowUnknown: true });
};

// API Response Validation
export const validateApiResponse = (data: any) => {
  const schema = Joi.object({
    success: Joi.boolean().required(),
    data: Joi.any().optional(),
    error: Joi.string().optional(),
    message: Joi.string().optional(),
    statusCode: Joi.number().integer().min(100).max(599).optional(),
    timestamp: Joi.date().iso().required(),
    path: Joi.string().optional()
  });

  return schema.validate(data);
};

// Custom validation functions
export const isValidEthereumAddress = (address: string): boolean => {
  return ethereumAddressPattern.test(address);
};

export const isValidTransactionHash = (hash: string): boolean => {
  return /^0x[a-fA-F0-9]{64}$/.test(hash);
};

export const isValidContentId = (contentId: string): boolean => {
  return typeof contentId === 'string' && contentId.length >= 1 && contentId.length <= 100;
};

export const isValidSessionId = (sessionId: string): boolean => {
  return typeof sessionId === 'string' && sessionId.length >= 10 && sessionId.length <= 50;
};

// Sanitization functions
export const sanitizeUserInput = (input: string): string => {
  return input.trim().replace(/[<>\"']/g, '');
};

export const sanitizeNumericInput = (input: any): number | null => {
  const num = parseInt(input, 10);
  return isNaN(num) ? null : num;
};

export const sanitizeBooleanInput = (input: any): boolean | null => {
  if (typeof input === 'boolean') return input;
  if (typeof input === 'string') {
    const lower = input.toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return null;
};