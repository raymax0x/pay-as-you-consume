import { PrismaClient } from '@prisma/client';
import { SessionStatus, SessionData, ContentData, ServiceResult } from '../types';
import { logger } from '../utils/logger';

let prisma: PrismaClient;

export const initializeDatabase = async (): Promise<void> => {
  try {
    prisma = new PrismaClient();
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error });
    throw new Error('Database connection failed');
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect from database', { error });
  }
};

// ===== USER OPERATIONS =====

export const upsertUser = async (address: string): Promise<ServiceResult> => {
  try {
    const user = await prisma.user.upsert({
      where: { address },
      update: { updatedAt: new Date() },
      create: { address }
    });

    return { success: true, data: user };
  } catch (error) {
    logger.error('Error upserting user', { error, address });
    return { success: false, error: 'Failed to create/update user' };
  }
};

export const getUserByAddress = async (address: string): Promise<ServiceResult> => {
  try {
    const user = await prisma.user.findUnique({
      where: { address },
      include: {
        sessions: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    return { success: true, data: user };
  } catch (error) {
    logger.error('Error getting user', { error, address });
    return { success: false, error: 'Failed to get user' };
  }
};

// ===== CONTENT OPERATIONS =====

export const upsertContent = async (contentData: Omit<ContentData, 'id'>): Promise<ServiceResult> => {
  try {
    const content = await prisma.content.upsert({
      where: { contentId: contentData.contentId },
      update: {
        title: contentData.title,
        description: contentData.description,
        fullPrice: contentData.fullPrice,
        totalDuration: contentData.totalDuration,
        category: contentData.category,
        thumbnailUrl: contentData.thumbnailUrl,
        isActive: contentData.isActive,
        updatedAt: new Date()
      },
      create: contentData
    });

    return { success: true, data: content };
  } catch (error) {
    logger.error('Error upserting content', { error, contentData });
    return { success: false, error: 'Failed to create/update content' };
  }
};

export const getContentByContentId = async (contentId: string): Promise<ServiceResult> => {
  try {
    const content = await prisma.content.findUnique({
      where: { contentId }
    });

    if (!content) {
      return { success: false, error: 'Content not found', statusCode: 404 };
    }

    return { success: true, data: content };
  } catch (error) {
    logger.error('Error getting content', { error, contentId });
    return { success: false, error: 'Failed to get content' };
  }
};

export const getActiveContent = async (): Promise<ServiceResult> => {
  try {
    const content = await prisma.content.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: content };
  } catch (error) {
    logger.error('Error getting active content', { error });
    return { success: false, error: 'Failed to get active content' };
  }
};

// ===== SESSION OPERATIONS =====

export const createSession = async (sessionData: Omit<SessionData, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult> => {
  try {
    const session = await prisma.session.create({
      data: sessionData,
      include: {
        content: true,
        user: true
      }
    });

    return { success: true, data: session };
  } catch (error) {
    logger.error('Error creating session', { error, sessionData });
    return { success: false, error: 'Failed to create session' };
  }
};

export const getSessionBySessionId = async (sessionId: string): Promise<ServiceResult> => {
  try {
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        content: true,
        user: true
      }
    });

    if (!session) {
      return { success: false, error: 'Session not found', statusCode: 404 };
    }

    return { success: true, data: session };
  } catch (error) {
    logger.error('Error getting session', { error, sessionId });
    return { success: false, error: 'Failed to get session' };
  }
};

export const updateSession = async (
  sessionId: string,
  updateData: Partial<Omit<SessionData, 'id' | 'sessionId' | 'createdAt'>>
): Promise<ServiceResult> => {
  try {
    const session = await prisma.session.update({
      where: { sessionId },
      data: {
        ...updateData,
        updatedAt: new Date()
      },
      include: {
        content: true,
        user: true
      }
    });

    return { success: true, data: session };
  } catch (error) {
    logger.error('Error updating session', { error, sessionId, updateData });
    return { success: false, error: 'Failed to update session' };
  }
};

