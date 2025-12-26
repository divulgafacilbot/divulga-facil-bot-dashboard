import cron from 'node-cron';
import { RefreshTokenService } from '../auth/refresh-token.service.js';
import { LoginHistoryService } from '../auth/login-history.service.js';
import { prisma } from '../../db/prisma.js';

export class CleanupService {
  private static isRunning = false;

  /**
   * Starts all cleanup cron jobs
   */
  static start() {
    if (this.isRunning) {
      console.log('⏰ Cleanup jobs already running');
      return;
    }

    console.log('⏰ Starting cleanup cron jobs...');
    this.isRunning = true;

    // Run cleanup every day at 3 AM
    cron.schedule('0 3 * * *', async () => {
      console.log('🧹 Running scheduled cleanup...');
      await this.runAllCleanups();
    });

    // Also run cleanup on startup (after 10 seconds)
    setTimeout(() => {
      console.log('🧹 Running initial cleanup...');
      this.runAllCleanups();
    }, 10000);

    console.log('✅ Cleanup jobs scheduled (daily at 3 AM)');
  }

  /**
   * Runs all cleanup tasks
   */
  static async runAllCleanups() {
    const results = {
      refreshTokens: 0,
      emailVerificationTokens: 0,
      passwordResetTokens: 0,
      loginHistory: 0,
      errors: [] as string[],
    };

    // Cleanup expired and old revoked refresh tokens
    try {
      await RefreshTokenService.cleanupExpiredTokens();
      const refreshTokensDeleted = await this.countDeletedRefreshTokens();
      results.refreshTokens = refreshTokensDeleted;
    } catch (error) {
      console.error('❌ Error cleaning up refresh tokens:', error);
      results.errors.push('refresh tokens cleanup failed');
    }

    // Cleanup expired email verification tokens (older than 7 days)
    try {
      const emailVerificationResult = await prisma.emailVerificationToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              usedAt: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            },
          ],
        },
      });
      results.emailVerificationTokens = emailVerificationResult.count;
    } catch (error) {
      console.error('❌ Error cleaning up email verification tokens:', error);
      results.errors.push('email verification tokens cleanup failed');
    }

    // Cleanup old password reset tokens (older than 7 days)
    try {
      const passwordResetResult = await prisma.passwordResetToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            {
              usedAt: {
                lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              }
            },
          ],
        },
      });
      results.passwordResetTokens = passwordResetResult.count;
    } catch (error) {
      console.error('❌ Error cleaning up password reset tokens:', error);
      results.errors.push('password reset tokens cleanup failed');
    }

    // Cleanup old login history (older than 90 days)
    try {
      const loginHistoryDeleted = await LoginHistoryService.cleanupOldHistory(90);
      results.loginHistory = loginHistoryDeleted;
    } catch (error) {
      console.error('❌ Error cleaning up login history:', error);
      results.errors.push('login history cleanup failed');
    }

    const statusSymbol = results.errors.length > 0 ? '⚠️' : '✅';
    console.log(`${statusSymbol} Cleanup completed:`, {
      refreshTokens: `${results.refreshTokens} deleted`,
      emailVerificationTokens: `${results.emailVerificationTokens} deleted`,
      passwordResetTokens: `${results.passwordResetTokens} deleted`,
      loginHistory: `${results.loginHistory} deleted`,
      errors: results.errors.length > 0 ? results.errors : 'none',
      timestamp: new Date().toISOString(),
    });

    return results;
  }

  /**
   * Gets count of deleted refresh tokens (for logging)
   */
  private static async countDeletedRefreshTokens(): Promise<number> {
    const expiredCount = await prisma.refreshToken.count({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revokedAt: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
    });
    return expiredCount;
  }

  /**
   * Manually trigger cleanup (useful for testing)
   */
  static async manualCleanup() {
    console.log('🧹 Manual cleanup triggered');
    return await this.runAllCleanups();
  }
}
