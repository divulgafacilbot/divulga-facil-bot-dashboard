import { ShopeeScraper } from './shopee-scraper.js';
import { MercadoLivreScraper } from './mercado-livre-scraper.js';
import { AmazonScraper } from './amazon-scraper.js';
import { MagazineLuizaScraper } from './magazine-luiza-scraper.js';
import { IMarketplaceScraper, ScraperResult } from './types.js';

/**
 * Scraper manager that routes URLs to appropriate scrapers
 */
export class ScraperManager {
  private scrapers: IMarketplaceScraper[];

  constructor() {
    this.scrapers = [
      new ShopeeScraper(),
      new MercadoLivreScraper(),
      new AmazonScraper(),
      new MagazineLuizaScraper(),
    ];
  }

  /**
   * Find appropriate scraper for a URL
   */
  private findScraper(url: string): IMarketplaceScraper | null {
    return this.scrapers.find((scraper) => scraper.canHandle(url)) || null;
  }

  /**
   * Detect marketplace from URL
   */
  detectMarketplace(url: string): string | null {
    const scraper = this.findScraper(url);
    return scraper?.marketplaceName || null;
  }

  /**
   * Scrape product data from any supported marketplace
   */
  async scrape(url: string): Promise<ScraperResult> {
    const scraper = this.findScraper(url);

    if (!scraper) {
      return {
        success: false,
        error: 'Marketplace not supported',
      };
    }

    console.log(`Scraping with ${scraper.marketplaceName} scraper...`);
    return await scraper.scrape(url);
  }

  /**
   * Get list of supported marketplaces
   */
  getSupportedMarketplaces(): string[] {
    return this.scrapers.map((s) => s.marketplaceName);
  }
}

// Export singleton instance
export const scraperManager = new ScraperManager();

// Export types and classes
export * from './types.js';
export { ShopeeScraper } from './shopee-scraper.js';
export { MercadoLivreScraper } from './mercado-livre-scraper.js';
export { AmazonScraper } from './amazon-scraper.js';
export { MagazineLuizaScraper } from './magazine-luiza-scraper.js';
