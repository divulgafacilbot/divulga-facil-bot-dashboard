import crypto from 'crypto';
import { prisma } from '../../db/prisma.js';

// Constants
const TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes

// Event type normalization map - maps Kiwify event types to internal types
export const EVENT_TYPE_NORMALIZATION: Record<string, string> = {
  // New Kiwify format (order.webhook_event_type)
  order_approved: 'PAYMENT_CONFIRMED',
  order_paid: 'PAYMENT_CONFIRMED',
  'order.paid': 'PAYMENT_CONFIRMED',
  purchase: 'PAYMENT_CONFIRMED',
  subscription_renewed: 'SUBSCRIPTION_RENEWED',
  'subscription.renewed': 'SUBSCRIPTION_RENEWED',
  subscription_renewal: 'SUBSCRIPTION_RENEWED',
  refund: 'REFUND',
  order_refunded: 'REFUND',
  'order.refunded': 'REFUND',
  chargeback: 'CHARGEBACK',
  order_chargeback: 'CHARGEBACK',
  'order.chargeback': 'CHARGEBACK',
  subscription_canceled: 'SUBSCRIPTION_CANCELED',
  'subscription.canceled': 'SUBSCRIPTION_CANCELED',
  subscription_cancelled: 'SUBSCRIPTION_CANCELED',
};

// Processing status constants
export const PROCESSING_STATUS = {
  PENDING: 'PENDING',
  PROCESSED: 'PROCESSED',
  ERROR: 'ERROR',
} as const;

export type ProcessingStatus = (typeof PROCESSING_STATUS)[keyof typeof PROCESSING_STATUS];

/**
 * Kiwify webhook payload structure (actual format from Kiwify)
 * The payload is nested under "order" object
 */
export interface KiwifyOrderData {
  order_id?: string;
  order_ref?: string;
  order_status?: string;
  product_type?: string;
  payment_method?: string;
  webhook_event_type?: string;
  created_at?: string;
  approved_date?: string;
  refunded_at?: string;
  subscription_id?: string;
  Product?: {
    product_id?: string;
    product_name?: string;
  };
  Customer?: {
    full_name?: string;
    first_name?: string;
    email?: string;
    mobile?: string;
    CPF?: string;
  };
  Commissions?: {
    charge_amount?: number;
    product_base_price?: number;
    currency?: string;
  };
  Subscription?: {
    start_date?: string;
    next_payment?: string;
    status?: string;
    customer_access?: {
      has_access?: boolean;
      active_period?: boolean;
      access_until?: string;
    };
    plan?: {
      id?: string;
      name?: string;
      frequency?: string;
    };
  };
}

export interface KiwifyEventPayload {
  // Signature at root level (Kiwify's format)
  signature?: string;
  url?: string;
  // Order data nested under "order"
  order?: KiwifyOrderData;
  // Legacy flat fields (for backwards compatibility)
  event_id?: string;
  order_id?: string;
  product_id?: string;
  customer_id?: string;
  customer_email?: string;
  transaction_id?: string;
  amount?: number;
  amount_cents?: number;
  status?: string;
  subscription?: {
    id?: string;
    status?: string;
    expires_at?: string;
  };
  [key: string]: unknown;
}

export interface WebhookHeaders {
  'x-kiwify-signature'?: string;
  'x-kiwify-timestamp'?: string;
  [key: string]: string | undefined;
}

export class KiwifyWebhookService {
  /**
   * Validate webhook signature using HMAC-SHA256
   * Algorithm: HMAC-SHA256(timestamp.payload, secret)
   */
  static validateSignature(
    payload: string,
    signature: string,
    timestamp: string
  ): boolean {
    const secret = process.env.KIWIFY_WEBHOOK_SECRET;

    if (!secret) {
      console.error('KIWIFY_WEBHOOK_SECRET not configured');
      return false;
    }

    if (!payload || !signature || !timestamp) {
      return false;
    }

    try {
      // Build the signed payload: timestamp.payload
      const signedPayload = `${timestamp}.${payload}`;

      // Generate expected signature
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Use constant-time comparison to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      console.error('Signature validation error:', error);
      return false;
    }
  }

  /**
   * Check if timestamp is within acceptable tolerance
   */
  static isTimestampValid(
    timestamp: string,
    toleranceMs: number = TIMESTAMP_TOLERANCE_MS
  ): boolean {
    try {
      const timestampMs = parseInt(timestamp, 10) * 1000; // Convert seconds to milliseconds
      const now = Date.now();
      const difference = Math.abs(now - timestampMs);

      return difference <= toleranceMs;
    } catch (error) {
      console.error('Timestamp validation error:', error);
      return false;
    }
  }

  /**
   * Normalize Kiwify event type to internal event type
   */
  static normalizeEventType(eventType: string): string {
    return EVENT_TYPE_NORMALIZATION[eventType] || eventType.toUpperCase();
  }

  /**
   * Check if event has already been processed (idempotency check)
   */
  static async isEventProcessed(eventId: string): Promise<boolean> {
    const existingEvent = await prisma.kiwify_events.findUnique({
      where: { event_id: eventId },
      select: { processing_status: true },
    });

    return existingEvent?.processing_status === PROCESSING_STATUS.PROCESSED;
  }

