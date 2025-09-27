import { z } from 'zod';

// Validation schemas for external inputs
export const ethereumAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');
export const sessionIdSchema = z.string().min(10).max(50);
export const contentIdSchema = z.string().min(1).max(100);
export const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash').optional();

// Session request schemas
export const startSessionSchema = z.object({
  userAddress: ethereumAddressSchema,
  contentId: contentIdSchema,
});

export const pauseSessionSchema = z.object({
  sessionId: sessionIdSchema,
  userAddress: ethereumAddressSchema,
});

export const resumeSessionSchema = z.object({
  sessionId: sessionIdSchema,
  userAddress: ethereumAddressSchema,
});

export const stopSessionSchema = z.object({
  sessionId: sessionIdSchema,
  userAddress: ethereumAddressSchema,
  txHash: txHashSchema,
});

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  timestamp: string;
}

export interface ApiError {
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

// Session types
export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED'
}

export interface SessionData {
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
}

// Content types
export interface ContentData {
  id: string;
  contentId: string;
  title: string;
  description?: string;
  fullPrice: string;
  totalDuration: number;
  category?: string;
  thumbnailUrl?: string;
  isActive: boolean;
}

// User types
export interface UserBalance {
  userAddress: string;
  yieldBalance: string;
  principalBalance: string;
  totalBalance: string;
  formatted: {
    yield: string;
    principal: string;
    total: string;
  };
}

// Blockchain types
export interface NetworkInfo {
  chainId: number;
  blockNumber: number;
  gasPrice: string;
}

export interface PaymentResult {
  txHash: string;
  blockNumber: number;
  gasUsed: string;
  finalCost: string;
  paidFromYield: string;
  paidFromPrincipal: string;
}

// Service response pattern
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
}

// Utility types
export type StartSessionRequest = z.infer<typeof startSessionSchema>;
export type PauseSessionRequest = z.infer<typeof pauseSessionSchema>;
export type ResumeSessionRequest = z.infer<typeof resumeSessionSchema>;
export type StopSessionRequest = z.infer<typeof stopSessionSchema>;