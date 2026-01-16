import { Router } from 'express';
import { UserFinanceService } from '../../services/user/finance.service.js';
import { SubscriptionService } from '../../services/billing/subscription.service.js';
import { requireAuth } from '../../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /user/finance/subscription
 * Get full subscription details with plan, status, and dates
 */
router.get('/subscription', async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get subscription with full details
    const subscription = await SubscriptionService.getSubscription(userId);

    if (!subscription) {
      return res.json({
        success: true,
        data: {
          status: 'NO_SUBSCRIPTION',
          hasActiveSubscription: false,
        },
      });
    }

    const hasActive = await SubscriptionService.hasActiveSubscription(userId);

    res.json({
      success: true,
      data: {
        id: subscription.id,
        status: subscription.status,
        expiresAt: subscription.expires_at,
        graceUntil: subscription.grace_until,
        hasActiveSubscription: hasActive,
        plan: subscription.plans
          ? {
              id: subscription.plans.id,
              name: subscription.plans.name,
              billingCycle: subscription.plans.billing_cycle,
              maxArtesPerDay: subscription.plans.max_artes_por_dia,
              maxDownloadsPerDay: subscription.plans.max_downloads_por_dia,
              includedMarketplaces: subscription.plans.included_marketplaces_count,
              hasBotGeracao: subscription.plans.acesso_bot_geracao,
              hasBotDownload: subscription.plans.acesso_bot_download,
            }
          : null,
        kiwifyLinked: !!subscription.kiwify_customer_id,
      },
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /user/finance/payments
 * Get payment history with pagination
 */
router.get('/payments', async (req, res) => {
  try {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const payments = await UserFinanceService.getPaymentHistory(userId, page, limit);
    res.json({ success: true, data: payments });
  } catch (error: any) {
    console.error('Get payments error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
