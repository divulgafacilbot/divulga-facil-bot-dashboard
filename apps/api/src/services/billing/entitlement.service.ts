import { prisma } from '../../db/prisma.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';
import { BOT_TYPES } from '../../constants/bot-types.js';

// Entitlement type constants (matching Prisma enums)
export const EntitlementType = {
  MARKETPLACE_SLOT: 'MARKETPLACE_SLOT',
  PROMO_ACCESS: 'PROMO_ACCESS',
  BOT_ACCESS: 'BOT_ACCESS',
} as const;

export const EntitlementSource = {
  PLAN_INCLUDED: 'PLAN_INCLUDED',
  ADDON_PURCHASED: 'ADDON_PURCHASED',
  PROMO: 'PROMO',
} as const;

export const EntitlementStatus = {
  ACTIVE: 'ACTIVE',
  REVOKED: 'REVOKED',
} as const;

export type EntitlementTypeValue = (typeof EntitlementType)[keyof typeof EntitlementType];
export type EntitlementSourceValue = (typeof EntitlementSource)[keyof typeof EntitlementSource];
export type EntitlementStatusValue = (typeof EntitlementStatus)[keyof typeof EntitlementStatus];

export class EntitlementService {
  /**
   * Create entitlements from a plan
   * This includes bot access and marketplace slots based on plan configuration
   *
   * Bot access is granted based on plan flags:
   * - acesso_bot_geracao: Bot de Promoções (ARTS)
   * - acesso_bot_download: Bot de Download (DOWNLOAD)
   * - acesso_bot_pinterest: Bot de Pins (PINTEREST)
   * - acesso_bot_sugestoes: Bot de Sugestões (SUGGESTION)
   */
  static async createEntitlementsFromPlan(userId: string, planId: string) {
    // Get plan details
    const plan = await prisma.plans.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new Error('Plan not found');
    }

    const entitlements = [];

    // Create bot access entitlements based on plan flags
    if (plan.acesso_bot_geracao) {
      entitlements.push({
        user_id: userId,
        bot_type: BOT_TYPES.PROMOCOES,
        entitlement_type: EntitlementType.BOT_ACCESS,
        source: EntitlementSource.PLAN_INCLUDED,
        status: EntitlementStatus.ACTIVE,
      });
    }

    if (plan.acesso_bot_download) {
      entitlements.push({
        user_id: userId,
        bot_type: BOT_TYPES.DOWNLOAD,
        entitlement_type: EntitlementType.BOT_ACCESS,
        source: EntitlementSource.PLAN_INCLUDED,
        status: EntitlementStatus.ACTIVE,
      });
    }

    if (plan.acesso_bot_pinterest) {
      entitlements.push({
        user_id: userId,
        bot_type: BOT_TYPES.PINTEREST,
        entitlement_type: EntitlementType.BOT_ACCESS,
        source: EntitlementSource.PLAN_INCLUDED,
        status: EntitlementStatus.ACTIVE,
      });
    }

    if (plan.acesso_bot_sugestoes) {
      entitlements.push({
        user_id: userId,
        bot_type: BOT_TYPES.SUGGESTION,
        entitlement_type: EntitlementType.BOT_ACCESS,
        source: EntitlementSource.PLAN_INCLUDED,
        status: EntitlementStatus.ACTIVE,
      });
    }

    // Create marketplace slot entitlements based on plan
    const marketplaceCount = plan.included_marketplaces_count || 0;
    for (let i = 0; i < marketplaceCount; i++) {
      entitlements.push({
        user_id: userId,
        bot_type: 'ALL', // Marketplace slots are not bot-specific
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        source: EntitlementSource.PLAN_INCLUDED,
        status: EntitlementStatus.ACTIVE,
      });
    }

    // First, revoke existing plan entitlements to avoid duplicates
    await this.revokeEntitlements(userId, EntitlementSource.PLAN_INCLUDED);

    // Create new entitlements
    const created = await prisma.user_entitlements.createMany({
      data: entitlements,
    });

    // Log audit for each entitlement
    for (const entitlement of entitlements) {
      await AuditService.logAction({
        actor_user_id: userId,
        action: AuditAction.ENTITLEMENT_CREATED,
        entity_type: 'entitlement',
        entity_id: planId, // Using planId as entity_id since we don't have individual IDs yet
        after: entitlement,
        metadata: { planId },
      });
    }

