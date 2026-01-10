import type { Response } from 'express';
import type { AdminRequest } from '../../middleware/require-admin.middleware.js';
import { promoTokensService } from '../../services/admin/promo-tokens.service.js';
import type {
  CreatePromoTokenInput,
  UpdatePromoTokenInput,
  GetPromoTokensQuery,
} from '../../validators/admin/promo-tokens.validator.js';
import type { BotType } from '../../constants/bot-types.js';

/**
 * Controller for promotional tokens management
 */
export class PromoTokensController {
  /**
   * Create a new promotional token
   * POST /api/admin/promo-tokens
   */
  async createToken(req: AdminRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const input = req.body as CreatePromoTokenInput;

      const token = await promoTokensService.createToken({
        adminId,
        userId: input.userId,
        botType: input.botType,
        name: input.name,
        description: input.description,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
      });

      res.status(201).json({
        success: true,
        data: token,
      });
    } catch (error) {
      console.error('[PromoTokensController] Create token error:', error);
      res.status(500).json({
        error: 'Failed to create promotional token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get promotional tokens with filters and pagination
   * GET /api/admin/promo-tokens
   */
  async getTokens(req: AdminRequest, res: Response): Promise<void> {
    try {
      const query = req.query as unknown as GetPromoTokensQuery;

      const filters = {
        botType: query.botType as BotType | undefined,
        isActive: query.isActive,
        page: query.page ? Number(query.page) : 1,
        limit: query.limit ? Number(query.limit) : 50,
      };

      console.log('[PromoTokensController] Fetching tokens with filters:', filters);

      const result = await promoTokensService.getTokens(filters);

      console.log('[PromoTokensController] Found tokens:', result.tokens.length, 'total:', result.total);

      res.status(200).json({
        success: true,
        data: result.tokens,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('[PromoTokensController] Get tokens error:', error);
      res.status(500).json({
        error: 'Failed to retrieve promotional tokens',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a single promotional token by ID
   * GET /api/admin/promo-tokens/:id
   */
  async getTokenById(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const token = await promoTokensService.getTokenById(id);

      if (!token) {
        res.status(404).json({
          error: 'Token not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: token,
      });
    } catch (error) {
      console.error('[PromoTokensController] Get token by ID error:', error);
      res.status(500).json({
        error: 'Failed to retrieve promotional token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a promotional token
   * PATCH /api/admin/promo-tokens/:id
   */
  async updateToken(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body as UpdatePromoTokenInput;

      // Convert expiresAt string to Date if provided
      const parsedUpdates = {
        ...updates,
        expiresAt: updates.expiresAt ? new Date(updates.expiresAt) : undefined,
      };

      const token = await promoTokensService.updateToken(id, parsedUpdates);

      if (!token) {
        res.status(404).json({
          error: 'Token not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: token,
      });
    } catch (error) {
      console.error('[PromoTokensController] Update token error:', error);
      res.status(500).json({
        error: 'Failed to update promotional token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a promotional token (soft delete)
   * DELETE /api/admin/promo-tokens/:id
   */
  async deleteToken(req: AdminRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const deleted = await promoTokensService.deleteToken(id, adminId);

      if (!deleted) {
        res.status(404).json({
          error: 'Token not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Token deleted successfully',
      });
    } catch (error) {
      console.error('[PromoTokensController] Delete token error:', error);
      res.status(500).json({
        error: 'Failed to delete promotional token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Rotate a promotional token (create new, deactivate old)
   * POST /api/admin/promo-tokens/:id/rotate
   */
  async rotateToken(req: AdminRequest, res: Response): Promise<void> {
    try {
      const adminId = req.admin?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const newToken = await promoTokensService.rotateToken(id, adminId);

      if (!newToken) {
        res.status(404).json({
          error: 'Token not found',
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: newToken,
        message: 'Token rotated successfully',
      });
    } catch (error) {
      console.error('[PromoTokensController] Rotate token error:', error);
      res.status(500).json({
        error: 'Failed to rotate promotional token',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const promoTokensController = new PromoTokensController();