export const getActiveSessionsForUser = async (userAddress: string): Promise<ServiceResult> => {
  try {
    const sessions = await prisma.session.findMany({
      where: {
        userAddress,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
        }
      },
      include: {
        content: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: sessions };
  } catch (error) {
    logger.error('Error getting active sessions for user', { error, userAddress });
    return { success: false, error: 'Failed to get active sessions' };
  }
};

export const getUserSessionHistory = async (userAddress: string, limit: number = 50): Promise<ServiceResult> => {
  try {
    const sessions = await prisma.session.findMany({
      where: { userAddress },
      include: {
        content: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return { success: true, data: sessions };
  } catch (error) {
    logger.error('Error getting user session history', { error, userAddress });
    return { success: false, error: 'Failed to get session history' };
  }
};

export const hasActiveSession = async (userAddress: string, contentId: string): Promise<ServiceResult<boolean>> => {
  try {
    const activeSession = await prisma.session.findFirst({
      where: {
        userAddress,
        contentId,
        status: {
          in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
        }
      }
    });

    return { success: true, data: !!activeSession };
  } catch (error) {
    logger.error('Error checking active session', { error, userAddress, contentId });
    return { success: false, error: 'Failed to check active session' };
  }
};

export const getUserSessionStats = async (userAddress: string): Promise<ServiceResult> => {
  try {
    const stats = await prisma.session.aggregate({
      where: { userAddress },
      _count: {
        id: true
      },
      _sum: {
        totalDuration: true,
        finalCost: true
      },
      _avg: {
        totalDuration: true
      }
    });

    const completedSessions = await prisma.session.count({
      where: {
        userAddress,
        status: SessionStatus.COMPLETED
      }
    });

    return {
      success: true,
      data: {
        totalSessions: stats._count.id,
        completedSessions,
        totalWatchTime: stats._sum.totalDuration || 0,
        averageWatchTime: stats._avg.totalDuration || 0,
        totalSpent: stats._sum.finalCost || '0'
      }
    };
  } catch (error) {
    logger.error('Error getting user session stats', { error, userAddress });
    return { success: false, error: 'Failed to get session statistics' };
  }
};

export const updateSystemMetrics = async (): Promise<ServiceResult> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSessions, activeSessions, totalUsers, newUsers] = await Promise.all([
      prisma.session.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      }),
      prisma.session.count({
        where: {
          status: {
            in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
          }
        }
      }),
      prisma.user.count(),
      prisma.user.count({
        where: {
          createdAt: {
            gte: today
          }
        }
      })
    ]);

    const revenueResult = await prisma.session.aggregate({
      where: {
        createdAt: {
          gte: today
        },
        status: SessionStatus.COMPLETED
      },
      _sum: {
        finalCost: true
      }
    });

    const metrics = await prisma.systemMetrics.upsert({
      where: { date: today },
      update: {
        totalSessions,
        activeSessions,
        totalUsers,
        newUsers,
        totalRevenue: revenueResult._sum.finalCost || '0',
        updatedAt: new Date()
      },
      create: {
        date: today,
        totalSessions,
        activeSessions,
        totalUsers,
        newUsers,
        totalRevenue: revenueResult._sum.finalCost || '0'
      }
    });

    return { success: true, data: metrics };
  } catch (error) {
    logger.error('Error updating system metrics', { error });
    return { success: false, error: 'Failed to update system metrics' };
  }
};

export const cleanupOldSessions = async (): Promise<ServiceResult> => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deletedSessions = await prisma.session.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        },
        status: {
          in: [SessionStatus.COMPLETED, SessionStatus.CANCELLED, SessionStatus.FAILED]
        }
      }
    });

    logger.info(`Cleaned up ${deletedSessions.count} old sessions`);
    return { success: true, data: { deletedCount: deletedSessions.count } };
  } catch (error) {
    logger.error('Error cleaning up old sessions', { error });
    return { success: false, error: 'Failed to cleanup old sessions' };
  }
};