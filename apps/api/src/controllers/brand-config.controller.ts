import { Request, Response } from 'express';
import { brandConfigService } from '../services/brand-config.service.js';
import { brandConfigUpdateSchema } from '../validators/brand-config.schema.js';

export class BrandConfigController {
  /**
   * GET /me/brand-config
   * Get brand config for authenticated user
   */
  async getConfig(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const config = await brandConfigService.getConfig(userId);
      return res.status(200).json(config);
    } catch (error) {
      console.error('Error getting brand config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /me/brand-config
   * Update brand config for authenticated user
   */
  async updateConfig(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body with Zod
      const validation = brandConfigUpdateSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors
        });
      }

      const config = await brandConfigService.updateConfig(userId, validation.data);
      return res.status(200).json(config);
    } catch (error) {
      console.error('Error updating brand config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /me/brand-config
   * Reset brand config to defaults for authenticated user
   */
  async deleteConfig(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const config = await brandConfigService.deleteConfig(userId);
      return res.status(200).json(config);
    } catch (error) {
      console.error('Error deleting brand config:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const brandConfigController = new BrandConfigController();
