import { prisma } from '../../db/prisma.js';
import { SUBSCRIPTION_STATUSES, ACTIVE_SUBSCRIPTION_STATUSES } from '../../constants/admin-enums.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';
import { EntitlementService } from './entitlement.service.js';

// Grace period duration in days
const GRACE_PERIOD_DAYS = 3;

export interface SubscriptionData {
  userId: string;
  planId: string;
  expiresAt: Date;
  kiwifyCustomerId?: string;
  kiwifyTransactionId?: string;
}

export interface KiwifySubscriptionData {
  customerId: string;
  transactionId: string;
}

export class SubscriptionService {
  /**
   * SINGLE SOURCE OF TRUTH for access control
   * All bots and services MUST use this function to check access
   */
  static async hasAccess(userId: string, botType: string): Promise<boolean> {
    console.log('[SubscriptionService.hasAccess] userId:', userId, 'botType:', botType);

    // First, check subscription status
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: { plans: true },
    });

    console.log('[SubscriptionService.hasAccess] Subscription found:', subscription ? 'YES' : 'NO');

    if (subscription) {
      const status = subscription.status as string;
      const now = new Date();
      console.log('[SubscriptionService.hasAccess] Status:', status, 'expires_at:', subscription.expires_at);

      // Check if subscription is active or in grace period
      if (ACTIVE_SUBSCRIPTION_STATUSES.includes(status as typeof SUBSCRIPTION_STATUSES[keyof typeof SUBSCRIPTION_STATUSES])) {
        // Check expiration
        if (subscription.expires_at && subscription.expires_at > now) {
          console.log('[SubscriptionService.hasAccess] Active subscription - GRANTED');
          return true;
        }

        // Check grace period
        if (status === SUBSCRIPTION_STATUSES.GRACE && subscription.grace_until) {
          if (subscription.grace_until > now) {
            console.log('[SubscriptionService.hasAccess] Grace period - GRANTED');
            return true;
          }
        }
      }
    }

    // If subscription doesn't grant access, check for promo entitlements
    console.log('[SubscriptionService.hasAccess] Checking promo entitlements...');
    const hasPromo = await EntitlementService.hasValidPromoEntitlement(userId, botType);
    console.log('[SubscriptionService.hasAccess] hasValidPromoEntitlement result:', hasPromo);
    return hasPromo;
  }

  /**
   * Get user subscription with plan details
   */
  static async getSubscription(userId: string) {
    return prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: { plans: true },
    });
  }

  /**
   * Get subscription by Kiwify customer ID
   */
  static async getSubscriptionByKiwifyCustomerId(kiwifyCustomerId: string) {
    return prisma.subscriptions.findFirst({
      where: { kiwify_customer_id: kiwifyCustomerId },
      include: {
        plans: true,
        users: true,
      },
    });
  }

  /**
   * Activate a new subscription or update existing one
   */
  static async activateSubscription(
    userId: string,
    planId: string,
    expiresAt: Date,
    kiwifyData?: KiwifySubscriptionData
  ) {
    const existingSubscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    const previousState = existingSubscription ? { ...existingSubscription } : null;

    const subscription = await prisma.subscriptions.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        plan_id: planId,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expires_at: expiresAt,
        kiwify_customer_id: kiwifyData?.customerId,
        kiwify_transaction_id: kiwifyData?.transactionId,
      },
      update: {
        plan_id: planId,
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expires_at: expiresAt,
        grace_until: null, // Clear grace period on activation
        kiwify_customer_id: kiwifyData?.customerId || undefined,
        kiwify_transaction_id: kiwifyData?.transactionId || undefined,
      },
      include: { plans: true },
    });

    // Create entitlements from plan
    await EntitlementService.createEntitlementsFromPlan(userId, planId);

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_ACTIVATED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: subscription,
      metadata: { kiwifyData },
    });

    return subscription;
  }

  /**
   * Renew subscription - extend expiration date
   */
  static async renewSubscription(userId: string, newExpiresAt: Date) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };

    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.ACTIVE,
        expires_at: newExpiresAt,
        grace_until: null, // Clear grace period on renewal
      },
      include: { plans: true },
    });

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_RENEWED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
    });

    return updated;
  }

  /**
   * Enter grace period when subscription expires
   */
  static async enterGracePeriod(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };
    const graceUntil = new Date();
    graceUntil.setDate(graceUntil.getDate() + GRACE_PERIOD_DAYS);

    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.GRACE,
        grace_until: graceUntil,
      },
      include: { plans: true },
    });

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_GRACE_ENTERED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
    });

    return updated;
  }

  /**
   * Expire subscription after grace period
   */
  static async expireSubscription(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };

    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.EXPIRED,
        grace_until: null,
      },
      include: { plans: true },
    });

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_EXPIRED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
    });

    return updated;
  }

  /**
   * Process refund - revoke entitlements and update status
   */
  static async refundSubscription(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };

    // Update status to REFUNDED
    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.REFUNDED,
        grace_until: null,
      },
      include: { plans: true },
    });

    // Revoke all entitlements from this subscription
    await EntitlementService.revokeEntitlements(userId, 'PLAN_INCLUDED');

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_REFUNDED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
    });

    return updated;
  }

  /**
   * Process chargeback - revoke entitlements and flag account
   */
  static async chargebackSubscription(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };

    // Update status to CHARGEBACK
    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.CHARGEBACK,
        grace_until: null,
      },
      include: { plans: true },
    });

    // Revoke ALL entitlements (including addons)
    await EntitlementService.revokeEntitlements(userId);

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_CHARGEBACK,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
      metadata: { severity: 'HIGH' },
    });

    return updated;
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const previousState = { ...subscription };

    // User keeps access until expires_at, then enters grace period
    const updated = await prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        status: SUBSCRIPTION_STATUSES.CANCELED,
      },
      include: { plans: true },
    });

    // Log audit
    await AuditService.logAction({
      actor_user_id: userId,
      action: AuditAction.SUBSCRIPTION_CANCELED,
      entity_type: 'subscription',
      entity_id: subscription.id,
      before: previousState,
      after: updated,
    });

    return updated;
  }

  /**
   * Link Kiwify customer ID to user
   */
  static async linkKiwifyCustomer(userId: string, kiwifyCustomerId: string) {
    return prisma.subscriptions.update({
      where: { user_id: userId },
      data: {
        kiwify_customer_id: kiwifyCustomerId,
      },
    });
  }

  /**
   * Check if user has any active subscription
   */
  static async hasActiveSubscription(userId: string): Promise<boolean> {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
    });

    if (!subscription) return false;

    const status = subscription.status as string;
    const now = new Date();

    if (ACTIVE_SUBSCRIPTION_STATUSES.includes(status as typeof SUBSCRIPTION_STATUSES[keyof typeof SUBSCRIPTION_STATUSES])) {
      if (subscription.expires_at && subscription.expires_at > now) {
        return true;
      }
      if (status === SUBSCRIPTION_STATUSES.GRACE && subscription.grace_until && subscription.grace_until > now) {
        return true;
      }
    }

    return false;
  }
}
