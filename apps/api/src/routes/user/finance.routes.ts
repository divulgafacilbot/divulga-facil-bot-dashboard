import { Router } from 'express';
import { UserFinanceService } from '../../services/user/finance.service.js';

const router = Router();

router.get('/subscription', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    const subscription = await UserFinanceService.getSubscriptionSummary(userId);
    res.json({ success: true, data: subscription });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/payments', async (req, res) => {
  try {
    const userId = (req as any).user?.id || 'temp-user-id';
    const payments = await UserFinanceService.getPaymentHistory(userId);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
