import { Request, Response } from 'express';
import { marketplaceProductService } from '../services/marketplace/product.service.js';
import {
  validateCreateMarketplaceProduct,
  validateUpdateMarketplaceProduct,
  validateListMarketplaceProductsQuery,
} from '../services/marketplace/types.js';
import { EntitlementService } from '../services/billing/entitlement.service.js';
import { MARKETPLACE_DISPLAY_NAMES, MarketplaceType } from '../constants/enums.js';

/**
 * Marketplace Controller
 * Handles HTTP requests for marketplace products
 */
export class MarketplaceController {
  /**
   * Create a new marketplace product
   * POST /api/marketplace/products
   */
  async createProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = validateCreateMarketplaceProduct(req.body);

      // Check if user has access to this marketplace
      const hasAccess = await EntitlementService.hasMarketplaceAccess(
        userId,
        validatedData.marketplace
      );

      if (!hasAccess) {
        // Get user's available marketplaces for helpful error message
        const summary = await EntitlementService.getMarketplaceAccessSummary(userId);
        const marketplaceName =
          MARKETPLACE_DISPLAY_NAMES[validatedData.marketplace as MarketplaceType] ||
          validatedData.marketplace;

        if (summary.totalSlots === 0) {
          return res.status(403).json({
            success: false,
            error: 'Sem acesso a marketplaces',
            message: 'Seu plano não inclui acesso a marketplaces. Faça upgrade para criar produtos.',
            code: 'NO_MARKETPLACE_SLOTS',
          });
        }

        if (summary.usedSlots === 0) {
          return res.status(403).json({
            success: false,
            error: 'Marketplaces não configurados',
            message: `Você tem ${summary.totalSlots} slot(s) disponível(is), mas ainda não selecionou seus marketplaces. Configure em Configurações > Marketplaces.`,
            code: 'MARKETPLACES_NOT_CONFIGURED',
            availableSlots: summary.totalSlots,
          });
        }

        return res.status(403).json({
          success: false,
          error: `Sem acesso ao ${marketplaceName}`,
          message: `Você não tem acesso ao marketplace ${marketplaceName}. Seus marketplaces disponíveis são: ${summary.selectedMarketplaces.map((m) => MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType] || m).join(', ')}.`,
          code: 'MARKETPLACE_NOT_ALLOWED',
          allowedMarketplaces: summary.selectedMarketplaces,
        });
      }

      const product = await marketplaceProductService.createProduct({
        ...validatedData,
        userId,
      });

      return res.status(201).json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Create error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to create product',
      });
    }
  }

  /**
   * Get product by ID
   * GET /api/marketplace/products/:id
   */
  async getProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productId = req.params.id;
      const product = await marketplaceProductService.getProductById(productId, userId);

      if (!product) {
        return res.status(404).json({
          success: false,
          error: 'Product not found',
        });
      }

      return res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Get error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get product',
      });
    }
  }

  /**
   * List products with filters
   * GET /api/marketplace/products
   */
  async listProducts(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedQuery = validateListMarketplaceProductsQuery(req.query);

      const result = await marketplaceProductService.listProducts({
        ...validatedQuery,
        userId,
      });

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[MarketplaceController] List error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to list products',
      });
    }
  }

  /**
   * Update product
   * PATCH /api/marketplace/products/:id
   */
  async updateProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productId = req.params.id;
      const validatedData = validateUpdateMarketplaceProduct(req.body);

      const product = await marketplaceProductService.updateProduct(
        productId,
        userId,
        validatedData
      );

      return res.json({
        success: true,
        data: product,
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Update error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update product',
      });
    }
  }

  /**
   * Delete product (soft delete)
   * DELETE /api/marketplace/products/:id
   */
  async deleteProduct(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const productId = req.params.id;
      await marketplaceProductService.deleteProduct(productId, userId);

      return res.json({
        success: true,
        message: 'Product deleted successfully',
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Delete error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to delete product',
      });
    }
  }

  /**
   * Get product statistics
   * GET /api/marketplace/products/stats
   */
  async getProductStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await marketplaceProductService.getProductStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  }

  /**
   * Track product view
   * POST /api/marketplace/products/:id/view
   */
  async trackView(req: Request, res: Response) {
    try {
      const productId = req.params.id;
      await marketplaceProductService.incrementViewCount(productId);

      return res.json({
        success: true,
        message: 'View tracked',
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Track view error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track view',
      });
    }
  }

  /**
   * Track product click
   * POST /api/marketplace/products/:id/click
   */
  async trackClick(req: Request, res: Response) {
    try {
      const productId = req.params.id;
      await marketplaceProductService.incrementClickCount(productId);

      return res.json({
        success: true,
        message: 'Click tracked',
      });
    } catch (error: any) {
      console.error('[MarketplaceController] Track click error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to track click',
      });
    }
  }
}

export const marketplaceController = new MarketplaceController();
