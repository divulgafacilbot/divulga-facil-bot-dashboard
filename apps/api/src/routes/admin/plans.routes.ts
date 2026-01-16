import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { prisma } from '../../db/prisma.js';

const router = Router();

/**
 * GET /admin/plans
 * List all available plans
 */
router.get('/', requireAdmin, requirePermission('finance'), async (_req, res) => {
  try {
    const plans = await prisma.plans.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        billing_cycle: true,
        acesso_bot_geracao: true,
        acesso_bot_download: true,
        acesso_bot_pinterest: true,
        acesso_bot_sugestoes: true,
        included_marketplaces_count: true,
        max_artes_por_dia: true,
        max_downloads_por_dia: true,
      },
    });

    res.json({ success: true, data: plans });
  } catch (error: any) {
    console.error('Get plans error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
