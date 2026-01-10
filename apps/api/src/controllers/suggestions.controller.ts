import { Request, Response } from 'express';
import { suggestionEngineService } from '../services/suggestions/suggestion-engine.service.js';
import { userProfileAnalyzerService } from '../services/suggestions/user-profile-analyzer.service.js';
import {
  validateUpdateSuggestionPreferences,
  validateRecordSuggestionAction,
  validateListSuggestionsQuery,
} from '../services/suggestions/types.js';

/**
 * Suggestions Controller
 * Handles HTTP requests for AI-powered suggestions
 */
export class SuggestionsController {
  /**
   * Generate suggestions for current user
   * POST /api/suggestions/generate
   */
  async generateSuggestions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const result = await suggestionEngineService.generateSuggestionsForUser(userId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message,
        });
      }

      return res.json({
        success: true,
        data: result.suggestions,
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Generate error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate suggestions',
      });
    }
  }

  /**
   * Get user's suggestion history
   * GET /api/suggestions
   */
  async getSuggestions(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedQuery = validateListSuggestionsQuery(req.query);

      const result = await suggestionEngineService.getUserSuggestions(userId, validatedQuery);

      return res.json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Get suggestions error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get suggestions',
      });
    }
  }

  /**
   * Record user action on suggestion
   * POST /api/suggestions/:id/action
   */
  async recordAction(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const suggestionId = req.params.id;
      const validatedData = validateRecordSuggestionAction(req.body);

      const suggestion = await suggestionEngineService.recordUserAction(
        suggestionId,
        userId,
        validatedData.action
      );

      return res.json({
        success: true,
        data: suggestion,
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Record action error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to record action',
      });
    }
  }

  /**
   * Get suggestion statistics
   * GET /api/suggestions/stats
   */
  async getSuggestionStats(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const stats = await suggestionEngineService.getSuggestionStats(userId);

      return res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Stats error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get stats',
      });
    }
  }

  /**
   * Get user suggestion preferences
   * GET /api/suggestions/preferences
   */
  async getPreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const preferences = await userProfileAnalyzerService.getUserPreferences(userId);

      return res.json({
        success: true,
        data: preferences || {
          suggestions_enabled: false,
          frequency: 'DAILY',
          max_suggestions_per_batch: 5,
          preferred_categories: [],
          excluded_marketplaces: [],
        },
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Get preferences error:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get preferences',
      });
    }
  }

  /**
   * Update user suggestion preferences
   * PATCH /api/suggestions/preferences
   */
  async updatePreferences(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = validateUpdateSuggestionPreferences(req.body);

      const preferences = await userProfileAnalyzerService.updateUserPreferences(
        userId,
        validatedData
      );

      return res.json({
        success: true,
        data: preferences,
      });
    } catch (error: any) {
      console.error('[SuggestionsController] Update preferences error:', error);
      return res.status(400).json({
        success: false,
        error: error.message || 'Failed to update preferences',
      });
    }
  }
}

export const suggestionsController = new SuggestionsController();
