import { ServiceResult, UserBalance } from '../types';
import * as blockchain from '../blockchain/service';
import * as database from '../database/service';
import { logger } from '../utils/logger';

export const getUserBalance = async (userAddress: string): Promise<ServiceResult<UserBalance>> => {
  try {
    const [yieldBalance, principalBalance] = await Promise.all([
      blockchain.getUserYield(userAddress),
      blockchain.getUserPrincipal(userAddress)
    ]);

    const totalBalance = (BigInt(yieldBalance) + BigInt(principalBalance)).toString();

    const data: UserBalance = {
      userAddress,
      yieldBalance,
      principalBalance,
      totalBalance,
      formatted: {
        yield: `${blockchain.formatTokenAmount(yieldBalance)} USDC`,
        principal: `${blockchain.formatTokenAmount(principalBalance)} USDC`,
        total: `${blockchain.formatTokenAmount(totalBalance)} USDC`
      }
    };

    return { success: true, data };

  } catch (error) {
    logger.error('Error getting user balance', { error, userAddress });
    return { success: false, error: 'Failed to get user balance', statusCode: 500 };
  }
};

export const getUserStats = async (userAddress: string): Promise<ServiceResult> => {
  try {
    // Get session stats from database
    const sessionStatsResult = await database.getUserSessionStats(userAddress);

    if (!sessionStatsResult.success) {
      return sessionStatsResult;
    }

    // Get current balance
    const balanceResult = await getUserBalance(userAddress);

    if (!balanceResult.success) {
      return balanceResult;
    }

    const combinedStats = {
      ...sessionStatsResult.data,
      balance: balanceResult.data
    };

    return { success: true, data: combinedStats };

  } catch (error) {
    logger.error('Error getting user stats', { error, userAddress });
    return { success: false, error: 'Failed to get user stats', statusCode: 500 };
  }
};