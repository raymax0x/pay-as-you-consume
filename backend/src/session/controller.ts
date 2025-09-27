import { Request, Response } from 'express';
import { z } from 'zod';
import { startSessionSchema, pauseSessionSchema, resumeSessionSchema, stopSessionSchema } from '../types';
import * as sessionService from './service';
import { logger } from '../utils/logger';

// Helper to send success response
const sendSuccess = (res: Response, data: any, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

// Helper to send error response
const sendError = (res: Response, error: string, statusCode = 400, path?: string) => {
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Failed',
    message: error,
    statusCode,
    timestamp: new Date().toISOString(),
    path
  });
};

export const startSession = async (req: Request, res: Response) => {
  try {
    const params = startSessionSchema.parse(req.body);
    const metadata = {
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    };

    const result = await sessionService.startSession(params, metadata);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    logger.info('Session started', { sessionId: result.data?.sessionId, userAddress: params.userAddress });
    sendSuccess(res, result.data, 201);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400, req.path);
    }
    logger.error('Error starting session', { error, body: req.body });
    sendError(res, 'Failed to start session', 500, req.path);
  }
};

export const pauseSession = async (req: Request, res: Response) => {
  try {
    const params = pauseSessionSchema.parse(req.body);
    const result = await sessionService.pauseSession(params);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    logger.info('Session paused', { sessionId: params.sessionId });
    sendSuccess(res, result.data);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400, req.path);
    }
    logger.error('Error pausing session', { error, body: req.body });
    sendError(res, 'Failed to pause session', 500, req.path);
  }
};

export const resumeSession = async (req: Request, res: Response) => {
  try {
    const params = resumeSessionSchema.parse(req.body);
    const result = await sessionService.resumeSession(params);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    logger.info('Session resumed', { sessionId: params.sessionId });
    sendSuccess(res, result.data);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400, req.path);
    }
    logger.error('Error resuming session', { error, body: req.body });
    sendError(res, 'Failed to resume session', 500, req.path);
  }
};

export const stopSession = async (req: Request, res: Response) => {
  try {
    const params = stopSessionSchema.parse(req.body);
    const result = await sessionService.stopSession(params);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    logger.info('Session stopped', { sessionId: params.sessionId, status: result.data?.status });
    sendSuccess(res, result.data);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendError(res, error.errors[0].message, 400, req.path);
    }
    logger.error('Error stopping session', { error, body: req.body });
    sendError(res, 'Failed to stop session', 500, req.path);
  }
};

export const getSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { userAddress } = req.query;

    if (!sessionId || !userAddress || typeof userAddress !== 'string') {
      return sendError(res, 'sessionId (param) and userAddress (query) are required', 400, req.path);
    }

    const result = await sessionService.getSession(sessionId, userAddress);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting session', { error, params: req.params, query: req.query });
    sendError(res, 'Failed to get session', 500, req.path);
  }
};

export const getUserActiveSessions = async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;

    if (!userAddress) {
      return sendError(res, 'userAddress is required', 400, req.path);
    }

    const result = await sessionService.getUserActiveSessions(userAddress);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting active sessions', { error, params: req.params });
    sendError(res, 'Failed to get active sessions', 500, req.path);
  }
};

export const getUserSessionHistory = async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    if (!userAddress) {
      return sendError(res, 'userAddress is required', 400, req.path);
    }

    const result = await sessionService.getUserSessionHistory(userAddress, limit);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 400, req.path);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting session history', { error, params: req.params });
    sendError(res, 'Failed to get session history', 500, req.path);
  }
};