import { prisma } from '../../db/prisma.js';
import { subDays } from 'date-fns';
import { EventProcessorService } from './event-processor.service.js';
import { AuditService, AuditAction } from '../audit/audit.service.js';
import { KiwifyWebhookService, PROCESSING_STATUS, KiwifyEventPayload } from './kiwify-webhook.service.js';

export interface Discrepancy {
  type: 'event_without_payment' | 'payment_without_event' | 'status_mismatch';
  eventId?: string;
  paymentId?: string;
  transactionId?: string;
  details: string;
  createdAt: Date;
}

export interface DiscrepancyReport {
  eventsWithoutPayments: Discrepancy[];
  paymentsWithoutEvents: Discrepancy[];
  statusMismatches: Discrepancy[];
  totalDiscrepancies: number;
  periodDays: number;
  generatedAt: Date;
}

export class ReconciliationService {
  /**
   * Detect discrepancies between Kiwify events and payments
   * @param days Number of days to look back (default: 7)
   */
  static async detectDiscrepancies(days: number = 7): Promise<DiscrepancyReport> {
    const fromDate = subDays(new Date(), days);

    // Get all processed Kiwify events in the period
    const kiwifyEvents = await prisma.kiwify_events.findMany({
      where: {
        received_at: {
          gte: fromDate,
        },
        processing_status: PROCESSING_STATUS.PROCESSED,
        event_type: {
          in: ['PAYMENT_CONFIRMED', 'SUBSCRIPTION_RENEWED'],
        },
      },
    });

    // Get all payments in the period
    const payments = await prisma.payments.findMany({
      where: {
        created_at: {
          gte: fromDate,
        },
      },
    });

    // Build maps for comparison
    const eventsByTransactionId = new Map<string, typeof kiwifyEvents[0]>();
    for (const event of kiwifyEvents) {
      const payload = event.payload as KiwifyEventPayload;
      const transactionId = payload.transaction_id || payload.order_id || '';
      if (transactionId) {
        eventsByTransactionId.set(transactionId, event);
      }
    }

    const paymentsByTransactionId = new Map<string, typeof payments[0]>();
    for (const payment of payments) {
      if (payment.transaction_id) {
        paymentsByTransactionId.set(payment.transaction_id, payment);
      }
    }

    const eventsWithoutPayments: Discrepancy[] = [];
    const paymentsWithoutEvents: Discrepancy[] = [];
    const statusMismatches: Discrepancy[] = [];

    // Check events without payments
    for (const [transactionId, event] of eventsByTransactionId) {
      if (!paymentsByTransactionId.has(transactionId)) {
        eventsWithoutPayments.push({
          type: 'event_without_payment',
          eventId: event.event_id,
          transactionId,
          details: `Kiwify event ${event.event_id} (${event.event_type}) has no corresponding payment`,
          createdAt: event.received_at || new Date(),
        });
      }
    }

    // Check payments without events
    for (const [transactionId, payment] of paymentsByTransactionId) {
      if (!eventsByTransactionId.has(transactionId)) {
        paymentsWithoutEvents.push({
          type: 'payment_without_event',
          paymentId: payment.id,
          transactionId,
          details: `Payment ${payment.id} has no corresponding Kiwify event`,
          createdAt: payment.created_at,
        });
      }
    }

    // Check status mismatches
    for (const [transactionId, event] of eventsByTransactionId) {
      const payment = paymentsByTransactionId.get(transactionId);
      if (payment) {
        const payload = event.payload as KiwifyEventPayload;
        const eventStatus = payload.status?.toLowerCase();
        const paymentStatus = payment.status.toLowerCase();

        // Simple status comparison - extend as needed
        if (eventStatus === 'paid' && paymentStatus !== 'paid') {
          statusMismatches.push({
            type: 'status_mismatch',
            eventId: event.event_id,
            paymentId: payment.id,
            transactionId,
            details: `Status mismatch: Event shows '${eventStatus}' but payment shows '${paymentStatus}'`,
            createdAt: payment.created_at,
          });
        }
      }
    }

    const report: DiscrepancyReport = {
      eventsWithoutPayments,
      paymentsWithoutEvents,
      statusMismatches,
      totalDiscrepancies:
        eventsWithoutPayments.length +
        paymentsWithoutEvents.length +
        statusMismatches.length,
      periodDays: days,
      generatedAt: new Date(),
    };

    // Log the reconciliation run
    await AuditService.logAction({
      action: AuditAction.RECONCILIATION_RUN,
      entity_type: 'reconciliation',
      entity_id: 'system',
      metadata: {
        periodDays: days,
        totalDiscrepancies: report.totalDiscrepancies,
        eventsWithoutPayments: eventsWithoutPayments.length,
        paymentsWithoutEvents: paymentsWithoutEvents.length,
        statusMismatches: statusMismatches.length,
      },
    });

    // Log individual discrepancies if found
    if (report.totalDiscrepancies > 0) {
      await AuditService.logAction({
        action: AuditAction.RECONCILIATION_DISCREPANCY,
        entity_type: 'reconciliation',
        entity_id: 'system',
        metadata: {
          totalDiscrepancies: report.totalDiscrepancies,
          summary: {
            eventsWithoutPayments: eventsWithoutPayments.length,
            paymentsWithoutEvents: paymentsWithoutEvents.length,
            statusMismatches: statusMismatches.length,
          },
        },
      });
    }

    return report;
  }

