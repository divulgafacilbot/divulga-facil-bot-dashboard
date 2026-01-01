import { Request, Response } from 'express';
import { layoutPreferencesService } from '../services/layout-preferences.service.js';
import { z } from 'zod';

const layoutPreferencesSchema = z.object({
  // Feed preferences
  feedShowTitle: z.boolean().optional(),
  feedShowDescription: z.boolean().optional(),
  feedShowPrice: z.boolean().optional(),
  feedShowOriginalPrice: z.boolean().optional(),
  feedShowProductUrl: z.boolean().optional(),
  feedShowCoupon: z.boolean().optional(),
  feedShowDisclaimer: z.boolean().optional(),
  feedShowSalesQuantity: z.boolean().optional(),
  feedShowCustomText: z.boolean().optional(),
  feedOrder: z.array(z.string()).optional(),

  // Story preferences
  storyShowTitle: z.boolean().optional(),
  storyShowPrice: z.boolean().optional(),
  storyShowOriginalPrice: z.boolean().optional(),
  storyShowCoupon: z.boolean().optional(),
  storyShowCustomText: z.boolean().optional(),
  storyOrder: z.array(z.string()).optional(),
});

export class LayoutPreferencesController {
  /**
   * GET /me/layout-preferences
   * Get layout preferences for authenticated user
   */
  async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await layoutPreferencesService.getPreferences(userId);
      return res.status(200).json(preferences);
    } catch (error) {
      console.error('Error getting layout preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * PUT /me/layout-preferences
   * Update layout preferences for authenticated user
   */
  async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body with Zod
      const validation = layoutPreferencesSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const preferences = await layoutPreferencesService.updatePreferences(
        userId,
        validation.data
      );
      return res.status(200).json(preferences);
    } catch (error) {
      console.error('Error updating layout preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /me/layout-preferences
   * Reset layout preferences to defaults for authenticated user
   */
  async resetPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await layoutPreferencesService.resetPreferences(userId);
      return res.status(200).json(preferences);
    } catch (error) {
      console.error('Error resetting layout preferences:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const layoutPreferencesController = new LayoutPreferencesController();
