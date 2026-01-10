import { prisma } from '../../db/prisma.js';
import { subDays } from 'date-fns';

interface GetUsersUsageFilters {
  fromDate?: Date;
  toDate?: Date;
  userId?: string;
}

interface UsageSort {
  sortBy?: 'renders' | 'downloads' | 'total';
  order?: 'asc' | 'desc';
}

export class AdminUsageService {
  /**
   * Get users usage with filters and sorting
   */
  static async getUsersUsage(filters: GetUsersUsageFilters = {}, sort: UsageSort = {}) {
    const { sortBy = 'renders', order = 'desc' } = sort;

    const where: any = {};

    if (filters.fromDate || filters.toDate) {
      where.date = {};
      if (filters.fromDate) {
        where.date.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.date.lte = filters.toDate;
      }
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    const usageData = await prisma.usage_counters.groupBy({
      by: ['user_id'],
      where,
      _sum: {
        renders_count: true,
        downloads_count: true,
      },
      _count: {
        id: true,
      },
    });

    // Get user details
    const userIds = usageData.map((u) => u.user_id).filter((id): id is string => id !== null);

    const users = await prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      include: {
        subscriptions: {
          include: {
            plans: true,
          },
        },
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // Combine data
    let result = usageData.map((usage) => {
      const user = usage.user_id ? userMap.get(usage.user_id) : null;
      const renders = usage._sum.renders_count || 0;
      const downloads = usage._sum.downloads_count || 0;

      return {
        userId: usage.user_id,
        user,
        renders,
        downloads,
        total: renders + downloads,
        daysActive: usage._count.id,
        plan: user?.subscriptions?.plans?.name || 'FREE',
      };
    });

    // Sort
    result.sort((a, b) => {
      let aVal = 0;
      let bVal = 0;

      switch (sortBy) {
        case 'renders':
          aVal = a.renders;
          bVal = b.renders;
          break;
        case 'downloads':
          aVal = a.downloads;
          bVal = b.downloads;
          break;
        case 'total':
          aVal = a.total;
          bVal = b.total;
          break;
      }

      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });

    return result;
  }

  /**
   * Get abuse alerts - users exceeding their plan limits
   */
  static async getAbuseAlerts() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's usage for all users
    const todayUsage = await prisma.usage_counters.findMany({
      where: {
        date: today,
      },
      include: {
        users: {
          include: {
            subscriptions: {
              include: {
                plans: true,
              },
            },
          },
        },
      },
    });

    const alerts = todayUsage
      .map((usage) => {
        const user = usage.users;
        if (!user) return null;

        const plan = user.subscriptions?.plans;
        const maxRenders = plan?.max_artes_por_dia || 10;
        const maxDownloads = plan?.max_downloads_por_dia || 10;

        const rendersExceeded = (usage.renders_count || 0) > maxRenders;
        const downloadsExceeded = (usage.downloads_count || 0) > maxDownloads;

        if (!rendersExceeded && !downloadsExceeded) return null;

        return {
          userId: user.id,
          email: user.email,
          plan: plan?.name || 'FREE',
          usage: {
            renders: usage.renders_count || 0,
            maxRenders,
            rendersExceeded,
            downloads: usage.downloads_count || 0,
            maxDownloads,
            downloadsExceeded,
          },
          date: usage.date,
        };
      })
      .filter((alert): alert is NonNullable<typeof alert> => alert !== null);

    return alerts;
  }

  /**
   * Get limit violations over a period
   */
  static async getLimitViolations() {
    const sevenDaysAgo = subDays(new Date(), 7);

    const recentUsage = await prisma.usage_counters.findMany({
      where: {
        date: {
          gte: sevenDaysAgo,
        },
      },
      include: {
        users: {
          include: {
            subscriptions: {
              include: {
                plans: true,
              },
            },
          },
        },
      },
    });

    const violations = recentUsage
      .map((usage) => {
        const user = usage.users;
        if (!user) return null;

        const plan = user.subscriptions?.plans;
        const maxRenders = plan?.max_artes_por_dia || 10;
        const maxDownloads = plan?.max_downloads_por_dia || 10;

        const rendersExceeded = (usage.renders_count || 0) > maxRenders;
        const downloadsExceeded = (usage.downloads_count || 0) > maxDownloads;

        if (!rendersExceeded && !downloadsExceeded) return null;

        return {
          userId: user.id,
          email: user.email,
          date: usage.date,
          plan: plan?.name || 'FREE',
          renders: {
            used: usage.renders_count || 0,
            limit: maxRenders,
            exceeded: rendersExceeded,
          },
          downloads: {
            used: usage.downloads_count || 0,
            limit: maxDownloads,
            exceeded: downloadsExceeded,
          },
        };
      })
      .filter((violation): violation is NonNullable<typeof violation> => violation !== null);

    // Group by user
    const violationsByUser = violations.reduce((acc, violation) => {
      const key = violation.userId;
      if (!acc[key]) {
        acc[key] = {
          userId: violation.userId,
          email: violation.email,
          plan: violation.plan,
          violations: [],
          totalViolations: 0,
        };
      }
      acc[key].violations.push({
        date: violation.date,
        renders: violation.renders,
        downloads: violation.downloads,
      });
      acc[key].totalViolations++;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(violationsByUser).sort(
      (a, b) => b.totalViolations - a.totalViolations
    );
  }

  /**
   * Get usage by bot type - renders, downloads, suggestions, pins per user
   */
  static async getUsageByBotType() {
    // Get renders and downloads from usage_counters
    const usageData = await prisma.usage_counters.groupBy({
      by: ['user_id'],
      _sum: {
        renders_count: true,
        downloads_count: true,
      },
    });

    // Get suggestions per user from suggestion_history
    const suggestionsData = await prisma.$queryRaw<{ user_id: string; count: number }[]>`
      SELECT user_id, COUNT(*)::int AS count
      FROM suggestion_history
      GROUP BY user_id
    `;

    // Get pins created per user from public_cards (source = BOT)
    const pinsData = await prisma.$queryRaw<{ user_id: string; count: number }[]>`
      SELECT user_id, COUNT(*)::int AS count
      FROM public_cards
      WHERE source = 'BOT'
      GROUP BY user_id
    `;

    // Get all unique user IDs
    const allUserIds = new Set<string>();
    usageData.forEach(u => u.user_id && allUserIds.add(u.user_id));
    suggestionsData.forEach(u => allUserIds.add(u.user_id));
    pinsData.forEach(u => allUserIds.add(u.user_id));

    // Get user details
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(allUserIds) } },
      select: { id: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const usageMap = new Map(usageData.map(u => [u.user_id, u]));
    const suggestionsMap = new Map(suggestionsData.map(s => [s.user_id, s.count]));
    const pinsMap = new Map(pinsData.map(p => [p.user_id, p.count]));

    // Combine all data
    const result = Array.from(allUserIds).map(userId => {
      const user = userMap.get(userId);
      const usage = usageMap.get(userId);

      return {
        userId,
        email: user?.email || null,
        renders: usage?._sum.renders_count || 0,
        downloads: usage?._sum.downloads_count || 0,
        suggestions: suggestionsMap.get(userId) || 0,
        pinsCreated: pinsMap.get(userId) || 0,
      };
    });

    return {
      byRenders: [...result].sort((a, b) => b.renders - a.renders),
      byDownloads: [...result].sort((a, b) => b.downloads - a.downloads),
      bySuggestions: [...result].sort((a, b) => b.suggestions - a.suggestions),
      byPins: [...result].sort((a, b) => b.pinsCreated - a.pinsCreated),
    };
  }
}
