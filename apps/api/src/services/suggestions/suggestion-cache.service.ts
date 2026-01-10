import { prisma } from '../../db/prisma.js';
import { nowBrt, computeExpiresAt, getDayKey, isExpired } from '../../utils/time.js';
import { SUGGESTION_CONSTANTS } from '../../constants/suggestions.constants.js';
import type { MarketplaceSuggestions, InputContext, Marketplace } from '../../types/suggestions.types.js';

export class SuggestionCacheService {
  /**
   * Get cached suggestions if valid
   */
  async getCache(): Promise<MarketplaceSuggestions | null> {
    try {
      const cache = await prisma.suggestion_cache.findUnique({
        where: { cache_key: 'global' },
      });

      if (!cache) {
        console.log('[SuggestionCache] No cache found');
        return null;
      }

      // Lazy expiration check
      if (isExpired(cache.expires_at)) {
        console.log('[SuggestionCache] Cache expired');
        return null;
      }

      console.log('[SuggestionCache] Cache hit');
      return {
        MERCADO_LIVRE: cache.mercado_livre as any[],
        SHOPEE: cache.shopee as any[],
        AMAZON: cache.amazon as any[],
        MAGALU: cache.magalu as any[],
      };
    } catch (error) {
      console.error('[SuggestionCache] Error getting cache:', error);
      return null;
    }
  }

  /**
   * Save suggestions to cache
   */
  async saveCache(suggestions: MarketplaceSuggestions, inputContext: InputContext): Promise<void> {
    try {
      const now = nowBrt();
      const expiresAt = computeExpiresAt(now, SUGGESTION_CONSTANTS.CACHE_TTL_DAYS);

      await prisma.suggestion_cache.upsert({
        where: { cache_key: 'global' },
        create: {
          cache_key: 'global',
          mercado_livre: suggestions.MERCADO_LIVRE as any,
          shopee: suggestions.SHOPEE as any,
          amazon: suggestions.AMAZON as any,
          magalu: suggestions.MAGALU as any,
          input_context: inputContext as any,
          created_at: now,
          expires_at: expiresAt,
        },
        update: {
          mercado_livre: suggestions.MERCADO_LIVRE as any,
          shopee: suggestions.SHOPEE as any,
          amazon: suggestions.AMAZON as any,
          magalu: suggestions.MAGALU as any,
          input_context: inputContext as any,
          expires_at: expiresAt,
        },
      });

      console.log('[SuggestionCache] Cache saved successfully');
    } catch (error) {
      console.error('[SuggestionCache] Error saving cache:', error);
      throw error;
    }
  }

  /**
   * Invalidate cache (delete)
   */
  async invalidateCache(): Promise<void> {
    try {
      await prisma.suggestion_cache.deleteMany({
        where: { cache_key: 'global' },
      });
      console.log('[SuggestionCache] Cache invalidated');
    } catch (error) {
      console.error('[SuggestionCache] Error invalidating cache:', error);
    }
  }

  /**
   * Detect if cache should be renewed (new day = force refresh)
   * Per guidelines:
   * - Cache is GLOBAL with 30 day TTL
   * - First access of a NEW day: force refresh (daily suggestions)
   * - Same day: use existing cache
   */
  async detectDoubleClick(userId: string, marketplace: Marketplace): Promise<boolean> {
    try {
      const currentDayKey = getDayKey(nowBrt());

      const clickState = await prisma.user_button_click_state.findUnique({
        where: {
          unique_user_marketplace_button: {
            user_id: userId,
            marketplace_button: marketplace,
          },
        },
      });

      if (!clickState) {
        // First click ever - force refresh to generate initial suggestions
        console.log('[SuggestionCache] First click ever for user/marketplace, will check cache');
        return false;
      }

      // Check if it's a NEW day (different from last click day)
      const isNewDay = clickState.last_click_day_key !== currentDayKey;

      console.log('[SuggestionCache] Double-click check:', {
        userId,
        marketplace,
        lastClickDay: clickState.last_click_day_key,
        currentDay: currentDayKey,
        isNewDay,
        shouldForceRefresh: isNewDay,
      });

      // If NEW day = first access of new day = force refresh for daily suggestions
      // If SAME day = already refreshed today = use cache
      return isNewDay;
    } catch (error) {
      console.error('[SuggestionCache] Error detecting double-click:', error);
      return false;
    }
  }

  /**
   * Record click (for double-click detection)
   */
  async recordClick(userId: string, marketplace: Marketplace): Promise<void> {
    try {
      const currentDayKey = getDayKey(nowBrt());

      await prisma.user_button_click_state.upsert({
        where: {
          unique_user_marketplace_button: {
            user_id: userId,
            marketplace_button: marketplace,
          },
        },
        create: {
          user_id: userId,
          marketplace_button: marketplace,
          last_click_day_key: currentDayKey,
        },
        update: {
          last_click_day_key: currentDayKey,
        },
      });

      console.log('[SuggestionCache] Click recorded:', { userId, marketplace, dayKey: currentDayKey });
    } catch (error) {
      console.error('[SuggestionCache] Error recording click:', error);
    }
  }
}

export const suggestionCacheService = new SuggestionCacheService();
