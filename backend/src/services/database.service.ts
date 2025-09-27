import { PrismaClient } from '@prisma/client';
import { SessionStatus, SessionModel, ContentModel, CreateSessionData, UpdateSessionData, ServiceResponse } from '../types';
import logger from '../utils/logger';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Initialize database connection
   */
  async connect(): Promise<void> {
    try {
      await this.prisma.$connect();
      logger.info('Database connected successfully');
    } catch (error) {
      logger.error('Failed to connect to database', { error });
      throw new Error('Database connection failed');
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Failed to disconnect from database', { error });
    }
  }

  // ===== USER OPERATIONS =====

  /**
   * Create or get user by address
   */
  async upsertUser(address: string): Promise<ServiceResponse> {
    try {
      const user = await this.prisma.user.upsert({
        where: { address },
        update: { updatedAt: new Date() },
        create: { address }
      });

      return { success: true, data: user };
    } catch (error) {
      logger.error('Error upserting user', { error, address });
      return { success: false, error: 'Failed to create/update user' };
    }
  }

  /**
   * Get user by address
   */
  async getUserByAddress(address: string): Promise<ServiceResponse> {
    try {
      const user = await this.prisma.user.findUnique({
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
  }

  // ===== CONTENT OPERATIONS =====

  /**
   * Create or update content
   */
  async upsertContent(contentData: Omit<ContentModel, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse> {
    try {
      const content = await this.prisma.content.upsert({
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
  }

  /**
   * Get content by contentId
   */
  async getContentByContentId(contentId: string): Promise<ServiceResponse<ContentModel>> {
    try {
      const content = await this.prisma.content.findUnique({
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
  }

  /**
   * Get all active content
   */
  async getActiveContent(): Promise<ServiceResponse<ContentModel[]>> {
    try {
      const content = await this.prisma.content.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });

      return { success: true, data: content };
    } catch (error) {
      logger.error('Error getting active content', { error });
      return { success: false, error: 'Failed to get active content' };
    }
  }

  // ===== SESSION OPERATIONS =====

  /**
   * Create a new session
   */
  async createSession(sessionData: CreateSessionData): Promise<ServiceResponse<SessionModel>> {
    try {
      const session = await this.prisma.session.create({
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
  }

  /**
   * Get session by sessionId
   */
  async getSessionBySessionId(sessionId: string): Promise<ServiceResponse<SessionModel>> {
    try {
      const session = await this.prisma.session.findUnique({
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
  }

  /**
   * Update session
   */
  async updateSession(sessionId: string, updateData: UpdateSessionData): Promise<ServiceResponse<SessionModel>> {
    try {
      const session = await this.prisma.session.update({
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
  }

  /**
   * Get active sessions for user
   */
  async getActiveSessionsForUser(userAddress: string): Promise<ServiceResponse<SessionModel[]>> {
    try {
      const sessions = await this.prisma.session.findMany({
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
  }

  /**
   * Get user's session history
   */
  async getUserSessionHistory(userAddress: string, limit: number = 50): Promise<ServiceResponse<SessionModel[]>> {
    try {
      const sessions = await this.prisma.session.findMany({
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
  }

  /**
   * Check if user has active session for content
   */
  async hasActiveSession(userAddress: string, contentId: string): Promise<ServiceResponse<boolean>> {
    try {
      const activeSession = await this.prisma.session.findFirst({
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
  }

  /**
   * Get session statistics for user
   */
  async getUserSessionStats(userAddress: string): Promise<ServiceResponse> {
    try {
      const stats = await this.prisma.session.aggregate({
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

      const completedSessions = await this.prisma.session.count({
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
  }

  // ===== SYSTEM METRICS =====

  /**
   * Update daily system metrics
   */
  async updateSystemMetrics(): Promise<ServiceResponse> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [totalSessions, activeSessions, totalUsers, newUsers] = await Promise.all([
        this.prisma.session.count({
          where: {
            createdAt: {
              gte: today
            }
          }
        }),
        this.prisma.session.count({
          where: {
            status: {
              in: [SessionStatus.ACTIVE, SessionStatus.PAUSED]
            }
          }
        }),
        this.prisma.user.count(),
        this.prisma.user.count({
          where: {
            createdAt: {
              gte: today
            }
          }
        })
      ]);

      const revenueResult = await this.prisma.session.aggregate({
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

      const metrics = await this.prisma.systemMetrics.upsert({
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
  }

  /**
   * Cleanup old sessions (older than 30 days)
   */
  async cleanupOldSessions(): Promise<ServiceResponse> {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedSessions = await this.prisma.session.deleteMany({
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
  }
}