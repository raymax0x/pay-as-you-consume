import { ServiceResult } from '../types';
import * as database from '../database/service';
import * as blockchain from '../blockchain/service';
import { logger } from '../utils/logger';

export const getActiveContent = async (): Promise<ServiceResult> => {
  try {
    return await database.getActiveContent();
  } catch (error) {
    logger.error('Error getting active content', { error });
    return { success: false, error: 'Failed to get active content', statusCode: 500 };
  }
};

export const getContentById = async (contentId: string): Promise<ServiceResult> => {
  try {
    // Get content from database
    const dbResult = await database.getContentByContentId(contentId);

    if (!dbResult.success || !dbResult.data) {
      return dbResult;
    }

    // Optionally enrich with blockchain data
    try {
      const blockchainInfo = await blockchain.getContentInfo(contentId);

      // Add blockchain verification status
      const enrichedContent = {
        ...dbResult.data,
        blockchain: {
          isListed: blockchainInfo.isListed,
          onChainPrice: blockchainInfo.fullPrice,
          onChainDuration: blockchainInfo.totalDuration,
          priceMatches: blockchainInfo.fullPrice === dbResult.data.fullPrice,
          durationMatches: blockchainInfo.totalDuration === dbResult.data.totalDuration
        }
      };

      return { success: true, data: enrichedContent };
    } catch (blockchainError) {
      // If blockchain call fails, just return database data
      logger.warn('Failed to get blockchain info for content', { contentId, error: blockchainError });
      return dbResult;
    }

  } catch (error) {
    logger.error('Error getting content by ID', { error, contentId });
    return { success: false, error: 'Failed to get content', statusCode: 500 };
  }
};