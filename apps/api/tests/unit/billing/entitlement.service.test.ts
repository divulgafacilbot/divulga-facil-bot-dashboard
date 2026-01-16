import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/prisma.js', () => ({
  prisma: {
    plans: {
      findUnique: vi.fn(),
    },
    user_entitlements: {
      createMany: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/audit/audit.service.js', () => ({
  AuditService: {
    logAction: vi.fn(),
  },
  AuditAction: {
    ENTITLEMENT_CREATED: 'ENTITLEMENT_CREATED',
    ENTITLEMENT_REVOKED: 'ENTITLEMENT_REVOKED',
  },
}));

vi.mock('../../../src/constants/bot-types.js', () => ({
  BOT_TYPES: {
    ARTS: 'PROMOCOES',
    DOWNLOAD: 'DOWNLOAD',
    PINTEREST: 'PINTEREST',
    SUGGESTION: 'SUGGESTION',
  },
}));

import {
  EntitlementService,
  EntitlementType,
  EntitlementSource,
  EntitlementStatus,
} from '../../../src/services/billing/entitlement.service.js';
import { prisma } from '../../../src/db/prisma.js';
import { AuditService } from '../../../src/services/audit/audit.service.js';

describe('EntitlementService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('createEntitlementsFromPlan', () => {
    it('should create bot access entitlements based on plan configuration', async () => {
      const mockPlan = {
        id: 'plan-1',
        name: 'Pro',
        acesso_bot_geracao: true,
        acesso_bot_download: true,
        included_marketplaces_count: 2,
      };

      vi.mocked(prisma.plans.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue([]); // For revokeEntitlements
      vi.mocked(prisma.user_entitlements.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user_entitlements.createMany).mockResolvedValue({ count: 6 });

      await EntitlementService.createEntitlementsFromPlan('user-123', 'plan-1');

      // Should revoke existing plan entitlements first
      expect(prisma.user_entitlements.updateMany).toHaveBeenCalled();

      // Should create entitlements:
      // - ARTS access (acesso_bot_geracao = true)
      // - DOWNLOAD access (acesso_bot_download = true)
      // - PINTEREST access (always included)
      // - SUGGESTION access (always included)
      // - 2 marketplace slots
      expect(prisma.user_entitlements.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ bot_type: 'PROMOCOES', entitlement_type: EntitlementType.BOT_ACCESS }),
          expect.objectContaining({ bot_type: 'DOWNLOAD', entitlement_type: EntitlementType.BOT_ACCESS }),
          expect.objectContaining({ bot_type: 'PINTEREST', entitlement_type: EntitlementType.BOT_ACCESS }),
          expect.objectContaining({ bot_type: 'SUGGESTION', entitlement_type: EntitlementType.BOT_ACCESS }),
          expect.objectContaining({ entitlement_type: EntitlementType.MARKETPLACE_SLOT }),
          expect.objectContaining({ entitlement_type: EntitlementType.MARKETPLACE_SLOT }),
        ]),
      });
    });

    it('should only create Pinterest and Suggestion access when plan has no bot access flags', async () => {
      const mockPlan = {
        id: 'plan-1',
        name: 'Basic',
        acesso_bot_geracao: false,
        acesso_bot_download: false,
        included_marketplaces_count: 0,
      };

      vi.mocked(prisma.plans.findUnique).mockResolvedValue(mockPlan as any);
      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue([]); // For revokeEntitlements
      vi.mocked(prisma.user_entitlements.updateMany).mockResolvedValue({ count: 0 });
      vi.mocked(prisma.user_entitlements.createMany).mockResolvedValue({ count: 2 });

      await EntitlementService.createEntitlementsFromPlan('user-123', 'plan-1');

      const createCall = vi.mocked(prisma.user_entitlements.createMany).mock.calls[0][0];
      expect(createCall.data).toHaveLength(2); // Only Pinterest and Suggestion
    });

    it('should throw error when plan not found', async () => {
      vi.mocked(prisma.plans.findUnique).mockResolvedValue(null);

      await expect(EntitlementService.createEntitlementsFromPlan('user-123', 'invalid-plan')).rejects.toThrow(
        'Plan not found'
      );
    });
  });

  describe('addMarketplaceSlot', () => {
    it('should create a marketplace slot entitlement', async () => {
      const mockEntitlement = {
        id: 'ent-123',
        user_id: 'user-123',
        bot_type: 'ALL',
        entitlement_type: EntitlementType.MARKETPLACE_SLOT,
        source: EntitlementSource.ADDON_PURCHASED,
        marketplace: 'SHOPEE',
        status: EntitlementStatus.ACTIVE,
      };

      vi.mocked(prisma.user_entitlements.create).mockResolvedValue(mockEntitlement as any);

      const result = await EntitlementService.addMarketplaceSlot(
        'user-123',
        'SHOPEE',
        EntitlementSource.ADDON_PURCHASED
      );

      expect(result).toEqual(mockEntitlement);
      expect(prisma.user_entitlements.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          bot_type: 'ALL',
          entitlement_type: EntitlementType.MARKETPLACE_SLOT,
          source: EntitlementSource.ADDON_PURCHASED,
          marketplace: 'SHOPEE',
          status: EntitlementStatus.ACTIVE,
        },
      });
      expect(AuditService.logAction).toHaveBeenCalled();
    });
  });

  describe('addPromoAccess', () => {
    it('should create a promo access entitlement with expiration', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const mockEntitlement = {
        id: 'ent-123',
        user_id: 'user-123',
        bot_type: 'PROMOCOES',
        entitlement_type: EntitlementType.PROMO_ACCESS,
        source: EntitlementSource.PROMO,
        expires_at: expiresAt,
        status: EntitlementStatus.ACTIVE,
      };

      vi.mocked(prisma.user_entitlements.create).mockResolvedValue(mockEntitlement as any);

      const result = await EntitlementService.addPromoAccess('user-123', 'PROMOCOES', expiresAt);

      expect(result).toEqual(mockEntitlement);
      expect(prisma.user_entitlements.create).toHaveBeenCalledWith({
        data: {
          user_id: 'user-123',
          bot_type: 'PROMOCOES',
          entitlement_type: EntitlementType.PROMO_ACCESS,
          source: EntitlementSource.PROMO,
          expires_at: expiresAt,
          status: EntitlementStatus.ACTIVE,
        },
      });
    });
  });

  describe('revokeEntitlements', () => {
    it('should revoke all active entitlements when no source specified', async () => {
      const mockEntitlements = [
        { id: 'ent-1', status: EntitlementStatus.ACTIVE },
        { id: 'ent-2', status: EntitlementStatus.ACTIVE },
      ];

      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue(mockEntitlements as any);
      vi.mocked(prisma.user_entitlements.updateMany).mockResolvedValue({ count: 2 });

      await EntitlementService.revokeEntitlements('user-123');

      expect(prisma.user_entitlements.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          status: EntitlementStatus.ACTIVE,
        },
        data: { status: EntitlementStatus.REVOKED },
      });
    });

    it('should only revoke entitlements from specified source', async () => {
      const mockEntitlements = [{ id: 'ent-1', status: EntitlementStatus.ACTIVE }];

      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue(mockEntitlements as any);
      vi.mocked(prisma.user_entitlements.updateMany).mockResolvedValue({ count: 1 });

      await EntitlementService.revokeEntitlements('user-123', EntitlementSource.PLAN_INCLUDED);

      expect(prisma.user_entitlements.updateMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          status: EntitlementStatus.ACTIVE,
          source: EntitlementSource.PLAN_INCLUDED,
        },
        data: { status: EntitlementStatus.REVOKED },
      });
    });
  });

  describe('hasValidPromoEntitlement', () => {
    it('should return true when valid promo entitlement exists', async () => {
      vi.mocked(prisma.user_entitlements.findFirst).mockResolvedValue({
        id: 'ent-123',
        status: EntitlementStatus.ACTIVE,
      } as any);

      const result = await EntitlementService.hasValidPromoEntitlement('user-123', 'PROMOCOES');

      expect(result).toBe(true);
      expect(prisma.user_entitlements.findFirst).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          bot_type: 'PROMOCOES',
          entitlement_type: EntitlementType.PROMO_ACCESS,
          status: EntitlementStatus.ACTIVE,
          OR: [{ expires_at: null }, { expires_at: { gt: expect.any(Date) } }],
        },
      });
    });

    it('should return false when no valid promo entitlement', async () => {
      vi.mocked(prisma.user_entitlements.findFirst).mockResolvedValue(null);

      const result = await EntitlementService.hasValidPromoEntitlement('user-123', 'PROMOCOES');
      expect(result).toBe(false);
    });
  });

  describe('getUserEntitlements', () => {
    it('should return all active entitlements for user', async () => {
      const mockEntitlements = [
        { id: 'ent-1', bot_type: 'PROMOCOES', status: EntitlementStatus.ACTIVE },
        { id: 'ent-2', bot_type: 'DOWNLOAD', status: EntitlementStatus.ACTIVE },
      ];

      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue(mockEntitlements as any);

      const result = await EntitlementService.getUserEntitlements('user-123');

      expect(result).toEqual(mockEntitlements);
      expect(prisma.user_entitlements.findMany).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          status: EntitlementStatus.ACTIVE,
        },
        orderBy: { created_at: 'desc' },
      });
    });
  });

  describe('getMarketplaceCount', () => {
    it('should return count of active marketplace slots', async () => {
      vi.mocked(prisma.user_entitlements.count).mockResolvedValue(3);

      const result = await EntitlementService.getMarketplaceCount('user-123');

      expect(result).toBe(3);
      expect(prisma.user_entitlements.count).toHaveBeenCalledWith({
        where: {
          user_id: 'user-123',
          entitlement_type: EntitlementType.MARKETPLACE_SLOT,
          status: EntitlementStatus.ACTIVE,
        },
      });
    });
  });

  describe('hasBotEntitlement', () => {
    it('should return true when user has active bot entitlement', async () => {
      vi.mocked(prisma.user_entitlements.findFirst).mockResolvedValue({
        id: 'ent-123',
        status: EntitlementStatus.ACTIVE,
      } as any);

      const result = await EntitlementService.hasBotEntitlement('user-123', 'PROMOCOES');
      expect(result).toBe(true);
    });

    it('should return false when no bot entitlement', async () => {
      vi.mocked(prisma.user_entitlements.findFirst).mockResolvedValue(null);

      const result = await EntitlementService.hasBotEntitlement('user-123', 'PROMOCOES');
      expect(result).toBe(false);
    });
  });

  describe('cleanupExpiredEntitlements', () => {
    it('should revoke expired entitlements', async () => {
      const expiredEntitlements = [
        { id: 'ent-1', expires_at: new Date('2020-01-01'), status: EntitlementStatus.ACTIVE },
      ];

      vi.mocked(prisma.user_entitlements.findMany).mockResolvedValue(expiredEntitlements as any);
      vi.mocked(prisma.user_entitlements.updateMany).mockResolvedValue({ count: 1 });

      await EntitlementService.cleanupExpiredEntitlements();

      expect(prisma.user_entitlements.updateMany).toHaveBeenCalledWith({
        where: {
          status: EntitlementStatus.ACTIVE,
          expires_at: { lt: expect.any(Date) },
        },
        data: { status: EntitlementStatus.REVOKED },
      });
      expect(AuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ENTITLEMENT_REVOKED',
          metadata: { reason: 'expired' },
        })
      );
    });
  });
});
