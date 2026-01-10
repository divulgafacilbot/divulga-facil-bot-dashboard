import { prisma } from '../db/prisma.js';
import type { PublicEventType } from '@prisma/client';

export class AnalyticsService {
  /**
   * Get dashboard overview metrics for a user
   */
  static async getDashboardMetrics(userId: string, timeRange: '7d' | '30d' | 'all' = '30d') {
    const startDate = this.getStartDate(timeRange);

    // Get public page stats
    const [
      profileViews,
      cardViews,
      cardClicks,
      ctaClicks,
      totalCards,
      activeCards
    ] = await Promise.all([
      this.countEvents(userId, 'PUBLIC_PROFILE_VIEW', startDate),
      this.countEvents(userId, 'PUBLIC_CARD_VIEW', startDate),
      this.countEvents(userId, 'PUBLIC_CARD_CLICK', startDate),
      this.countEvents(userId, 'PUBLIC_CTA_CLICK', startDate),
      prisma.public_cards.count({ where: { user_id: userId } }),
      prisma.public_cards.count({
        where: { user_id: userId, status: 'ACTIVE' }
      })
    ]);

    // Calculate CTR (Click-Through Rate)
    const ctr = profileViews > 0
      ? ((cardClicks / profileViews) * 100).toFixed(2)
      : '0.00';

    return {
      timeRange,
      publicPage: {
        profileViews,
        cardViews,
        cardClicks,
        ctaClicks,
        ctr: parseFloat(ctr),
        totalCards,
        activeCards
      }
    };
  }

  /**
   * Get top performing cards
   */
  static async getTopCards(userId: string, limit: number = 10) {
    // Get card IDs with most clicks
    const topCardIds = await prisma.public_events.groupBy({
      by: ['card_id'],
      where: {
        user_id: userId,
        event_type: 'PUBLIC_CTA_CLICK',
        card_id: { not: null }
      },
      _count: {
        card_id: true
      },
      orderBy: {
        _count: {
          card_id: 'desc'
        }
      },
      take: limit
    });

    // Get full card details
    const cards = await prisma.public_cards.findMany({
      where: {
        id: {
          in: topCardIds.map(c => c.card_id!)
        }
      },
      select: {
        id: true,
        card_slug: true,
        title: true,
        image_url: true,
        price: true,
        marketplace: true,
        source: true,
        created_at: true
      }
    });

    // Map with click counts
    return topCardIds.map(top => {
      const card = cards.find(c => c.id === top.card_id);
      return {
        ...card,
        clickCount: top._count.card_id
      };
    });
  }

  /**
   * Get visitor stats breakdown
   */
  static async getVisitorStats(userId: string, timeRange: '7d' | '30d' = '30d') {
    const startDate = this.getStartDate(timeRange);

    // Unique visitors (by visitor_id)
    const uniqueVisitors = await prisma.public_events.groupBy({
      by: ['visitor_id'],
      where: {
        user_id: userId,
        created_at: { gte: startDate },
        visitor_id: { not: null }
      }
    });

    // Events by type
    const eventsByType = await prisma.public_events.groupBy({
      by: ['event_type'],
      where: {
        user_id: userId,
        created_at: { gte: startDate }
      },
      _count: {
        event_type: true
      }
    });

    return {
      uniqueVisitors: uniqueVisitors.length,
      eventsByType: eventsByType.reduce((acc, e) => {
        acc[e.event_type] = e._count.event_type;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  /**
   * Get events grouped by date for time series charts
   */
  static async getEventTimeSeries(
    userId: string,
    eventType: PublicEventType,
    timeRange: '7d' | '30d' = '30d'
  ) {
    const startDate = this.getStartDate(timeRange);

    const events = await prisma.public_events.groupBy({
      by: ['created_at'],
      where: {
        user_id: userId,
        event_type: eventType,
        created_at: { gte: startDate }
      },
      _count: {
        id: true
      }
    });

    return events.map(e => ({
      date: e.created_at.toISOString().split('T')[0], // YYYY-MM-DD
      count: e._count.id
    }));
  }

  // Helper methods
  private static getStartDate(timeRange: '7d' | '30d' | 'all'): Date {
    if (timeRange === 'all') return new Date(0);
    const days = timeRange === '7d' ? 7 : 30;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private static async countEvents(
    userId: string,
    eventType: PublicEventType,
    startDate: Date
  ): Promise<number> {
    return prisma.public_events.count({
      where: {
        user_id: userId,
        event_type: eventType,
        created_at: { gte: startDate }
      }
    });
  }
}
