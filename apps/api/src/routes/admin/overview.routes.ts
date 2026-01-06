import { Router } from 'express';
import { requireAdmin } from '../../middleware/require-admin.middleware.js';
import { AdminOverviewService } from '../../services/admin/overview.service.js';

const router = Router();
const CACHE_TTL_MS = 30 * 1000;
let cachedOverview: { data: any; expiresAt: number } | null = null;

router.get('/', requireAdmin, async (req, res) => {
  try {
    if (cachedOverview && cachedOverview.expiresAt > Date.now()) {
      res.json({ success: true, data: cachedOverview.data, cached: true });
      return;
    }
    const [kpis, timeSeries, subscriptionStatus, criticalEvents, kiwifyEvents] = await Promise.all([
      AdminOverviewService.getKPIs(),
      AdminOverviewService.getTimeSeriesData(30),
      AdminOverviewService.getSubscriptionStatusBreakdown(),
      AdminOverviewService.getCriticalEvents(10),
      AdminOverviewService.getRecentKiwifyWebhooks(10),
    ]);
    let activeTokens: Awaited<ReturnType<typeof AdminOverviewService.getActiveTokens>> = [];
    try {
      activeTokens = await AdminOverviewService.getActiveTokens();
    } catch (error) {
      console.warn('[admin-overview] active tokens unavailable', error);
    }
    const data = { kpis, timeSeries, subscriptionStatus, criticalEvents, kiwifyEvents, activeTokens };
    cachedOverview = { data, expiresAt: Date.now() + CACHE_TTL_MS };

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
