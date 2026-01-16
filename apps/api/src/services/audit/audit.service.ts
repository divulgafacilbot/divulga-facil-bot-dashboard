import { prisma } from '../../db/prisma.js';

// Audit action constants
export const AuditAction = {
  // Subscription actions
  SUBSCRIPTION_ACTIVATED: 'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
  SUBSCRIPTION_GRACE_ENTERED: 'SUBSCRIPTION_GRACE_ENTERED',
  SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_REFUNDED: 'SUBSCRIPTION_REFUNDED',
  SUBSCRIPTION_CHARGEBACK: 'SUBSCRIPTION_CHARGEBACK',
  SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',

  // Entitlement actions
  ENTITLEMENT_CREATED: 'ENTITLEMENT_CREATED',
  ENTITLEMENT_UPDATED: 'ENTITLEMENT_UPDATED',
  ENTITLEMENT_REVOKED: 'ENTITLEMENT_REVOKED',

  // Payment actions
  PAYMENT_CREATED: 'PAYMENT_CREATED',
  PAYMENT_UPDATED: 'PAYMENT_UPDATED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',

  // Admin actions
  ADMIN_USER_CREATED: 'ADMIN_USER_CREATED',
  ADMIN_USER_UPDATED: 'ADMIN_USER_UPDATED',
  ADMIN_USER_DEACTIVATED: 'ADMIN_USER_DEACTIVATED',
  ADMIN_PERMISSIONS_UPDATED: 'ADMIN_PERMISSIONS_UPDATED',

  // Webhook actions
  WEBHOOK_RECEIVED: 'WEBHOOK_RECEIVED',
  WEBHOOK_PROCESSED: 'WEBHOOK_PROCESSED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',

  // Reconciliation actions
  RECONCILIATION_RUN: 'RECONCILIATION_RUN',
  RECONCILIATION_DISCREPANCY: 'RECONCILIATION_DISCREPANCY',
  EVENT_REPROCESSED: 'EVENT_REPROCESSED',
  PAYMENT_REBUILT: 'PAYMENT_REBUILT',

  // Job actions
  JOB_EXECUTED: 'JOB_EXECUTED',
  JOB_FAILED: 'JOB_FAILED',
} as const;

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditLogParams {
  actor_user_id?: string;
  actor_admin_id?: string;
  action: AuditActionType;
  entity_type: string;
  entity_id: string;
  before?: object | null;
  after?: object | null;
  metadata?: object | null;
}

export class AuditService {
  /**
   * Log an audit action
   * Non-blocking - failures are logged but don't throw
   */
  static async logAction(params: AuditLogParams): Promise<void> {
    try {
      await prisma.audit_logs.create({
        data: {
          actor_user_id: params.actor_user_id || null,
          actor_admin_id: params.actor_admin_id || null,
          action: params.action,
          entity_type: params.entity_type,
          entity_id: params.entity_id,
          before: params.before ?? undefined,
          after: params.after ?? undefined,
          metadata: params.metadata ?? undefined,
        },
      });
    } catch (error) {
      // Log error but don't throw - audit logging should not block operations
      console.error('Failed to create audit log:', error);
    }
  }

  /**
   * Get audit logs for a specific entity
   */
  static async getLogsForEntity(entityType: string, entityId: string, limit = 50) {
    return prisma.audit_logs.findMany({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        admin: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  /**
   * Get audit logs with filters
   */
  static async getLogs(options: {
    action?: AuditActionType;
    entityType?: string;
    actorUserId?: string;
    actorAdminId?: string;
    fromDate?: Date;
    toDate?: Date;
    page?: number;
    limit?: number;
  }) {
    const {
      action,
      entityType,
      actorUserId,
      actorAdminId,
      fromDate,
      toDate,
      page = 1,
      limit = 20,
    } = options;

    const where: any = {};

    if (action) {
      where.action = action;
    }

    if (entityType) {
      where.entity_type = entityType;
    }

    if (actorUserId) {
      where.actor_user_id = actorUserId;
    }

    if (actorAdminId) {
      where.actor_admin_id = actorAdminId;
    }

    if (fromDate || toDate) {
      where.created_at = {};
      if (fromDate) {
        where.created_at.gte = fromDate;
      }
      if (toDate) {
        where.created_at.lte = toDate;
      }
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.audit_logs.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
          admin: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.audit_logs.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get recent admin activity
   */
  static async getAdminActivity(adminId: string, limit = 20) {
    return prisma.audit_logs.findMany({
      where: {
        actor_admin_id: adminId,
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get recent user activity
   */
  static async getUserActivity(userId: string, limit = 20) {
    return prisma.audit_logs.findMany({
      where: {
        OR: [
          { actor_user_id: userId },
          {
            entity_type: 'subscription',
            entity_id: {
              in: await prisma.subscriptions
                .findMany({
                  where: { user_id: userId },
                  select: { id: true },
                })
                .then((subs) => subs.map((s) => s.id)),
            },
          },
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
      take: limit,
    });
  }
}
