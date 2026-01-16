import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/prisma.js', () => ({
  prisma: {
    kiwify_events: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    payments: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    subscriptions: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../../../src/services/audit/audit.service.js', () => ({
  AuditService: {
    logAction: vi.fn(),
  },
  AuditAction: {
    RECONCILIATION_RUN: 'RECONCILIATION_RUN',
    RECONCILIATION_DISCREPANCY: 'RECONCILIATION_DISCREPANCY',
    EVENT_REPROCESSED: 'EVENT_REPROCESSED',
    PAYMENT_REBUILT: 'PAYMENT_REBUILT',
  },
}));

vi.mock('../../../src/services/billing/event-processor.service.js', () => ({
  EventProcessorService: {
    processEvent: vi.fn(),
  },
}));

vi.mock('../../../src/services/billing/kiwify-webhook.service.js', () => ({
  KiwifyWebhookService: {
    extractPayloadData: (payload: any) => ({
      customerId: payload?.customer_id || '',
      customerEmail: payload?.customer_email || '',
      transactionId: payload?.transaction_id || '',
      amountCents: payload?.amount_cents || 0,
    }),
  },
  PROCESSING_STATUS: {
    PENDING: 'PENDING',
    PROCESSED: 'PROCESSED',
    ERROR: 'ERROR',
  },
}));

import { ReconciliationService } from '../../../src/services/billing/reconciliation.service.js';
import { prisma } from '../../../src/db/prisma.js';
import { AuditService } from '../../../src/services/audit/audit.service.js';
import { EventProcessorService } from '../../../src/services/billing/event-processor.service.js';

