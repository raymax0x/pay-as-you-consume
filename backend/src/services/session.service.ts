import { BlockchainService } from './blockchain.service';
import { DatabaseService } from './database.service';
import {
  SessionStatus,
  StartSessionRequest,
  StartSessionResponse,
  PauseSessionRequest,
  PauseSessionResponse,
  StopSessionRequest,
  StopSessionResponse,
  GetSessionResponse,
  ServiceResponse,
  CreateSessionData,
  CostCalculation
} from '../types';
import logger from '../utils/logger';
import { generateSessionId } from '../utils/helpers';

export class SessionService {
  private blockchain: BlockchainService;
  private database: DatabaseService;

  constructor(blockchain: BlockchainService, database: DatabaseService) {
    this.blockchain = blockchain;
    this.database = database;
  }

  /**
   * Start a new streaming session
   */
  async startSession(request: StartSessionRequest): Promise<ServiceResponse<StartSessionResponse>> {
    try {
      const { userAddress, contentId, userAgent, ipAddress } = request;

      // 1. Validate user exists and create if needed
      await this.database.upsertUser(userAddress);

      // 2. Check if content exists and is active
      const contentResult = await this.database.getContentByContentId(contentId);
      if (!contentResult.success || !contentResult.data) {
        return { success: false, error: 'Content not found', statusCode: 404 };
      }

      // 3. Check if user already has an active session for this content
      const activeSessionResult = await this.database.hasActiveSession(userAddress, contentId);
      if (activeSessionResult.success && activeSessionResult.data) {
        return { success: false, error: 'User already has an active session for this content', statusCode: 409 };
      }

      // 4. Check user balance
      const balanceCheck = await this.blockchain.checkUserBalance(userAddress, contentId);
      if (!balanceCheck.hasSufficientBalance) {
        return {
          success: false,
          error: 'Insufficient balance',
          statusCode: 400,
          data: {
            required: this.blockchain.formatTokenAmount(balanceCheck.contentPrice),
            available: this.blockchain.formatTokenAmount(balanceCheck.totalBalance)
          }
        };
      }

      // 5. Get content info from blockchain to ensure it's listed
      const blockchainContentInfo = await this.blockchain.getContentInfo(contentId);
      if (!blockchainContentInfo.isListed) {
        return { success: false, error: 'Content not listed on blockchain', statusCode: 400 };
      }

      // 6. Create session in database
      const sessionId = generateSessionId();
      const now = new Date();

      const sessionData: CreateSessionData = {
        sessionId,
        userAddress,
        contentId,
        status: SessionStatus.ACTIVE,
        startTime: now,
        totalDuration: 0,
        pausedDuration: 0,
        activeDuration: 0,
        estimatedCost: '0',
        paidFromYield: '0',
        paidFromPrincipal: '0',
        userAgent,
        ipAddress
      };

      const createResult = await this.database.createSession(sessionData);
      if (!createResult.success || !createResult.data) {
        return { success: false, error: 'Failed to create session', statusCode: 500 };
      }

      // 7. Calculate estimated cost for full content
      const estimatedCost = blockchainContentInfo.fullPrice;

      // 8. Update session with estimated cost
      await this.database.updateSession(sessionId, { estimatedCost });

      // 9. Return success response
      const response: StartSessionResponse = {
        sessionId,
        status: 'active',
        startTime: now.toISOString(),
        estimatedCost,
        content: {
          id: contentResult.data.contentId,
          title: contentResult.data.title,
          fullPrice: contentResult.data.fullPrice,
          totalDuration: contentResult.data.totalDuration
        }
      };

      logger.info('Session started successfully', { sessionId, userAddress, contentId });
      return { success: true, data: response };

    } catch (error) {
      logger.error('Error starting session', { error, request });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Pause an active session
   */
  async pauseSession(request: PauseSessionRequest): Promise<ServiceResponse<PauseSessionResponse>> {
    try {
      const { sessionId, userAddress } = request;

      // 1. Get session from database
      const sessionResult = await this.database.getSessionBySessionId(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { success: false, error: 'Session not found', statusCode: 404 };
      }

      const session = sessionResult.data;

      // 2. Verify session belongs to user
      if (session.userAddress !== userAddress) {
        return { success: false, error: 'Unauthorized', statusCode: 403 };
      }

      // 3. Check if session is active
      if (session.status !== SessionStatus.ACTIVE) {
        return { success: false, error: 'Session is not active', statusCode: 400 };
      }

      // 4. Calculate current duration and cost
      const now = new Date();
      const startTime = session.resumedAt || session.startTime;
      const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      const totalActiveDuration = session.activeDuration + currentActiveDuration;

      // 5. Calculate current cost
      const costCalculation = this.calculateCurrentCost(
        session.content.fullPrice,
        session.content.totalDuration,
        totalActiveDuration
      );

      // 6. Update session in database
      const updateResult = await this.database.updateSession(sessionId, {
        status: SessionStatus.PAUSED,
        pausedAt: now,
        activeDuration: totalActiveDuration,
        estimatedCost: costCalculation.currentCost
      });

      if (!updateResult.success) {
        return { success: false, error: 'Failed to pause session', statusCode: 500 };
      }

      // 7. Return response
      const response: PauseSessionResponse = {
        sessionId,
        status: 'paused',
        pausedAt: now.toISOString(),
        activeDuration: totalActiveDuration,
        currentCost: costCalculation.currentCost
      };

      logger.info('Session paused successfully', { sessionId, userAddress, activeDuration: totalActiveDuration });
      return { success: true, data: response };

    } catch (error) {
      logger.error('Error pausing session', { error, request });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Resume a paused session
   */
  async resumeSession(request: { sessionId: string; userAddress: string }): Promise<ServiceResponse> {
    try {
      const { sessionId, userAddress } = request;

      // 1. Get session from database
      const sessionResult = await this.database.getSessionBySessionId(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { success: false, error: 'Session not found', statusCode: 404 };
      }

      const session = sessionResult.data;

      // 2. Verify session belongs to user
      if (session.userAddress !== userAddress) {
        return { success: false, error: 'Unauthorized', statusCode: 403 };
      }

      // 3. Check if session is paused
      if (session.status !== SessionStatus.PAUSED) {
        return { success: false, error: 'Session is not paused', statusCode: 400 };
      }

      // 4. Calculate paused duration
      const now = new Date();
      const pausedDuration = session.pausedAt
        ? Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
        : 0;

      // 5. Update session in database
      const updateResult = await this.database.updateSession(sessionId, {
        status: SessionStatus.ACTIVE,
        resumedAt: now,
        pausedDuration: session.pausedDuration + pausedDuration
      });

      if (!updateResult.success) {
        return { success: false, error: 'Failed to resume session', statusCode: 500 };
      }

      logger.info('Session resumed successfully', { sessionId, userAddress });
      return { success: true, data: { sessionId, status: 'active', resumedAt: now.toISOString() } };

    } catch (error) {
      logger.error('Error resuming session', { error, request });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Stop a session and process payment
   */
  async stopSession(request: StopSessionRequest): Promise<ServiceResponse<StopSessionResponse>> {
    try {
      const { sessionId, userAddress, txHash } = request;

      // 1. Get session from database
      const sessionResult = await this.database.getSessionBySessionId(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { success: false, error: 'Session not found', statusCode: 404 };
      }

      const session = sessionResult.data;

      // 2. Verify session belongs to user
      if (session.userAddress !== userAddress) {
        return { success: false, error: 'Unauthorized', statusCode: 403 };
      }

      // 3. Check if session can be stopped
      if (![SessionStatus.ACTIVE, SessionStatus.PAUSED].includes(session.status)) {
        return { success: false, error: 'Session cannot be stopped', statusCode: 400 };
      }

      const now = new Date();
      let totalActiveDuration = session.activeDuration;

      // 4. If session is active, calculate final active duration
      if (session.status === SessionStatus.ACTIVE) {
        const startTime = session.resumedAt || session.startTime;
        const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        totalActiveDuration += currentActiveDuration;
      }

      // 5. Calculate final cost
      const finalCost = this.calculateCurrentCost(
        session.content.fullPrice,
        session.content.totalDuration,
        totalActiveDuration
      ).currentCost;

      let paymentResult = null;
      let status = SessionStatus.COMPLETED;

      try {
        // 6. Process payment on blockchain (if no txHash provided)
        if (!txHash && totalActiveDuration > 0 && BigInt(finalCost) > 0) {
          paymentResult = await this.blockchain.stopStream(userAddress, session.contentId);
        }

        // 7. Update session in database
        const updateData = {
          status,
          endTime: now,
          activeDuration: totalActiveDuration,
          totalDuration: totalActiveDuration + session.pausedDuration,
          finalCost,
          txHash: txHash || paymentResult?.txHash,
          blockNumber: paymentResult?.blockNumber,
          gasUsed: paymentResult?.gasUsed,
          paidFromYield: paymentResult?.paidFromYield || '0',
          paidFromPrincipal: paymentResult?.paidFromPrincipal || '0'
        };

        await this.database.updateSession(sessionId, updateData);

      } catch (blockchainError) {
        logger.error('Blockchain payment failed', { error: blockchainError, sessionId });
        status = SessionStatus.FAILED;

        // Still update session with failure status
        await this.database.updateSession(sessionId, {
          status: SessionStatus.FAILED,
          endTime: now,
          activeDuration: totalActiveDuration,
          totalDuration: totalActiveDuration + session.pausedDuration,
          finalCost
        });
      }

      // 8. Return response
      const response: StopSessionResponse = {
        sessionId,
        status: status === SessionStatus.COMPLETED ? 'completed' : 'failed',
        endTime: now.toISOString(),
        totalDuration: totalActiveDuration,
        finalCost,
        payment: {
          fromYield: paymentResult?.paidFromYield || '0',
          fromPrincipal: paymentResult?.paidFromPrincipal || '0',
          txHash: txHash || paymentResult?.txHash,
          blockNumber: paymentResult?.blockNumber,
          gasUsed: paymentResult?.gasUsed
        }
      };

      logger.info('Session stopped successfully', {
        sessionId,
        userAddress,
        totalDuration: totalActiveDuration,
        finalCost,
        status
      });

      return { success: true, data: response };

    } catch (error) {
      logger.error('Error stopping session', { error, request });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string, userAddress: string): Promise<ServiceResponse<GetSessionResponse>> {
    try {
      // 1. Get session from database
      const sessionResult = await this.database.getSessionBySessionId(sessionId);
      if (!sessionResult.success || !sessionResult.data) {
        return { success: false, error: 'Session not found', statusCode: 404 };
      }

      const session = sessionResult.data;

      // 2. Verify session belongs to user
      if (session.userAddress !== userAddress) {
        return { success: false, error: 'Unauthorized', statusCode: 403 };
      }

      // 3. Calculate current duration and cost for active sessions
      let currentCost = session.finalCost || session.estimatedCost;
      let activeDuration = session.activeDuration;

      if (session.status === SessionStatus.ACTIVE) {
        const now = new Date();
        const startTime = session.resumedAt || session.startTime;
        const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
        activeDuration += currentActiveDuration;

        const costCalculation = this.calculateCurrentCost(
          session.content.fullPrice,
          session.content.totalDuration,
          activeDuration
        );
        currentCost = costCalculation.currentCost;
      }

      // 4. Build response
      const response: GetSessionResponse = {
        sessionId: session.sessionId,
        status: session.status,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString(),
        totalDuration: activeDuration + session.pausedDuration,
        activeDuration,
        pausedDuration: session.pausedDuration,
        currentCost,
        finalCost: session.finalCost,
        content: {
          id: session.content.contentId,
          title: session.content.title,
          fullPrice: session.content.fullPrice,
          totalDuration: session.content.totalDuration
        }
      };

      if (session.finalCost && session.txHash) {
        response.payment = {
          fromYield: session.paidFromYield,
          fromPrincipal: session.paidFromPrincipal,
          txHash: session.txHash,
          blockNumber: session.blockNumber
        };
      }

      return { success: true, data: response };

    } catch (error) {
      logger.error('Error getting session', { error, sessionId, userAddress });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Get user's active sessions
   */
  async getUserActiveSessions(userAddress: string): Promise<ServiceResponse> {
    try {
      const result = await this.database.getActiveSessionsForUser(userAddress);
      return result;
    } catch (error) {
      logger.error('Error getting user active sessions', { error, userAddress });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Get user's session history
   */
  async getUserSessionHistory(userAddress: string, limit: number = 50): Promise<ServiceResponse> {
    try {
      const result = await this.database.getUserSessionHistory(userAddress, limit);
      return result;
    } catch (error) {
      logger.error('Error getting user session history', { error, userAddress });
      return { success: false, error: 'Internal server error', statusCode: 500 };
    }
  }

  /**
   * Calculate current cost based on duration
   */
  private calculateCurrentCost(fullPrice: string, totalDuration: number, activeDuration: number): CostCalculation {
    const costPerSecond = BigInt(fullPrice) / BigInt(totalDuration);
    const currentCost = costPerSecond * BigInt(activeDuration);
    const remainingDuration = totalDuration - activeDuration;

    return {
      currentCost: currentCost.toString(),
      activeDuration,
      remainingDuration: Math.max(0, remainingDuration),
      costPerSecond: costPerSecond.toString()
    };
  }
}