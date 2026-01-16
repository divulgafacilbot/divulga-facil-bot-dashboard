import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { EntitlementService } from '../../services/billing/entitlement.service.js';
import { SubscriptionService } from '../../services/billing/subscription.service.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

/**
 * GET /user/entitlements
 * Get all active entitlements for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const entitlements = await EntitlementService.getUserEntitlements(userId);
    const marketplaceCount = await EntitlementService.getMarketplaceCount(userId);
    const botEntitlements = await EntitlementService.getBotAccessEntitlements(userId);

    // Also get subscription status
    const subscription = await SubscriptionService.getSubscription(userId);

    res.json({
      entitlements,
      marketplaceCount,
      botAccess: botEntitlements.map((e) => ({
        botType: e.bot_type,
        type: e.entitlement_type,
        source: e.source,
        expiresAt: e.expires_at,
      })),
      subscription: subscription
        ? {
            status: subscription.status,
            expiresAt: subscription.expires_at,
            graceUntil: subscription.grace_until,
            plan: subscription.plans
              ? {
                  name: subscription.plans.name,
                  includedMarketplaces: subscription.plans.included_marketplaces_count,
                }
              : null,
          }
        : null,
    });
  } catch (error) {
    console.error('Get entitlements error:', error);
    res.status(500).json({
      error: 'Erro ao buscar entitlements',
      message: 'Tente novamente mais tarde',
    });
  }
});

/**
 * GET /user/entitlements/access/:botType
 * Check if user has access to a specific bot
 */
router.get('/access/:botType', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { botType } = req.params;

    const hasAccess = await SubscriptionService.hasAccess(userId, botType.toUpperCase());

    res.json({
      botType: botType.toUpperCase(),
      hasAccess,
    });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({
      error: 'Erro ao verificar acesso',
      message: 'Tente novamente mais tarde',
    });
  }
});

export default router;
