import { prisma } from '../../db/prisma.js';
import { userProfileAnalyzerService } from './user-profile-analyzer.service.js';
import { productRecommendationService } from './product-recommendation.service.js';
import { telemetryService } from '../telemetry.service.js';
import { nowBrt } from '../../utils/time.js';

/**
 * Suggestion Engine Service
 * Main orchestrator for AI-powered product suggestions
 */
export class SuggestionEngineService {
  /**
   * Generate suggestions for a user
   */
  async generateSuggestionsForUser(userId: string) {
    console.log('[SuggestionEngine] generateSuggestionsForUser called for userId:', userId);

    // Check if user should receive suggestions
    console.log('[SuggestionEngine] Checking if user should receive suggestions...');
    const shouldReceive = await userProfileAnalyzerService.shouldReceiveSuggestions(userId);
    console.log('[SuggestionEngine] Should receive suggestions:', shouldReceive);

    if (!shouldReceive) {
      console.log('[SuggestionEngine] User not due for suggestions, returning early');
      return {
        success: false,
        message: 'User is not due for suggestions yet',
      };
    }

    // Analyze user profile
    console.log('[SuggestionEngine] Analyzing user profile...');
    const profile = await userProfileAnalyzerService.analyzeUserProfile(userId);
    console.log('[SuggestionEngine] Profile analyzed, product count:', profile.productCount);

    if (profile.productCount === 0) {
      console.log('[SuggestionEngine] User has no products, returning early');
      return {
        success: false,
        message: 'User has no products to base suggestions on',
      };
    }

    // Get user preferences
    console.log('[SuggestionEngine] Getting user preferences...');
    const preferences = await userProfileAnalyzerService.getUserPreferences(userId);
    const maxSuggestions = preferences?.max_suggestions_per_batch || 5;
    console.log('[SuggestionEngine] Max suggestions:', maxSuggestions);

    // Generate recommendations
    console.log('[SuggestionEngine] Generating recommendations...');
    const recommendations = await productRecommendationService.generateRecommendations(
      profile,
      maxSuggestions
    );
    console.log('[SuggestionEngine] Recommendations generated:', recommendations.length);

    if (recommendations.length === 0) {
      console.log('[SuggestionEngine] No recommendations found, returning early');
      return {
        success: false,
        message: 'No recommendations found',
      };
    }

    // Save suggestions to history
    console.log('[SuggestionEngine] Saving suggestions to history...');
    const savedSuggestions = await this.saveSuggestions(userId, recommendations);
    console.log('[SuggestionEngine] Suggestions saved:', savedSuggestions.length);

    // Mark that user received suggestions
    await userProfileAnalyzerService.markSuggestionsReceived(userId);

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'SUGGESTIONS_GENERATED',
      userId,
      origin: 'suggestion-engine',
      metadata: {
        count: savedSuggestions.length,
        categories: [...new Set(recommendations.map((r) => r.category))],
      },
    });

    return {
      success: true,
      suggestions: savedSuggestions,
    };
  }

  /**
   * Save suggestions to history
   */
  private async saveSuggestions(userId: string, recommendations: any[]) {
    const suggestions = await Promise.all(
      recommendations.map((rec) =>
        prisma.suggestion_history.create({
          data: {
            user_id: userId,
            suggested_product_url: rec.url,
            suggested_title: rec.title,
            suggested_category: rec.category,
            suggested_marketplace: rec.marketplace,
            score: rec.score,
          },
        })
      )
    );

    return suggestions;
  }

  /**
   * Get user's suggestion history
   */
  async getUserSuggestions(
    userId: string,
    filters?: {
      category?: string;
      marketplace?: string;
      userAction?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = Math.min(filters?.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { user_id: userId };

    if (filters?.category) {
      where.suggested_category = filters.category;
    }

    if (filters?.marketplace) {
      where.suggested_marketplace = filters.marketplace;
    }

    if (filters?.userAction) {
      where.user_action = filters.userAction;
    }

    const [suggestions, total] = await Promise.all([
      prisma.suggestion_history.findMany({
        where,
        orderBy: { suggested_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.suggestion_history.count({ where }),
    ]);

    return {
      suggestions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Record user action on suggestion
   */
  async recordUserAction(
    suggestionId: string,
    userId: string,
    action: 'ACCEPTED' | 'REJECTED' | 'IGNORED'
  ) {
    const suggestion = await prisma.suggestion_history.findFirst({
      where: {
        id: suggestionId,
        user_id: userId,
      },
    });

    if (!suggestion) {
      throw new Error('Suggestion not found');
    }

    const updated = await prisma.suggestion_history.update({
      where: { id: suggestionId },
      data: {
        user_action: action,
        action_at: nowBrt(),
      },
    });

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'SUGGESTION_ACTION',
      userId,
      origin: 'suggestion-engine',
      metadata: {
        suggestionId,
        action,
        category: suggestion.suggested_category,
        marketplace: suggestion.suggested_marketplace,
      },
    });

    return updated;
  }

  /**
   * Get suggestion statistics
   */
  async getSuggestionStats(userId: string) {
    const [total, accepted, rejected, ignored, byCategory, byMarketplace] = await Promise.all([
      prisma.suggestion_history.count({
        where: { user_id: userId },
      }),
      prisma.suggestion_history.count({
        where: { user_id: userId, user_action: 'ACCEPTED' },
      }),
      prisma.suggestion_history.count({
        where: { user_id: userId, user_action: 'REJECTED' },
      }),
      prisma.suggestion_history.count({
        where: { user_id: userId, user_action: 'IGNORED' },
      }),
      prisma.suggestion_history.groupBy({
        by: ['suggested_category'],
        where: { user_id: userId },
        _count: true,
      }),
      prisma.suggestion_history.groupBy({
        by: ['suggested_marketplace'],
        where: { user_id: userId },
        _count: true,
      }),
    ]);

    const pending = total - accepted - rejected - ignored;

    return {
      total,
      accepted,
      rejected,
      ignored,
      pending,
      acceptanceRate: total > 0 ? (accepted / total) * 100 : 0,
      byCategory: byCategory.map((item) => ({
        category: item.suggested_category,
        count: item._count,
      })),
      byMarketplace: byMarketplace.map((item) => ({
        marketplace: item.suggested_marketplace,
        count: item._count,
      })),
    };
  }

  /**
   * Generate suggestions for all eligible users (cron job)
   */
  async generateSuggestionsForAllUsers() {
    // Get all users with suggestions enabled
    const usersWithPreferences = await prisma.user_suggestion_preferences.findMany({
      where: {
        suggestions_enabled: true,
      },
      select: {
        user_id: true,
      },
    });

    const results = {
      total: usersWithPreferences.length,
      success: 0,
      failed: 0,
      skipped: 0,
    };

    for (const { user_id } of usersWithPreferences) {
      try {
        const result = await this.generateSuggestionsForUser(user_id);
        if (result.success) {
          results.success++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`[SuggestionEngine] Failed for user ${user_id}:`, error);
        results.failed++;
      }
    }

    // Log telemetry
    await telemetryService.logEvent({
      eventType: 'SUGGESTIONS_BATCH_GENERATED',
      userId: 'system',
      origin: 'suggestion-engine-cron',
      metadata: results,
    });

    return results;
  }
}

export const suggestionEngineService = new SuggestionEngineService();
