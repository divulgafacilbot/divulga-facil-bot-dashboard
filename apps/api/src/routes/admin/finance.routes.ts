import { Router } from 'express';
import { requireAdmin, requirePermission } from '../../middleware/require-admin.middleware.js';
import { AdminFinanceService } from '../../services/admin/finance.service.js';

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
    const discrepancies = await AdminFinanceService.detectDiscrepancies();
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

export default router;
