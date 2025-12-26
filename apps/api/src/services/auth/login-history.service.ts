import { prisma } from '../../db/prisma.js';
import { UAParser } from 'ua-parser-js';

export interface LoginHistoryEntry {
  id: string;
  userId: string | null;
  email: string;
  ipAddress: string | null;
  userAgent: string | null;
  success: boolean;
  failureReason: string | null;
  loginAt: Date;
  location: string | null;
  deviceInfo: any;
}

export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  deviceType?: string;
}

export class LoginHistoryService {
  /**
   * Records a login attempt (successful or failed)
   */
  static async recordLoginAttempt(
    email: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    userId?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      const deviceInfo = this.parseUserAgent(userAgent);

      await prisma.loginHistory.create({
        data: {
          userId: userId || null,
          email,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          success,
          failureReason: failureReason || null,
          deviceInfo: deviceInfo as any,
          location: null, // Could be enhanced with IP geolocation service
        },
      });
    } catch (error) {
      // Log error but don't throw - login history shouldn't block authentication
      console.error('Failed to record login attempt:', error);
    }
  }

  /**
   * Gets login history for a specific user
   */
  static async getUserLoginHistory(
    userId: string,
    limit: number = 20
  ): Promise<LoginHistoryEntry[]> {
    const history = await prisma.loginHistory.findMany({
      where: { userId },
      orderBy: { loginAt: 'desc' },
      take: limit,
    });

    return history.map(entry => ({
      id: entry.id,
      userId: entry.userId,
      email: entry.email,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      success: entry.success,
      failureReason: entry.failureReason,
      loginAt: entry.loginAt || new Date(),
      location: entry.location,
      deviceInfo: entry.deviceInfo,
    }));
  }

  /**
   * Gets recent failed login attempts for an email
   */
  static async getRecentFailedAttempts(
    email: string,
    minutesAgo: number = 10
  ): Promise<number> {
    const cutoffTime = new Date(Date.now() - minutesAgo * 60 * 1000);

    const count = await prisma.loginHistory.count({
      where: {
        email,
        success: false,
        loginAt: {
          gte: cutoffTime,
        },
      },
    });

    return count;
  }

  /**
   * Parses user agent string to extract device information
   */
  private static parseUserAgent(userAgent?: string): DeviceInfo | null {
    if (!userAgent) return null;

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      return {
        browser: result.browser.name,
        browserVersion: result.browser.version,
        os: result.os.name,
        osVersion: result.os.version,
        device: result.device.model || 'Desktop',
        deviceType: result.device.type || 'desktop',
      };
    } catch (error) {
      console.error('Failed to parse user agent:', error);
      return null;
    }
  }

  /**
   * Cleans up old login history entries (older than specified days)
   */
  static async cleanupOldHistory(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await prisma.loginHistory.deleteMany({
      where: {
        loginAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Gets login statistics for a user
   */
  static async getLoginStats(userId: string) {
    const [totalLogins, failedLogins, lastLogin] = await Promise.all([
      prisma.loginHistory.count({
        where: { userId, success: true },
      }),
      prisma.loginHistory.count({
        where: { userId, success: false },
      }),
      prisma.loginHistory.findFirst({
        where: { userId, success: true },
        orderBy: { loginAt: 'desc' },
        select: { loginAt: true, ipAddress: true, deviceInfo: true },
      }),
    ]);

    return {
      totalLogins,
      failedLogins,
      lastLogin: lastLogin
        ? {
            timestamp: lastLogin.loginAt,
            ipAddress: lastLogin.ipAddress,
            deviceInfo: lastLogin.deviceInfo,
          }
        : null,
    };
  }
}
