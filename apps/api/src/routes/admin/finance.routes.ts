import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { AdminFinanceService } from '../../services/admin/finance.service.js';
import { ReconciliationService } from '../../services/billing/reconciliation.service.js';

const router = Router();

router.get('/summary', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const summary = await AdminFinanceService.getPaymentsSummary(req.query as any);
    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payments', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const payments = await AdminFinanceService.getPayments(req.query, { page: 1, limit: 50 });
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/discrepancies', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const discrepancies = await ReconciliationService.detectDiscrepancies(days);
    res.json({ success: true, data: discrepancies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/kiwify-events', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const events = await AdminFinanceService.getKiwifyEvents(req.query as any, { page: 1, limit: 50 });
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/finance/reprocess-event/:eventId
 * Reprocess a Kiwify event
 */
router.post('/reprocess-event/:eventId', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const { eventId } = req.params;
    await ReconciliationService.reprocessEvent(eventId);
    res.json({ success: true, message: 'Event reprocessed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /admin/finance/rebuild-payment/:eventId
 * Rebuild payment from Kiwify event
 */
router.post('/rebuild-payment/:eventId', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const { eventId } = req.params;
    const payment = await ReconciliationService.rebuildPaymentFromEvent(eventId);
    res.json({ success: true, data: payment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/finance/failed-events
 * Get failed Kiwify events for manual review
 */
router.get('/failed-events', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const events = await ReconciliationService.getFailedEvents(limit);
    res.json({ success: true, data: events });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /admin/finance/processing-stats
 * Get event processing statistics
 */
router.get('/processing-stats', requireAdmin, requirePermission('finance'), async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const stats = await ReconciliationService.getProcessingStats(days);
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
