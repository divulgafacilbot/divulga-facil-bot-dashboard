import { prisma } from '../../db/prisma.js';
import { subDays } from 'date-fns';

interface GetBotErrorsFilters {
  botType?: string;
  fromDate?: Date;
  toDate?: Date;
}

export class AdminBotsService {
  /**
   * Get bot statistics
   */
  static async getBotsStats() {
    const sevenDaysAgo = subDays(new Date(), 7);

    const [
      totalBotLinks,
      botLinksByType,
      recentLinkages,
      activeBots7d,
    ] = await Promise.all([
      prisma.telegram_bot_links.count(),
      prisma.telegram_bot_links.groupBy({
        by: ['bot_type'],
        _count: {
          id: true,
        },
      }),
      prisma.telegram_bot_links.count({
        where: {
          linked_at: {
            gte: sevenDaysAgo,
          },
        },
      }),
      prisma.telegram_bot_links.groupBy({
        by: ['bot_type'],
        where: {
          linked_at: {
            gte: sevenDaysAgo,
          },
        },
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalBotLinks,
      botLinksByType: botLinksByType.map((b) => ({
        botType: b.bot_type,
        count: b._count.id,
      })),
      recentLinkages,
      activeBots7d: activeBots7d.map((b) => ({
        botType: b.bot_type,
        count: b._count.id,
      })),
    };
  }

  /**
   * Get bot errors from telemetry
   */
  static async getBotErrors(filters: GetBotErrorsFilters = {}) {
    const where: any = {
      event_type: {
        contains: 'ERROR',
      },
    };

    if (filters.botType) {
      where.origin = filters.botType;
    }

    if (filters.fromDate || filters.toDate) {
      where.created_at = {};
      if (filters.fromDate) {
        where.created_at.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.created_at.lte = filters.toDate;
      }
    }

    const [errors, errorsByType, errorsByOrigin] = await Promise.all([
      prisma.telemetry_events.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 100,
        include: {
          users: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.telemetry_events.groupBy({
        by: ['event_type'],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
      prisma.telemetry_events.groupBy({
        by: ['origin'],
        where,
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
      }),
    ]);

    return {
      errors,
      errorsByType: errorsByType.map((e) => ({
        eventType: e.event_type,
        count: e._count.id,
      })),
      errorsByOrigin: errorsByOrigin.map((e) => ({
        origin: e.origin,
        count: e._count.id,
      })),
    };
  }

  /**
   * Get bot usage by user
   */
  static async getBotUsageByUser() {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const usageData = await prisma.usage_counters.groupBy({
      by: ['user_id'],
      where: {
        date: {
          gte: thirtyDaysAgo,
        },
      },
      _sum: {
        renders_count: true,
        downloads_count: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          renders_count: 'desc',
        },
      },
      take: 100,
    });

    // Get user details for top users
    const userIds = usageData.map((u) => u.user_id).filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        email: true,
        subscriptions: {
          include: {
            plans: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return usageData.map((usage) => ({
      userId: usage.user_id,
      user: usage.user_id ? userMap.get(usage.user_id) : null,
      totalRenders: usage._sum.renders_count || 0,
      totalDownloads: usage._sum.downloads_count || 0,
      daysActive: usage._count.id,
    }));
  }
}
