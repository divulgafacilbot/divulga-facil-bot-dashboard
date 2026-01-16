import { Router } from 'express';
import { telegramController } from '../controllers/telegram.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { TelegramLinkGenerationService } from '../services/telegram/link-generation.service.js';
import { promoTokensService } from '../services/admin/promo-tokens.service.js';
import { EntitlementService } from '../services/billing/entitlement.service.js';
import { SubscriptionService } from '../services/billing/subscription.service.js';
import { z } from 'zod';

const router = Router();

// POST /telegram/link-token - Generate link token (requires auth)
router.post('/telegram/link-token', authMiddleware, telegramController.generateLinkToken.bind(telegramController));

// GET /telegram/link-tokens - List pending tokens (requires auth)
router.get('/telegram/link-tokens', authMiddleware, telegramController.listTokens.bind(telegramController));

// POST /telegram/link-tokens/:id/refresh - Refresh token (requires auth)
router.post('/telegram/link-tokens/:id/refresh', authMiddleware, telegramController.refreshToken.bind(telegramController));

// DELETE /telegram/link-tokens/:id - Delete token (requires auth)
router.delete('/telegram/link-tokens/:id', authMiddleware, telegramController.deleteToken.bind(telegramController));

// POST /telegram/confirm-link - Confirm link (called by bot, no auth)
router.post('/telegram/confirm-link', telegramController.confirmLink.bind(telegramController));

// GET /telegram/link-status - Check link status (requires auth)
router.get('/telegram/link-status', authMiddleware, telegramController.getLinkStatus.bind(telegramController));