  /**
   * Reprocess a Kiwify event
   */
  static async reprocessEvent(eventId: string): Promise<void> {
    // Reset processing status to pending
    await prisma.kiwify_events.update({
      where: { event_id: eventId },
      data: {
        processing_status: PROCESSING_STATUS.PENDING,
        processing_error: null,
        processed_at: null,
      },
    });

    // Process the event
    await EventProcessorService.processEvent(eventId);

    // Log audit
    await AuditService.logAction({
      action: AuditAction.EVENT_REPROCESSED,
      entity_type: 'kiwify_event',
      entity_id: eventId,
      metadata: { reprocessedAt: new Date() },
    });
  }

  /**
   * Rebuild payment record from Kiwify event
   */
  static async rebuildPaymentFromEvent(eventId: string) {
    const event = await prisma.kiwify_events.findUnique({
      where: { event_id: eventId },
    });

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    const payload = event.payload as KiwifyEventPayload;
    const data = KiwifyWebhookService.extractPayloadData(payload);

    // Find user
    let userId: string | null = null;

    if (data.customerId) {
      const subscription = await prisma.subscriptions.findFirst({
        where: { kiwify_customer_id: data.customerId },
      });
      userId = subscription?.user_id || null;
    }

    if (!userId && data.customerEmail) {
      const user = await prisma.user.findFirst({
        where: {
          email: {
            equals: data.customerEmail,
            mode: 'insensitive',
          },
        },
      });
      userId = user?.id || null;
    }

    if (!userId) {
      throw new Error(`User not found for event: ${eventId}`);
    }

    // Check if payment already exists
    const existingPayment = data.transactionId
      ? await prisma.payments.findFirst({
          where: { transaction_id: data.transactionId },
        })
      : null;

    let payment;

    if (existingPayment) {
      // Update existing payment
      payment = await prisma.payments.update({
        where: { id: existingPayment.id },
        data: {
          amount: data.amountCents / 100,
          status: 'paid',
          paid_at: event.received_at,
        },
      });
    } else {
      // Create new payment
      payment = await prisma.payments.create({
        data: {
          user_id: userId,
          provider: 'kiwify',
          amount: data.amountCents / 100,
          currency: 'BRL',
          status: 'paid',
          transaction_id: data.transactionId || null,
          paid_at: event.received_at,
        },
      });
    }

    // Log audit
    await AuditService.logAction({
      action: AuditAction.PAYMENT_REBUILT,
      entity_type: 'payment',
      entity_id: payment.id,
      before: existingPayment,
      after: payment,
      metadata: { fromEventId: eventId },
    });

    return payment;
  }

  /**
   * Get failed events for manual review
   */
  static async getFailedEvents(limit: number = 50) {
    return prisma.kiwify_events.findMany({
      where: {
        processing_status: PROCESSING_STATUS.ERROR,
      },
      orderBy: {
        received_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get event processing stats
   */
  static async getProcessingStats(days: number = 30) {
    const fromDate = subDays(new Date(), days);

    const [total, processed, pending, errors] = await Promise.all([
      prisma.kiwify_events.count({
        where: { received_at: { gte: fromDate } },
      }),
      prisma.kiwify_events.count({
        where: {
          received_at: { gte: fromDate },
          processing_status: PROCESSING_STATUS.PROCESSED,
        },
      }),
      prisma.kiwify_events.count({
        where: {
          received_at: { gte: fromDate },
          processing_status: PROCESSING_STATUS.PENDING,
        },
      }),
      prisma.kiwify_events.count({
        where: {
          received_at: { gte: fromDate },
          processing_status: PROCESSING_STATUS.ERROR,
        },
      }),
    ]);

    return {
      total,
      processed,
      pending,
      errors,
      successRate: total > 0 ? (processed / total) * 100 : 0,
      periodDays: days,
    };
  }
}
