import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the service
vi.mock('../../../src/db/prisma.js', () => ({
  prisma: {
    subscriptions: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    user_entitlements: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/billing/entitlement.service.js', () => ({
  EntitlementService: {
    createEntitlementsFromPlan: vi.fn(),
    revokeEntitlements: vi.fn(),
    hasValidPromoEntitlement: vi.fn(),
  },
}));

vi.mock('../../../src/services/audit/audit.service.js', () => ({
  AuditService: {
    logAction: vi.fn(),
  },
  AuditAction: {
    SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
    SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
    SUBSCRIPTION_GRACE_ENTERED: 'SUBSCRIPTION_GRACE_ENTERED',
    SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
    SUBSCRIPTION_REFUNDED: 'SUBSCRIPTION_REFUNDED',
    SUBSCRIPTION_CHARGEBACK: 'SUBSCRIPTION_CHARGEBACK',
    SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  },
}));

vi.mock('../../../src/constants/admin-enums.js', () => ({
  SUBSCRIPTION_STATUSES: {
    PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
    ACTIVE: 'ACTIVE',
    GRACE: 'GRACE',
    PAST_DUE: 'PAST_DUE',
    CANCELED: 'CANCELED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED',
    CHARGEBACK: 'CHARGEBACK',
  },
  ACTIVE_SUBSCRIPTION_STATUSES: ['ACTIVE', 'GRACE'],
}));

import { SubscriptionService } from '../../../src/services/billing/subscription.service.js';
import { prisma } from '../../../src/db/prisma.js';
import { EntitlementService } from '../../../src/services/billing/entitlement.service.js';
import { AuditService } from '../../../src/services/audit/audit.service.js';

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('hasAccess', () => {
    it('should return true for active subscription with valid expiration', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue({
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
        expires_at: futureDate,
        plans: { name: 'Pro' },
      } as any);

      const result = await SubscriptionService.hasAccess('user-123', 'PROMOCOES');
      expect(result).toBe(true);
    });

    it('should return true for subscription in grace period with valid grace_until', async () => {
      const pastExpiration = new Date();
      pastExpiration.setDate(pastExpiration.getDate() - 1);
      const futureGrace = new Date();
      futureGrace.setDate(futureGrace.getDate() + 2);

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue({
        id: 'sub-123',
        user_id: 'user-123',
        status: 'GRACE',
        expires_at: pastExpiration,
        grace_until: futureGrace,
        plans: { name: 'Pro' },
      } as any);

      const result = await SubscriptionService.hasAccess('user-123', 'PROMOCOES');
      expect(result).toBe(true);
    });

    it('should return false for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue({
        id: 'sub-123',
        user_id: 'user-123',
        status: 'EXPIRED',
        expires_at: pastDate,
        plans: { name: 'Pro' },
      } as any);
      vi.mocked(EntitlementService.hasValidPromoEntitlement).mockResolvedValue(false);

      const result = await SubscriptionService.hasAccess('user-123', 'PROMOCOES');
      expect(result).toBe(false);
    });

    it('should check promo entitlements when subscription does not grant access', async () => {
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);
      vi.mocked(EntitlementService.hasValidPromoEntitlement).mockResolvedValue(true);

      const result = await SubscriptionService.hasAccess('user-123', 'PROMOCOES');

      expect(result).toBe(true);
      expect(EntitlementService.hasValidPromoEntitlement).toHaveBeenCalledWith('user-123', 'PROMOCOES');
    });

    it('should return false when no subscription and no promo access', async () => {
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);
      vi.mocked(EntitlementService.hasValidPromoEntitlement).mockResolvedValue(false);

      const result = await SubscriptionService.hasAccess('user-123', 'PROMOCOES');
      expect(result).toBe(false);
    });
  });

  describe('getSubscription', () => {
    it('should return subscription with plan details', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
        plans: { id: 'plan-1', name: 'Pro' },
      };
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(mockSubscription as any);

      const result = await SubscriptionService.getSubscription('user-123');

      expect(result).toEqual(mockSubscription);
      expect(prisma.subscriptions.findUnique).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        include: { plans: true },
      });
    });

    it('should return null when no subscription exists', async () => {
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);

      const result = await SubscriptionService.getSubscription('user-123');
      expect(result).toBeNull();
    });
  });

  describe('activateSubscription', () => {
    it('should create new subscription when none exists', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const mockSubscription = {
        id: 'sub-new',
        user_id: 'user-123',
        plan_id: 'plan-1',
        status: 'ACTIVE',
        expires_at: expiresAt,
        plans: { name: 'Pro' },
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.subscriptions.upsert).mockResolvedValue(mockSubscription as any);

      const result = await SubscriptionService.activateSubscription(
        'user-123',
        'plan-1',
        expiresAt,
        { customerId: 'kiwify-cust-123', transactionId: 'txn-456' }
      );

      expect(result).toEqual(mockSubscription);
      expect(EntitlementService.createEntitlementsFromPlan).toHaveBeenCalledWith('user-123', 'plan-1');
      expect(AuditService.logAction).toHaveBeenCalled();
    });

    it('should update existing subscription', async () => {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const existingSubscription = {
        id: 'sub-existing',
        user_id: 'user-123',
        status: 'EXPIRED',
      };
      const updatedSubscription = {
        id: 'sub-existing',
        user_id: 'user-123',
        status: 'ACTIVE',
        expires_at: expiresAt,
        plans: { name: 'Pro' },
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.upsert).mockResolvedValue(updatedSubscription as any);

      const result = await SubscriptionService.activateSubscription('user-123', 'plan-1', expiresAt);

      expect(result).toEqual(updatedSubscription);
      expect(AuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBSCRIPTION_ACTIVATED',
          before: existingSubscription,
        })
      );
    });
  });

  describe('renewSubscription', () => {
    it('should update expiration date and set status to ACTIVE', async () => {
      const newExpiresAt = new Date();
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);
      const existingSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'GRACE',
        expires_at: new Date(),
      };
      const updatedSubscription = {
        ...existingSubscription,
        status: 'ACTIVE',
        expires_at: newExpiresAt,
        grace_until: null,
        plans: { name: 'Pro' },
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.update).mockResolvedValue(updatedSubscription as any);

      const result = await SubscriptionService.renewSubscription('user-123', newExpiresAt);

      expect(result).toEqual(updatedSubscription);
      expect(prisma.subscriptions.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: {
          status: 'ACTIVE',
          expires_at: newExpiresAt,
          grace_until: null,
        },
        include: { plans: true },
      });
    });

    it('should throw error when subscription not found', async () => {
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);

      await expect(SubscriptionService.renewSubscription('user-123', new Date())).rejects.toThrow(
        'Subscription not found'
      );
    });
  });

  describe('enterGracePeriod', () => {
    it('should set status to GRACE and calculate grace_until', async () => {
      const existingSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.update).mockResolvedValue({
        ...existingSubscription,
        status: 'GRACE',
        grace_until: expect.any(Date),
        plans: { name: 'Pro' },
      } as any);

      await SubscriptionService.enterGracePeriod('user-123');

      expect(prisma.subscriptions.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: {
          status: 'GRACE',
          grace_until: expect.any(Date),
        },
        include: { plans: true },
      });
    });
  });

  describe('refundSubscription', () => {
    it('should set status to REFUNDED and revoke PLAN_INCLUDED entitlements', async () => {
      const existingSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.update).mockResolvedValue({
        ...existingSubscription,
        status: 'REFUNDED',
        plans: { name: 'Pro' },
      } as any);

      await SubscriptionService.refundSubscription('user-123');

      expect(prisma.subscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'REFUNDED' }),
        })
      );
      expect(EntitlementService.revokeEntitlements).toHaveBeenCalledWith('user-123', 'PLAN_INCLUDED');
    });
  });

  describe('chargebackSubscription', () => {
    it('should set status to CHARGEBACK and revoke ALL entitlements', async () => {
      const existingSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.update).mockResolvedValue({
        ...existingSubscription,
        status: 'CHARGEBACK',
        plans: { name: 'Pro' },
      } as any);

      await SubscriptionService.chargebackSubscription('user-123');

      expect(prisma.subscriptions.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CHARGEBACK' }),
        })
      );
      // Revoke ALL entitlements (no source filter)
      expect(EntitlementService.revokeEntitlements).toHaveBeenCalledWith('user-123');
    });
  });

  describe('cancelSubscription', () => {
    it('should set status to CANCELED (user keeps access until expires_at)', async () => {
      const existingSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        status: 'ACTIVE',
      };

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(existingSubscription as any);
      vi.mocked(prisma.subscriptions.update).mockResolvedValue({
        ...existingSubscription,
        status: 'CANCELED',
        plans: { name: 'Pro' },
      } as any);

      await SubscriptionService.cancelSubscription('user-123');

      expect(prisma.subscriptions.update).toHaveBeenCalledWith({
        where: { user_id: 'user-123' },
        data: { status: 'CANCELED' },
        include: { plans: true },
      });
      // Should NOT revoke entitlements immediately
      expect(EntitlementService.revokeEntitlements).not.toHaveBeenCalled();
    });
  });

  describe('hasActiveSubscription', () => {
    it('should return true for active subscription with valid expiration', async () => {
      const futureDate = new Date();
      futureDate.setMonth(futureDate.getMonth() + 1);

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue({
        status: 'ACTIVE',
        expires_at: futureDate,
      } as any);

      const result = await SubscriptionService.hasActiveSubscription('user-123');
      expect(result).toBe(true);
    });

    it('should return false when no subscription', async () => {
      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue(null);

      const result = await SubscriptionService.hasActiveSubscription('user-123');
      expect(result).toBe(false);
    });

    it('should return false for expired subscription', async () => {
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);

      vi.mocked(prisma.subscriptions.findUnique).mockResolvedValue({
        status: 'ACTIVE',
        expires_at: pastDate,
      } as any);

      const result = await SubscriptionService.hasActiveSubscription('user-123');
      expect(result).toBe(false);
    });
  });
});
