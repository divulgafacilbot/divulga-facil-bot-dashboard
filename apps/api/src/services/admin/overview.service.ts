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
      totalPinsCreated,
      totalSuggestionsGenerated,
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
      prisma.telemetry_events.count({
        where: {
          event_type: 'PINTEREST_PIN_CREATED',
          created_at: { gte: thirtyDaysAgo },
        },
      }),
      prisma.telemetry_events.count({
        where: {
          event_type: 'SUGGESTION_GENERATED',
          created_at: { gte: thirtyDaysAgo },
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
        if (item.bot_type === BOT_TYPES.PINTEREST) {
          acc.pinterest += item._count._all;
        }
        if (item.bot_type === BOT_TYPES.SUGGESTION) {
          acc.suggestion += item._count._all;
        }
        return acc;
      },
      { arts: 0, download: 0, pinterest: 0, suggestion: 0 }
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
      activePinterestBots: tokenCounts.pinterest,
      activeSuggestionBots: tokenCounts.suggestion,
      totalPinsCreated,
      totalSuggestionsGenerated,
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

    // Bot links by type (4 separate series)
    const botsSeriesByType = await prisma.$queryRaw<{ date: Date; bot_type: string; count: number }[]>`
      SELECT date_trunc('day', linked_at) AS date, bot_type, COUNT(*)::int AS count
      FROM telegram_bot_links
      WHERE linked_at >= ${startDate}
      GROUP BY 1, 2
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

    // Transform botsSeriesByType into separate arrays by bot type
    const botLinksByType = {
      arts: [] as { date: Date; count: number }[],
      download: [] as { date: Date; count: number }[],
      pinterest: [] as { date: Date; count: number }[],
      suggestion: [] as { date: Date; count: number }[],
    };

    for (const row of botsSeriesByType) {
      const entry = { date: row.date, count: row.count };
      if (row.bot_type === 'ARTS') {
        botLinksByType.arts.push(entry);
      } else if (row.bot_type === 'DOWNLOAD') {
        botLinksByType.download.push(entry);
      } else if (row.bot_type === 'PINTEREST') {
        botLinksByType.pinterest.push(entry);
      } else if (row.bot_type === 'SUGGESTION') {
        botLinksByType.suggestion.push(entry);
      }
    }

    // Time series for suggestions (30d)
    const suggestionsSeries = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT date_trunc('day', suggested_at) AS date, COUNT(*)::int AS count
      FROM suggestion_history
      WHERE suggested_at >= ${startDate}
      GROUP BY 1
      ORDER BY 1
    `;

    // Time series for pins created by bot (30d)
    const pinsSeries = await prisma.$queryRaw<{ date: Date; count: number }[]>`
      SELECT date_trunc('day', created_at) AS date, COUNT(*)::int AS count
      FROM public_cards
      WHERE source = 'BOT'
        AND created_at >= ${startDate}
      GROUP BY 1
      ORDER BY 1
    `;

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
      botLinksByType,
      revenue: revenueSeries.map((row) => ({
        date: row.date,
        amount: row.amount,
      })),
      suggestions: suggestionsSeries.map((row) => ({
        date: row.date,
        count: row.count,
      })),
      pinsCreated: pinsSeries.map((row) => ({
        date: row.date,
        count: row.count,
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
        user: {
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
      userEmail: token.user?.email || null,
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

  /**
   * Get public page metrics (all users combined)
   */
  static async getPublicPageMetrics(days: number = 30) {
    const startDate = subDays(new Date(), days);

    const [
      profileViews,
      cardViews,
      ctaClicks,
      marketplaceBreakdown,
      publicPageTimeSeries,
    ] = await Promise.all([
      // Total profile views
      prisma.public_events.count({
        where: {
          event_type: 'PUBLIC_PROFILE_VIEW',
          created_at: { gte: startDate },
        },
      }),
      // Total card views
      prisma.public_events.count({
        where: {
          event_type: 'PUBLIC_CARD_VIEW',
          created_at: { gte: startDate },
        },
      }),
      // Total CTA clicks
      prisma.public_events.count({
        where: {
          event_type: { in: ['PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK'] },
          created_at: { gte: startDate },
        },
      }),
      // Clicks by marketplace
      prisma.$queryRaw<{ marketplace: string | null; count: number }[]>`
        SELECT marketplace::text, COUNT(*)::int AS count
        FROM public_events
        WHERE event_type IN ('PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK')
          AND created_at >= ${startDate}
          AND marketplace IS NOT NULL
        GROUP BY 1
      `,
      // Time series for public page events
      prisma.$queryRaw<{ date: Date; event_type: string; count: number }[]>`
        SELECT date_trunc('day', created_at) AS date, event_type::text, COUNT(*)::int AS count
        FROM public_events
        WHERE created_at >= ${startDate}
        GROUP BY 1, 2
        ORDER BY 1
      `,
    ]);

    // Transform marketplace breakdown
    const marketplaceCounts = {
      MERCADO_LIVRE: 0,
      SHOPEE: 0,
      AMAZON: 0,
      MAGALU: 0,
    };

    for (const row of marketplaceBreakdown) {
      if (row.marketplace && row.marketplace in marketplaceCounts) {
        marketplaceCounts[row.marketplace as keyof typeof marketplaceCounts] = row.count;
      }
    }

    // Transform time series by event type
    const timeSeriesByType = {
      profileViews: [] as { date: Date; count: number }[],
      cardViews: [] as { date: Date; count: number }[],
      ctaClicks: [] as { date: Date; count: number }[],
    };

    for (const row of publicPageTimeSeries) {
      const entry = { date: row.date, count: row.count };
      if (row.event_type === 'PUBLIC_PROFILE_VIEW') {
        timeSeriesByType.profileViews.push(entry);
      } else if (row.event_type === 'PUBLIC_CARD_VIEW') {
        timeSeriesByType.cardViews.push(entry);
      } else if (row.event_type === 'PUBLIC_CTA_CLICK' || row.event_type === 'PUBLIC_CARD_CLICK') {
        // Aggregate CTA and card clicks
        const existing = timeSeriesByType.ctaClicks.find(
          (e) => e.date.getTime() === row.date.getTime()
        );
        if (existing) {
          existing.count += row.count;
        } else {
          timeSeriesByType.ctaClicks.push(entry);
        }
      }
    }

    return {
      profileViews,
      cardViews,
      ctaClicks,
      marketplaceBreakdown: marketplaceCounts,
      timeSeries: timeSeriesByType,
    };
  }

  /**
   * Get Pinterest bot specific metrics
   */
  static async getPinterestBotMetrics(days: number = 30) {
    const startDate = subDays(new Date(), days);

    const [
      totalCards,
      cardsByMarketplace,
      activeUsers,
    ] = await Promise.all([
      prisma.public_cards.count({
        where: {
          source: 'BOT',
          created_at: { gte: startDate },
        },
      }),
      prisma.$queryRaw<{ marketplace: string; count: number }[]>`
        SELECT marketplace::text, COUNT(*)::int AS count
        FROM public_cards
        WHERE source = 'BOT'
          AND created_at >= ${startDate}
        GROUP BY 1
      `,
      prisma.pinterest_bot_configs.count({
        where: {
          enabled: true,
        },
      }),
    ]);

    const marketplaceCounts = {
      MERCADO_LIVRE: 0,
      SHOPEE: 0,
      AMAZON: 0,
      MAGALU: 0,
    };

    for (const row of cardsByMarketplace) {
      if (row.marketplace in marketplaceCounts) {
        marketplaceCounts[row.marketplace as keyof typeof marketplaceCounts] = row.count;
      }
    }

    return {
      totalCardsGenerated: totalCards,
      cardsByMarketplace: marketplaceCounts,
      activeConfigs: activeUsers,
    };
  }

  /**
   * Get Suggestion bot specific metrics
   */
  static async getSuggestionBotMetrics(days: number = 30) {
    const startDate = subDays(new Date(), days);

    const [
      totalSuggestions,
      suggestionsByMarketplace,
      activeUsers,
    ] = await Promise.all([
      prisma.suggestion_history.count({
        where: {
          suggested_at: { gte: startDate },
        },
      }),
      prisma.$queryRaw<{ marketplace: string | null; count: number }[]>`
        SELECT suggested_marketplace AS marketplace, COUNT(*)::int AS count
        FROM suggestion_history
        WHERE suggested_at >= ${startDate}
        GROUP BY 1
      `,
      prisma.user_suggestion_preferences.count({
        where: {
          suggestions_enabled: true,
        },
      }),
    ]);

    const marketplaceCounts = {
      MERCADO_LIVRE: 0,
      SHOPEE: 0,
      AMAZON: 0,
      MAGALU: 0,
    };

    for (const row of suggestionsByMarketplace) {
      const marketplace = row.marketplace;
      if (marketplace && marketplace in marketplaceCounts) {
        marketplaceCounts[marketplace as keyof typeof marketplaceCounts] = row.count;
      }
    }

    return {
      totalSuggestions,
      suggestionsByMarketplace: marketplaceCounts,
      activeUsers,
    };
  }
}
