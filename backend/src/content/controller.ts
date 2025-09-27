import { Request, Response } from 'express';
import * as contentService from './service';
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

export const getActiveContent = async (req: Request, res: Response) => {
  try {
    const result = await contentService.getActiveContent();

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 500);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting active content', { error });
    sendError(res, 'Failed to get content', 500);
  }
};

export const getContentById = async (req: Request, res: Response) => {
  try {
    const { contentId } = req.params;

    if (!contentId) {
      return sendError(res, 'Content ID is required');
    }

    const result = await contentService.getContentById(contentId);

    if (!result.success) {
      return sendError(res, result.error!, result.statusCode || 404);
    }

    sendSuccess(res, result.data);

  } catch (error) {
    logger.error('Error getting content by ID', { error, contentId: req.params.contentId });
    sendError(res, 'Failed to get content', 500);
  }
};