import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('../../../src/db/prisma.js', () => ({
  prisma: {
    audit_logs: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    subscriptions: {
      findMany: vi.fn(),
    },
  },
}));

import { AuditService, AuditAction, AuditActionType } from '../../../src/services/audit/audit.service.js';
import { prisma } from '../../../src/db/prisma.js';

describe('AuditService', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('logAction', () => {
    it('should create audit log entry', async () => {
      vi.mocked(prisma.audit_logs.create).mockResolvedValue({} as any);

      await AuditService.logAction({
        actor_user_id: 'user-123',
        action: AuditAction.SUBSCRIPTION_ACTIVATED,
        entity_type: 'subscription',
        entity_id: 'sub-456',
        metadata: { source: 'kiwify' },
      });

      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: {
          actor_user_id: 'user-123',
          actor_admin_id: null,
          action: AuditAction.SUBSCRIPTION_ACTIVATED,
          entity_type: 'subscription',
          entity_id: 'sub-456',
          before: undefined,
          after: undefined,
          metadata: { source: 'kiwify' },
        },
      });
    });

    it('should log with admin actor', async () => {
      vi.mocked(prisma.audit_logs.create).mockResolvedValue({} as any);

      await AuditService.logAction({
        actor_admin_id: 'admin-123',
        action: AuditAction.ADMIN_USER_CREATED,
        entity_type: 'admin_user',
        entity_id: 'admin-new',
      });

      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actor_admin_id: 'admin-123',
          actor_user_id: null,
        }),
      });
    });

    it('should log before and after states', async () => {
      vi.mocked(prisma.audit_logs.create).mockResolvedValue({} as any);

      const before = { status: 'ACTIVE' };
      const after = { status: 'EXPIRED' };

      await AuditService.logAction({
        action: AuditAction.SUBSCRIPTION_EXPIRED,
        entity_type: 'subscription',
        entity_id: 'sub-123',
        before,
        after,
      });

      expect(prisma.audit_logs.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          before,
          after,
        }),
      });
    });

    it('should not throw on database error (non-blocking)', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.mocked(prisma.audit_logs.create).mockRejectedValue(new Error('DB Error'));

      // Should not throw
      await expect(
        AuditService.logAction({
          action: AuditAction.PAYMENT_CREATED,
          entity_type: 'payment',
          entity_id: 'pay-123',
        })
      ).resolves.toBeUndefined();

      expect(consoleSpy).toHaveBeenCalledWith('Failed to create audit log:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('getLogsForEntity', () => {
    it('should fetch logs for specific entity', async () => {
      const mockLogs = [
        { id: 'log-1', action: AuditAction.SUBSCRIPTION_ACTIVATED },
        { id: 'log-2', action: AuditAction.SUBSCRIPTION_RENEWED },
      ];

      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue(mockLogs as any);

      const result = await AuditService.getLogsForEntity('subscription', 'sub-123', 50);

      expect(result).toEqual(mockLogs);
      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith({
        where: {
          entity_type: 'subscription',
          entity_id: 'sub-123',
        },
        orderBy: { created_at: 'desc' },
        take: 50,
        include: {
          user: { select: { id: true, email: true } },
          admin: { select: { id: true, email: true, name: true } },
        },
      });
    });
  });

  describe('getLogs', () => {
    it('should fetch logs with filters', async () => {
      const mockLogs = [{ id: 'log-1' }];
      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue(mockLogs as any);
      vi.mocked(prisma.audit_logs.count).mockResolvedValue(1);

      const result = await AuditService.getLogs({
        action: AuditAction.PAYMENT_CREATED,
        entityType: 'payment',
        page: 1,
        limit: 20,
      });

      expect(result.logs).toEqual(mockLogs);
      expect(result.pagination).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            action: AuditAction.PAYMENT_CREATED,
            entity_type: 'payment',
          },
        })
      );
    });

    it('should filter by date range', async () => {
      const fromDate = new Date('2025-01-01');
      const toDate = new Date('2025-01-31');

      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue([]);
      vi.mocked(prisma.audit_logs.count).mockResolvedValue(0);

      await AuditService.getLogs({
        fromDate,
        toDate,
      });

      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            created_at: {
              gte: fromDate,
              lte: toDate,
            },
          },
        })
      );
    });

    it('should filter by actor user ID', async () => {
      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue([]);
      vi.mocked(prisma.audit_logs.count).mockResolvedValue(0);

      await AuditService.getLogs({
        actorUserId: 'user-123',
      });

      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            actor_user_id: 'user-123',
          },
        })
      );
    });

    it('should handle pagination correctly', async () => {
      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue([]);
      vi.mocked(prisma.audit_logs.count).mockResolvedValue(100);

      const result = await AuditService.getLogs({
        page: 3,
        limit: 20,
      });

      expect(result.pagination).toEqual({
        total: 100,
        page: 3,
        limit: 20,
        totalPages: 5,
      });
      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 40, // (3-1) * 20
          take: 20,
        })
      );
    });
  });

  describe('getAdminActivity', () => {
    it('should fetch recent admin activity', async () => {
      const mockActivity = [
        { id: 'log-1', action: AuditAction.ADMIN_USER_CREATED },
      ];

      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue(mockActivity as any);

      const result = await AuditService.getAdminActivity('admin-123', 20);

      expect(result).toEqual(mockActivity);
      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith({
        where: { actor_admin_id: 'admin-123' },
        orderBy: { created_at: 'desc' },
        take: 20,
      });
    });
  });

  describe('getUserActivity', () => {
    it('should fetch user activity including subscription-related logs', async () => {
      const mockSubscriptions = [{ id: 'sub-1' }, { id: 'sub-2' }];
      const mockActivity = [
        { id: 'log-1', action: AuditAction.SUBSCRIPTION_ACTIVATED },
      ];

      vi.mocked(prisma.subscriptions.findMany).mockResolvedValue(mockSubscriptions as any);
      vi.mocked(prisma.audit_logs.findMany).mockResolvedValue(mockActivity as any);

      const result = await AuditService.getUserActivity('user-123', 20);

      expect(result).toEqual(mockActivity);
      expect(prisma.audit_logs.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { actor_user_id: 'user-123' },
            {
              entity_type: 'subscription',
              entity_id: { in: ['sub-1', 'sub-2'] },
            },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: 20,
      });
    });
  });

  describe('AuditAction constants', () => {
    it('should have all expected action types', () => {
      expect(AuditAction.SUBSCRIPTION_ACTIVATED).toBe('SUBSCRIPTION_ACTIVATED');
      expect(AuditAction.SUBSCRIPTION_RENEWED).toBe('SUBSCRIPTION_RENEWED');
      expect(AuditAction.SUBSCRIPTION_GRACE_ENTERED).toBe('SUBSCRIPTION_GRACE_ENTERED');
      expect(AuditAction.SUBSCRIPTION_EXPIRED).toBe('SUBSCRIPTION_EXPIRED');
      expect(AuditAction.SUBSCRIPTION_REFUNDED).toBe('SUBSCRIPTION_REFUNDED');
      expect(AuditAction.SUBSCRIPTION_CHARGEBACK).toBe('SUBSCRIPTION_CHARGEBACK');
      expect(AuditAction.SUBSCRIPTION_CANCELED).toBe('SUBSCRIPTION_CANCELED');

      expect(AuditAction.ENTITLEMENT_CREATED).toBe('ENTITLEMENT_CREATED');
      expect(AuditAction.ENTITLEMENT_REVOKED).toBe('ENTITLEMENT_REVOKED');

      expect(AuditAction.PAYMENT_CREATED).toBe('PAYMENT_CREATED');
      expect(AuditAction.PAYMENT_UPDATED).toBe('PAYMENT_UPDATED');
      expect(AuditAction.PAYMENT_REFUNDED).toBe('PAYMENT_REFUNDED');

      expect(AuditAction.WEBHOOK_RECEIVED).toBe('WEBHOOK_RECEIVED');
      expect(AuditAction.WEBHOOK_PROCESSED).toBe('WEBHOOK_PROCESSED');
      expect(AuditAction.WEBHOOK_FAILED).toBe('WEBHOOK_FAILED');

      expect(AuditAction.RECONCILIATION_RUN).toBe('RECONCILIATION_RUN');
      expect(AuditAction.RECONCILIATION_DISCREPANCY).toBe('RECONCILIATION_DISCREPANCY');
      expect(AuditAction.EVENT_REPROCESSED).toBe('EVENT_REPROCESSED');
      expect(AuditAction.PAYMENT_REBUILT).toBe('PAYMENT_REBUILT');

      expect(AuditAction.JOB_EXECUTED).toBe('JOB_EXECUTED');
      expect(AuditAction.JOB_FAILED).toBe('JOB_FAILED');
    });
  });
});
