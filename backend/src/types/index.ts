import { Request } from 'express';

// API Request/Response Types
export interface StartSessionRequest {
  userAddress: string;
  contentId: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface StartSessionResponse {
  sessionId: string;
  status: 'active';
  startTime: string;
  estimatedCost: string;
  content: {
    id: string;
    title: string;
    fullPrice: string;
    totalDuration: number;
  };
}

export interface PauseSessionRequest {
  sessionId: string;
  userAddress: string;
}

export interface PauseSessionResponse {
  sessionId: string;
  status: 'paused';
  pausedAt: string;
  activeDuration: number;
  currentCost: string;
}

export interface ResumeSessionRequest {
  sessionId: string;
  userAddress: string;
}

export interface ResumeSessionResponse {
  sessionId: string;
  status: 'active';
  resumedAt: string;
  totalPausedDuration: number;
}

export interface StopSessionRequest {
  sessionId: string;
  userAddress: string;
  txHash?: string; // Optional: if frontend already executed the transaction
}

export interface StopSessionResponse {
  sessionId: string;
  status: 'completed' | 'failed';
  endTime: string;
  totalDuration: number;
  finalCost: string;
  payment: {
    fromYield: string;
    fromPrincipal: string;
    txHash?: string;
    blockNumber?: number;
    gasUsed?: string;
  };
}

export interface GetSessionResponse {
  sessionId: string;
  status: SessionStatus;
  startTime: string;
  endTime?: string;
  totalDuration: number;
  activeDuration: number;
  pausedDuration: number;
  currentCost: string;
  finalCost?: string;
  content: {
    id: string;
    title: string;
    fullPrice: string;
    totalDuration: number;
  };
  payment?: {
    fromYield: string;
    fromPrincipal: string;
    txHash?: string;
    blockNumber?: number;
  };
}

// Blockchain Types
export interface ContractAddresses {
  yieldVault: string;
  streamingWallet: string;
  mockUSDC: string;
}

export interface BlockchainConfig {
  rpcUrl: string;
  privateKey: string;
  contracts: ContractAddresses;
  networkId: number;
}

// Session Status Enum
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

// Database Session Model (matching Prisma)
export interface SessionModel {
  id: string;
  sessionId: string;
  userAddress: string;
  contentId: string;
  status: SessionStatus;
  startTime: Date;
  endTime?: Date;
  pausedAt?: Date;
  resumedAt?: Date;
  totalDuration: number;
  pausedDuration: number;
  activeDuration: number;
  estimatedCost: string;
  finalCost?: string;
  paidFromYield: string;
  paidFromPrincipal: string;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Content Model
export interface ContentModel {
  id: string;
  contentId: string;
  title: string;
  description?: string;
  fullPrice: string;
  totalDuration: number;
  category?: string;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Extended Express Request
export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

// API Error Response
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path: string;
}

// Blockchain Event Types
export interface StreamStartedEvent {
  user: string;
  contentId: string;
  startTime: number;
}

export interface StreamStoppedEvent {
  user: string;
  contentId: string;
  endTime: number;
  totalDuration: number;
  amountPaid: string;
}

export interface PaymentDeductedEvent {
  user: string;
  contentId: string;
  amount: string;
  fromYield: boolean;
  remainingYield: string;
}

// Utility Types
export type CreateSessionData = Omit<SessionModel, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSessionData = Partial<Pick<SessionModel, 'status' | 'endTime' | 'pausedAt' | 'resumedAt' | 'totalDuration' | 'pausedDuration' | 'activeDuration' | 'finalCost' | 'paidFromYield' | 'paidFromPrincipal' | 'txHash' | 'blockNumber' | 'gasUsed'>>;

// Service Response Types
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Cost calculation interface
export interface CostCalculation {
  currentCost: string;
  activeDuration: number;
  remainingDuration: number;
  costPerSecond: string;
}