  /**
   * Check if event exists (for duplicate detection)
   */
  static async eventExists(eventId: string): Promise<boolean> {
    const existingEvent = await prisma.kiwify_events.findUnique({
      where: { event_id: eventId },
      select: { id: true },
    });

    return !!existingEvent;
  }

  /**
   * Persist webhook event to database (idempotent)
   * Returns the event if new, null if duplicate
   */
  static async persistEvent(
    eventId: string,
    eventType: string,
    payload: KiwifyEventPayload,
    headers: WebhookHeaders,
    signature: string
  ) {
    // Check if event already exists
    const exists = await this.eventExists(eventId);
    if (exists) {
      // Return existing event for idempotency
      return prisma.kiwify_events.findUnique({
        where: { event_id: eventId },
      });
    }

    // Normalize event type
    const normalizedEventType = this.normalizeEventType(eventType);

    // Create new event
    return prisma.kiwify_events.create({
      data: {
        event_id: eventId,
        event_type: normalizedEventType,
        payload: payload as object,
        headers: headers as object,
        signature,
        processing_status: PROCESSING_STATUS.PENDING,
      },
    });
  }

  /**
   * Update event processing status
   */
  static async updateProcessingStatus(
    eventId: string,
    status: ProcessingStatus,
    error?: string
  ) {
    return prisma.kiwify_events.update({
      where: { event_id: eventId },
      data: {
        processing_status: status,
        processed_at: status === PROCESSING_STATUS.PROCESSED ? new Date() : undefined,
        processing_error: error || null,
      },
    });
  }

  /**
   * Get pending events for processing
   */
  static async getPendingEvents(limit: number = 100) {
    return prisma.kiwify_events.findMany({
      where: {
        processing_status: PROCESSING_STATUS.PENDING,
      },
      orderBy: {
        received_at: 'asc',
      },
      take: limit,
    });
  }

  /**
   * Extract relevant data from webhook payload
   * Handles both nested (order.*) and flat formats for backwards compatibility
   */
  static extractPayloadData(payload: KiwifyEventPayload) {
    const order = payload.order;

    // If we have the nested order object (real Kiwify format), use it
    if (order) {
      return {
        eventId: order.order_id || order.order_ref || '',
        customerId: order.Customer?.CPF || '',
        customerEmail: order.Customer?.email || '',
        customerName: order.Customer?.full_name || order.Customer?.first_name || '',
        customerPhone: order.Customer?.mobile || '',
        transactionId: order.order_id || '',
        productId: order.Product?.product_id || '',
        productName: order.Product?.product_name || '',
        amountCents: order.Commissions?.charge_amount
          ? Math.round(order.Commissions.charge_amount * 100)
          : order.Commissions?.product_base_price
            ? Math.round(order.Commissions.product_base_price * 100)
            : 0,
        currency: order.Commissions?.currency || 'BRL',
        subscriptionId: order.subscription_id || order.Subscription?.plan?.id || '',
        subscriptionStatus: order.Subscription?.status || order.order_status || '',
        subscriptionExpiresAt: order.Subscription?.customer_access?.access_until || '',
        subscriptionPlanName: order.Subscription?.plan?.name || '',
        paymentMethod: order.payment_method || '',
        orderStatus: order.order_status || '',
        webhookEventType: order.webhook_event_type || '',
        createdAt: order.created_at || '',
        approvedDate: order.approved_date || '',
        refundedAt: order.refunded_at || '',
      };
    }

    // Legacy flat format (backwards compatibility)
    return {
      eventId: payload.event_id || payload.order_id || '',
      customerId: payload.customer_id || '',
      customerEmail: payload.customer_email || '',
      customerName: '',
      customerPhone: '',
      transactionId: payload.transaction_id || payload.order_id || '',
      productId: payload.product_id || '',
      productName: '',
      amountCents: payload.amount_cents || (payload.amount ? payload.amount * 100 : 0),
      currency: 'BRL',
      subscriptionId: payload.subscription?.id || '',
      subscriptionStatus: payload.subscription?.status || '',
      subscriptionExpiresAt: payload.subscription?.expires_at || '',
      subscriptionPlanName: '',
      paymentMethod: '',
      orderStatus: payload.status || '',
      webhookEventType: '',
      createdAt: '',
      approvedDate: '',
      refundedAt: '',
    };
  }

  /**
   * Extract event type from payload (handles both nested and flat formats)
   */
  static extractEventType(payload: KiwifyEventPayload): string {
    // Real Kiwify format: event type in order.webhook_event_type
    if (payload.order?.webhook_event_type) {
      return payload.order.webhook_event_type;
    }
    // Fallback to order status
    if (payload.order?.order_status) {
      return payload.order.order_status;
    }
    // Legacy format
    return payload.status || '';
  }

  /**
   * Extract signature from payload (Kiwify sends it in body, not headers)
   */
  static extractSignature(payload: KiwifyEventPayload): string {
    return payload.signature || '';
  }
}
