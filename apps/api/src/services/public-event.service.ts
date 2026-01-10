/**
 * Public Event Service - Feature 7
 *
 * Consolidated service for tracking public events.
 * Integrates with Feature 5 TTL system.
 */

import { prisma } from '../db/prisma.js';
import { PublicEventType, Marketplace, CardSource } from '@prisma/client';
import { sanitizeReferrer, sanitizeUTM } from '../utils/sanitize.utils.js';
import { sanitizeUserAgent } from '../utils/user-agent.utils.js';
import { TRACKING_CONFIG } from '../constants/tracking-config.js';

export interface TrackEventOptions {
  userId: string;
  cardId?: string;
  eventType: PublicEventType;
  marketplace?: Marketplace;
  source?: CardSource;
  visitorId?: string;
  ipHash?: string;
  userAgent?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  isDuplicate?: boolean;
  isBot?: boolean;
}

export class PublicEventService {
  /**
   * Track a page view event
   */
  static async trackPageView(options: {
    userId: string;
    visitorId?: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    isDuplicate?: boolean;
    isBot?: boolean;
  }) {
    return this.trackEvent({
      ...options,
      eventType: 'PUBLIC_PROFILE_VIEW',
    });
  }

  /**
   * Track a CTA click event
   */
  static async trackCtaClick(options: {
    userId: string;
    cardId: string;
    marketplace?: Marketplace;
    source?: CardSource;
    visitorId?: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    isDuplicate?: boolean;
    isBot?: boolean;
  }) {
    return this.trackEvent({
      ...options,
      eventType: 'PUBLIC_CTA_CLICK',
    });
  }

  /**
   * Track a card view event
   */
  static async trackCardView(options: {
    userId: string;
    cardId: string;
    marketplace?: Marketplace;
    source?: CardSource;
    visitorId?: string;
    ipHash?: string;
    userAgent?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    isDuplicate?: boolean;
    isBot?: boolean;
  }) {
    return this.trackEvent({
      ...options,
      eventType: 'PUBLIC_CARD_VIEW',
    });
  }

  /**
   * Track an event (generic)
   */
  static async trackEvent(options: TrackEventOptions) {
    try {
      // Calculate expiration date (now + 30 days)
      const now = new Date();
      const expiresAt = new Date(now.getTime() + TRACKING_CONFIG.EVENT_TTL_DAYS * 24 * 60 * 60 * 1000);

      // Create event
      const event = await prisma.public_events.create({
        data: {
          user_id: options.userId,
          card_id: options.cardId,
          event_type: options.eventType,
          marketplace: options.marketplace,
          source: options.source,
          visitor_id: options.visitorId?.substring(0, 50), // Truncate to max length
          ip_hash: options.ipHash?.substring(0, 64), // Truncate to max length
          user_agent: sanitizeUserAgent(options.userAgent),
          referrer: sanitizeReferrer(options.referrer),
          utm_source: sanitizeUTM(options.utmSource),
          utm_medium: sanitizeUTM(options.utmMedium),
          utm_campaign: sanitizeUTM(options.utmCampaign),
          // Feature 5 integration: TTL field
          expires_at: expiresAt,
        },
      });

      return {
        tracked: true,
        eventId: event.id,
      };
    } catch (error) {
      console.error('[PublicEventService] Failed to track event:', error);
      return {
        tracked: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get events for a user
   */
  static async getUserEvents(
    userId: string,
    options?: {
      eventType?: PublicEventType;
      limit?: number;
      offset?: number;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const where: any = {
      user_id: userId,
    };

    if (options?.eventType) {
      where.event_type = options.eventType;
    }

    if (options?.startDate || options?.endDate) {
      where.created_at = {};
      if (options.startDate) {
        where.created_at.gte = options.startDate;
      }
      if (options.endDate) {
        where.created_at.lte = options.endDate;
      }
    }

    const events = await prisma.public_events.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: options?.limit || 100,
      skip: options?.offset || 0,
    });

    return events;
  }

  /**
   * Get events for a card
   */
  static async getCardEvents(
    cardId: string,
    options?: {
      eventType?: PublicEventType;
      limit?: number;
    }
  ) {
    const where: any = {
      card_id: cardId,
    };

    if (options?.eventType) {
      where.event_type = options.eventType;
    }

    const events = await prisma.public_events.findMany({
      where,
      orderBy: {
        created_at: 'desc',
      },
      take: options?.limit || 100,
    });

    return events;
  }

  /**
   * Get event counts for a user
   */
  static async getUserEventCounts(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Record<string, number>> {
    const where: any = {
      user_id: userId,
    };

    if (startDate || endDate) {
      where.created_at = {};
      if (startDate) {
        where.created_at.gte = startDate;
      }
      if (endDate) {
        where.created_at.lte = endDate;
      }
    }

    const counts = await prisma.public_events.groupBy({
      by: ['event_type'],
      where,
      _count: true,
    });

    const result: Record<string, number> = {};
    for (const count of counts) {
      result[count.event_type] = count._count;
    }

    return result;
  }

  /**
   * Delete old events (for housekeeping job)
   * Called by Feature 5 housekeeping
   */
  static async deleteExpiredEvents(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - TRACKING_CONFIG.EVENT_TTL_DAYS);

    const result = await prisma.public_events.deleteMany({
      where: {
        created_at: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
