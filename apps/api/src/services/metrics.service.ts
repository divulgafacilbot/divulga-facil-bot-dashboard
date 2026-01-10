/**
 * Metrics Service - Feature 7
 *
 * Consolidated metrics aggregation service.
 * Filters hidden cards, uses optimized indexes.
 */

import { prisma } from '../db/prisma.js';
import { PublicEventType, Marketplace } from '@prisma/client';

export interface UserMetrics {
  totalViews: number;
  totalClicks: number;
  totalCards: number;
  activeCards: number;
  ctr: number; // Click-through rate
  topMarketplace?: Marketplace;
  topCard?: {
    id: string;
    title: string;
    clicks: number;
  };
}

export interface CardMetrics {
  cardId: string;
  views: number;
  clicks: number;
  ctr: number;
  lastViewedAt?: Date;
  lastClickedAt?: Date;
}

export class MetricsService {
  /**
   * Get comprehensive metrics for a user
   */
  static async getUserMetrics(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<UserMetrics> {
    // Build where clause
    const eventWhere: any = {
      user_id: userId,
    };

    if (dateRange) {
      eventWhere.created_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Get event counts
    const eventCounts = await prisma.public_events.groupBy({
      by: ['event_type'],
      where: eventWhere,
      _count: true,
    });

    const totalViews = eventCounts.find((e) => e.event_type === 'PUBLIC_PROFILE_VIEW')?._count || 0;
    const cardViews = eventCounts.find((e) => e.event_type === 'PUBLIC_CARD_VIEW')?._count || 0;
    const totalClicks =
      (eventCounts.find((e) => e.event_type === 'PUBLIC_CTA_CLICK')?._count || 0) +
      (eventCounts.find((e) => e.event_type === 'PUBLIC_CARD_CLICK')?._count || 0);

    // Get card counts (excluding hidden)
    const totalCards = await prisma.public_cards.count({
      where: {
        user_id: userId,
      },
    });

    const activeCards = await prisma.public_cards.count({
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
    });

    // Calculate CTR
    const totalViewsForCtr = totalViews + cardViews;
    const ctr = totalViewsForCtr > 0 ? (totalClicks / totalViewsForCtr) * 100 : 0;

    // Get top marketplace
    const marketplaceCounts = await prisma.public_events.groupBy({
      by: ['marketplace'],
      where: {
        ...eventWhere,
        marketplace: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          marketplace: 'desc',
        },
      },
      take: 1,
    });

    const topMarketplace = marketplaceCounts[0]?.marketplace || undefined;

    // Get top card
    const topCardData = await prisma.public_events.groupBy({
      by: ['card_id'],
      where: {
        ...eventWhere,
        card_id: { not: null },
        event_type: { in: ['PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK'] },
      },
      _count: true,
      orderBy: {
        _count: {
          card_id: 'desc',
        },
      },
      take: 1,
    });

    let topCard: UserMetrics['topCard'] = undefined;
    if (topCardData[0]?.card_id) {
      const card = await prisma.public_cards.findUnique({
        where: { id: topCardData[0].card_id },
        select: { id: true, title: true },
      });

      if (card) {
        topCard = {
          id: card.id,
          title: card.title,
          clicks: topCardData[0]._count,
        };
      }
    }

    return {
      totalViews: totalViews + cardViews,
      totalClicks,
      totalCards,
      activeCards,
      ctr,
      topMarketplace,
      topCard,
    };
  }

  /**
   * Get metrics for a specific card
   */
  static async getCardMetrics(cardId: string, dateRange?: { start: Date; end: Date }): Promise<CardMetrics> {
    const eventWhere: any = {
      card_id: cardId,
    };

    if (dateRange) {
      eventWhere.created_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Get event counts
    const eventCounts = await prisma.public_events.groupBy({
      by: ['event_type'],
      where: eventWhere,
      _count: true,
    });

    const views = eventCounts.find((e) => e.event_type === 'PUBLIC_CARD_VIEW')?._count || 0;
    const clicks =
      (eventCounts.find((e) => e.event_type === 'PUBLIC_CTA_CLICK')?._count || 0) +
      (eventCounts.find((e) => e.event_type === 'PUBLIC_CARD_CLICK')?._count || 0);

    const ctr = views > 0 ? (clicks / views) * 100 : 0;

    // Get last viewed/clicked
    const lastView = await prisma.public_events.findFirst({
      where: {
        card_id: cardId,
        event_type: 'PUBLIC_CARD_VIEW',
      },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    const lastClick = await prisma.public_events.findFirst({
      where: {
        card_id: cardId,
        event_type: { in: ['PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK'] },
      },
      orderBy: { created_at: 'desc' },
      select: { created_at: true },
    });

    return {
      cardId,
      views,
      clicks,
      ctr,
      lastViewedAt: lastView?.created_at,
      lastClickedAt: lastClick?.created_at,
    };
  }

  /**
   * Get top performing cards for a user
   */
  static async getTopCards(
    userId: string,
    limit: number = 10,
    dateRange?: { start: Date; end: Date }
  ): Promise<Array<CardMetrics & { title: string; marketplace: Marketplace }>> {
    const eventWhere: any = {
      user_id: userId,
      card_id: { not: null },
      event_type: { in: ['PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK'] },
    };

    if (dateRange) {
      eventWhere.created_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Get cards by click count
    const topCardIds = await prisma.public_events.groupBy({
      by: ['card_id'],
      where: eventWhere,
      _count: true,
      orderBy: {
        _count: {
          card_id: 'desc',
        },
      },
      take: limit,
    });

    // Get card details and metrics
    const results: Array<CardMetrics & { title: string; marketplace: Marketplace }> = [];

    for (const item of topCardIds) {
      if (!item.card_id) continue;

      const card = await prisma.public_cards.findUnique({
        where: {
          id: item.card_id,
          status: 'ACTIVE', // Only active cards
        },
        select: {
          id: true,
          title: true,
          marketplace: true,
        },
      });

      if (!card) continue;

      const metrics = await this.getCardMetrics(item.card_id, dateRange);

      results.push({
        ...metrics,
        title: card.title,
        marketplace: card.marketplace,
      });
    }

    return results;
  }

  /**
   * Get metrics by marketplace
   */
  static async getMarketplaceMetrics(
    userId: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<
    Array<{
      marketplace: Marketplace;
      views: number;
      clicks: number;
      cards: number;
    }>
  > {
    const eventWhere: any = {
      user_id: userId,
      marketplace: { not: null },
    };

    if (dateRange) {
      eventWhere.created_at = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // Group by marketplace
    const marketplaceEvents = await prisma.public_events.groupBy({
      by: ['marketplace', 'event_type'],
      where: eventWhere,
      _count: true,
    });

    // Aggregate by marketplace
    const marketplaceMap = new Map<
      string,
      { marketplace: Marketplace; views: number; clicks: number }
    >();

    for (const event of marketplaceEvents) {
      if (!event.marketplace) continue;

      if (!marketplaceMap.has(event.marketplace)) {
        marketplaceMap.set(event.marketplace, {
          marketplace: event.marketplace,
          views: 0,
          clicks: 0,
        });
      }

      const entry = marketplaceMap.get(event.marketplace)!;

      if (event.event_type === 'PUBLIC_CARD_VIEW' || event.event_type === 'PUBLIC_PROFILE_VIEW') {
        entry.views += event._count;
      } else if (event.event_type === 'PUBLIC_CTA_CLICK' || event.event_type === 'PUBLIC_CARD_CLICK') {
        entry.clicks += event._count;
      }
    }

    // Get card counts by marketplace
    const cardCounts = await prisma.public_cards.groupBy({
      by: ['marketplace'],
      where: {
        user_id: userId,
        status: 'ACTIVE',
      },
      _count: true,
    });

    // Combine results
    const results: Array<{
      marketplace: Marketplace;
      views: number;
      clicks: number;
      cards: number;
    }> = [];

    for (const [marketplace, data] of marketplaceMap.entries()) {
      const cardCount = cardCounts.find((c) => c.marketplace === marketplace)?._count || 0;

      results.push({
        marketplace: data.marketplace,
        views: data.views,
        clicks: data.clicks,
        cards: cardCount,
      });
    }

    return results.sort((a, b) => b.clicks - a.clicks);
  }
}
