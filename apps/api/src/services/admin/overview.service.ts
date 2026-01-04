import { prisma } from '../../db/prisma.js';
import {
  KIWIFY_EVENT_TYPE_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../constants/admin-enums.js';
import { subDays } from 'date-fns';
import { BOT_TYPES } from '../../constants/bot-types.js';

export class AdminOverviewService {
  /**
   * Get KPIs for dashboard overview
   */
  static async getKPIs() {
    const now = new Date();
    const sevenDaysAgo = subDays(now, 7);
    const thirtyDaysAgo = subDays(now, 30);

    const [
      totalUsers,
      newUsers7d,
      newUsers30d,
      activeUsers,
      totalRenders,
      totalDownloads,
      activeBotTokens,
      rendersByMarketplace,
      downloadsByPlatform,
      criticalErrors,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { isActive: true } }),
      prisma.usage_counters.aggregate({ _sum: { renders_count: true } }),
      prisma.usage_counters.aggregate({ _sum: { downloads_count: true } }),
      prisma.telegram_links.groupBy({
        by: ['bot_type'],
        where: {
          status: 'PENDING',
          expires_at: {
            gt: now,
          },
        },
        _count: {
          _all: true,
        },
      }),
      prisma.$queryRaw<{ marketplace: string | null; count: number }[]>`
        SELECT metadata->>'marketplace' AS marketplace, COUNT(*)::int AS count
        FROM telemetry_events
        WHERE event_type = 'ART_GENERATED'
        GROUP BY 1
      `,
      prisma.$queryRaw<{ platform: string | null; count: number }[]>`
        SELECT metadata->>'platform' AS platform, COUNT(*)::int AS count
        FROM telemetry_events
        WHERE event_type = 'DOWNLOAD_COMPLETED'
        GROUP BY 1
      `,
      prisma.telemetry_events.count({
        where: {
          event_type: { contains: 'ERROR' },
          created_at: { gte: sevenDaysAgo },
        },
      }),
    ]);

    const tokenCounts = activeBotTokens.reduce(
      (acc, item) => {
        if (item.bot_type === BOT_TYPES.ARTS) {
          acc.arts += item._count._all;
        }
        if (item.bot_type === BOT_TYPES.DOWNLOAD) {
          acc.download += item._count._all;
        }
        return acc;
      },
      { arts: 0, download: 0 }
    );
    const marketplaceCounts = rendersByMarketplace.reduce(
      (acc, item) => {
        const marketplace = item.marketplace;
        if (!marketplace) {
          return acc;
        }
        if (marketplace in acc) {
          acc[marketplace as keyof typeof acc] = item.count;
        }
        return acc;
      },
      {
        MERCADO_LIVRE: 0,
        MAGALU: 0,
        SHOPEE: 0,
        AMAZON: 0,
      }
    );
    const downloadCounts = downloadsByPlatform.reduce(
      (acc, item) => {
        const platform = item.platform;
        if (!platform) {
          return acc;
        }
        if (platform in acc) {
          acc[platform as keyof typeof acc] = item.count;
        }
        return acc;
      },
      {
        INSTAGRAM: 0,
        TIKTOK: 0,
        PINTEREST: 0,
        YOUTUBE: 0,
      }
    );

    return {
      totalUsers,
      newUsers7d,
      newUsers30d,
      activeUsers,
      totalRenders: totalRenders._sum.renders_count || 0,
      totalDownloads: totalDownloads._sum.downloads_count || 0,
      activeArtsBots: tokenCounts.arts,
      activeDownloadBots: tokenCounts.download,
      rendersByMarketplace: marketplaceCounts,
      downloadsByPlatform: downloadCounts,
      criticalErrors,
    };
  }

  /**
   * Get time series data for charts
   */
  static async getTimeSeriesData(days: number = 30) {
    const startDate = subDays(new Date(), days);

    const usageData = await prisma.usage_counters.groupBy({
      by: ['date'],
      where: { date: { gte: startDate } },
      _sum: {
        renders_count: true,
        downloads_count: true,
      },
      orderBy: { date: 'asc' },
    });

    const usageSeries = usageData.map(d => ({
      date: d.date,
      renders: d._sum.renders_count || 0,
      downloads: d._sum.downloads_count || 0,
    }));
    const usersSeries = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT date_trunc('day', created_at) AS date, COUNT(*)::int AS count
      FROM users
      WHERE created_at >= ${startDate}
      GROUP BY 1
      ORDER BY 1
    `;
    const botsSeries = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT date_trunc('day', linked_at) AS date, COUNT(*)::int AS count
      FROM telegram_bot_links
      WHERE linked_at >= ${startDate}
      GROUP BY 1
      ORDER BY 1
    `;
    let revenueSeries: { date: Date; amount: number }[] = [];
    try {
      revenueSeries = await prisma.$queryRaw<{ date: Date; amount: number }[]>`
        SELECT date_trunc('day', created_at) AS date, SUM(amount)::float AS amount
        FROM payments
        WHERE created_at >= ${startDate}
          AND status = 'paid'
          AND provider = 'kiwify'
        GROUP BY 1
        ORDER BY 1
      `;
    } catch (error) {
      console.warn('[admin-overview] revenue series unavailable', error);
    }

    return {
      usage: usageSeries,
      newUsers: usersSeries.map((row) => ({
        date: row.date,
        count: row.count,
      })),
      botLinks: botsSeries.map((row) => ({
        date: row.date,
        count: row.count,
      })),
      revenue: revenueSeries.map((row) => ({
        date: row.date,
        amount: row.amount,
      })),
    };
  }

  /**
   * Get enabled bot tokens
   */
  static async getActiveTokens() {
    const now = new Date();

    const tokens = await prisma.telegram_links.findMany({
      where: {
        expires_at: { gt: now },
      },
      orderBy: {
        created_at: 'desc',
      },
      include: {
        users: {
          select: {
            email: true,
          },
        },
      },
    });

    return tokens.map((token) => ({
      id: token.id,
      token: token.token,
      botType: token.bot_type,
      createdAt: token.created_at,
      userEmail: token.users?.email || null,
    }));
  }

  /**
   * Get subscription status breakdown
   */
  static async getSubscriptionStatusBreakdown() {
    const [statusCounts, noSubscription] = await Promise.all([
      prisma.subscriptions.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      prisma.user.count({
        where: {
          subscriptions: { is: null },
        },
      }),
    ]);

    const mapped = statusCounts.map((item) => {
      const status = item.status || 'UNKNOWN';
      return {
        status,
        status_label: SUBSCRIPTION_STATUS_LABELS[status] || status,
        count: item._count._all,
      };
    });

    if (noSubscription > 0) {
      mapped.push({
        status: 'NO_SUBSCRIPTION',
        status_label: SUBSCRIPTION_STATUS_LABELS.NO_SUBSCRIPTION,
        count: noSubscription,
      });
    }

    return mapped;
  }

  /**
   * Get critical events from telemetry
   */
  static async getCriticalEvents(limit: number = 10) {
    return prisma.telemetry_events.findMany({
      where: { event_type: { contains: 'ERROR' } },
      orderBy: { created_at: 'desc' },
      take: limit,
      include: { users: { select: { email: true } } },
    });
  }

  /**
   * Get recent Kiwify webhook events
   */
  static async getRecentKiwifyWebhooks(limit: number = 10) {
    const events = await prisma.kiwify_events.findMany({
      orderBy: { received_at: 'desc' },
      take: limit,
    });
    return events.map((event) => ({
      ...event,
      event_type_label: KIWIFY_EVENT_TYPE_LABELS[event.event_type || ''] || event.event_type,
    }));
  }
}
