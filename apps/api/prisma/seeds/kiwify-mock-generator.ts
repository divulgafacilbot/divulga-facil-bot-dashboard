import { faker } from '@faker-js/faker';
import { subDays } from 'date-fns';

/**
 * Generates realistic Kiwify mock data for the last 90 days
 * Includes:
 * - Webhook events (purchase, payment_confirmed, subscription_renewed, refund, chargeback)
 * - Corresponding payments
 * - Intentional discrepancies for testing reconciliation
 */

interface KiwifyEvent {
  eventId: string;
  type: 'purchase' | 'payment_confirmed' | 'subscription_renewed' | 'refund' | 'chargeback' | 'subscription_canceled';
  payload: any;
  receivedAt: Date;
}

interface Payment {
  userId: string;
  provider: 'kiwify';
  amount: number;
  currency: 'BRL';
  status: 'pending' | 'paid' | 'failed' | 'refunded' | 'chargeback';
  transactionId: string;
  paidAt: Date | null;
  createdAt: Date;
}

export class KiwifyMockGenerator {
  private readonly DAYS_TO_GENERATE = 30;
  private readonly EVENTS_PER_DAY = { min: 1, max: 3 };
  private readonly PLAN_PRICES: Record<string, number> = {
    'basic_monthly': 9.90,
    'basic_yearly': 99.00,
    'premium_monthly': 14.90,
    'premium_yearly': 149.00,
    'pro_monthly': 19.90,
    'pro_yearly': 199.00,
  };

  /**
   * Generate all mock data
   */
  public generate(): { events: KiwifyEvent[], payments: Payment[] } {
    const events: KiwifyEvent[] = [];
    const payments: Payment[] = [];
    const now = new Date();

    // Generate events for each day
    for (let dayOffset = 0; dayOffset < this.DAYS_TO_GENERATE; dayOffset++) {
      const date = subDays(now, dayOffset);
      const numEvents = faker.number.int(this.EVENTS_PER_DAY);

      for (let i = 0; i < numEvents; i++) {
        const event = this.generateEvent(date);
        events.push(event);

        // Generate corresponding payment (if applicable)
        if (['purchase', 'payment_confirmed', 'subscription_renewed'].includes(event.type)) {
          const payment = this.generatePayment(event);
          payments.push(payment);
        } else if (['refund', 'chargeback'].includes(event.type)) {
          const payment = this.generateRefundPayment(event);
          payments.push(payment);
        }
      }
    }

    // Add intentional discrepancies (10% of events)
    const discrepancyCount = Math.floor(events.length * 0.1);
    this.addDiscrepancies(events, payments, discrepancyCount);

    return { events, payments };
  }

  /**
   * Generate a single Kiwify event
   */
  private generateEvent(date: Date): KiwifyEvent {
    const eventTypes = [
      { type: 'purchase', weight: 40 },
      { type: 'payment_confirmed', weight: 30 },
      { type: 'subscription_renewed', weight: 20 },
      { type: 'refund', weight: 5 },
      { type: 'chargeback', weight: 3 },
      { type: 'subscription_canceled', weight: 2 },
    ];

    const type = this.weightedRandom(eventTypes);
    const planKey = this.randomPlanKey();

    return {
      eventId: `evt_${faker.string.alphanumeric(24)}`,
      type: type as any,
      payload: this.generateEventPayload(type, planKey),
      receivedAt: this.randomizeTime(date),
    };
  }

  /**
   * Generate event payload
   */
  private generateEventPayload(type: string, planKey: string) {
    const customerId = `cus_${faker.string.alphanumeric(16)}`;
    const transactionId = `txn_${faker.string.alphanumeric(20)}`;
    const amount = this.PLAN_PRICES[planKey];

    const basePayload = {
      customer: {
        id: customerId,
        email: faker.internet.email(),
        name: faker.person.fullName(),
      },
      product: {
        id: `prod_${planKey}`,
        name: this.getPlanName(planKey),
      },
      transaction: {
        id: transactionId,
        amount: amount,
        currency: 'BRL',
        status: type === 'payment_confirmed' ? 'paid' : 'pending',
      },
    };

    if (type === 'refund' || type === 'chargeback') {
      return {
        ...basePayload,
        reason: type === 'refund'
          ? faker.helpers.arrayElement(['customer_request', 'duplicate', 'fraud'])
          : 'chargeback_dispute',
        original_transaction_id: `txn_${faker.string.alphanumeric(20)}`,
      };
    }

    return basePayload;
  }

