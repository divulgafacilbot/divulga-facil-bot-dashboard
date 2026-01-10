import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SuggestionEngineService } from '../suggestion-engine.service';
import prisma from '../../../lib/prisma';

vi.mock('../../../lib/prisma', () => ({
  default: {
    suggestionHistory: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    userSuggestionPreferences: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../user-profile-analyzer.service', () => ({
  UserProfileAnalyzerService: vi.fn().mockImplementation(() => ({
    analyzeUserProfile: vi.fn().mockResolvedValue({
      preferredCategories: ['Eletrônicos'],
      preferredMarketplaces: ['SHOPEE'],
      avgPriceRange: { min: 10, max: 100 },
      topKeywords: ['smartphone', 'fone'],
    }),
  })),
}));

vi.mock('../product-recommendation.service', () => ({
  ProductRecommendationService: vi.fn().mockImplementation(() => ({
    fetchRecommendations: vi.fn().mockResolvedValue([
      {
        title: 'Smartphone XYZ',
        productUrl: 'https://example.com/product1',
        price: 50,
        originalPrice: 100,
        discountPercent: 50,
        marketplace: 'SHOPEE',
        category: 'Eletrônicos',
        imageUrl: 'https://example.com/image1.jpg',
        score: 0.95,
      },
    ]),
  })),
}));

describe('SuggestionEngineService', () => {
  let service: SuggestionEngineService;

  beforeEach(() => {
    service = new SuggestionEngineService();
    vi.clearAllMocks();
  });

  describe('generateSuggestions', () => {
    it('should generate suggestions for user', async () => {
      const mockPreferences = {
        user_id: 'user1',
        suggestions_enabled: true,
        frequency: 'DAILY',
        max_suggestions_per_batch: 5,
        preferred_categories: ['Eletrônicos'],
        excluded_marketplaces: [],
      };

      const mockSuggestion = {
        id: 'sugg1',
        user_id: 'user1',
        suggested_title: 'Smartphone XYZ',
        suggested_product_url: 'https://example.com/product1',
        suggested_price: 50,
        suggested_category: 'Eletrônicos',
        suggested_marketplace: 'SHOPEE',
        suggested_image_url: 'https://example.com/image1.jpg',
        score: 0.95,
        suggested_at: new Date(),
      };

      vi.mocked(prisma.userSuggestionPreferences.findUnique).mockResolvedValue(mockPreferences as any);
      vi.mocked(prisma.suggestionHistory.create).mockResolvedValue(mockSuggestion as any);

      const result = await service.generateSuggestions('user1');

      expect(result.generatedCount).toBeGreaterThan(0);
      expect(prisma.suggestionHistory.create).toHaveBeenCalled();
    });

    it('should throw error if suggestions are disabled', async () => {
      const mockPreferences = {
        user_id: 'user1',
        suggestions_enabled: false,
        frequency: 'DAILY',
        max_suggestions_per_batch: 5,
        preferred_categories: [],
        excluded_marketplaces: [],
      };

      vi.mocked(prisma.userSuggestionPreferences.findUnique).mockResolvedValue(mockPreferences as any);

      await expect(service.generateSuggestions('user1')).rejects.toThrow('Sugestões desabilitadas');
    });
  });

  describe('recordUserAction', () => {
    it('should record user action on suggestion', async () => {
      const mockSuggestion = {
        id: 'sugg1',
        user_id: 'user1',
        user_action: 'ACCEPTED',
        actioned_at: new Date(),
      };

      vi.mocked(prisma.suggestionHistory.update).mockResolvedValue(mockSuggestion as any);

      const result = await service.recordUserAction('sugg1', 'user1', 'ACCEPTED');

      expect(result.user_action).toBe('ACCEPTED');
      expect(prisma.suggestionHistory.update).toHaveBeenCalledWith({
        where: { id: 'sugg1', user_id: 'user1' },
        data: {
          user_action: 'ACCEPTED',
          actioned_at: expect.any(Date),
        },
      });
    });
  });

  describe('listSuggestions', () => {
    it('should list suggestions with pagination', async () => {
      const mockSuggestions = [
        { id: 'sugg1', suggested_title: 'Product 1' },
        { id: 'sugg2', suggested_title: 'Product 2' },
      ];

      vi.mocked(prisma.suggestionHistory.findMany).mockResolvedValue(mockSuggestions as any);
      vi.mocked(prisma.suggestionHistory.count).mockResolvedValue(10);

      const result = await service.listSuggestions({
        userId: 'user1',
        page: 1,
        limit: 2,
      });

      expect(result.suggestions).toEqual(mockSuggestions);
      expect(result.pagination.total).toBe(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(2);
      expect(result.pagination.totalPages).toBe(5);
    });
  });

  describe('updatePreferences', () => {
    it('should update user preferences', async () => {
      const mockPreferences = {
        user_id: 'user1',
        suggestions_enabled: true,
        frequency: 'WEEKLY',
        max_suggestions_per_batch: 10,
        preferred_categories: ['Moda', 'Beleza'],
        excluded_marketplaces: ['ALIEXPRESS'],
      };

      vi.mocked(prisma.userSuggestionPreferences.upsert).mockResolvedValue(mockPreferences as any);

      const result = await service.updatePreferences('user1', {
        suggestionsEnabled: true,
        frequency: 'WEEKLY',
        maxSuggestionsPerBatch: 10,
        preferredCategories: ['Moda', 'Beleza'],
        excludedMarketplaces: ['ALIEXPRESS'],
      });

      expect(result.frequency).toBe('WEEKLY');
      expect(result.preferred_categories).toContain('Moda');
      expect(prisma.userSuggestionPreferences.upsert).toHaveBeenCalled();
    });
  });
});