describe('ReconciliationService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('detectDiscrepancies', () => {
    it('should detect events without corresponding payments', async () => {
      const mockEvents = [
        {
          event_id: 'evt-1',
          event_type: 'PAYMENT_CONFIRMED',
          payload: { transaction_id: 'txn-1', status: 'paid' },
          received_at: new Date(),
        },
      ];

      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockEvents as any);
      vi.mocked(prisma.payments.findMany).mockResolvedValue([]); // No payments

      const result = await ReconciliationService.detectDiscrepancies(7);

      expect(result.eventsWithoutPayments).toHaveLength(1);
      expect(result.eventsWithoutPayments[0].type).toBe('event_without_payment');
      expect(result.eventsWithoutPayments[0].transactionId).toBe('txn-1');
      expect(result.totalDiscrepancies).toBe(1);
    });

    it('should detect payments without corresponding events', async () => {
      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue([]);

      const mockPayments = [
        {
          id: 'pay-1',
          transaction_id: 'txn-orphan',
          status: 'paid',
          created_at: new Date(),
        },
      ];
      vi.mocked(prisma.payments.findMany).mockResolvedValue(mockPayments as any);

      const result = await ReconciliationService.detectDiscrepancies(7);

      expect(result.paymentsWithoutEvents).toHaveLength(1);
      expect(result.paymentsWithoutEvents[0].type).toBe('payment_without_event');
      expect(result.paymentsWithoutEvents[0].paymentId).toBe('pay-1');
    });

    it('should detect status mismatches', async () => {
      const mockEvents = [
        {
          event_id: 'evt-1',
          event_type: 'PAYMENT_CONFIRMED',
          payload: { transaction_id: 'txn-1', status: 'paid' },
          received_at: new Date(),
        },
      ];

      const mockPayments = [
        {
          id: 'pay-1',
          transaction_id: 'txn-1',
          status: 'pending', // Mismatch!
          created_at: new Date(),
        },
      ];

      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockEvents as any);
      vi.mocked(prisma.payments.findMany).mockResolvedValue(mockPayments as any);

      const result = await ReconciliationService.detectDiscrepancies(7);

      expect(result.statusMismatches).toHaveLength(1);
      expect(result.statusMismatches[0].type).toBe('status_mismatch');
      expect(result.statusMismatches[0].details).toContain("Event shows 'paid' but payment shows 'pending'");
    });

    it('should return empty report when everything is reconciled', async () => {
      const mockEvents = [
        {
          event_id: 'evt-1',
          event_type: 'PAYMENT_CONFIRMED',
          payload: { transaction_id: 'txn-1', status: 'paid' },
          received_at: new Date(),
        },
      ];

      const mockPayments = [
        {
          id: 'pay-1',
          transaction_id: 'txn-1',
          status: 'paid',
          created_at: new Date(),
        },
      ];

      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockEvents as any);
      vi.mocked(prisma.payments.findMany).mockResolvedValue(mockPayments as any);

      const result = await ReconciliationService.detectDiscrepancies(7);

      expect(result.totalDiscrepancies).toBe(0);
      expect(result.eventsWithoutPayments).toHaveLength(0);
      expect(result.paymentsWithoutEvents).toHaveLength(0);
      expect(result.statusMismatches).toHaveLength(0);
    });

    it('should log audit action for reconciliation run', async () => {
      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue([]);
      vi.mocked(prisma.payments.findMany).mockResolvedValue([]);

      await ReconciliationService.detectDiscrepancies(7);

      expect(AuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RECONCILIATION_RUN',
          entity_type: 'reconciliation',
          metadata: expect.objectContaining({
            periodDays: 7,
            totalDiscrepancies: 0,
          }),
        })
      );
    });

    it('should log discrepancy audit when discrepancies found', async () => {
      const mockEvents = [
        {
          event_id: 'evt-1',
          event_type: 'PAYMENT_CONFIRMED',
          payload: { transaction_id: 'txn-1' },
          received_at: new Date(),
        },
      ];

      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockEvents as any);
      vi.mocked(prisma.payments.findMany).mockResolvedValue([]);

      await ReconciliationService.detectDiscrepancies(7);

      // Should log both RECONCILIATION_RUN and RECONCILIATION_DISCREPANCY
      expect(AuditService.logAction).toHaveBeenCalledTimes(2);
    });
  });

  describe('reprocessEvent', () => {
    it('should reset event status and reprocess', async () => {
      vi.mocked(prisma.kiwify_events.update).mockResolvedValue({} as any);

      await ReconciliationService.reprocessEvent('evt-123');

      expect(prisma.kiwify_events.update).toHaveBeenCalledWith({
        where: { event_id: 'evt-123' },
        data: {
          processing_status: 'PENDING',
          processing_error: null,
          processed_at: null,
        },
      });
      expect(EventProcessorService.processEvent).toHaveBeenCalledWith('evt-123');
      expect(AuditService.logAction).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'EVENT_REPROCESSED',
          entity_type: 'kiwify_event',
          entity_id: 'evt-123',
        })
      );
    });
  });

  describe('rebuildPaymentFromEvent', () => {
    it('should throw error when event not found', async () => {
      vi.mocked(prisma.kiwify_events.findUnique).mockResolvedValue(null);

      await expect(ReconciliationService.rebuildPaymentFromEvent('invalid-evt')).rejects.toThrow(
        'Event not found: invalid-evt'
      );
    });

    // Note: rebuildPaymentFromEvent depends on the actual KiwifyWebhookService.extractPayloadData
    // implementation. Integration tests should cover the full flow.
  });

  describe('getFailedEvents', () => {
    it('should return failed events ordered by received_at desc', async () => {
      const mockFailedEvents = [
        { event_id: 'evt-1', processing_status: 'ERROR', received_at: new Date() },
        { event_id: 'evt-2', processing_status: 'ERROR', received_at: new Date() },
      ];

      vi.mocked(prisma.kiwify_events.findMany).mockResolvedValue(mockFailedEvents as any);

      const result = await ReconciliationService.getFailedEvents(50);

      expect(result).toEqual(mockFailedEvents);
      expect(prisma.kiwify_events.findMany).toHaveBeenCalledWith({
        where: { processing_status: 'ERROR' },
        orderBy: { received_at: 'desc' },
        take: 50,
      });
    });
  });

  describe('getProcessingStats', () => {
    it('should return processing statistics', async () => {
      // Mock count to return different values for each call
      const mockCount = vi.fn()
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(90) // processed
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(5); // errors

      (prisma.kiwify_events as any).count = mockCount;

      const result = await ReconciliationService.getProcessingStats(30);

      expect(result).toEqual({
        total: 100,
        processed: 90,
        pending: 5,
        errors: 5,
        successRate: 90,
        periodDays: 30,
      });
    });

    it('should return 0 success rate when no events', async () => {
      const mockCount = vi.fn().mockResolvedValue(0);
      (prisma.kiwify_events as any).count = mockCount;

      const result = await ReconciliationService.getProcessingStats(30);

      expect(result.successRate).toBe(0);
    });
  });
});
