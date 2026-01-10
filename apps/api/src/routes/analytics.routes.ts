import { Router } from 'express';
import { z } from 'zod';
import { AnalyticsService } from '../services/analytics.service.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// Validation schemas
const timeRangeSchema = z.object({
  timeRange: z.enum(['7d', '30d', 'all']).optional().default('30d')
});

/**
 * GET /api/analytics/dashboard
 * Get dashboard metrics (profile views, clicks, CTR, etc)
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { timeRange } = timeRangeSchema.parse(req.query);

    const metrics = await AnalyticsService.getDashboardMetrics(userId, timeRange as any);

    res.json({ metrics });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Get dashboard metrics error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
  }
});

/**
 * GET /api/analytics/top-cards
 * Get top performing cards by clicks
 */
router.get('/top-cards', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const cards = await AnalyticsService.getTopCards(userId, limit);

    res.json({ cards });
  } catch (error) {
    console.error('Get top cards error:', error);
    res.status(500).json({ error: 'Failed to fetch top cards' });
  }
});

/**
 * GET /api/analytics/visitors
 * Get visitor statistics
 */
router.get('/visitors', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

    const stats = await AnalyticsService.getVisitorStats(userId, timeRange);

    res.json({ stats });
  } catch (error) {
    console.error('Get visitor stats error:', error);
    res.status(500).json({ error: 'Failed to fetch visitor stats' });
  }
});

/**
 * GET /api/analytics/time-series
 * Get event time series data for charts
 */
router.get('/time-series', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const eventType = req.query.eventType as any || 'PUBLIC_PROFILE_VIEW';
    const timeRange = (req.query.timeRange as '7d' | '30d') || '30d';

    const series = await AnalyticsService.getEventTimeSeries(userId, eventType, timeRange);

    res.json({ series });
  } catch (error) {
    console.error('Get time series error:', error);
    res.status(500).json({ error: 'Failed to fetch time series data' });
  }
});

export default router;
