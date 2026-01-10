import { prisma } from '../../db/prisma.js';
import { nowBrt, subtractDays } from '../../utils/time.js';
import { SUGGESTION_CONSTANTS } from '../../constants/suggestions.constants.js';
import type { InputContext, Marketplace } from '../../types/suggestions.types.js';

export class MetricsAnalyzerService {
  /**
   * Analyze metrics from the last N days to generate InputContext
   * Uses public_events and public_cards tables for real data
   */
  async analyzeMetrics(): Promise<InputContext> {
    const now = nowBrt();
    const startDate = subtractDays(now, SUGGESTION_CONSTANTS.METRICS_WINDOW_DAYS);

    console.log('[MetricsAnalyzer] Analyzing metrics from', startDate.toISOString(), 'to', now.toISOString());

    try {
      // Get aggregated event data by marketplace and category
      const events = await prisma.public_events.findMany({
        where: {
          created_at: { gte: startDate },
          event_type: { in: ['PUBLIC_CARD_VIEW', 'PUBLIC_CTA_CLICK', 'PUBLIC_CARD_CLICK'] },
        },
        select: {
          event_type: true,
          marketplace: true,
          card_id: true,
        },
      });

      // Get cards for category info
      const cards = await prisma.public_cards.findMany({
        where: {
          created_at: { gte: startDate },
          status: 'ACTIVE',
        },
        select: {
          id: true,
          marketplace: true,
          category: true,
          title: true,
        },
      });

      console.log('[MetricsAnalyzer] Found', events.length, 'events and', cards.length, 'cards');

      // If insufficient data, return default context
      if (events.length < 10 || cards.length < 5) {
        console.log('[MetricsAnalyzer] Insufficient data, using default context');
        return this.getDefaultInputContext();
      }

      // Build card lookup map
      const cardMap = new Map(cards.map(c => [c.id, c]));

      // Analyze categories
      const categoryCounts: Record<string, number> = {};
      const categoryClicks: Record<string, number> = {};
      const categoryViews: Record<string, number> = {};

      events.forEach(event => {
        if (!event.card_id) return;
        const card = cardMap.get(event.card_id);
        if (!card?.category) return;

        const category = card.category;
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;

        if (event.event_type === 'PUBLIC_CTA_CLICK' || event.event_type === 'PUBLIC_CARD_CLICK') {
          categoryClicks[category] = (categoryClicks[category] || 0) + 1;
        } else if (event.event_type === 'PUBLIC_CARD_VIEW') {
          categoryViews[category] = (categoryViews[category] || 0) + 1;
        }
      });

      const totalEvents = events.length;

      // Calculate dominant categories (top 4)
      const dominantCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({
          name,
          share: (count / totalEvents) * 100,
        }))
        .sort((a, b) => b.share - a.share)
        .slice(0, SUGGESTION_CONSTANTS.DOMINANT_CATEGORIES_COUNT);

      // Secondary categories (next 2)
      const secondaryCategories = Object.entries(categoryCounts)
        .map(([name, count]) => ({
          name,
          share: (count / totalEvents) * 100,
        }))
        .sort((a, b) => b.share - a.share)
        .slice(SUGGESTION_CONSTANTS.DOMINANT_CATEGORIES_COUNT, SUGGESTION_CONSTANTS.DOMINANT_CATEGORIES_COUNT + 2);

      // Categories to avoid (lowest CTR)
      const avoidCategories = Object.entries(categoryViews)
        .filter(([name]) => categoryViews[name] > 5) // Need min sample size
        .map(([name, views]) => ({
          name,
          ctr: views > 0 ? ((categoryClicks[name] || 0) / views) * 100 : 0,
        }))
        .sort((a, b) => a.ctr - b.ctr)
        .slice(0, 3)
        .map(c => c.name);

      // Analyze marketplace distribution
      const marketplaceData: Record<string, { count: number; clicks: number; views: number }> = {};
      SUGGESTION_CONSTANTS.MARKETPLACES.forEach(mp => {
        marketplaceData[mp] = { count: 0, clicks: 0, views: 0 };
      });

      events.forEach(event => {
        const mp = event.marketplace as Marketplace;
        if (!mp || !marketplaceData[mp]) return;

        marketplaceData[mp].count += 1;
        if (event.event_type === 'PUBLIC_CTA_CLICK' || event.event_type === 'PUBLIC_CARD_CLICK') {
          marketplaceData[mp].clicks += 1;
        } else if (event.event_type === 'PUBLIC_CARD_VIEW') {
          marketplaceData[mp].views += 1;
        }
      });

      const marketplaceDistributions: Record<Marketplace, { productCount: number; avgCTR: number; topCategories: { name: string; share: number }[] }> = {} as any;
      SUGGESTION_CONSTANTS.MARKETPLACES.forEach(mp => {
        const data = marketplaceData[mp];
        const avgCTR = data.views > 0 ? (data.clicks / data.views) * 100 : 0;

        // Get top categories for this marketplace
        const mpCards = cards.filter(c => c.marketplace === mp);
        const mpCategoryCounts: Record<string, number> = {};
        mpCards.forEach(c => {
          if (c.category) {
            mpCategoryCounts[c.category] = (mpCategoryCounts[c.category] || 0) + 1;
          }
        });

        const topCategories = Object.entries(mpCategoryCounts)
          .map(([name, count]) => ({
            name,
            share: mpCards.length > 0 ? (count / mpCards.length) * 100 : 0,
          }))
          .sort((a, b) => b.share - a.share)
          .slice(0, 3);

        marketplaceDistributions[mp] = {
          productCount: data.count,
          avgCTR,
          topCategories,
        };
      });

      // Extract top product patterns from titles
      const productPatterns = this.analyzeProductPatterns(cards.map(c => c.title));

      // Calculate CTR patterns (simplified without captions)
      const topCTRPatterns = this.getDefaultCTRPatterns();

      // Build InputContext
      const inputContext: InputContext = {
        dominantPersonas: this.getDefaultPersonas(),
        dominantCategories,
        secondaryCategories,
        avoidCategories,
        topCTRPatterns,
        topProductPatterns: productPatterns,
        marketplaceDistributions,
        targetPriceBands: {
          MERCADO_LIVRE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MERCADO_LIVRE.map(range => ({ range, count: 0 })),
          SHOPEE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.SHOPEE.map(range => ({ range, count: 0 })),
          AMAZON: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.AMAZON.map(range => ({ range, count: 0 })),
          MAGALU: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MAGALU.map(range => ({ range, count: 0 })),
        },
      };

      console.log('[MetricsAnalyzer] Real metrics analysis complete');
      return inputContext;

    } catch (error) {
      console.error('[MetricsAnalyzer] Error analyzing metrics:', error);
      return this.getDefaultInputContext();
    }

  }

  /**
   * Analyze product patterns from titles
   */
  private analyzeProductPatterns(titles: string[]): { pattern: string; clicks: number; examples: string[] }[] {
    const patternCounts: Record<string, { count: number; examples: string[] }> = {};

    titles.forEach(title => {
      const pattern = this.extractProductPattern(title);
      if (!patternCounts[pattern]) {
        patternCounts[pattern] = { count: 0, examples: [] };
      }
      patternCounts[pattern].count += 1;
      if (patternCounts[pattern].examples.length < 3) {
        patternCounts[pattern].examples.push(title);
      }
    });

    return Object.entries(patternCounts)
      .map(([pattern, data]) => ({
        pattern,
        clicks: data.count * 10, // Estimated clicks based on count
        examples: data.examples,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);
  }

  /**
   * Get default CTR patterns when no caption data available
   */
  private getDefaultCTRPatterns() {
    return [
      { pattern: 'antes/depois', ctr: 5.2, examples: ['Veja a transformação antes e depois!'] },
      { pattern: 'economia', ctr: 4.8, examples: ['Economize até 50% hoje!'] },
      { pattern: 'urgência', ctr: 4.5, examples: ['Últimas unidades disponíveis!'] },
      { pattern: 'desconto', ctr: 4.2, examples: ['Desconto imperdível de 30%!'] },
      { pattern: 'frete-grátis', ctr: 3.8, examples: ['Frete grátis para todo Brasil!'] },
    ];
  }

  /**
   * Get default personas when no data available
   */
  private getDefaultPersonas() {
    return [
      { name: 'Econômico Consciente', share: 40 },
      { name: 'Impulsivo Digital', share: 30 },
      { name: 'Caçador de Tendências', share: 30 },
    ];
  }

  /**
   * Get default InputContext when no metrics available
   */
  private getDefaultInputContext(): InputContext {
    return {
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
      avoidCategories: [],
      topCTRPatterns: [
        { pattern: 'antes/depois', ctr: 5.2, examples: ['Veja a transformação antes e depois!'] },
        { pattern: 'economia', ctr: 4.8, examples: ['Economize até 50% hoje!'] },
      ],
      topProductPatterns: [
        { pattern: 'kit', clicks: 1000, examples: ['Kit Completo', 'Kit Essencial'] },
        { pattern: 'conjunto', clicks: 800, examples: ['Conjunto Premium', 'Conjunto Moderno'] },
      ],
      marketplaceDistributions: {
        MERCADO_LIVRE: { productCount: 0, avgCTR: 0, topCategories: [] },
        SHOPEE: { productCount: 0, avgCTR: 0, topCategories: [] },
        AMAZON: { productCount: 0, avgCTR: 0, topCategories: [] },
        MAGALU: { productCount: 0, avgCTR: 0, topCategories: [] },
      },
      targetPriceBands: {
        MERCADO_LIVRE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MERCADO_LIVRE.map(range => ({ range, count: 0 })),
        SHOPEE: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.SHOPEE.map(range => ({ range, count: 0 })),
        AMAZON: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.AMAZON.map(range => ({ range, count: 0 })),
        MAGALU: SUGGESTION_CONSTANTS.TARGET_PRICE_BANDS.MAGALU.map(range => ({ range, count: 0 })),
      },
    };
  }

  /**
   * Extract patterns from caption (before/after, urgency, discount, etc.)
   */
  private extractPatterns(caption: string): string[] {
    const patterns: string[] = [];
    const lower = caption.toLowerCase();

    if (lower.includes('antes') && lower.includes('depois')) patterns.push('antes/depois');
    if (lower.includes('economize') || lower.includes('economia')) patterns.push('economia');
    if (lower.includes('urgente') || lower.includes('últimas unidades')) patterns.push('urgência');
    if (lower.match(/\d+%/)) patterns.push('desconto');
    if (lower.includes('kit') || lower.includes('conjunto')) patterns.push('kit/conjunto');
    if (lower.includes('grátis') || lower.includes('frete grátis')) patterns.push('frete-grátis');

    return patterns;
  }

  /**
   * Aggregate CTR patterns and calculate average CTR
   */
  private aggregateCTRPatterns(data: Array<{ pattern: string; clicks: number; impressions: number; example: string }>) {
    const patternMap: Record<string, { clicks: number; impressions: number; examples: Set<string> }> = {};

    data.forEach(item => {
      if (!patternMap[item.pattern]) {
        patternMap[item.pattern] = { clicks: 0, impressions: 0, examples: new Set() };
      }
      patternMap[item.pattern].clicks += item.clicks;
      patternMap[item.pattern].impressions += item.impressions;
      patternMap[item.pattern].examples.add(item.example);
    });

    return Object.entries(patternMap)
      .map(([pattern, data]) => ({
        pattern,
        ctr: data.impressions > 0 ? (data.clicks / data.impressions) * 100 : 0,
        examples: Array.from(data.examples).slice(0, 3),
      }))
      .sort((a, b) => b.ctr - a.ctr);
  }

  /**
   * Extract product pattern from title
   */
  private extractProductPattern(title: string): string {
    const lower = title.toLowerCase();

    if (lower.includes('kit')) return 'kit';
    if (lower.includes('conjunto')) return 'conjunto';
    if (lower.includes('pack')) return 'pack';
    if (lower.includes('combo')) return 'combo';
    if (lower.match(/\d+ em \d+/)) return 'multiplo';

    return 'individual';
  }

  /**
   * Extract marketplace from product URL
   */
  private extractMarketplaceFromUrl(url: string): Marketplace | null {
    const lower = url.toLowerCase();

    if (lower.includes('mercadolivre.com') || lower.includes('mercadolibre.com')) {
      return 'MERCADO_LIVRE';
    }
    if (lower.includes('shopee.com')) {
      return 'SHOPEE';
    }
    if (lower.includes('amazon.com')) {
      return 'AMAZON';
    }
    if (lower.includes('magazineluiza.com') || lower.includes('magalu.com')) {
      return 'MAGALU';
    }

    return null;
  }
}

export const metricsAnalyzerService = new MetricsAnalyzerService();
