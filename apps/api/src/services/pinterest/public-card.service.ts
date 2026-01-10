import { prisma } from '../../db/prisma.js';
import { CardSource, Marketplace, CardStatus } from '@prisma/client';
import { customAlphabet } from 'nanoid';
import { buildCursorQuery, processPaginatedResults, decodeCursor } from '../../utils/cursor.util.js';

const nanoid = customAlphabet('abcdefghijklmnopqrstuvwxyz0123456789', 12);

export class PublicCardService {
  /**
   * List cards with cursor pagination
   */
  static async listCards(options: {
    userId: string;
    cursor?: string;
    limit?: number;
    marketplace?: Marketplace;
    category?: string;
    status?: CardStatus;
  }) {
    const {
      userId,
      cursor: cursorString,
      limit = 24,
      marketplace,
      category,
      status = CardStatus.ACTIVE
    } = options;

    const cursor = cursorString ? decodeCursor(cursorString) : null;
    const query = buildCursorQuery(cursor, limit);

    const where: any = {
      user_id: userId,
      status
    };

    if (marketplace) {
      where.marketplace = marketplace;
    }

    if (category) {
      where.category = category;
    }

    const results = await prisma.public_cards.findMany({
      where,
      ...(query as any)
    });

    return processPaginatedResults(results, limit);
  }

  /**
   * Get card by slug
   */
  static async getCardBySlug(userId: string, cardSlug: string) {
    return await prisma.public_cards.findFirst({
      where: {
        user_id: userId,
        card_slug: cardSlug
      }
    });
  }

  /**
   * Get card by ID
   */
  static async getCardById(cardId: string) {
    return await prisma.public_cards.findUnique({
      where: { id: cardId }
    });
  }

  /**
   * Check if a product already exists on the public page
   * Checks by affiliate_url (unique per product)
   * Only checks ACTIVE cards
   */
  static async checkDuplicate(userId: string, affiliateUrl: string): Promise<{
    isDuplicate: boolean;
    existingCard: any | null;
  }> {
    // Normalize URL for comparison (remove tracking params, trailing slashes, etc.)
    const normalizedUrl = this.normalizeUrl(affiliateUrl);

    // Find existing card with same affiliate URL
    const existingCard = await prisma.public_cards.findFirst({
      where: {
        user_id: userId,
        status: CardStatus.ACTIVE,
        affiliate_url: {
          contains: normalizedUrl
        }
      }
    });

    // If not found by contains, try exact match
    if (!existingCard) {
      const exactMatch = await prisma.public_cards.findFirst({
        where: {
          user_id: userId,
          status: CardStatus.ACTIVE,
          affiliate_url: affiliateUrl
        }
      });

      return {
        isDuplicate: !!exactMatch,
        existingCard: exactMatch
      };
    }

    return {
      isDuplicate: true,
      existingCard
    };
  }

  /**
   * Normalize URL for duplicate comparison
   * Removes common tracking parameters and normalizes the URL
   */
  private static normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
        'fbclid', 'gclid', 'ref', 'tag', 'aff', 'affiliate',
        'source', 'src', 'campaign'
      ];

      trackingParams.forEach(param => {
        parsed.searchParams.delete(param);
      });

      // Get the base URL without tracking params
      let normalized = `${parsed.hostname}${parsed.pathname}`;

      // Keep important product identifiers in query string
      const importantParams = ['id', 'product', 'item', 'sku', 'asin'];
      const keptParams: string[] = [];

      importantParams.forEach(param => {
        const value = parsed.searchParams.get(param);
        if (value) {
          keptParams.push(`${param}=${value}`);
        }
      });

      if (keptParams.length > 0) {
        normalized += `?${keptParams.join('&')}`;
      }

      // Remove trailing slash
      normalized = normalized.replace(/\/$/, '');

      return normalized;
    } catch {
      // If URL parsing fails, return original
      return url;
    }
  }

  /**
   * Create card
   */
  static async create(data: {
    userId: string;
    source: CardSource;
    marketplace: Marketplace;
    title: string;
    description?: string;
    price: string;
    originalPrice?: string;
    imageUrl: string;
    affiliateUrl: string;
    coupon?: string;
    category: string;
    metadata?: any;
  }) {
    const cardSlug = this.generateCardSlug(data.marketplace);

    return await prisma.public_cards.create({
      data: {
        user_id: data.userId,
        card_slug: cardSlug,
        source: data.source,
        marketplace: data.marketplace,
        title: data.title,
        description: data.description,
        price: data.price,
        original_price: data.originalPrice,
        image_url: data.imageUrl,
        affiliate_url: data.affiliateUrl,
        coupon: data.coupon,
        category: data.category,
        status: CardStatus.ACTIVE,
        metadata: data.metadata
      }
    });
  }

  /**
   * Update card
   */
  static async update(cardId: string, data: Partial<{
    title: string;
    description: string;
    price: string;
    originalPrice: string;
    imageUrl: string;
    affiliateUrl: string;
    coupon: string;
    category: string;
    status: CardStatus;
    metadata: any;
  }>) {
    const updateData: any = {};

    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.originalPrice !== undefined) updateData.original_price = data.originalPrice;
    if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;
    if (data.affiliateUrl !== undefined) updateData.affiliate_url = data.affiliateUrl;
    if (data.coupon !== undefined) updateData.coupon = data.coupon;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.metadata !== undefined) updateData.metadata = data.metadata;

    updateData.updated_at = new Date();

    return await prisma.public_cards.update({
      where: { id: cardId },
      data: updateData
    });
  }

  /**
   * Soft delete card (set status to HIDDEN)
   */
  static async delete(cardId: string) {
    return await prisma.public_cards.update({
      where: { id: cardId },
      data: {
        status: CardStatus.HIDDEN,
        updated_at: new Date()
      }
    });
  }

  /**
   * Generate unique card slug
   * Format: <marketplace>-<random12>
   */
  static generateCardSlug(marketplace: Marketplace): string {
    const prefix = marketplace.toLowerCase().replace('_', '-');
    const random = nanoid();
    return `${prefix}-${random}`;
  }

  /**
   * Get analytics for a card
   */
  static async getCardAnalytics(cardId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const events = await prisma.public_events.groupBy({
      by: ['event_type'],
      where: {
        card_id: cardId,
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
}
