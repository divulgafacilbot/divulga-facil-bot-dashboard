import { prisma } from '../../db/prisma.js';
import { TokenService } from './token.service.js';

export class RefreshTokenService {
  /**
   * Creates a new refresh token for a user
   * @param userId - User ID
   * @param ipAddress - Optional IP address of the request
   * @param userAgent - Optional user agent string
   * @param rememberMe - If true, extends token lifetime to 60 days instead of 30
   * @returns The generated refresh token (plain, not hashed)
   */
  static async createRefreshToken(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    rememberMe: boolean = false
  ): Promise<string> {
    const token = TokenService.generateRefreshToken();
    const tokenHash = TokenService.hashToken(token);

    // 30 days for normal login, 60 days for "remember me"
    const expirationDays = rememberMe ? 60 : 30;
    const expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  /**
   * Verifies a refresh token and returns the associated user ID
   * @param token - The refresh token to verify
   * @returns User ID if valid, null otherwise
   */
  static async verifyRefreshToken(token: string): Promise<string | null> {
    const tokenHash = TokenService.hashToken(token);

    const refreshToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
    });

    return refreshToken?.userId || null;
  }

  /**
   * Revokes a specific refresh token
   * @param token - The refresh token to revoke
   */
  static async revokeToken(token: string): Promise<void> {
    const tokenHash = TokenService.hashToken(token);

    await prisma.refreshToken.updateMany({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active refresh tokens for a user
   * @param userId - User ID
   */
  static async revokeAllUserTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Cleans up expired and old revoked tokens from the database
   * Should be called periodically (e.g., via cron job)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            revokedAt: {
              lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            },
          }, // Revoked >90 days ago
        ],
      },
    });
  }
}
