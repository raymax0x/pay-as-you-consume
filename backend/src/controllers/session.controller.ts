import { Request, Response } from 'express';
import { SessionService } from '../services/session.service';
import {
  StartSessionRequest,
  PauseSessionRequest,
  StopSessionRequest,
  AuthenticatedRequest
} from '../types';
import { validateStartSession, validatePauseSession, validateStopSession } from '../utils/validation';
import logger from '../utils/logger';

export class SessionController {
  private sessionService: SessionService;

  constructor(sessionService: SessionService) {
    this.sessionService = sessionService;
  }

  /**
   * POST /api/session/start
   * Start a new streaming session
   */
  startSession = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = validateStartSession(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const startRequest: StartSessionRequest = {
        ...value,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip
      };

      const result = await this.sessionService.startSession(startRequest);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Session Start Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path,
          data: result.data
        });
        return;
      }

      logger.info('Session started via API', {
        sessionId: result.data?.sessionId,
        userAddress: startRequest.userAddress,
        contentId: startRequest.contentId
      });

      res.status(201).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in startSession controller', { error, body: req.body });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to start session',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * POST /api/session/pause
   * Pause an active streaming session
   */
  pauseSession = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = validatePauseSession(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const pauseRequest: PauseSessionRequest = value;
      const result = await this.sessionService.pauseSession(pauseRequest);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Session Pause Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      logger.info('Session paused via API', {
        sessionId: pauseRequest.sessionId,
        userAddress: pauseRequest.userAddress
      });

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in pauseSession controller', { error, body: req.body });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to pause session',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * POST /api/session/resume
   * Resume a paused streaming session
   */
  resumeSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId, userAddress } = req.body;

      if (!sessionId || !userAddress) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sessionId and userAddress are required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const result = await this.sessionService.resumeSession({ sessionId, userAddress });

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Session Resume Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      logger.info('Session resumed via API', { sessionId, userAddress });

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in resumeSession controller', { error, body: req.body });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to resume session',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * POST /api/session/stop
   * Stop a streaming session and process payment
   */
  stopSession = async (req: Request, res: Response): Promise<void> => {
    try {
      // Validate request body
      const { error, value } = validateStopSession(req.body);
      if (error) {
        res.status(400).json({
          error: 'Validation Error',
          message: error.details[0].message,
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const stopRequest: StopSessionRequest = value;
      const result = await this.sessionService.stopSession(stopRequest);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Session Stop Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      logger.info('Session stopped via API', {
        sessionId: stopRequest.sessionId,
        userAddress: stopRequest.userAddress,
        status: result.data?.status
      });

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in stopSession controller', { error, body: req.body });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to stop session',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * GET /api/session/:sessionId
   * Get session details
   */
  getSession = async (req: Request, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { userAddress } = req.query;

      if (!sessionId || !userAddress || typeof userAddress !== 'string') {
        res.status(400).json({
          error: 'Validation Error',
          message: 'sessionId (param) and userAddress (query) are required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const result = await this.sessionService.getSession(sessionId, userAddress);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Get Session Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getSession controller', { error, params: req.params, query: req.query });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get session',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * GET /api/session/user/:userAddress/active
   * Get user's active sessions
   */
  getUserActiveSessions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userAddress } = req.params;

      if (!userAddress) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'userAddress is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const result = await this.sessionService.getUserActiveSessions(userAddress);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Get Active Sessions Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getUserActiveSessions controller', { error, params: req.params });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get active sessions',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };

  /**
   * GET /api/session/user/:userAddress/history
   * Get user's session history
   */
  getUserSessionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userAddress } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      if (!userAddress) {
        res.status(400).json({
          error: 'Validation Error',
          message: 'userAddress is required',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      const result = await this.sessionService.getUserSessionHistory(userAddress, limit);

      if (!result.success) {
        res.status(result.statusCode || 500).json({
          error: 'Get Session History Failed',
          message: result.error,
          statusCode: result.statusCode || 500,
          timestamp: new Date().toISOString(),
          path: req.path
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('Error in getUserSessionHistory controller', { error, params: req.params });
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get session history',
        statusCode: 500,
        timestamp: new Date().toISOString(),
        path: req.path
      });
    }
  };
}