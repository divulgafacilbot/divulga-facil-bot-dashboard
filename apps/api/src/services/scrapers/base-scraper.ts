import axios from 'axios';
import * as cheerio from 'cheerio';
import { IMarketplaceScraper, ProductData, ScraperResult } from './types.js';

/**
 * Base scraper class with common functionality
 * Provides axios + cheerio as primary method and Playwright as fallback
 */
export abstract class BaseScraper implements IMarketplaceScraper {
  abstract readonly marketplaceName: string;

  /**
   * Timeout for HTTP requests (10 seconds)
   */
  protected readonly REQUEST_TIMEOUT = 10000;

  /**
   * User agent for requests
   */
  protected readonly USER_AGENT =
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  /**
   * Check if this scraper can handle the given URL
   */
  abstract canHandle(url: string): boolean;

  /**
   * Extract product data from HTML using cheerio
   */
  protected abstract extractProductData(
    $: cheerio.CheerioAPI,
    url: string
  ): ProductData | null;

  /**
   * Scrape using Playwright (fallback method)
   * To be implemented by subclasses if needed
   */
  protected async scrapeWithPlaywright(url: string): Promise<ProductData | null> {
    // Default implementation - can be overridden by subclasses
    throw new Error('Playwright scraping not implemented for this marketplace');
  }

  /**
   * Fetch HTML content using axios
   */
  protected async fetchHTML(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': this.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    return response.data;
  }

  /**
   * Main scrape method
   * Tries axios + cheerio first, falls back to Playwright if needed
   */
  async scrape(url: string): Promise<ScraperResult> {
    try {
      // Validate URL
      if (!this.canHandle(url)) {
        return {
          success: false,
          error: `URL not supported by ${this.marketplaceName} scraper`,
        };
      }

      // Try primary method: axios + cheerio
      try {
        const html = await this.fetchHTML(url);
        const $ = cheerio.load(html) as cheerio.CheerioAPI;
        const data = this.extractProductData($, url);

        if (data) {
          return {
            success: true,
            data,
          };
        }

        // If extraction failed, try Playwright
        console.log(`Cheerio extraction failed for ${url}, trying Playwright...`);
      } catch (axiosError) {
        console.log(`Axios fetch failed for ${url}, trying Playwright...`, axiosError);
      }

      // Fallback: Playwright
      try {
        const data = await this.scrapeWithPlaywright(url);

        if (data) {
          return {
            success: true,
            data,
          };
        }

        return {
          success: false,
          error: 'Failed to extract product data',
        };
      } catch (playwrightError) {
        console.error('Playwright scraping failed:', playwrightError);
        return {
          success: false,
          error: 'Failed to scrape product data with both methods',
        };
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Helper: Extract price from text (handles R$ 1.234,56 format)
   */
  protected extractPrice(text: string): number | null {
    // Remove R$, spaces, and convert , to .
    const cleaned = text
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .trim();

    const price = parseFloat(cleaned);
    return isNaN(price) ? null : price;
  }

  /**
   * Helper: Extract rating from text
   */
  protected extractRating(text: string): number | undefined {
    const match = text.match(/(\d+(\.\d+)?)/);
    if (!match) return undefined;

    const rating = parseFloat(match[1]);
    return isNaN(rating) ? undefined : rating;
  }

  /**
   * Helper: Extract review count from text
   */
  protected extractReviewCount(text: string): number | undefined {
    const cleaned = text.replace(/\D/g, '');
    const count = parseInt(cleaned, 10);
    return isNaN(count) ? undefined : count;
  }

  /**
   * Helper: Calculate discount percentage
   */
  protected calculateDiscount(originalPrice: number, currentPrice: number): number {
    if (originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }
}