    return created;
  }

  /**
   * Add a marketplace slot entitlement
   */
  static async addMarketplaceSlot(
    userId: string,
    marketplace: string | null,
    source: EntitlementSourceValue
  ) {
    const entitlement = await prisma.user_entitlements.create({
      data: {
        user_id: userId,
        bot_type: 'ALL',
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        source,
        marketplace,
        status: EntitlementStatus.ACTIVE,
      },
    });

    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.ENTITLEMENT_CREATED,
      entity_type: 'entitlement',
      entity_id: entitlement.id,
      after: entitlement,
      metadata: { marketplace, source },
    });

    return entitlement;
  }

  /**
   * Add promo access entitlement
   * @param expiresAt - Optional expiration date. If null/undefined, access is perpetual.
   */
  static async addPromoAccess(
    userId: string,
    botType: string,
    expiresAt?: Date | null
  ) {
    // Check if user already has an active promo entitlement for this bot
    const existingEntitlement = await prisma.user_entitlements.findFirst({
      where: {
        user_id: userId,
        bot_type: botType,
        entitlement_type: EntitlementType.PROMO_ACCESS,
        status: EntitlementStatus.ACTIVE,
      },
    });

    if (existingEntitlement) {
      console.log('[EntitlementService] User already has active promo entitlement for', botType);
      return existingEntitlement;
    }

    const entitlement = await prisma.user_entitlements.create({
      data: {
        user_id: userId,
        bot_type: botType,
        entitlement_type: EntitlementType.PROMO_ACCESS,
        source: EntitlementSource.PROMO,
        expires_at: expiresAt || null,
        status: EntitlementStatus.ACTIVE,
      },
    });

    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.ENTITLEMENT_CREATED,
      entity_type: 'entitlement',
      entity_id: entitlement.id,
      after: entitlement,
      metadata: { botType, expiresAt: expiresAt?.toISOString() || 'perpetual' },
    });

    console.log('[EntitlementService] Promo access created for user:', userId, 'botType:', botType);
    return entitlement;
  }

  /**
   * Revoke entitlements for a user
   * @param source - If provided, only revoke entitlements from this source
   */
  static async revokeEntitlements(userId: string, source?: EntitlementSourceValue) {
    const where: any = {
      user_id: userId,
      status: EntitlementStatus.ACTIVE,
    };

    if (source) {
      where.source = source;
    }

    // Get entitlements to revoke for audit
    const entitlementsToRevoke = await prisma.user_entitlements.findMany({
      where,
    });

    // Update status to REVOKED
    const result = await prisma.user_entitlements.updateMany({
      where,
      data: {
        status: EntitlementStatus.REVOKED,
      },
    });

    // Log audit for each revoked entitlement
    for (const entitlement of entitlementsToRevoke) {
      await AuditService.logAction({
        actor_user_id: userId,
        action: AuditAction.ENTITLEMENT_REVOKED,
        entity_type: 'entitlement',
        entity_id: entitlement.id,
        before: entitlement,
        after: { ...entitlement, status: EntitlementStatus.REVOKED },
        metadata: { source },
      });
    }

    return result;
  }

  /**
   * Check if user has a valid promo entitlement for a specific bot type
   */
  static async hasValidPromoEntitlement(userId: string, botType: string): Promise<boolean> {
    const now = new Date();
    console.log('[EntitlementService.hasValidPromoEntitlement] userId:', userId, 'botType:', botType);
    console.log('[EntitlementService.hasValidPromoEntitlement] Looking for entitlement_type:', EntitlementType.PROMO_ACCESS);

    const entitlement = await prisma.user_entitlements.findFirst({
      where: {
        user_id: userId,
        bot_type: botType,
        entitlement_type: EntitlementType.PROMO_ACCESS,
        status: EntitlementStatus.ACTIVE,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
    });

    console.log('[EntitlementService.hasValidPromoEntitlement] Entitlement found:', entitlement ? 'YES' : 'NO');
    if (entitlement) {
      console.log('[EntitlementService.hasValidPromoEntitlement] Entitlement details:', JSON.stringify(entitlement, null, 2));
    }

    return !!entitlement;
  }

  /**
   * Get all active entitlements for a user
   */
  static async getUserEntitlements(userId: string) {
    return prisma.user_entitlements.findMany({
      where: {
        user_id: userId,
        status: EntitlementStatus.ACTIVE,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  /**
   * Get marketplace slot count for a user
   */
  static async getMarketplaceCount(userId: string): Promise<number> {
    return prisma.user_entitlements.count({
      where: {
        user_id: userId,
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        status: EntitlementStatus.ACTIVE,
      },
    });
  }

  /**
   * Get bot access entitlements for a user
   */
  static async getBotAccessEntitlements(userId: string) {
    return prisma.user_entitlements.findMany({
      where: {
        user_id: userId,
        entitlement_type: {
          in: [EntitlementType.BOT_ACCESS, EntitlementType.PROMO_ACCESS],
        },
        status: EntitlementStatus.ACTIVE,
      },
    });
  }

  /**
   * Check if user has access to a specific bot type via entitlements
   * (not considering subscription - use SubscriptionService.hasAccess for full check)
   */
  static async hasBotEntitlement(userId: string, botType: string): Promise<boolean> {
    const now = new Date();

    const entitlement = await prisma.user_entitlements.findFirst({
      where: {
        user_id: userId,
        bot_type: botType,
        entitlement_type: {
          in: [EntitlementType.BOT_ACCESS, EntitlementType.PROMO_ACCESS],
        },
        status: EntitlementStatus.ACTIVE,
        OR: [
          { expires_at: null },
          { expires_at: { gt: now } },
        ],
      },
    });

    return !!entitlement;
  }

  /**
   * Cleanup expired entitlements (called by scheduler)
   */
  static async cleanupExpiredEntitlements() {
    const now = new Date();

    const expired = await prisma.user_entitlements.findMany({
      where: {
        status: EntitlementStatus.ACTIVE,
        expires_at: {
          lt: now,
        },
      },
    });

    const result = await prisma.user_entitlements.updateMany({
      where: {
        status: EntitlementStatus.ACTIVE,
        expires_at: {
          lt: now,
        },
      },
      data: {
        status: EntitlementStatus.REVOKED,
      },
    });

    // Log audit for expired entitlements
    for (const entitlement of expired) {
      await AuditService.logAction({
        action: AuditAction.ENTITLEMENT_REVOKED,
        entity_type: 'entitlement',
        entity_id: entitlement.id,
        before: entitlement,
        after: { ...entitlement, status: EntitlementStatus.REVOKED },
        metadata: { reason: 'expired' },
      });
    }

    return result;
  }

  /**
   * Get all marketplace slot entitlements for a user
   * Returns slots with their assigned marketplace (if any)
   */
  static async getMarketplaceSlots(userId: string) {
    return prisma.user_entitlements.findMany({
      where: {
        user_id: userId,
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        status: EntitlementStatus.ACTIVE,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
  }

  /**
   * Get list of marketplaces the user has selected/assigned to their slots
   */
  static async getSelectedMarketplaces(userId: string): Promise<string[]> {
    const slots = await this.getMarketplaceSlots(userId);
    return slots
      .filter((slot) => slot.marketplace !== null)
      .map((slot) => slot.marketplace as string);
  }

  /**
   * Select/assign marketplaces to user's slots
   * @param userId - User ID
   * @param marketplaces - Array of marketplace names to assign
   * @throws Error if user doesn't have enough slots or tries to select duplicate marketplaces
   */
  static async selectMarketplaces(userId: string, marketplaces: string[]) {
    // Get user's marketplace slots
    const slots = await this.getMarketplaceSlots(userId);

    if (marketplaces.length > slots.length) {
      throw new Error(
        `Você tem ${slots.length} slot(s) disponível(is), mas tentou selecionar ${marketplaces.length} marketplace(s)`
      );
    }

    // Check for duplicates in the request
    const uniqueMarketplaces = [...new Set(marketplaces)];
    if (uniqueMarketplaces.length !== marketplaces.length) {
      throw new Error('Não é possível selecionar o mesmo marketplace mais de uma vez');
    }

    // Clear all existing marketplace assignments first
    await prisma.user_entitlements.updateMany({
      where: {
        user_id: userId,
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        status: EntitlementStatus.ACTIVE,
      },
      data: {
        marketplace: null,
      },
    });

    // Assign marketplaces to slots (one by one)
    const updatedSlots = [];
    for (let i = 0; i < marketplaces.length; i++) {
      const slot = slots[i];
      const marketplace = marketplaces[i];

      const updated = await prisma.user_entitlements.update({
        where: { id: slot.id },
        data: { marketplace },
      });

      updatedSlots.push(updated);

      // Log audit
      await AuditService.logAction({
        actor_user_id: userId,
        action: AuditAction.ENTITLEMENT_UPDATED,
        entity_type: 'entitlement',
        entity_id: slot.id,
        before: { marketplace: slot.marketplace },
        after: { marketplace },
        metadata: { action: 'marketplace_selection' },
      });
    }

    return updatedSlots;
  }

  /**
   * Check if user has access to a specific marketplace
   * User has access if they have a slot assigned to that marketplace
   */
  static async hasMarketplaceAccess(userId: string, marketplace: string): Promise<boolean> {
    const slot = await prisma.user_entitlements.findFirst({
      where: {
        user_id: userId,
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        status: EntitlementStatus.ACTIVE,
        marketplace: marketplace,
      },
    });

    return !!slot;
  }

  /**
   * Get marketplace access summary for a user
   * Returns total slots, used slots, available slots, and selected marketplaces
   */
  static async getMarketplaceAccessSummary(userId: string) {
    const slots = await this.getMarketplaceSlots(userId);
    const selectedMarketplaces = slots
      .filter((slot) => slot.marketplace !== null)
      .map((slot) => slot.marketplace as string);

    return {
      totalSlots: slots.length,
      usedSlots: selectedMarketplaces.length,
      availableSlots: slots.length - selectedMarketplaces.length,
      selectedMarketplaces,
      slots: slots.map((slot) => ({
        id: slot.id,
        marketplace: slot.marketplace,
        source: slot.source,
      })),
    };
  }
}
