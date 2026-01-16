import { prisma } from '../../db/prisma.js';
import { KiwifyWebhookService, PROCESSING_STATUS, KiwifyEventPayload } from './kiwify-webhook.service.js';
import { SubscriptionService } from './subscription.service.js';
import { EntitlementService } from './entitlement.service.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';
import { KiwifyProductsService } from '../admin/kiwify-products.service.js';
import { addMonths, addYears } from 'date-fns';

// Normalized event types
const EventTypes = {
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  REFUND: 'REFUND',
  CHARGEBACK: 'CHARGEBACK',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
} as const;

export class EventProcessorService {
  /**
   * Process a single event by ID
   */
  static async processEvent(eventId: string): Promise<void> {
    const event = await prisma.kiwify_events.findUnique({
      where: { event_id: eventId },
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // Skip if already processed
    if (event.processing_status === PROCESSING_STATUS.PROCESSED) {
      return;
    }

    try {
      const payload = event.payload as KiwifyEventPayload;
      const eventType = event.event_type;

      switch (eventType) {
        case EventTypes.PAYMENT_CONFIRMED:
          await this.handlePaymentConfirmed(payload, event.id);
          break;

        case EventTypes.SUBSCRIPTION_RENEWED:
          await this.handleRenewal(payload, event.id);
          break;

        case EventTypes.REFUND:
          await this.handleRefund(payload, event.id);
          break;

        case EventTypes.CHARGEBACK:
          await this.handleChargeback(payload, event.id);
          break;

        case EventTypes.SUBSCRIPTION_CANCELED:
          await this.handleCancellation(payload, event.id);
          break;

        default:
          console.warn(`Unknown event type: ${eventType}`);
      }

      // Mark as processed
      await KiwifyWebhookService.updateProcessingStatus(
        eventId,
        PROCESSING_STATUS.PROCESSED
      );

      await AuditService.logAction({
        action: AuditAction.WEBHOOK_PROCESSED,
        entity_type: 'kiwify_event',
        entity_id: event.id,
        metadata: { eventType },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark as error
      await KiwifyWebhookService.updateProcessingStatus(
        eventId,
        PROCESSING_STATUS.ERROR,
        errorMessage
      );

      await AuditService.logAction({
        action: AuditAction.WEBHOOK_FAILED,
        entity_type: 'kiwify_event',
        entity_id: event.id,
        metadata: { error: errorMessage },
      });

      throw error;
    }
  }

  /**
   * Handle payment confirmed event (new purchase)
   */
  static async handlePaymentConfirmed(payload: KiwifyEventPayload, internalEventId: string) {
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user by Kiwify customer ID or email
    let user = await this.findUserByKiwifyData(data.customerId, data.customerEmail);

    if (!user) {
      // User not found - store event for later matching
      console.warn(`User not found for customer: ${data.customerId} / ${data.customerEmail}`);
      return;
    }

    // Get product mapping to determine what was purchased
    // Try by product ID first, then by product name
    let productMapping = await KiwifyProductsService.getProductMapping(data.productId);

    if (!productMapping && data.productName) {
      productMapping = await KiwifyProductsService.getProductMappingByName(data.productName);
    }

    if (!productMapping) {
      console.warn(`No product mapping found for: ${data.productId} / ${data.productName}`);
      // Still create payment record
    }

    // Parse paid date from Kiwify payload
    const paidAt = data.approvedDate ? new Date(data.approvedDate) : new Date();

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        user_id: user.id,
        provider: 'kiwify',
        amount: data.amountCents / 100, // Convert cents to decimal
        currency: data.currency || 'BRL',
        status: 'paid',
        transaction_id: data.transactionId,
        paid_at: paidAt,
      },
    });

    await AuditService.logAction({
      actor_user_id: user.id,
      action: AuditAction.PAYMENT_CREATED,
      entity_type: 'payment',
      entity_id: payment.id,
      after: payment,
      metadata: {
        kiwifyEventId: internalEventId,
        productName: data.productName,
        paymentMethod: data.paymentMethod,
      },
    });

    // Handle based on product type
    if (productMapping) {
      switch (productMapping.kind) {
        case 'SUBSCRIPTION':
          if (productMapping.plan_id) {
            // Use expiration from Kiwify if available, otherwise calculate
            const expiresAt = data.subscriptionExpiresAt
              ? new Date(data.subscriptionExpiresAt)
              : this.calculateExpirationDate();

            await SubscriptionService.activateSubscription(
              user.id,
              productMapping.plan_id,
              expiresAt,
              {
                customerId: data.customerId,
                transactionId: data.transactionId,
              }
            );
          }
          break;

        case 'ADDON_MARKETPLACE':
          for (let i = 0; i < (productMapping.quantity || 1); i++) {
            await EntitlementService.addMarketplaceSlot(
              user.id,
              null,
              'ADDON_PURCHASED'
            );
          }
          break;

        case 'PROMO_TOKEN_PACK':
          // TODO: Implement promo token handling
          break;
      }
    } else if (data.subscriptionId || data.subscriptionPlanName) {
      // Fallback: If no product mapping but subscription data present
      // Try to find plan by name or default
      let plan = null;

      if (data.subscriptionPlanName) {
        plan = await prisma.plans.findFirst({
          where: {
            name: {
              contains: data.subscriptionPlanName,
              mode: 'insensitive',
            },
          },
        });
      }

      if (!plan) {
        plan = await prisma.plans.findFirst({
          orderBy: { created_at: 'asc' },
        });
      }

      if (plan) {
        const expiresAt = data.subscriptionExpiresAt
          ? new Date(data.subscriptionExpiresAt)
          : this.calculateExpirationDate();

        await SubscriptionService.activateSubscription(
          user.id,
          plan.id,
          expiresAt,
          {
            customerId: data.customerId,
            transactionId: data.transactionId,
          }
        );
      }
    }
  }

  /**
   * Handle subscription renewal
   */
  static async handleRenewal(payload: KiwifyEventPayload, internalEventId: string) {
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user
    const user = await this.findUserByKiwifyData(data.customerId, data.customerEmail);

    if (!user) {
      console.warn(`User not found for renewal: ${data.customerId}`);
      return;
    }

    // Calculate new expiration date
    const newExpiresAt = data.subscriptionExpiresAt
      ? new Date(data.subscriptionExpiresAt)
      : this.calculateExpirationDate();

    // Renew subscription
    await SubscriptionService.renewSubscription(user.id, newExpiresAt);

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        user_id: user.id,
        provider: 'kiwify',
        amount: data.amountCents / 100,
        currency: 'BRL',
        status: 'paid',
        transaction_id: data.transactionId,
        paid_at: new Date(),
      },
    });

    await AuditService.logAction({
      actor_user_id: user.id,
      action: AuditAction.PAYMENT_CREATED,
      entity_type: 'payment',
      entity_id: payment.id,
      after: payment,
      metadata: { type: 'renewal', kiwifyEventId: internalEventId },
    });
  }

  /**
   * Handle refund event
   */
  static async handleRefund(payload: KiwifyEventPayload, internalEventId: string) {
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user
    const user = await this.findUserByKiwifyData(data.customerId, data.customerEmail);

    if (!user) {
      console.warn(`User not found for refund: ${data.customerId}`);
      return;
    }

    // Update payment status
    if (data.transactionId) {
      const payment = await prisma.payments.findFirst({
        where: { transaction_id: data.transactionId },
      });

      if (payment) {
        await prisma.payments.update({
          where: { id: payment.id },
          data: { status: 'refunded' },
        });

        await AuditService.logAction({
          actor_user_id: user.id,
          action: AuditAction.PAYMENT_REFUNDED,
          entity_type: 'payment',
          entity_id: payment.id,
          before: payment,
          after: { ...payment, status: 'refunded' },
          metadata: { kiwifyEventId: internalEventId },
        });
      }
    }

    // Process subscription refund
    await SubscriptionService.refundSubscription(user.id);
  }

  /**
   * Handle chargeback event
   */
  static async handleChargeback(payload: KiwifyEventPayload, internalEventId: string) {
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user
    const user = await this.findUserByKiwifyData(data.customerId, data.customerEmail);

    if (!user) {
      console.warn(`User not found for chargeback: ${data.customerId}`);
      return;
    }

    // Update payment status
    if (data.transactionId) {
      const payment = await prisma.payments.findFirst({
        where: { transaction_id: data.transactionId },
      });

      if (payment) {
        await prisma.payments.update({
          where: { id: payment.id },
          data: { status: 'chargeback' },
        });

        await AuditService.logAction({
          action: AuditAction.PAYMENT_UPDATED,
          entity_type: 'payment',
          entity_id: payment.id,
          before: payment,
          after: { ...payment, status: 'chargeback' },
          metadata: { type: 'chargeback', kiwifyEventId: internalEventId },
        });
      }
    }

    // Process subscription chargeback
    await SubscriptionService.chargebackSubscription(user.id);
  }

  /**
   * Handle subscription cancellation
   */
  static async handleCancellation(payload: KiwifyEventPayload, internalEventId: string) {
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user
    const user = await this.findUserByKiwifyData(data.customerId, data.customerEmail);

    if (!user) {
      console.warn(`User not found for cancellation: ${data.customerId}`);
      return;
    }

    // Cancel subscription (user keeps access until expires_at)
    await SubscriptionService.cancelSubscription(user.id);
  }

  /**
   * Find user by Kiwify customer ID or email
   */
  private static async findUserByKiwifyData(
    customerId: string,
    customerEmail: string
  ) {
    // First try to find by Kiwify customer ID in subscription
    if (customerId) {
      const subscription = await prisma.subscriptions.findFirst({
        where: { kiwify_customer_id: customerId },
        include: { users: true },
      });

      if (subscription?.users) {
        return subscription.users;
      }
    }

    // Then try to find by email
    if (customerEmail) {
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: customerEmail,
            mode: 'insensitive',
          },
        },
      });

      if (user) {
        return user;
      }
    }

    return null;
  }

  /**
   * Calculate subscription expiration date
   * Default: 1 month from now for monthly, 1 year for annual
   */
  private static calculateExpirationDate(billingCycle: string = 'MONTHLY'): Date {
    const now = new Date();

    switch (billingCycle.toUpperCase()) {
      case 'YEARLY':
      case 'ANNUAL':
        return addYears(now, 1);
      case 'MONTHLY':
      default:
        return addMonths(now, 1);
    }
  }

  /**
   * Process all pending events
   */
  static async processPendingEvents(limit: number = 100): Promise<number> {
    const pendingEvents = await KiwifyWebhookService.getPendingEvents(limit);
    let processed = 0;

    for (const event of pendingEvents) {
      try {
        await this.processEvent(event.event_id);
        processed++;
      } catch (error) {
        console.error(`Failed to process event ${event.event_id}:`, error);
        // Continue with next event
      }
    }

    return processed;
  }
}
