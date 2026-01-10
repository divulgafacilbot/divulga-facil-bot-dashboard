/**
 * Card Service - Feature 7
 *
 * Consolidated card management with soft delete.
 * Never physical DELETE - always set status to HIDDEN.
 */

import { prisma } from '../db/prisma.js';
import { Marketplace, CardSource, CardStatus } from '@prisma/client';
import { sanitizeCardSlug, sanitizeText, sanitizeURL } from '../utils/sanitize.utils.js';

export interface CreateCardData {
  userId: string;
  cardSlug: string;
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
}

export interface UpdateCardData {
  title?: string;
  description?: string;
  price?: string;
  originalPrice?: string;
  imageUrl?: string;
  affiliateUrl?: string;
  coupon?: string;
  category?: string;
  status?: CardStatus;
  metadata?: any;
}

export class CardService {
  /**
   * Create a new card
   */
  static async createCard(data: CreateCardData) {
    // Sanitize inputs
    const sanitizedSlug = sanitizeCardSlug(data.cardSlug);
    if (!sanitizedSlug) {
      throw new Error('Invalid card slug');
    }

    const sanitizedAffiliateUrl = sanitizeURL(data.affiliateUrl, 1000);
    if (!sanitizedAffiliateUrl) {
      throw new Error('Invalid affiliate URL');
    }

    const sanitizedTitle = sanitizeText(data.title, 200);
    if (!sanitizedTitle) {
      throw new Error('Invalid title');
    }

    // Create card
    const card = await prisma.public_cards.create({
      data: {
        user_id: data.userId,
        card_slug: sanitizedSlug,
        source: data.source,
        marketplace: data.marketplace,
        title: sanitizedTitle,
        description: data.description ? sanitizeText(data.description, 1000) : undefined,
        price: data.price,
        original_price: data.originalPrice,
        image_url: sanitizeURL(data.imageUrl, 500) || data.imageUrl,
        affiliate_url: sanitizedAffiliateUrl,
        coupon: data.coupon ? sanitizeText(data.coupon, 100) : undefined,
        category: data.category,
        status: 'ACTIVE',
        metadata: data.metadata,
      },
    });

    return card;
  }

  /**
   * Update a card
   */
  static async updateCard(cardId: string, data: UpdateCardData) {
    // Build update data
    const updateData: any = {};

    if (data.title !== undefined) {
      const sanitized = sanitizeText(data.title, 200);
      if (sanitized) updateData.title = sanitized;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? sanitizeText(data.description, 1000) : null;
    }

    if (data.price !== undefined) {
      updateData.price = data.price;
    }

    if (data.originalPrice !== undefined) {
      updateData.original_price = data.originalPrice || null;
    }

    if (data.imageUrl !== undefined) {
      const sanitized = sanitizeURL(data.imageUrl, 500);
      if (sanitized) updateData.image_url = sanitized;
    }

    if (data.affiliateUrl !== undefined) {
      const sanitized = sanitizeURL(data.affiliateUrl, 1000);
      if (!sanitized) {
        throw new Error('Invalid affiliate URL');
      }
      updateData.affiliate_url = sanitized;
    }

    if (data.coupon !== undefined) {
      updateData.coupon = data.coupon ? sanitizeText(data.coupon, 100) : null;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;
    }

    if (data.metadata !== undefined) {
      updateData.metadata = data.metadata;
    }

    // Update card
    const card = await prisma.public_cards.update({
      where: { id: cardId },
      data: updateData,
    });

    return card;
  }

  /**
   * Hide a card (soft delete)
   * NEVER use physical DELETE
   */
  static async hideCard(cardId: string) {
    const card = await prisma.public_cards.update({
      where: { id: cardId },
      data: { status: 'HIDDEN' },
    });

    return card;
  }

  /**
   * Restore a hidden card
   */
  static async restoreCard(cardId: string) {
    const card = await prisma.public_cards.update({
      where: { id: cardId },
      data: { status: 'ACTIVE' },
    });

    return card;
  }

  /**
   * List cards for a user
   */
  static async listCards(options: {
    userId: string;
    status?: CardStatus | CardStatus[];
    marketplace?: Marketplace;
    category?: string;
    cursor?: string;
    limit?: number;
  }) {
    const where: any = {
      user_id: options.userId,
    };

    // Filter by status (default: only ACTIVE)
    if (options.status) {
      where.status = Array.isArray(options.status) ? { in: options.status } : options.status;
    } else {
      where.status = 'ACTIVE';
    }

    if (options.marketplace) {
      where.marketplace = options.marketplace;
    }

    if (options.category) {
      where.category = options.category;
    }

    // Cursor pagination
    const cursorConfig: any = options.cursor
      ? {
          skip: 1,
          cursor: { id: options.cursor },
        }
      : {};

    const cards = await prisma.public_cards.findMany({
      where,
      ...cursorConfig,
      orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
      take: options.limit || 24,
    });

    return {
      cards,
      nextCursor: cards.length === (options.limit || 24) ? cards[cards.length - 1].id : null,
    };
  }

  /**
   * Get a card by ID
   */
  static async getCardById(cardId: string, includeHidden: boolean = false) {
    const where: any = { id: cardId };

    if (!includeHidden) {
      where.status = 'ACTIVE';
    }

    const card = await prisma.public_cards.findFirst({
      where,
    });

    return card;
  }

  /**
   * Get a card by slug
   */
  static async getCardBySlug(userId: string, cardSlug: string, includeHidden: boolean = false) {
    const where: any = {
      user_id: userId,
      card_slug: cardSlug,
    };

    if (!includeHidden) {
      where.status = 'ACTIVE';
    }

    const card = await prisma.public_cards.findFirst({
      where,
    });

    return card;
  }

  /**
   * Get card count for a user
   */
  static async getCardCount(userId: string, status?: CardStatus) {
    const where: any = {
      user_id: userId,
    };

    if (status) {
      where.status = status;
    }

    const count = await prisma.public_cards.count({
      where,
    });

    return count;
  }

  /**
   * Permanently delete a card
   * This is a hard delete - cannot be recovered
   */
  static async deleteCard(cardId: string) {
    const card = await prisma.public_cards.delete({
      where: { id: cardId },
    });

    return card;
  }

  /**
   * Permanently delete hidden cards older than X days
   * (Only for housekeeping - not exposed to users)
   */
  static async permanentlyDeleteOldHiddenCards(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.public_cards.deleteMany({
      where: {
        status: 'HIDDEN',
        updated_at: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }
}