// DELETE /telegram/unlink - Unlink account (requires auth)
router.delete('/telegram/unlink', authMiddleware, telegramController.unlinkAccount.bind(telegramController));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Milestone 2: Bot link generation endpoints
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// Validation schema
const generateLinkSchema = z.object({
  botType: z.enum(['PROMOCOES', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION'])
});

/**
 * POST /api/telegram/generate-link
 * Generate 10-minute temporary token for bot linkage
 *
 * Validations:
 * 1. User must have BOT_ACCESS entitlement for the requested bot
 * 2. User must have at least one marketplace configured (MARKETPLACE_SLOT with assigned marketplace)
 * 3. Bot must not already be linked
 */
router.post('/generate-link', authMiddleware, async (req, res) => {
  try {
    const { botType } = generateLinkSchema.parse(req.body);
    const userId = req.user!.id;

    // 1. Check if user has access to this bot type
    const hasAccess = await SubscriptionService.hasAccess(userId, botType);
    if (!hasAccess) {
      return res.status(403).json({
        error: 'Sem acesso ao bot',
        message: `Voce nao tem acesso ao bot ${botType}. Verifique se sua assinatura esta ativa e inclui este bot.`,
        code: 'NO_BOT_ACCESS',
      });
    }

    // 2. Check marketplace configuration (only for bots that use marketplace tiers)
    // DOWNLOAD and SUGGESTION are "plano único" - they don't require marketplace configuration
    const botsRequiringMarketplaceConfig = ['PROMOCOES', 'PINTEREST'];
    const requiresMarketplaceConfig = botsRequiringMarketplaceConfig.includes(botType);

    let marketplaceSummary = null;
    if (requiresMarketplaceConfig) {
      marketplaceSummary = await EntitlementService.getMarketplaceAccessSummary(userId);

      if (marketplaceSummary.totalSlots === 0) {
        return res.status(403).json({
          error: 'Sem slots de marketplace',
          message: 'Seu plano nao inclui acesso a marketplaces. Faca upgrade para usar o bot.',
          code: 'NO_MARKETPLACE_SLOTS',
        });
      }

      if (marketplaceSummary.usedSlots === 0) {
        return res.status(403).json({
          error: 'Marketplaces nao configurados',
          message: `Voce tem ${marketplaceSummary.totalSlots} slot(s) de marketplace, mas ainda nao selecionou quais marketplaces deseja usar. Configure em Configuracoes > Marketplaces.`,
          code: 'MARKETPLACES_NOT_CONFIGURED',
          availableSlots: marketplaceSummary.totalSlots,
        });
      }
    }

    // 3. Check if already linked
    const isLinked = await TelegramLinkGenerationService.isLinked(userId, botType as any);
    if (isLinked) {
      return res.status(400).json({
        error: 'Bot ja vinculado',
        message: 'Este bot ja esta vinculado a sua conta.',
        code: 'BOT_ALREADY_LINKED',
      });
    }

    // All validations passed - generate token
    const link = await TelegramLinkGenerationService.generateLinkToken(userId, botType as any);

    // Build response based on bot type
    const response: {
      success: boolean;
      link: typeof link;
      marketplaces?: string[];
      message: string;
    } = {
      success: true,
      link,
      message: 'Token gerado com sucesso!',
    };

    if (marketplaceSummary) {
      response.marketplaces = marketplaceSummary.selectedMarketplaces;
      response.message = `Token gerado! Voce tem acesso aos marketplaces: ${marketplaceSummary.selectedMarketplaces.join(', ')}`;
    } else {
      // For DOWNLOAD and SUGGESTION bots (plano único)
      response.message = 'Token gerado! Este bot nao requer configuracao de marketplace.';
    }

    res.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Generate link error:', error);
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

/**
 * GET /api/telegram/linked-bots
 * Get all linked bots for current user
 */
router.get('/linked-bots', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const bots = await TelegramLinkGenerationService.getLinkedBots(userId);
    res.json({ bots });
  } catch (error) {
    console.error('Get linked bots error:', error);
    res.status(500).json({ error: 'Failed to fetch linked bots' });
  }
});

/**
 * GET /api/telegram/bot-configs
 * Get configuration for all available bots
 */
router.get('/bot-configs', authMiddleware, async (req, res) => {
  try {
    const configs = TelegramLinkGenerationService.getAllBotConfigs();
    res.json({ bots: configs });
  } catch (error) {
    console.error('Get bot configs error:', error);
    res.status(500).json({ error: 'Failed to fetch bot configs' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Promo Token Validation (Bot → API, no auth)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const validatePromoTokenSchema = z.object({
  botType: z.enum(['PROMOCOES', 'DOWNLOAD', 'PINTEREST', 'SUGGESTION']),
  promoToken: z.string().min(1).max(64),
  userId: z.string().uuid().optional(),
});

/**
 * POST /api/telegram/validate-promo-token
 * Validate a promotional token (called by bots, no auth required)
 *
 * Response:
 *   - { valid: true, tokenId: string }
 *   - { valid: false, reason: 'TOKEN_NOT_FOUND' | 'TOKEN_EXPIRED' | 'TOKEN_INACTIVE' | 'WRONG_BOT_TYPE' }
 */
router.post('/validate-promo-token', async (req, res) => {
  try {
    const { botType, promoToken } = validatePromoTokenSchema.parse(req.body);

    const result = await promoTokensService.validateToken(promoToken, botType as any);

    if (result.valid) {
      return res.json({
        valid: true,
        tokenId: result.tokenId,
      });
    }

    // Map error messages to reason codes
    let reason = 'TOKEN_NOT_FOUND';
    if (result.error?.includes('inactive')) {
      reason = 'TOKEN_INACTIVE';
    } else if (result.error?.includes('expired')) {
      reason = 'TOKEN_EXPIRED';
    } else if (result.error?.includes('is for')) {
      reason = 'WRONG_BOT_TYPE';
    }

    return res.json({
      valid: false,
      reason,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Validate promo token error:', error);
    res.status(500).json({ error: 'Failed to validate promo token' });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// User Promo Tokens Management (requires auth)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const tokenIdParamSchema = z.object({
  id: z.string().uuid('Invalid token ID format'),
});

/**
 * GET /api/telegram/promo-tokens
 * Get all promo tokens for the current user
 */
router.get('/telegram/promo-tokens', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const botType = req.query.botType as string | undefined;

    console.log('[Promo Tokens] Fetching tokens for user:', userId, 'botType:', botType);

    const tokens = await promoTokensService.getTokensByUserId(
      userId,
      botType as any
    );

    console.log('[Promo Tokens] Found tokens:', tokens.length);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    console.error('Get promo tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch promo tokens' });
  }
});

/**
 * POST /api/telegram/promo-tokens/:id/refresh
 * Refresh a promo token (generate new token string)
 */
router.post('/telegram/promo-tokens/:id/refresh', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = tokenIdParamSchema.parse(req.params);

    const newToken = await promoTokensService.refreshTokenByUser(id, userId);

    if (!newToken) {
      return res.status(404).json({
        error: 'Token not found or unauthorized',
      });
    }

    res.json({
      success: true,
      data: newToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Refresh promo token error:', error);
    res.status(500).json({ error: 'Failed to refresh promo token' });
  }
});

/**
 * DELETE /api/telegram/promo-tokens/:id
 * Delete a promo token
 */
router.delete('/telegram/promo-tokens/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = tokenIdParamSchema.parse(req.params);

    const deleted = await promoTokensService.deleteTokenByUser(id, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Token not found or unauthorized',
      });
    }

    res.json({
      success: true,
      message: 'Token deleted successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Delete promo token error:', error);
    res.status(500).json({ error: 'Failed to delete promo token' });
  }
});

export default router;
