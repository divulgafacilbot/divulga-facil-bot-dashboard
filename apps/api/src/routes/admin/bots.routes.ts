import { Router, Response } from 'express';
import { z } from 'zod';
import { AdminBotsService } from '../../services/admin/bots.service.js';
import { requireAdmin, requirePermission, AdminRequest } from '../../middleware/require-admin.middleware.js';

const router = Router();

// Validation schemas
const getBotErrorsQuerySchema = z.object({
  botType: z.string().optional(),
  fromDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  toDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

/**
 * GET /admin/bots
 * Get bot statistics and usage data
 */
router.get(
  '/',
  requireAdmin,
  requirePermission('bots'),
  async (req: AdminRequest, res: Response) => {
    try {
      const stats = await AdminBotsService.getBotsStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching bot stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/bots/errors
 * Get bot errors from telemetry
 */
router.get(
  '/errors',
  requireAdmin,
  requirePermission('bots'),
  async (req: AdminRequest, res: Response) => {
    try {
      const query = getBotErrorsQuerySchema.parse(req.query);

      const filters = {
        botType: query.botType,
        fromDate: query.fromDate,
        toDate: query.toDate,
      };

      const errors = await AdminBotsService.getBotErrors(filters);

      res.json({
        success: true,
        data: errors,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      console.error('Error fetching bot errors:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /admin/bots/usage
 * Get bot usage by user
 */
router.get(
  '/usage',
  requireAdmin,
  requirePermission('bots'),
  async (req: AdminRequest, res: Response) => {
    try {
      const usage = await AdminBotsService.getBotUsageByUser();

      res.json({
        success: true,
        data: usage,
      });
    } catch (error) {
      console.error('Error fetching bot usage:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;
