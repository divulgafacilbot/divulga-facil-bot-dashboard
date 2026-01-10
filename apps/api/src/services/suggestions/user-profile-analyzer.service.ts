import { prisma } from '../../db/prisma.js';
import { nowBrt } from '../../utils/time.js';

export interface UserProfile {
  userId: string;
  preferredCategories: string[];
  excludedMarketplaces: string[];
  averagePrice: number;
  mostViewedCategories: string[];
  productCount: number;
}

/**
 * User Profile Analyzer Service
 * Analyzes user's marketplace products to build preference profile
 */
export class UserProfileAnalyzerService {
  /**
   * Analyze user profile from their marketplace products
   */
  async analyzeUserProfile(userId: string): Promise<UserProfile> {
    // Get user's marketplace products
    const products = await prisma.marketplace_products.findMany({
      where: {
        user_id: userId,
        is_hidden: false,
      },
      select: {
        category: true,
        marketplace: true,
        price: true,
        view_count: true,
      },
    });

    // Get user preferences
    const preferences = await prisma.user_suggestion_preferences.findUnique({
      where: { user_id: userId },
    });

    // Calculate category frequency
    const categoryCount: Record<string, number> = {};
    const categoryViews: Record<string, number> = {};

    for (const product of products) {
      if (product.category) {
        categoryCount[product.category] = (categoryCount[product.category] || 0) + 1;
        categoryViews[product.category] = (categoryViews[product.category] || 0) + product.view_count;
      }
    }

    // Get top categories by frequency
    const preferredCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Get most viewed categories
    const mostViewedCategories = Object.entries(categoryViews)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category]) => category);

    // Calculate average price
    const prices = products
      .filter((p) => p.price !== null)
      .map((p) => Number(p.price));
    const averagePrice = prices.length > 0
      ? prices.reduce((sum, price) => sum + price, 0) / prices.length
      : 0;

    return {
      userId,
      preferredCategories: preferences?.preferred_categories || preferredCategories,
      excludedMarketplaces: preferences?.excluded_marketplaces || [],
      averagePrice,
      mostViewedCategories,
      productCount: products.length,
    };
  }

  /**
   * Get user suggestion preferences
   */
  async getUserPreferences(userId: string) {
    return await prisma.user_suggestion_preferences.findUnique({
      where: { user_id: userId },
    });
  }

  /**
   * Update user suggestion preferences
   */
  async updateUserPreferences(
    userId: string,
    data: {
      suggestionsEnabled?: boolean;
      frequency?: string;
      maxSuggestionsPerBatch?: number;
      preferredCategories?: string[];
      excludedMarketplaces?: string[];
    }
  ) {
    return await prisma.user_suggestion_preferences.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        suggestions_enabled: data.suggestionsEnabled ?? false,
        frequency: data.frequency ?? 'DAILY',
        max_suggestions_per_batch: data.maxSuggestionsPerBatch ?? 5,
        preferred_categories: data.preferredCategories ?? [],
        excluded_marketplaces: data.excludedMarketplaces ?? [],
      },
      update: {
        suggestions_enabled: data.suggestionsEnabled,
        frequency: data.frequency,
        max_suggestions_per_batch: data.maxSuggestionsPerBatch,
        preferred_categories: data.preferredCategories,
        excluded_marketplaces: data.excludedMarketplaces,
      },
    });
  }

  /**
   * Check if user should receive suggestions (based on frequency)
   */
  async shouldReceiveSuggestions(userId: string): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);

    if (!preferences || !preferences.suggestions_enabled) {
      return false;
    }

    const lastSuggestionAt = preferences.last_suggestion_at;
    if (!lastSuggestionAt) {
      return true; // Never received suggestions
    }

    const now = nowBrt();
    const hoursSinceLastSuggestion =
      (now.getTime() - lastSuggestionAt.getTime()) / (1000 * 60 * 60);

    switch (preferences.frequency) {
      case 'DAILY':
        return hoursSinceLastSuggestion >= 24;
      case 'WEEKLY':
        return hoursSinceLastSuggestion >= 24 * 7;
      case 'MONTHLY':
        return hoursSinceLastSuggestion >= 24 * 30;
      default:
        return false;
    }
  }

  /**
   * Mark that user received suggestions
   */
  async markSuggestionsReceived(userId: string) {
    await prisma.user_suggestion_preferences.update({
      where: { user_id: userId },
      data: {
        last_suggestion_at: nowBrt(),
      },
    });
  }
}

export const userProfileAnalyzerService = new UserProfileAnalyzerService();
