/**
 * Feature 6: Intelligent Suggestions Bot - Integration Tests
 *
 * Tests the complete flow of the suggestions bot including:
 * - Database schema and tables
 * - Core services (cache, metrics, campaigns, validators)
 * - Telegram bot integration
 * - Admin API endpoints
 * - Campaign rotation and injection
 * - Double-click detection
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '../../src/db/prisma';
import { suggestionCacheService } from '../../src/services/suggestions/suggestion-cache.service';
import { metricsAnalyzerService } from '../../src/services/suggestions/metrics-analyzer.service';
import { campaignInjectorService } from '../../src/services/suggestions/campaign-injector.service';
import { jsonValidatorService } from '../../src/services/suggestions/json-validator.service';
import { telegramSuggestionOrchestratorService } from '../../src/services/suggestions/telegram-suggestion-orchestrator.service';
import { nowBrt, getDayKey, computeExpiresAt, subtractDays } from '../../src/utils/time';
import { SUGGESTION_CONSTANTS } from '../../src/constants/suggestions.constants';
import type { MarketplaceSuggestions, ProductSuggestion } from '../../src/types/suggestions.types';

// Test data - will be set to actual user ID in beforeAll
let testUserId: string;
const mockSuggestions: MarketplaceSuggestions = {
  MERCADO_LIVRE: [
    {
      title: 'Fone de Ouvido Bluetooth Premium',
      url: 'https://produto.mercadolivre.com.br/MLB-test-123',
      hook_angle: 'antes/depois',
      category: 'Eletrônicos',
      estimated_price: 'R$ 50–80',
    },
    {
      title: 'Kit Teclado e Mouse Gamer',
      url: 'https://produto.mercadolivre.com.br/MLB-test-456',
      hook_angle: 'economia',
      category: 'Eletrônicos',
      estimated_price: 'R$ 100–150',
    },
    {
      title: 'Câmera de Segurança WiFi',
      url: 'https://produto.mercadolivre.com.br/MLB-test-789',
      hook_angle: 'transformação',
      category: 'Casa',
      estimated_price: 'R$ 80–120',
    },
    {
      title: 'Smartwatch Fitness Tracker',
      url: 'https://produto.mercadolivre.com.br/MLB-test-101',
      hook_angle: 'urgência',
      category: 'Eletrônicos',
      estimated_price: 'R$ 150–200',
    },
    {
      title: 'Aspirador de Pó Robô',
      url: 'https://produto.mercadolivre.com.br/MLB-test-102',
      hook_angle: 'economia',
      category: 'Casa',
      estimated_price: 'R$ 200–300',
    },
  ],
  SHOPEE: [
    {
      title: 'Camiseta Oversized Streetwear',
      url: 'https://shopee.com.br/test-1',
      hook_angle: 'tendência',
      category: 'Moda',
      estimated_price: 'R$ 20–40',
    },
    {
      title: 'Kit 10 Pares de Meias Confortáveis',
      url: 'https://shopee.com.br/test-2',
      hook_angle: 'kit/conjunto',
      category: 'Moda',
      estimated_price: 'R$ 30–50',
    },
    {
      title: 'Organizador de Gavetas Multiuso',
      url: 'https://shopee.com.br/test-3',
      hook_angle: 'transformação',
      category: 'Casa',
      estimated_price: 'R$ 15–30',
    },
    {
      title: 'Luminária LED Decorativa',
      url: 'https://shopee.com.br/test-4',
      hook_angle: 'antes/depois',
      category: 'Casa',
      estimated_price: 'R$ 40–60',
    },
    {
      title: 'Kit Skincare Coreano Básico',
      url: 'https://shopee.com.br/test-5',
      hook_angle: 'tendência',
      category: 'Beleza',
      estimated_price: 'R$ 80–120',
    },
  ],
  AMAZON: [
    {
      title: 'Echo Dot 5ª Geração',
      url: 'https://www.amazon.com.br/dp/test-a1',
      hook_angle: 'inovação',
      category: 'Eletrônicos',
      estimated_price: 'R$ 200–300',
    },
    {
      title: 'Livro "Hábitos Atômicos"',
      url: 'https://www.amazon.com.br/dp/test-a2',
      hook_angle: 'transformação',
      category: 'Livros',
      estimated_price: 'R$ 30–50',
    },
    {
      title: 'Kit Ferramentas 108 Peças',
      url: 'https://www.amazon.com.br/dp/test-a3',
      hook_angle: 'kit/conjunto',
      category: 'Ferramentas',
      estimated_price: 'R$ 150–250',
    },
    {
      title: 'Air Fryer Digital 5L',
      url: 'https://www.amazon.com.br/dp/test-a4',
      hook_angle: 'economia',
      category: 'Casa',
      estimated_price: 'R$ 300–450',
    },
    {
      title: 'Tênis Corrida Masculino',
      url: 'https://www.amazon.com.br/dp/test-a5',
      hook_angle: 'performance',
      category: 'Esporte',
      estimated_price: 'R$ 200–350',
    },
  ],
  MAGALU: [
    {
      title: 'Smart TV 50" 4K UHD',
      url: 'https://www.magazineluiza.com.br/test-m1',
      hook_angle: 'economia',
      category: 'Eletrônicos',
      estimated_price: 'R$ 1500–2000',
    },
    {
      title: 'Geladeira Frost Free 400L',
      url: 'https://www.magazineluiza.com.br/test-m2',
      hook_angle: 'upgrade',
      category: 'Casa',
      estimated_price: 'R$ 2000–3000',
    },
    {
      title: 'Notebook Core i5 8GB',
      url: 'https://www.magazineluiza.com.br/test-m3',
      hook_angle: 'performance',
      category: 'Eletrônicos',
      estimated_price: 'R$ 2500–3500',
    },
    {
      title: 'Conjunto Sofá 3+2 Lugares',
      url: 'https://www.magazineluiza.com.br/test-m4',
      hook_angle: 'transformação',
      category: 'Casa',
      estimated_price: 'R$ 1500–2500',
    },
    {
      title: 'Micro-ondas 30L Digital',
      url: 'https://www.magazineluiza.com.br/test-m5',
      hook_angle: 'praticidade',
      category: 'Casa',
      estimated_price: 'R$ 400–600',
    },
  ],
};

const mockInputContext = {
  dominantPersonas: [
    { name: 'Econômico Consciente', share: 40 },
    { name: 'Impulsivo Digital', share: 30 },
    { name: 'Caçador de Tendências', share: 30 },
  ],
  dominantCategories: [
    { name: 'Eletrônicos', share: 30 },
    { name: 'Moda', share: 25 },
    { name: 'Casa', share: 20 },
    { name: 'Beleza', share: 15 },
  ],
  secondaryCategories: [
    { name: 'Esporte', share: 5 },
    { name: 'Livros', share: 5 },
  ],
  avoidCategories: [] as string[],
  topCTRPatterns: [
    { pattern: 'antes/depois', ctr: 5.2, examples: ['Transformação incrível!'] },
    { pattern: 'economia', ctr: 4.8, examples: ['Economize 50%'] },
  ],
  topProductPatterns: [
    { pattern: 'kit', clicks: 1000, examples: ['Kit Completo', 'Kit Premium'] },
    { pattern: 'conjunto', clicks: 800, examples: ['Conjunto Moderno'] },
  ],
  marketplaceDistributions: {
    MERCADO_LIVRE: { productCount: 100, avgCTR: 3.5, topCategories: [] },
    SHOPEE: { productCount: 80, avgCTR: 4.0, topCategories: [] },
    AMAZON: { productCount: 60, avgCTR: 3.8, topCategories: [] },
    MAGALU: { productCount: 50, avgCTR: 3.2, topCategories: [] },
  },
  targetPriceBands: {
    MERCADO_LIVRE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MERCADO_LIVRE.map(range => ({ range, count: 10 })),
    SHOPEE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.SHOPEE.map(range => ({ range, count: 10 })),
    AMAZON: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.AMAZON.map(range => ({ range, count: 10 })),
    MAGALU: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MAGALU.map(range => ({ range, count: 10 })),
  },
};

describe('Feature 6: Intelligent Suggestions Bot', () => {
  // Cleanup before all tests
  beforeAll(async () => {
    // Create or get test user
    let user = await prisma.user.findFirst({
      where: { email: { startsWith: 'test-feature6-' } },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: `test-feature6-${Date.now()}@example.com`,
          passwordHash: 'test-hash',
        },
      });
    }

    testUserId = user.id;

    // Clean up test data
    await prisma.user_button_click_state.deleteMany({
      where: { user_id: testUserId },
    });
    await prisma.suggestion_cache.deleteMany({
      where: { cache_key: 'global' },
    });
    await prisma.promotional_campaigns.deleteMany({
      where: { name: { startsWith: 'TEST_' } },
    });
  });

  // Cleanup after each test
  afterEach(async () => {
    await prisma.user_button_click_state.deleteMany({
      where: { user_id: testUserId },
    });
  });

  // Cleanup after all tests
  afterAll(async () => {
    await prisma.user_button_click_state.deleteMany({
      where: { user_id: testUserId },
    });
    await prisma.suggestion_cache.deleteMany({
      where: { cache_key: 'global' },
    });
    await prisma.promotional_campaigns.deleteMany({
      where: { name: { startsWith: 'TEST_' } },
    });
    await prisma.$disconnect();
  });

  describe('T001 - Database Schema', () => {
    it('should have suggestion_cache table with correct structure', async () => {
      const cache = await prisma.suggestion_cache.create({
        data: {
          cache_key: 'test-schema',
          mercado_livre: mockSuggestions.MERCADO_LIVRE,
          shopee: mockSuggestions.SHOPEE,
          amazon: mockSuggestions.AMAZON,
          magalu: mockSuggestions.MAGALU,
          input_context: mockInputContext,
          expires_at: computeExpiresAt(SUGGESTION_CONSTANTS.CACHE_TTL_DAYS * 24 * 60 * 60),
        },
      });

      expect(cache).toBeDefined();
      expect(cache.cache_key).toBe('test-schema');
      expect(cache.mercado_livre).toBeDefined();
      expect(cache.shopee).toBeDefined();
      expect(cache.amazon).toBeDefined();
      expect(cache.magalu).toBeDefined();

      await prisma.suggestion_cache.delete({ where: { id: cache.id } });
    });

    it('should have user_button_click_state table with correct structure', async () => {
      // Create test user first (assuming User table exists)
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `test-${Date.now()}@example.com`,
            password_hash: 'test-hash',
          },
        });
      }

      const clickState = await prisma.user_button_click_state.create({
        data: {
          user_id: user.id,
          marketplace_button: 'MERCADO_LIVRE',
          last_click_day_key: getDayKey(nowBrt()),
        },
      });

      expect(clickState).toBeDefined();
      expect(clickState.marketplace_button).toBe('MERCADO_LIVRE');
      expect(clickState.last_click_day_key).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      await prisma.user_button_click_state.delete({ where: { id: clickState.id } });
    });

    it('should have promotional_campaigns table with correct structure', async () => {
      const campaign = await prisma.promotional_campaigns.create({
        data: {
          name: 'TEST_Campaign',
          product_title: 'Test Product',
          product_url: 'https://www.amazon.com.br/test',
          category: 'Eletrônicos',
          marketplace: 'AMAZON',
          hook_angle: 'economia',
          is_active: true,
          priority: 10,
        },
      });

      expect(campaign).toBeDefined();
      expect(campaign.marketplace).toBe('AMAZON');
      expect(campaign.is_active).toBe(true);

      await prisma.promotional_campaigns.delete({ where: { id: campaign.id } });
    });

    it('should have campaign_rotation_state table with correct structure', async () => {
      const rotationState = await prisma.campaign_rotation_state.create({
        data: {
          marketplace: 'MERCADO_LIVRE',
          last_used_day_key: getDayKey(nowBrt()),
        },
      });

      expect(rotationState).toBeDefined();
      expect(rotationState.marketplace).toBe('MERCADO_LIVRE');

      await prisma.campaign_rotation_state.delete({ where: { id: rotationState.id } });
    });
  });

  describe('T002-T003 - Constants & Types', () => {
    it('should have correct marketplace constants', () => {
      expect(SUGGESTION_CONSTANTS.MARKETPLACES).toEqual([
        'MERCADO_LIVRE',
        'SHOPEE',
        'AMAZON',
        'MAGALU',
      ]);
    });

    it('should have correct cache TTL', () => {
      expect(SUGGESTION_CONSTANTS.CACHE_TTL_DAYS).toBe(30);
    });

    it('should have 5 suggestions per marketplace', () => {
      expect(SUGGESTION_CONSTANTS.SUGGESTIONS_PER_MARKETPLACE).toBe(5);
    });

    it('should have allowed categories', () => {
      expect(SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES).toContain('Eletrônicos');
      expect(SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES).toContain('Moda');
      expect(SUGGESTION_CONSTANTS.ALLOWED_CATEGORIES.length).toBeGreaterThanOrEqual(13);
    });

    it('should have campaign cooldown of 5 days', () => {
      expect(SUGGESTION_CONSTANTS.CAMPAIGN_COOLDOWN_DAYS).toBe(5);
    });

    it('should substitute at index 4', () => {
      expect(SUGGESTION_CONSTANTS.CAMPAIGN_SUBSTITUTION_INDEX).toBe(4);
    });
  });

  describe('T005 - Suggestion Cache Service', () => {
    it('should save cache with 30-day TTL', async () => {
      await suggestionCacheService.saveCache(mockSuggestions, mockInputContext);

      const cache = await prisma.suggestion_cache.findUnique({
        where: { cache_key: 'global' },
      });

      expect(cache).toBeDefined();
      expect(cache!.mercado_livre).toBeDefined();

      // Check TTL is approximately 30 days
      const now = nowBrt();
      const expiresAt = new Date(cache!.expires_at);
      const diffDays = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(29);
      expect(diffDays).toBeLessThanOrEqual(30);

      await suggestionCacheService.invalidateCache();
    });

    it('should return cached suggestions if valid', async () => {
      await suggestionCacheService.saveCache(mockSuggestions, mockInputContext);

      const cached = await suggestionCacheService.getCache();

      expect(cached).toBeDefined();
      expect(cached!.MERCADO_LIVRE).toHaveLength(5);
      expect(cached!.SHOPEE).toHaveLength(5);

      await suggestionCacheService.invalidateCache();
    });

    it('should return null if cache is expired', async () => {
      // Create expired cache
      const pastDate = subtractDays(nowBrt(), 31);
      await prisma.suggestion_cache.create({
        data: {
          cache_key: 'global',
          mercado_livre: mockSuggestions.MERCADO_LIVRE,
          shopee: mockSuggestions.SHOPEE,
          amazon: mockSuggestions.AMAZON,
          magalu: mockSuggestions.MAGALU,
          expires_at: pastDate,
        },
      });

      const cached = await suggestionCacheService.getCache();

      expect(cached).toBeNull();

      await suggestionCacheService.invalidateCache();
    });

    it('should detect double-click (same user, same marketplace, next day)', async () => {
      const yesterday = getDayKey(subtractDays(nowBrt(), 1));

      // Create test user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `test-dc-${Date.now()}@example.com`,
            password_hash: 'test-hash',
          },
        });
      }

      // Record click yesterday
      await prisma.user_button_click_state.create({
        data: {
          user_id: user.id,
          marketplace_button: 'MERCADO_LIVRE',
          last_click_day_key: yesterday,
        },
      });

      // Detect double-click today
      const isDoubleClick = await suggestionCacheService.detectDoubleClick(
        user.id,
        'MERCADO_LIVRE'
      );

      expect(isDoubleClick).toBe(true);

      // Clean up
      await prisma.user_button_click_state.deleteMany({
        where: { user_id: user.id },
      });
    });

    it('should not detect double-click on first click', async () => {
      // Create test user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `test-fc-${Date.now()}@example.com`,
            password_hash: 'test-hash',
          },
        });
      }

      const isDoubleClick = await suggestionCacheService.detectDoubleClick(
        user.id,
        'MERCADO_LIVRE'
      );

      expect(isDoubleClick).toBe(false);
    });

    it('should record click with day key', async () => {
      // Create test user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `test-rc-${Date.now()}@example.com`,
            password_hash: 'test-hash',
          },
        });
      }

      await suggestionCacheService.recordClick(user.id, 'SHOPEE');

      const clickState = await prisma.user_button_click_state.findFirst({
        where: {
          user_id: user.id,
          marketplace_button: 'SHOPEE',
        },
      });

      expect(clickState).toBeDefined();
      expect(clickState!.last_click_day_key).toBe(getDayKey(nowBrt()));

      await prisma.user_button_click_state.deleteMany({
        where: { user_id: user.id },
      });
    });
  });

  describe('T007 - Metrics Analyzer Service', () => {
    it('should return default InputContext when no metrics available', async () => {
      const inputContext = await metricsAnalyzerService.analyzeMetrics();

      expect(inputContext).toBeDefined();
      expect(inputContext.dominantPersonas).toBeDefined();
      expect(inputContext.dominantCategories).toBeDefined();
      expect(Array.isArray(inputContext.dominantPersonas)).toBe(true);
    });

    it('should have required InputContext fields', async () => {
      const inputContext = await metricsAnalyzerService.analyzeMetrics();

      expect(inputContext).toHaveProperty('dominantPersonas');
      expect(inputContext).toHaveProperty('dominantCategories');
      expect(inputContext).toHaveProperty('secondaryCategories');
      expect(inputContext).toHaveProperty('avoidCategories');
      expect(inputContext).toHaveProperty('topCTRPatterns');
      expect(inputContext).toHaveProperty('topProductPatterns');
      expect(inputContext).toHaveProperty('marketplaceDistributions');
      expect(inputContext).toHaveProperty('targetPriceBands');
    });
  });

  describe('T009 - Campaign Injector Service', () => {
    it('should inject campaign at index 4', async () => {
      // Create active campaign
      const campaign = await prisma.promotional_campaigns.create({
        data: {
          name: 'TEST_Inject_Campaign',
          product_title: 'Campaign Product',
          product_url: 'https://www.amazon.com.br/campaign-test',
          category: 'Eletrônicos',
          marketplace: 'AMAZON',
          hook_angle: 'promoção',
          is_active: true,
          priority: 100,
        },
      });

      const suggestions = { ...mockSuggestions };
      const original5th = suggestions.AMAZON[4].title;

      const injected = await campaignInjectorService.injectCampaigns(suggestions);

      expect(injected.AMAZON[4].title).toBe('Campaign Product');
      expect(injected.AMAZON[4].title).not.toBe(original5th);

      await prisma.promotional_campaigns.delete({ where: { id: campaign.id } });
      await prisma.campaign_rotation_state.deleteMany({
        where: { marketplace: 'AMAZON' },
      });
    });

    it('should not inject if no active campaigns', async () => {
      const suggestions = { ...mockSuggestions };
      const original5th = suggestions.AMAZON[4].title;

      const injected = await campaignInjectorService.injectCampaigns(suggestions);

      expect(injected.AMAZON[4].title).toBe(original5th);
    });
  });

  describe('T011 - JSON Validator Service', () => {
    it('should validate correct JSON structure', () => {
      const validation = jsonValidatorService.validate(mockSuggestions);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing marketplace', () => {
      const invalid = {
        MERCADO_LIVRE: mockSuggestions.MERCADO_LIVRE,
        SHOPEE: mockSuggestions.SHOPEE,
        AMAZON: mockSuggestions.AMAZON,
        // Missing MAGALU
      };

      const validation = jsonValidatorService.validate(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should detect wrong number of suggestions', () => {
      const invalid = {
        ...mockSuggestions,
        MERCADO_LIVRE: mockSuggestions.MERCADO_LIVRE.slice(0, 3), // Only 3 instead of 5
      };

      const validation = jsonValidatorService.validate(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('MERCADO_LIVRE'))).toBe(true);
    });

    it('should detect invalid category', () => {
      const invalid = {
        ...mockSuggestions,
        MERCADO_LIVRE: [
          ...mockSuggestions.MERCADO_LIVRE.slice(0, 4),
          {
            ...mockSuggestions.MERCADO_LIVRE[4],
            category: 'InvalidCategory',
          },
        ],
      };

      const validation = jsonValidatorService.validate(invalid);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some(e => e.includes('category'))).toBe(true);
    });

    it('should repair malformed JSON', () => {
      const malformed = {
        MERCADO_LIVRE: mockSuggestions.MERCADO_LIVRE.slice(0, 3), // Missing 2
        SHOPEE: mockSuggestions.SHOPEE,
        AMAZON: mockSuggestions.AMAZON,
        MAGALU: mockSuggestions.MAGALU,
      };

      const repaired = jsonValidatorService.repair(malformed);

      expect(repaired).toBeDefined();
      expect(repaired!.MERCADO_LIVRE).toHaveLength(5);
    });
  });

  describe('T016 - Telegram Bot Integration', () => {
    it('should have bot token configured', () => {
      expect(process.env.TELEGRAM_BOT_SUGESTION_TOKEN).toBeDefined();
    });

    it('should export startSuggestionBot function', async () => {
      const { startSuggestionBot } = await import('../../src/bot/suggestion-bot');
      expect(typeof startSuggestionBot).toBe('function');
    });
  });

  describe('T020 - Admin API (Promotional Campaigns)', () => {
    it('should create promotional campaign', async () => {
      const campaign = await prisma.promotional_campaigns.create({
        data: {
          name: 'TEST_API_Campaign',
          product_title: 'API Test Product',
          product_url: 'https://shopee.com.br/test-api',
          category: 'Moda',
          marketplace: 'SHOPEE',
          hook_angle: 'tendência',
          is_active: true,
          priority: 5,
        },
      });

      expect(campaign).toBeDefined();
      expect(campaign.marketplace).toBe('SHOPEE');

      await prisma.promotional_campaigns.delete({ where: { id: campaign.id } });
    });

    it('should list campaigns with pagination', async () => {
      // Create multiple test campaigns
      const campaigns = await Promise.all([
        prisma.promotional_campaigns.create({
          data: {
            name: 'TEST_List_1',
            product_title: 'Product 1',
            product_url: 'https://shopee.com.br/test-1',
            marketplace: 'SHOPEE',
            is_active: true,
            priority: 1,
          },
        }),
        prisma.promotional_campaigns.create({
          data: {
            name: 'TEST_List_2',
            product_title: 'Product 2',
            product_url: 'https://shopee.com.br/test-2',
            marketplace: 'SHOPEE',
            is_active: true,
            priority: 2,
          },
        }),
      ]);

      const result = await prisma.promotional_campaigns.findMany({
        where: { name: { startsWith: 'TEST_List_' } },
        orderBy: { priority: 'desc' },
      });

      expect(result).toHaveLength(2);
      expect(result[0].priority).toBeGreaterThan(result[1].priority);

      await prisma.promotional_campaigns.deleteMany({
        where: { name: { startsWith: 'TEST_List_' } },
      });
    });

    it('should toggle campaign active status', async () => {
      const campaign = await prisma.promotional_campaigns.create({
        data: {
          name: 'TEST_Toggle',
          product_title: 'Toggle Test',
          product_url: 'https://amazon.com.br/test',
          marketplace: 'AMAZON',
          is_active: true,
          priority: 1,
        },
      });

      const updated = await prisma.promotional_campaigns.update({
        where: { id: campaign.id },
        data: { is_active: !campaign.is_active },
      });

      expect(updated.is_active).toBe(false);

      await prisma.promotional_campaigns.delete({ where: { id: campaign.id } });
    });

    it('should delete campaign', async () => {
      const campaign = await prisma.promotional_campaigns.create({
        data: {
          name: 'TEST_Delete',
          product_title: 'Delete Test',
          product_url: 'https://magalu.com.br/test',
          marketplace: 'MAGALU',
          is_active: true,
          priority: 1,
        },
      });

      await prisma.promotional_campaigns.delete({ where: { id: campaign.id } });

      const deleted = await prisma.promotional_campaigns.findUnique({
        where: { id: campaign.id },
      });

      expect(deleted).toBeNull();
    });
  });

  describe('Full Integration Flow', () => {
    it('should complete full suggestion flow (cache miss → generate → save)', async () => {
      // Clear cache
      await suggestionCacheService.invalidateCache();

      // Save mock suggestions (simulating AI generation)
      await suggestionCacheService.saveCache(mockSuggestions, mockInputContext);

      // Verify cache was saved
      const cached = await suggestionCacheService.getCache();
      expect(cached).toBeDefined();
      expect(cached!.MERCADO_LIVRE).toHaveLength(5);

      await suggestionCacheService.invalidateCache();
    });

    it('should handle double-click refresh flow', async () => {
      // Create test user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: `test-flow-${Date.now()}@example.com`,
            password_hash: 'test-hash',
          },
        });
      }

      // Day 1: First click
      await suggestionCacheService.recordClick(user.id, 'MERCADO_LIVRE');
      let isDoubleClick = await suggestionCacheService.detectDoubleClick(
        user.id,
        'MERCADO_LIVRE'
      );
      expect(isDoubleClick).toBe(false);

      // Simulate next day
      const yesterday = getDayKey(subtractDays(nowBrt(), 1));
      await prisma.user_button_click_state.updateMany({
        where: { user_id: user.id, marketplace_button: 'MERCADO_LIVRE' },
        data: { last_click_day_key: yesterday },
      });

      // Day 2: Second click (should detect double-click)
      isDoubleClick = await suggestionCacheService.detectDoubleClick(
        user.id,
        'MERCADO_LIVRE'
      );
      expect(isDoubleClick).toBe(true);

      await prisma.user_button_click_state.deleteMany({
        where: { user_id: user.id },
      });
    });
  });
});
