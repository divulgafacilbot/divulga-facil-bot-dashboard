import { prisma } from '../../db/prisma.js';
import { KIWIFY_EVENT_TYPE_LABELS } from '../../constants/admin-enums.js';
import { subDays } from 'date-fns';

interface DateRange {
  fromDate?: Date;
  toDate?: Date;
}

interface GetPaymentsFilters {
  status?: string;
  userId?: string;
  provider?: string;
  fromDate?: Date;
  toDate?: Date;
}

interface Pagination {
  page?: number;
  limit?: number;
}

export class AdminFinanceService {
  /**
   * Get payments summary for a date range
   */
  static async getPaymentsSummary(dateRange: DateRange = {}) {
    const { fromDate, toDate } = dateRange;

    const where: any = {};

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) {
        where.created_at.gte = fromDate;
      }
      if (toDate) {
        where.created_at.lte = toDate;
      }
    }

    const [
      totalPayments,
      successfulPayments,
      totalRevenue,
      paymentsByStatus,
      recentPayments,
    ] = await Promise.all([
      prisma.payments.count({ where }),
      prisma.payments.count({ where: { ...where, status: 'paid' } }),
      prisma.payments.aggregate({
        where: { ...where, status: 'paid' },
        _sum: { amount: true },
      }),
      prisma.payments.groupBy({
        by: ['status'],
        where,
        _count: { id: true },
        _sum: { amount: true },
      }),
      prisma.payments.findMany({
        where,
        orderBy: { created_at: 'desc' },
        take: 10,
        include: {
          users: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      totalPayments,
      successfulPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      byStatus: paymentsByStatus.map((p) => ({
        status: p.status,
        count: p._count.id,
        amount: p._sum.amount || 0,
      })),
      recentPayments,
    };
  }

  /**
   * Get payments with filters and pagination
   */
  static async getPayments(filters: GetPaymentsFilters = {}, pagination: Pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.userId) {
      where.user_id = filters.userId;
    }

    if (filters.provider) {
      where.provider = filters.provider;
    }

    if (filters.fromDate || filters.toDate) {
      where.created_at = {};
      if (filters.fromDate) {
        where.created_at.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.created_at.lte = filters.toDate;
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payments.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      }),
      prisma.payments.count({ where }),
    ]);

    return {
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get Kiwify webhook events with filters and pagination
   */
  static async getKiwifyEvents(filters: DateRange = {}, pagination: Pagination = {}) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.fromDate || filters.toDate) {
      where.received_at = {};
      if (filters.fromDate) {
        where.received_at.gte = filters.fromDate;
      }
      if (filters.toDate) {
        where.received_at.lte = filters.toDate;
      }
    }

    const [events, total] = await Promise.all([
      prisma.kiwify_events.findMany({
        where,
        skip,
        take: limit,
        orderBy: { received_at: 'desc' },
      }),
      prisma.kiwify_events.count({ where }),
    ]);

    return {
      events: events.map((event) => ({
        ...event,
        event_type_label: KIWIFY_EVENT_TYPE_LABELS[event.event_type || ''] || event.event_type,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Reconcile a payment with a Kiwify event
   */
  static async reconcilePayment(
    paymentId: string,
    kiwifyEventId: string
  ) {
    // Get payment and event
    const [payment, kiwifyEvent] = await Promise.all([
      prisma.payments.findUnique({ where: { id: paymentId } }),
      prisma.kiwify_events.findUnique({ where: { id: kiwifyEventId } }),
    ]);

    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!kiwifyEvent) {
      throw new Error('Kiwify event not found');
    }

    return {
      success: true,
      payment,
      kiwifyEvent,
    };
  }

  /**
   * Detect payment discrepancies
   */
  static async detectDiscrepancies() {
    const thirtyDaysAgo = subDays(new Date(), 30);

    // Get all payments in the last 30 days
    const payments = await prisma.payments.findMany({
      where: {
        created_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Get all Kiwify events in the last 30 days
    const kiwifyEvents = await prisma.kiwify_events.findMany({
      where: {
        received_at: {
          gte: thirtyDaysAgo,
        },
      },
    });

    // Build maps for comparison
    const paymentsByTxId = new Map(
      payments
        .filter((p) => p.transaction_id)
        .map((p) => [p.transaction_id!, p])
    );

    const kiwifyEventsByEventId = new Map(
      kiwifyEvents.map((e) => [e.event_id, e])
    );

    const discrepancies = {
      paymentsWithoutKiwifyEvent: [] as any[],
      kiwifyEventsWithoutPayment: [] as any[],
      statusMismatches: [] as any[],
    };

    // Check payments without Kiwify events
    for (const payment of payments) {
      if (!payment.transaction_id) continue;

      if (!kiwifyEventsByEventId.has(payment.transaction_id)) {
        discrepancies.paymentsWithoutKiwifyEvent.push({
          paymentId: payment.id,
          transactionId: payment.transaction_id,
          amount: payment.amount,
          status: payment.status,
          createdAt: payment.created_at,
        });
      }
    }

    // Check Kiwify events without payments
    for (const event of kiwifyEvents) {
      if (!paymentsByTxId.has(event.event_id)) {
        discrepancies.kiwifyEventsWithoutPayment.push({
          eventId: event.event_id,
          eventType: event.event_type,
          eventTypeLabel: KIWIFY_EVENT_TYPE_LABELS[event.event_type || ''] || event.event_type,
          payload: event.payload,
          receivedAt: event.received_at,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Get detailed payment information
   */
  static async getPaymentDetail(paymentId: string) {
    const payment = await prisma.payments.findUnique({
      where: { id: paymentId },
      include: {
        users: {
          include: {
            subscriptions: {
              include: {
                plans: true,
              },
            },
          },
        },
        billing_disputes: true,
      },
    });

    if (!payment) {
      throw new Error('Payment not found');
    }

    // Try to find related Kiwify event
    let kiwifyEvent = null;
    if (payment.transaction_id) {
      kiwifyEvent = await prisma.kiwify_events.findFirst({
        where: { event_id: payment.transaction_id },
      });
    }

    return {
      payment,
      kiwifyEvent,
    };
  }
}
