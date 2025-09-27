import { SessionStatus, StartSessionRequest, PauseSessionRequest, ResumeSessionRequest, StopSessionRequest, ServiceResult } from '../types';
import * as database from '../database/service';
import * as blockchain from '../blockchain/service';
import { logger } from '../utils/logger';
import { generateSessionId, getCurrentTimestamp } from '../utils/helpers';

export const startSession = async (
  request: StartSessionRequest,
  metadata: { userAgent?: string; ipAddress?: string }
): Promise<ServiceResult> => {
  try {
    const { userAddress, contentId } = request;

    // Create/get user
    await database.upsertUser(userAddress);

    // Check content exists
    const contentResult = await database.getContentByContentId(contentId);
    if (!contentResult.success || !contentResult.data) {
      return { success: false, error: 'Content not found', statusCode: 404 };
    }

    // Check for existing active session
    const activeSessionResult = await database.hasActiveSession(userAddress, contentId);
    if (activeSessionResult.success && activeSessionResult.data) {
      return { success: false, error: 'User already has active session for this content', statusCode: 409 };
    }

    // Check user balance
    const balanceCheck = await blockchain.checkUserBalance(userAddress, contentId);
    if (!balanceCheck.hasSufficientBalance) {
      return {
        success: false,
        error: 'Insufficient balance',
        statusCode: 400,
        data: {
          required: blockchain.formatTokenAmount(balanceCheck.contentPrice),
          available: blockchain.formatTokenAmount(balanceCheck.totalBalance)
        }
      };
    }

    // Check content is listed on blockchain
    const blockchainContent = await blockchain.getContentInfo(contentId);
    if (!blockchainContent.isListed) {
      return { success: false, error: 'Content not listed on blockchain', statusCode: 400 };
    }

    // Create session
    const sessionId = generateSessionId();
    const now = new Date();

    const sessionData = {
      sessionId,
      userAddress,
      contentId,
      status: SessionStatus.ACTIVE,
      startTime: now,
      totalDuration: 0,
      pausedDuration: 0,
      activeDuration: 0,
      estimatedCost: blockchainContent.fullPrice,
      paidFromYield: '0',
      paidFromPrincipal: '0',
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress
    };

    const createResult = await database.createSession(sessionData);
    if (!createResult.success) {
      return { success: false, error: 'Failed to create session', statusCode: 500 };
    }

    return {
      success: true,
      data: {
        sessionId,
        status: 'active',
        startTime: now.toISOString(),
        estimatedCost: blockchainContent.fullPrice,
        content: {
          id: contentResult.data.contentId,
          title: contentResult.data.title,
          fullPrice: contentResult.data.fullPrice,
          totalDuration: contentResult.data.totalDuration
        }
      }
    };

  } catch (error) {
    logger.error('Error in startSession service', { error, request });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const pauseSession = async (request: PauseSessionRequest): Promise<ServiceResult> => {
  try {
    const { sessionId, userAddress } = request;

    // Get session
    const sessionResult = await database.getSessionBySessionId(sessionId);
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: 'Session not found', statusCode: 404 };
    }

    const session = sessionResult.data;

    // Verify ownership
    if (session.userAddress !== userAddress) {
      return { success: false, error: 'Unauthorized', statusCode: 403 };
    }

    // Check if active
    if (session.status !== SessionStatus.ACTIVE) {
      return { success: false, error: 'Session is not active', statusCode: 400 };
    }

    // Calculate duration
    const now = new Date();
    const startTime = session.resumedAt || session.startTime;
    const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const totalActiveDuration = session.activeDuration + currentActiveDuration;

    // Calculate current cost
    const currentCost = calculateCost(
      session.content.fullPrice,
      session.content.totalDuration,
      totalActiveDuration
    );

    // Update session
    const updateResult = await database.updateSession(sessionId, {
      status: SessionStatus.PAUSED,
      pausedAt: now,
      activeDuration: totalActiveDuration,
      estimatedCost: currentCost
    });

    if (!updateResult.success) {
      return { success: false, error: 'Failed to pause session', statusCode: 500 };
    }

    return {
      success: true,
      data: {
        sessionId,
        status: 'paused',
        pausedAt: now.toISOString(),
        activeDuration: totalActiveDuration,
        currentCost
      }
    };

  } catch (error) {
    logger.error('Error in pauseSession service', { error, request });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const resumeSession = async (request: ResumeSessionRequest): Promise<ServiceResult> => {
  try {
    const { sessionId, userAddress } = request;

    // Get session
    const sessionResult = await database.getSessionBySessionId(sessionId);
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: 'Session not found', statusCode: 404 };
    }

    const session = sessionResult.data;

    // Verify ownership
    if (session.userAddress !== userAddress) {
      return { success: false, error: 'Unauthorized', statusCode: 403 };
    }

    // Check if paused
    if (session.status !== SessionStatus.PAUSED) {
      return { success: false, error: 'Session is not paused', statusCode: 400 };
    }

    // Calculate paused duration
    const now = new Date();
    const pausedDuration = session.pausedAt
      ? Math.floor((now.getTime() - session.pausedAt.getTime()) / 1000)
      : 0;

    // Update session
    const updateResult = await database.updateSession(sessionId, {
      status: SessionStatus.ACTIVE,
      resumedAt: now,
      pausedDuration: session.pausedDuration + pausedDuration
    });

    if (!updateResult.success) {
      return { success: false, error: 'Failed to resume session', statusCode: 500 };
    }

    return {
      success: true,
      data: {
        sessionId,
        status: 'active',
        resumedAt: now.toISOString(),
        totalPausedDuration: session.pausedDuration + pausedDuration
      }
    };

  } catch (error) {
    logger.error('Error in resumeSession service', { error, request });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const stopSession = async (request: StopSessionRequest): Promise<ServiceResult> => {
  try {
    const { sessionId, userAddress, txHash } = request;

    // Get session
    const sessionResult = await database.getSessionBySessionId(sessionId);
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: 'Session not found', statusCode: 404 };
    }

    const session = sessionResult.data;

    // Verify ownership
    if (session.userAddress !== userAddress) {
      return { success: false, error: 'Unauthorized', statusCode: 403 };
    }

    // Check if stoppable
    if (![SessionStatus.ACTIVE, SessionStatus.PAUSED].includes(session.status)) {
      return { success: false, error: 'Session cannot be stopped', statusCode: 400 };
    }

    const now = new Date();
    let totalActiveDuration = session.activeDuration;

    // Calculate final duration if active
    if (session.status === SessionStatus.ACTIVE) {
      const startTime = session.resumedAt || session.startTime;
      const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      totalActiveDuration += currentActiveDuration;
    }

    // Calculate final cost
    const finalCost = calculateCost(
      session.content.fullPrice,
      session.content.totalDuration,
      totalActiveDuration
    );

    let paymentResult = null;
    let status = SessionStatus.COMPLETED;

    try {
      // Process payment if needed and no txHash provided
      if (!txHash && totalActiveDuration > 0 && BigInt(finalCost) > 0) {
        paymentResult = await blockchain.stopStream(userAddress, session.contentId);
      }

      // Update session
      await database.updateSession(sessionId, {
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
      });

    } catch (blockchainError) {
      logger.error('Payment processing failed', { error: blockchainError, sessionId });
      status = SessionStatus.FAILED;

      await database.updateSession(sessionId, {
        status: SessionStatus.FAILED,
        endTime: now,
        activeDuration: totalActiveDuration,
        totalDuration: totalActiveDuration + session.pausedDuration,
        finalCost
      });
    }

    return {
      success: true,
      data: {
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
      }
    };

  } catch (error) {
    logger.error('Error in stopSession service', { error, request });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const getSession = async (sessionId: string, userAddress: string): Promise<ServiceResult> => {
  try {
    const sessionResult = await database.getSessionBySessionId(sessionId);
    if (!sessionResult.success || !sessionResult.data) {
      return { success: false, error: 'Session not found', statusCode: 404 };
    }

    const session = sessionResult.data;

    if (session.userAddress !== userAddress) {
      return { success: false, error: 'Unauthorized', statusCode: 403 };
    }

    // Calculate current values for active sessions
    let currentCost = session.finalCost || session.estimatedCost;
    let activeDuration = session.activeDuration;

    if (session.status === SessionStatus.ACTIVE) {
      const now = new Date();
      const startTime = session.resumedAt || session.startTime;
      const currentActiveDuration = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      activeDuration += currentActiveDuration;

      currentCost = calculateCost(
        session.content.fullPrice,
        session.content.totalDuration,
        activeDuration
      );
    }

    const response = {
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
    logger.error('Error in getSession service', { error, sessionId, userAddress });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const getUserActiveSessions = async (userAddress: string): Promise<ServiceResult> => {
  try {
    return await database.getActiveSessionsForUser(userAddress);
  } catch (error) {
    logger.error('Error in getUserActiveSessions service', { error, userAddress });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

export const getUserSessionHistory = async (userAddress: string, limit: number = 50): Promise<ServiceResult> => {
  try {
    return await database.getUserSessionHistory(userAddress, limit);
  } catch (error) {
    logger.error('Error in getUserSessionHistory service', { error, userAddress });
    return { success: false, error: 'Internal server error', statusCode: 500 };
  }
};

// Helper function for cost calculation
const calculateCost = (fullPrice: string, totalDuration: number, activeDuration: number): string => {
  const costPerSecond = BigInt(fullPrice) / BigInt(totalDuration);
  return (costPerSecond * BigInt(activeDuration)).toString();
};