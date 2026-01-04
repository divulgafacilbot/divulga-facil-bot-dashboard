import { Router, Response } from 'express';
import { z } from 'zod';
import { AdminUsageService } from '../../services/admin/usage.service.js';
import { requireAdmin, requirePermission, AdminRequest } from '../../middleware/require-admin.middleware.js';

const router = Router();

// Validation schemas
const getUsersUsageQuerySchema = z.object({
  fromDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  toDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  userId: z.string().optional(),
  sortBy: z.enum(['renders', 'downloads', 'total']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

/**
 * GET /admin/usage
 * Get users usage data with filters and sorting
 */
router.get(
  '/',
  requireAdmin,
  requirePermission('usage'),
  async (req: AdminRequest, res: Response) => {
    try {
      const query = getUsersUsageQuerySchema.parse(req.query);

      const filters = {
        fromDate: query.fromDate,
        toDate: query.toDate,
        userId: query.userId,
      };

      const sort = {
        sortBy: query.sortBy,
        order: query.order,
      };

      const usageData = await AdminUsageService.getUsersUsage(filters, sort);

      res.json({
        success: true,
        data: usageData,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error fetching usage data:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/usage/alerts
 * Get usage abuse alerts - users exceeding their plan limits
 */
router.get(
  '/alerts',
  requireAdmin,
  requirePermission('usage'),
  async (req: AdminRequest, res: Response) => {
    try {
      const alerts = await AdminUsageService.getAbuseAlerts();

      res.json({
        success: true,
        data: alerts,
      });
    } catch (error) {
      console.error('Error fetching usage alerts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/usage/violations
 * Get limit violations over the past 7 days
 */
router.get(
  '/violations',
  requireAdmin,
  requirePermission('usage'),
  async (req: AdminRequest, res: Response) => {
    try {
      const violations = await AdminUsageService.getLimitViolations();

      res.json({
        success: true,
        data: violations,
      });
    } catch (error) {
      console.error('Error fetching usage violations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
