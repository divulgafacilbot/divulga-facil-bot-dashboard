import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';

// Mock prisma before importing the service
vi.mock('../../../src/db/prisma.js', () => ({
  prisma: {
    kiwify_events: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { KiwifyWebhookService, PROCESSING_STATUS, EVENT_TYPE_NORMALIZATION } from '../../../src/services/billing/kiwify-webhook.service.js';
import { prisma } from '../../../src/db/prisma.js';

describe('KiwifyWebhookService', () => {
  const mockSecret = 'test-webhook-secret-123';

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.KIWIFY_WEBHOOK_SECRET = mockSecret;
  });

  afterEach(() => {
    delete process.env.KIWIFY_WEBHOOK_SECRET;
  });

  describe('validateSignature', () => {
    it('should return true for valid signature', () => {
      const payload = '{"order_id":"123"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signedPayload = `${timestamp}.${payload}`;
      const signature = crypto
        .createHmac('sha256', mockSecret)
        .update(signedPayload)
        .digest('hex');

      const result = KiwifyWebhookService.validateSignature(payload, signature, timestamp);
      expect(result).toBe(true);
    });

    it('should return false for invalid signature', () => {
      const payload = '{"order_id":"123"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const invalidSignature = 'invalid-signature';

      const result = KiwifyWebhookService.validateSignature(payload, invalidSignature, timestamp);
      expect(result).toBe(false);
    });

    it('should return false when secret is not configured', () => {
      delete process.env.KIWIFY_WEBHOOK_SECRET;

      const payload = '{"order_id":"123"}';
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = 'any-signature';

      const result = KiwifyWebhookService.validateSignature(payload, signature, timestamp);
      expect(result).toBe(false);
    });

    it('should return false for empty inputs', () => {
      expect(KiwifyWebhookService.validateSignature('', 'sig', '123')).toBe(false);
      expect(KiwifyWebhookService.validateSignature('payload', '', '123')).toBe(false);
      expect(KiwifyWebhookService.validateSignature('payload', 'sig', '')).toBe(false);
    });
  });

  describe('isTimestampValid', () => {
    it('should return true for recent timestamp', () => {
      const recentTimestamp = Math.floor(Date.now() / 1000).toString();
      expect(KiwifyWebhookService.isTimestampValid(recentTimestamp)).toBe(true);
    });

    it('should return false for old timestamp (> 5 minutes)', () => {
      const oldTimestamp = Math.floor((Date.now() - 6 * 60 * 1000) / 1000).toString();
      expect(KiwifyWebhookService.isTimestampValid(oldTimestamp)).toBe(false);
    });

    it('should return false for future timestamp beyond tolerance', () => {
      const futureTimestamp = Math.floor((Date.now() + 10 * 60 * 1000) / 1000).toString();
      expect(KiwifyWebhookService.isTimestampValid(futureTimestamp)).toBe(false);
    });

    it('should handle custom tolerance', () => {
      const timestamp = Math.floor((Date.now() - 8 * 60 * 1000) / 1000).toString();
      // Should fail with default 5 minute tolerance
      expect(KiwifyWebhookService.isTimestampValid(timestamp)).toBe(false);
      // Should pass with 10 minute tolerance
      expect(KiwifyWebhookService.isTimestampValid(timestamp, 10 * 60 * 1000)).toBe(true);
    });

    it('should return false for invalid timestamp', () => {
      expect(KiwifyWebhookService.isTimestampValid('invalid')).toBe(false);
    });
  });

  describe('normalizeEventType', () => {
    it('should normalize order_paid to PAYMENT_CONFIRMED', () => {
      expect(KiwifyWebhookService.normalizeEventType('order_paid')).toBe('PAYMENT_CONFIRMED');
      expect(KiwifyWebhookService.normalizeEventType('order.paid')).toBe('PAYMENT_CONFIRMED');
      expect(KiwifyWebhookService.normalizeEventType('purchase')).toBe('PAYMENT_CONFIRMED');
    });

    it('should normalize subscription.renewed to SUBSCRIPTION_RENEWED', () => {
      expect(KiwifyWebhookService.normalizeEventType('subscription.renewed')).toBe('SUBSCRIPTION_RENEWED');
      expect(KiwifyWebhookService.normalizeEventType('subscription_renewed')).toBe('SUBSCRIPTION_RENEWED');
    });

    it('should normalize refund events', () => {
      expect(KiwifyWebhookService.normalizeEventType('refund')).toBe('REFUND');
      expect(KiwifyWebhookService.normalizeEventType('order.refunded')).toBe('REFUND');
    });

    it('should normalize chargeback events', () => {
      expect(KiwifyWebhookService.normalizeEventType('chargeback')).toBe('CHARGEBACK');
      expect(KiwifyWebhookService.normalizeEventType('order.chargeback')).toBe('CHARGEBACK');
    });

    it('should normalize cancellation events', () => {
      expect(KiwifyWebhookService.normalizeEventType('subscription.canceled')).toBe('SUBSCRIPTION_CANCELED');
      expect(KiwifyWebhookService.normalizeEventType('subscription_canceled')).toBe('SUBSCRIPTION_CANCELED');
    });

    it('should uppercase unknown event types', () => {
      expect(KiwifyWebhookService.normalizeEventType('custom_event')).toBe('CUSTOM_EVENT');
    });
  });

  describe('isEventProcessed', () => {
    it('should return true when event is processed', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue({
        processing_status: PROCESSING_STATUS.PROCESSED,
      } as any);

      const result = await KiwifyWebhookService.isEventProcessed('event-123');
      expect(result).toBe(true);
      expect(prisma.kiwify_events.findUnique).toHaveBeenCalledWith({
        where: { event_id: 'event-123' },
        select: { processing_status: true },
      });
    });

    it('should return false when event is pending', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue({
        processing_status: PROCESSING_STATUS.PENDING,
      } as any);

      const result = await KiwifyWebhookService.isEventProcessed('event-123');
      expect(result).toBe(false);
    });

    it('should return false when event does not exist', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue(null);

      const result = await KiwifyWebhookService.isEventProcessed('event-123');
      expect(result).toBe(false);
    });
  });

  describe('eventExists', () => {
    it('should return true when event exists', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue({
        id: 'some-id',
      } as any);

      const result = await KiwifyWebhookService.eventExists('event-123');
      expect(result).toBe(true);
    });

    it('should return false when event does not exist', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue(null);

      const result = await KiwifyWebhookService.eventExists('event-123');
      expect(result).toBe(false);
    });
  });

  describe('persistEvent', () => {
    const mockPayload = {
      event_id: 'event-123',
      customer_id: 'cust-456',
      customer_email: 'test@example.com',
    };
    const mockHeaders = {
      'x-kiwify-signature': 'sig',
      'x-kiwify-timestamp': '123',
    };

    it('should return existing event if already exists', async () => {
      const existingEvent = { id: 'existing-id', event_id: 'event-123' };
      vi.mocked(prisma.kiwify_events.findUnique)
        .mockResolvedValueOnce({ id: 'exists' } as any) // eventExists check
        .mockResolvedValueOnce(existingEvent as any); // return existing

      const result = await KiwifyWebhookService.persistEvent(
        'event-123',
        'order_paid',
        mockPayload,
        mockHeaders,
        'signature'
      );

      expect(result).toEqual(existingEvent);
      expect(prisma.kiwify_events.create).not.toHaveBeenCalled();
    });

    it('should create new event if it does not exist', async () => {
      const newEvent = { id: 'new-id', event_id: 'event-123' };
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.kiwify_events.create).mockResolvedValue(newEvent as any);

      const result = await KiwifyWebhookService.persistEvent(
        'event-123',
        'order_paid',
        mockPayload,
        mockHeaders,
        'signature'
      );

      expect(result).toEqual(newEvent);
      expect(prisma.kiwify_events.create).toHaveBeenCalledWith({
        data: {
          event_id: 'event-123',
          event_type: 'PAYMENT_CONFIRMED', // normalized
          payload: mockPayload,
          headers: mockHeaders,
          signature: 'signature',
          processing_status: PROCESSING_STATUS.PENDING,
        },
      });
    });
  });

  describe('updateProcessingStatus', () => {
    it('should update status to PROCESSED with processed_at', async () => {
      await KiwifyWebhookService.updateProcessingStatus('event-123', PROCESSING_STATUS.PROCESSED);

      expect(prisma.kiwify_events.update).toHaveBeenCalledWith({
        where: { event_id: 'event-123' },
        data: expect.objectContaining({
          processing_status: PROCESSING_STATUS.PROCESSED,
          processed_at: expect.any(Date),
          processing_error: null,
        }),
      });
    });

    it('should update status to ERROR with error message', async () => {
      await KiwifyWebhookService.updateProcessingStatus('event-123', PROCESSING_STATUS.ERROR, 'Some error');

      expect(prisma.kiwify_events.update).toHaveBeenCalledWith({
        where: { event_id: 'event-123' },
        data: expect.objectContaining({
          processing_status: PROCESSING_STATUS.ERROR,
          processing_error: 'Some error',
        }),
      });
    });
  });

  describe('getPendingEvents', () => {
    it('should return pending events ordered by received_at', async () => {
      const mockEvents = [{ id: '1' }, { id: '2' }];
      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockEvents as any);

      const result = await KiwifyWebhookService.getPendingEvents(50);

      expect(result).toEqual(mockEvents);
      expect(prisma.kiwify_events.findMany).toHaveBeenCalledWith({
        where: { processing_status: PROCESSING_STATUS.PENDING },
        orderBy: { received_at: 'asc' },
        take: 50,
      });
    });
  });

  describe('extractPayloadData', () => {
    it('should extract data from real nested Kiwify payload', () => {
      const payload = {
        signature: 'abc123',
        order: {
          order_id: 'ord_abc123',
          order_ref: 'REF123',
          order_status: 'paid',
          webhook_event_type: 'order_approved',
          created_at: '2025-01-15T10:00:00Z',
          approved_date: '2025-01-15T10:05:00Z',
          payment_method: 'credit_card',
          Product: {
            product_id: 'prod_xyz',
            product_name: 'Plano Pro Mensal',
          },
          Customer: {
            full_name: 'João Silva',
            first_name: 'João',
            email: 'joao@example.com',
            mobile: '+5511999999999',
            CPF: '12345678900',
          },
          Commissions: {
            charge_amount: 99.9,
            product_base_price: 97.0,
            currency: 'BRL',
          },
          Subscription: {
            status: 'active',
            customer_access: {
              access_until: '2025-02-15T10:00:00Z',
            },
            plan: {
              id: 'plan_123',
              name: 'Pro',
              frequency: 'monthly',
            },
          },
        },
      };

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.eventId).toBe('ord_abc123');
      expect(result.customerEmail).toBe('joao@example.com');
      expect(result.customerName).toBe('João Silva');
      expect(result.customerPhone).toBe('+5511999999999');
      expect(result.customerId).toBe('12345678900');
      expect(result.transactionId).toBe('ord_abc123');
      expect(result.productId).toBe('prod_xyz');
      expect(result.productName).toBe('Plano Pro Mensal');
      expect(result.amountCents).toBe(9990);
      expect(result.currency).toBe('BRL');
      expect(result.subscriptionStatus).toBe('active');
      expect(result.subscriptionExpiresAt).toBe('2025-02-15T10:00:00Z');
      expect(result.subscriptionPlanName).toBe('Pro');
      expect(result.paymentMethod).toBe('credit_card');
      expect(result.orderStatus).toBe('paid');
      expect(result.webhookEventType).toBe('order_approved');
      expect(result.approvedDate).toBe('2025-01-15T10:05:00Z');
    });

    it('should handle legacy flat payload format', () => {
      const payload = {
        event_id: 'evt-123',
        customer_id: 'cust-456',
        customer_email: 'test@example.com',
        transaction_id: 'txn-789',
        product_id: 'prod-001',
        amount_cents: 9900,
        subscription: {
          id: 'sub-123',
          status: 'active',
          expires_at: '2025-12-31',
        },
      };

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.eventId).toBe('evt-123');
      expect(result.customerId).toBe('cust-456');
      expect(result.customerEmail).toBe('test@example.com');
      expect(result.transactionId).toBe('txn-789');
      expect(result.productId).toBe('prod-001');
      expect(result.amountCents).toBe(9900);
      expect(result.subscriptionId).toBe('sub-123');
      expect(result.subscriptionStatus).toBe('active');
      expect(result.subscriptionExpiresAt).toBe('2025-12-31');
    });

    it('should handle missing fields gracefully', () => {
      const payload = {};

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.eventId).toBe('');
      expect(result.customerId).toBe('');
      expect(result.customerEmail).toBe('');
      expect(result.transactionId).toBe('');
      expect(result.productId).toBe('');
      expect(result.amountCents).toBe(0);
    });

    it('should convert amount to cents if amount_cents not provided', () => {
      const payload = { amount: 99.50 };

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.amountCents).toBe(9950);
    });

    it('should use order_id as fallback for eventId and transactionId', () => {
      const payload = { order_id: 'order-123' };

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.eventId).toBe('order-123');
      expect(result.transactionId).toBe('order-123');
    });

    it('should use product_base_price when charge_amount is not available', () => {
      const payload = {
        order: {
          order_id: 'ord_123',
          Commissions: {
            product_base_price: 49.9,
          },
        },
      };

      const result = KiwifyWebhookService.extractPayloadData(payload);

      expect(result.amountCents).toBe(4990);
    });
  });

  describe('extractEventType', () => {
    it('should extract event type from nested order.webhook_event_type', () => {
      const payload = {
        order: {
          webhook_event_type: 'order_approved',
          order_status: 'paid',
        },
      };

      expect(KiwifyWebhookService.extractEventType(payload)).toBe('order_approved');
    });

    it('should fallback to order.order_status when webhook_event_type is missing', () => {
      const payload = {
        order: {
          order_status: 'paid',
        },
      };

      expect(KiwifyWebhookService.extractEventType(payload)).toBe('paid');
    });

    it('should fallback to legacy status field', () => {
      const payload = {
        status: 'completed',
      };

      expect(KiwifyWebhookService.extractEventType(payload)).toBe('completed');
    });

    it('should return empty string when no event type available', () => {
      const payload = {};

      expect(KiwifyWebhookService.extractEventType(payload)).toBe('');
    });
  });

  describe('extractSignature', () => {
    it('should extract signature from body', () => {
      const payload = {
        signature: 'abc123xyz',
        order: {},
      };

      expect(KiwifyWebhookService.extractSignature(payload)).toBe('abc123xyz');
    });

    it('should return empty string when signature is missing', () => {
      const payload = {
        order: {},
      };

      expect(KiwifyWebhookService.extractSignature(payload)).toBe('');
    });
  });

  describe('normalizeEventType with order_approved', () => {
    it('should normalize order_approved to PAYMENT_CONFIRMED', () => {
      expect(KiwifyWebhookService.normalizeEventType('order_approved')).toBe('PAYMENT_CONFIRMED');
    });
  });
});
