import { prisma } from '../../db/prisma.js';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

interface GetUsersFilters {
  isActive?: boolean;
  role?: string;
  emailSearch?: string;
  hasSubscription?: boolean;
  hasBotLinked?: boolean;
}

interface Pagination {
  page?: number;
  limit?: number;
}

export class AdminUsersService {
  /**
   * Get users with filters and pagination
   */
  static async getUsers(filters: GetUsersFilters = {}, pagination: Pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (filters.emailSearch) {
      where.email = {
        contains: filters.emailSearch,
        mode: 'insensitive',
      };
    }

    if (filters.hasSubscription !== undefined) {
      if (filters.hasSubscription) {
        where.subscriptions = { isNot: null };
      } else {
        where.subscriptions = { is: null };
      }
    }

    if (filters.hasBotLinked !== undefined) {
      if (filters.hasBotLinked) {
        where.telegram_bot_links = { some: {} };
      } else {
        where.telegram_bot_links = { none: {} };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subscriptions: {
            include: {
              plans: true,
            },
          },
          telegram_bot_links: true,
          _count: {
            select: {
              usage_counters: true,
              user_templates: true,
              support_tickets: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed user information
   */
  static async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        subscriptions: {
          include: {
            plans: true,
          },
        },
        telegram_bot_links: true,
        user_brand_configs: true,
        user_layout_preferences: true,
        user_templates: true,
        loginHistory: {
          orderBy: { loginAt: 'desc' },
          take: 10,
        },
        usage_counters: {
          orderBy: { date: 'desc' },
          take: 30,
        },
        support_tickets: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
        payments: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            telemetry_events: true,
            support_tickets: true,
            payments: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  /**
   * Deactivate a user account
   */
  static async deactivateUser(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Activate a user account
   */
  static async activateUser(userId: string) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        updatedAt: new Date(),
      },
    });

    return user;
  }

  /**
   * Reset user usage counters
   */
  static async resetUserUsage(userId: string) {
    // Delete all usage counters for the user
    await prisma.usage_counters.deleteMany({
      where: { user_id: userId },
    });

    return { success: true, message: 'User usage counters reset successfully' };
  }

  /**
   * Unlink a user's bot connection
   */
  static async unlinkUserBot(userId: string, botType: string) {
    await prisma.telegram_bot_links.deleteMany({
      where: {
        user_id: userId,
        bot_type: botType,
      },
    });

    return { success: true, message: `Bot ${botType} unlinked successfully` };
  }

  /**
   * Reset user password and return a temporary password
   */
  static async resetUserPassword(userId: string) {
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        updatedAt: new Date(),
      },
    });

    return { temporaryPassword: tempPassword };
  }
}
