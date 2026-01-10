import { prisma } from '../../db/prisma.js';
import { PublicEventType, Marketplace, CardSource } from '@prisma/client';
import {
  hashIP,
  sanitizeReferrer,
  sanitizeUserAgent,
  isBot,
  generateVisitorKey,
  generateDedupeKey,
  getDedupeWindow
} from '../../utils/tracking.util.js';

export class TrackingService {
  /**
   * Track event with rate limiting, deduplication, and bot filtering
   */
  static async trackEvent(options: {
    userId: string;
    cardId?: string;
    eventType: PublicEventType;
    marketplace?: Marketplace;
    source?: CardSource;
    ip: string;
    userAgent?: string;
    referrer?: string;
    visitorId?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }) {
    const {
      userId,
      cardId,
      eventType,
      marketplace,
      source,
      ip,
      userAgent,
      referrer,
      visitorId,
      utmSource,
      utmMedium,
      utmCampaign
    } = options;

    // 1. Bot filtering
    if (isBot(userAgent)) {
      return { tracked: false, reason: 'bot_filtered' };
    }

    // 2. Generate tracking identifiers
    const ipHash = hashIP(ip, userAgent || '');
    const visitorKey = generateVisitorKey(visitorId || null, ipHash);

    // 3. Check deduplication
    const dedupeKey = generateDedupeKey(visitorKey, eventType, cardId || null);
    const isDuplicate = await this.checkDedupe(dedupeKey);

    if (isDuplicate) {
      return { tracked: false, reason: 'duplicate' };
    }

    // 4. Register event
    await prisma.public_events.create({
      data: {
        user_id: userId,
        card_id: cardId,
        event_type: eventType,
        marketplace,
        source,
        referrer: sanitizeReferrer(referrer),
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: sanitizeUserAgent(userAgent)
      }
    });

    // 5. Set dedupe key
    await this.setDedupe(dedupeKey, getDedupeWindow(eventType));

    return { tracked: true };
  }

  /**
   * Check if dedupe key exists
   */
  private static async checkDedupe(dedupeKey: string): Promise<boolean> {
    const existing = await prisma.public_event_dedupe.findUnique({
      where: { dedupe_key: dedupeKey }
    });

    if (!existing) {
      return false;
    }

    // Check if expired
    if (existing.expires_at < new Date()) {
      // Expired, can track
      await prisma.public_event_dedupe.delete({
        where: { dedupe_key: dedupeKey }
      });
      return false;
    }

    return true;
  }

  /**
   * Set dedupe key with expiration
   */
  private static async setDedupe(dedupeKey: string, ttlSeconds: number) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + ttlSeconds);

    await prisma.public_event_dedupe.upsert({
      where: { dedupe_key: dedupeKey },
      create: {
        dedupe_key: dedupeKey,
        expires_at: expiresAt
      },
      update: {
        expires_at: expiresAt
      }
    });
  }

  /**
   * Get analytics for user
   */
  static async getAnalytics(userId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.public_events.groupBy({
      by: ['event_type'],
      where: {
        user_id: userId,
        created_at: {
          gte: since
        }
      },
      _count: true
    });

    return events.reduce((acc, event) => {
      acc[event.event_type] = event._count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Cleanup expired dedupe keys (scheduled job)
   */
  static async cleanupExpiredDedupe() {
    const deleted = await prisma.public_event_dedupe.deleteMany({
      where: {
        expires_at: {
          lt: new Date()
        }
      }
    });

    return deleted.count;
  }

  /**
   * Cleanup old events (30 days TTL)
   */
  static async cleanupOldEvents() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const deleted = await prisma.public_events.deleteMany({
      where: {
        created_at: {
          lt: cutoff
        }
      }
    });

    return deleted.count;
  }
}
