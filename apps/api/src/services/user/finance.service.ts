import { prisma } from '../../db/prisma.js';

export class UserFinanceService {
  /**
   * Get subscription summary for user
   */
  static async getSubscriptionSummary(userId: string) {
    const subscription = await prisma.subscriptions.findUnique({
      where: { user_id: userId },
      include: {
        plans: true,
      },
    });

    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      plan: {
        name: subscription.plans?.name || 'Unknown',
        billing_cycle: subscription.plans?.billing_cycle || 'MONTHLY',
      },
      status: subscription.status,
      expires_at: subscription.expires_at,
      kiwify_customer_id: subscription.kiwify_customer_id,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };
  }

  /**
   * Get payment history for user
   */
  static async getPaymentHistory(userId: string) {
    return prisma.payments.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        amount: true,
        currency: true,
        status: true,
        transaction_id: true,
        paid_at: true,
        created_at: true,
        provider: true,
      },
    });
  }

  /**
   * Get payment status and any disputes
   */
  static async getPaymentStatus(userId: string) {
    const [lastPayment, disputes] = await Promise.all([
      prisma.payments.findFirst({
        where: { user_id: userId },
        orderBy: { created_at: 'desc' },
      }),
      prisma.billing_disputes.findMany({
        where: {
          user_id: userId,
          status: { not: 'resolved' },
        },
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return {
      lastPayment: lastPayment ? {
        id: lastPayment.id,
        amount: lastPayment.amount,
        status: lastPayment.status,
        paid_at: lastPayment.paid_at,
        created_at: lastPayment.created_at,
      } : null,
      disputes: disputes.map(d => ({
        id: d.id,
        issue_type: d.issue_type,
        description: d.description,
        status: d.status,
        created_at: d.created_at,
      })),
    };
  }
}