  /**
   * Generate payment from event
   */
  private generatePayment(event: KiwifyEvent): Payment {
    const userId = faker.string.uuid(); // In real scenario, would match existing users

    return {
      userId,
      provider: 'kiwify',
      amount: event.payload.transaction.amount,
      currency: 'BRL',
      status: event.type === 'payment_confirmed' ? 'paid' : 'pending',
      transactionId: event.payload.transaction.id,
      paidAt: event.type === 'payment_confirmed' ? event.receivedAt : null,
      createdAt: event.receivedAt,
    };
  }

  /**
   * Generate refund/chargeback payment
   */
  private generateRefundPayment(event: KiwifyEvent): Payment {
    const userId = faker.string.uuid();

    return {
      userId,
      provider: 'kiwify',
      amount: event.payload.transaction.amount,
      currency: 'BRL',
      status: event.type === 'refund' ? 'refunded' : 'chargeback',
      transactionId: event.payload.transaction.id,
      paidAt: event.receivedAt,
      createdAt: subDays(event.receivedAt, faker.number.int({ min: 18, max: 49 })),
    };
  }

  /**
   * Add intentional discrepancies for testing
   */
  private addDiscrepancies(
    events: KiwifyEvent[],
    payments: Payment[],
    count: number
  ) {
    for (let i = 0; i < count; i++) {
      const choice = faker.number.int({ min: 1, max: 3 });

      if (choice === 1) {
        // Payment without Kiwify event
        payments.push({
          userId: faker.string.uuid(),
          provider: 'kiwify',
          amount: 27.00,
          currency: 'BRL',
          status: 'paid',
          transactionId: `txn_orphan_${faker.string.alphanumeric(20)}`,
          paidAt: subDays(new Date(), faker.number.int({ min: 1, max: 90 })),
          createdAt: subDays(new Date(), faker.number.int({ min: 1, max: 90 })),
        });
      } else if (choice === 2 && events.length > 0) {
        // Kiwify event without payment (remove random payment)
        const randomIndex = faker.number.int({ min: 0, max: payments.length - 1 });
        payments.splice(randomIndex, 1);
      } else if (choice === 3 && payments.length > 0) {
        // Amount mismatch
        const randomPayment = payments[faker.number.int({ min: 0, max: payments.length - 1 })];
        randomPayment.amount = randomPayment.amount * 1.1; // 10% difference
      }
    }
  }

  /**
   * Helper: weighted random selection
   */
  private weightedRandom(items: { type: string, weight: number }[]): string {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = faker.number.float({ min: 0, max: totalWeight });

    for (const item of items) {
      if (random < item.weight) {
        return item.type;
      }
      random -= item.weight;
    }

    return items[0].type;
  }

  /**
   * Helper: random plan key
   */
  private randomPlanKey(): string {
    const keys = Object.keys(this.PLAN_PRICES);
    return keys[faker.number.int({ min: 0, max: keys.length - 1 })];
  }

  /**
   * Helper: get plan name
   */
  private getPlanName(planKey: string): string {
    const nameMap: Record<string, string> = {
      'basic_monthly': 'Plano Básico (Mensal)',
      'basic_yearly': 'Plano Básico (Anual)',
      'premium_monthly': 'Plano Premium (Mensal)',
      'premium_yearly': 'Plano Premium (Anual)',
      'pro_monthly': 'Plano Pro (Mensal)',
      'pro_yearly': 'Plano Pro (Anual)',
    };
    return nameMap[planKey] || planKey;
  }

  /**
   * Helper: randomize time within a day
   */
  private randomizeTime(date: Date): Date {
    const hour = faker.number.int({ min: 0, max: 23 });
    const minute = faker.number.int({ min: 0, max: 59 });
    const second = faker.number.int({ min: 0, max: 59 });

    const newDate = new Date(date);
    newDate.setHours(hour, minute, second);
    return newDate;
  }
}
