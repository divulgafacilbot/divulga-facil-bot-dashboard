import { UserProfile } from './user-profile-analyzer.service.js';

export interface ProductRecommendation {
  url: string;
  title: string;
  category: string;
  marketplace: string;
  price?: number;
  score: number; // 0-1 relevance score
}

/**
 * Product Recommendation Engine
 * Generates product recommendations based on user profile
 * Uses external APIs (SerpAPI, Google Shopping, etc.)
 */
export class ProductRecommendationService {
  /**
   * Generate product recommendations for user
   */
  async generateRecommendations(
    profile: UserProfile,
    count: number = 5
  ): Promise<ProductRecommendation[]> {
    const recommendations: ProductRecommendation[] = [];

    // Try SerpAPI Shopping first
    const serpRecommendations = await this.getRecommendationsFromSerpAPI(profile, count);
    recommendations.push(...serpRecommendations);

    // If not enough recommendations, try Google Shopping API
    if (recommendations.length < count) {
      const googleRecommendations = await this.getRecommendationsFromGoogleShopping(
        profile,
        count - recommendations.length
      );
      recommendations.push(...googleRecommendations);
    }

    // Sort by relevance score
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations.slice(0, count);
  }

  /**
   * Get recommendations from SerpAPI Shopping
   */
  private async getRecommendationsFromSerpAPI(
    profile: UserProfile,
    count: number
  ): Promise<ProductRecommendation[]> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log('[ProductRecommendation] SerpAPI key not configured');
      return [];
    }

    const recommendations: ProductRecommendation[] = [];

    // Try each preferred category
    for (const category of profile.preferredCategories.slice(0, 3)) {
      try {
        const query = this.buildSearchQuery(category, profile);
        const response = await fetch(
          `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${apiKey}&hl=pt&gl=br&num=${count}`
        );

        if (!response.ok) {
          continue;
        }

        const data = await response.json();
        const results = data.shopping_results || [];

        for (const result of results) {
          // Filter by excluded marketplaces
          const marketplace = this.detectMarketplaceFromUrl(result.link);
          if (profile.excludedMarketplaces.includes(marketplace)) {
            continue;
          }

          // Calculate relevance score
          const score = this.calculateRelevanceScore(result, profile);

          recommendations.push({
            url: result.link,
            title: result.title,
            category,
            marketplace,
            price: this.extractPrice(result.price),
            score,
          });
        }
      } catch (error) {
        console.error('[ProductRecommendation] SerpAPI error:', error);
      }
    }

    return recommendations;
  }

  /**
   * Get recommendations from Google Shopping API
   */
  private async getRecommendationsFromGoogleShopping(
    profile: UserProfile,
    count: number
  ): Promise<ProductRecommendation[]> {
    const apiKey = process.env.GOOGLE_SHOPPING_API_KEY;
    if (!apiKey) {
      console.log('[ProductRecommendation] Google Shopping API key not configured');
      return [];
    }

    // Similar implementation to SerpAPI
    // Using Google Content API for Shopping
    // https://developers.google.com/shopping-content/guides/quickstart

    return [];
  }

  /**
   * Build search query from category and profile
   */
  private buildSearchQuery(category: string, profile: UserProfile): string {
    const queries: Record<string, string> = {
      'Eletrônicos': 'eletrônicos novos',
      'Moda': 'roupas tendência',
      'Beleza': 'produtos beleza',
      'Casa e Decoração': 'decoração casa',
      'Esporte e Lazer': 'artigos esportivos',
      'Alimentos e Bebidas': 'alimentos gourmet',
      'Livros': 'livros mais vendidos',
      'Brinquedos': 'brinquedos populares',
      'Pet': 'produtos pet',
      'Automotivo': 'acessórios automotivos',
    };

    return queries[category] || category;
  }

  /**
   * Detect marketplace from product URL
   */
  private detectMarketplaceFromUrl(url: string): string {
    const lowercaseUrl = url.toLowerCase();

    if (lowercaseUrl.includes('shopee')) return 'SHOPEE';
    if (lowercaseUrl.includes('amazon')) return 'AMAZON';
    if (lowercaseUrl.includes('mercadolivre') || lowercaseUrl.includes('mercadolibre')) return 'MERCADO_LIVRE';
    if (lowercaseUrl.includes('aliexpress')) return 'ALIEXPRESS';
    if (lowercaseUrl.includes('magalu') || lowercaseUrl.includes('magazineluiza')) return 'MAGALU';
    if (lowercaseUrl.includes('americanas')) return 'AMERICANAS';
    if (lowercaseUrl.includes('shein')) return 'SHEIN';

    return 'UNKNOWN';
  }

  /**
   * Calculate relevance score (0-1)
   */
  private calculateRelevanceScore(
    product: any,
    profile: UserProfile
  ): number {
    let score = 0.5; // Base score

    // Price proximity (closer to average price = higher score)
    if (product.price && profile.averagePrice > 0) {
      const priceValue = this.extractPrice(product.price);
      if (priceValue) {
        const priceDiff = Math.abs(priceValue - profile.averagePrice);
        const priceScore = Math.max(0, 1 - priceDiff / profile.averagePrice);
        score += priceScore * 0.3;
      }
    }

    // Rating boost
    if (product.rating && product.rating >= 4.5) {
      score += 0.2;
    }

    return Math.min(1, score);
  }

  /**
   * Extract numeric price from string
   */
  private extractPrice(priceStr: string | number | undefined): number | undefined {
    if (typeof priceStr === 'number') return priceStr;
    if (!priceStr) return undefined;

    const cleaned = priceStr.toString().replace(/[^0-9,\.]/g, '');
    const normalized = cleaned.replace(',', '.');
    const value = parseFloat(normalized);

    return isNaN(value) ? undefined : value;
  }
}

export const productRecommendationService = new ProductRecommendationService();
