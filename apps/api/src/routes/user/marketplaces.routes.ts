import { Router, Request, Response } from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { EntitlementService } from '../../services/billing/entitlement.service.js';
import { MARKETPLACE_VALUES, MARKETPLACE_DISPLAY_NAMES, MarketplaceType } from '../../constants/enums.js';
import { z } from 'zod';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Validation schema for marketplace selection
const selectMarketplacesSchema = z.object({
  marketplaces: z
    .array(z.enum(MARKETPLACE_VALUES as unknown as [string, ...string[]]))
    .min(1, 'Selecione pelo menos um marketplace'),
});

/**
 * GET /user/marketplaces
 * Get user's marketplace access summary
 * Returns: total slots, used slots, available slots, selected marketplaces, and all available marketplaces
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const summary = await EntitlementService.getMarketplaceAccessSummary(userId);

    // Add display names and available marketplaces list
    const response = {
      ...summary,
      selectedMarketplacesWithNames: summary.selectedMarketplaces.map((m) => ({
        value: m,
        label: MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType] || m,
      })),
      availableMarketplaces: MARKETPLACE_VALUES.map((m) => ({
        value: m,
        label: MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType],
        selected: summary.selectedMarketplaces.includes(m),
      })),
    };

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Get marketplaces error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar marketplaces',
      message: error.message || 'Tente novamente mais tarde',
    });
  }
});

/**
 * POST /user/marketplaces
 * Select/assign marketplaces to user's slots
 * Body: { marketplaces: ['SHOPEE', 'MERCADO_LIVRE'] }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    // Validate request body
    const validation = selectMarketplacesSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: validation.error.errors,
      });
    }

    const { marketplaces } = validation.data;

    // Update marketplace selections
    await EntitlementService.selectMarketplaces(userId, marketplaces);

    // Return updated summary
    const summary = await EntitlementService.getMarketplaceAccessSummary(userId);

    res.json({
      success: true,
      message: 'Marketplaces atualizados com sucesso',
      data: {
        ...summary,
        selectedMarketplacesWithNames: summary.selectedMarketplaces.map((m) => ({
          value: m,
          label: MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType] || m,
        })),
      },
    });
  } catch (error: any) {
    console.error('Select marketplaces error:', error);

    // Check if it's a validation error from the service
    if (error.message?.includes('slot') || error.message?.includes('marketplace')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao atualizar marketplaces',
      message: error.message || 'Tente novamente mais tarde',
    });
  }
});

/**
 * GET /user/marketplaces/check/:marketplace
 * Check if user has access to a specific marketplace
 */
router.get('/check/:marketplace', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { marketplace } = req.params;

    const marketplaceUpper = marketplace.toUpperCase();

    // Validate marketplace is a valid value
    if (!MARKETPLACE_VALUES.includes(marketplaceUpper as MarketplaceType)) {
      return res.status(400).json({
        success: false,
        error: 'Marketplace inválido',
        validMarketplaces: MARKETPLACE_VALUES,
      });
    }

    const hasAccess = await EntitlementService.hasMarketplaceAccess(userId, marketplaceUpper);

    res.json({
      success: true,
      data: {
        marketplace: marketplaceUpper,
        hasAccess,
      },
    });
  } catch (error: any) {
    console.error('Check marketplace access error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar acesso',
      message: error.message || 'Tente novamente mais tarde',
    });
  }
});

/**
 * GET /user/marketplaces/available
 * Get list of marketplaces the user can use (has selected)
 * This is useful for filtering product creation options
 */
router.get('/available', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const selectedMarketplaces = await EntitlementService.getSelectedMarketplaces(userId);

    // If user hasn't selected any marketplaces yet, return empty with a message
    if (selectedMarketplaces.length === 0) {
      const summary = await EntitlementService.getMarketplaceAccessSummary(userId);

      return res.json({
        success: true,
        data: {
          marketplaces: [],
          message:
            summary.totalSlots > 0
              ? 'Você ainda não selecionou seus marketplaces. Configure em Configurações > Marketplaces.'
              : 'Você não tem slots de marketplace disponíveis no seu plano.',
          totalSlots: summary.totalSlots,
          needsConfiguration: summary.totalSlots > 0 && summary.usedSlots === 0,
        },
      });
    }

    res.json({
      success: true,
      data: {
        marketplaces: selectedMarketplaces.map((m) => ({
          value: m,
          label: MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType] || m,
        })),
        needsConfiguration: false,
      },
    });
  } catch (error: any) {
    console.error('Get available marketplaces error:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar marketplaces disponíveis',
      message: error.message || 'Tente novamente mais tarde',
    });
  }
});

export default router;
