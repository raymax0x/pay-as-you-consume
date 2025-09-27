import { Request, Response } from 'express';
import { ethereumAddressSchema } from '../types';
import * as userService from './service';
import { logger } from '../utils/logger';

const sendSuccess = (res: Response, data: any) => {
  res.json({
    success: true,
    data,
    timestamp: new Date().toISOString()
  });
};

const sendError = (res: Response, error: string, statusCode = 400) => {
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : 'Request Failed',
    message: error,
    statusCode,
    timestamp: new Date().toISOString()
  });
};

export const getUserBalance = async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;

    // Validate Ethereum address
    const validation = ethereumAddressSchema.safeParse(userAddress);
    if (!validation.success) {
      return sendError(res, 'Invalid Ethereum address format');
    }

    const result = await userService.getUserBalance(userAddress);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 500);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting user balance', { error, userAddress: req.params.userAddress });
    sendError(res, 'Failed to get user balance', 500);
  }
};

export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;

    // Validate Ethereum address
    const validation = ethereumAddressSchema.safeParse(userAddress);
    if (!validation.success) {
      return sendError(res, 'Invalid Ethereum address format');
    }

    const result = await userService.getUserStats(userAddress);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 500);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting user stats', { error, userAddress: req.params.userAddress });
    sendError(res, 'Failed to get user stats', 500);
  }
};