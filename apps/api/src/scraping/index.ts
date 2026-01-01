import { AmazonScraper } from "./amazon.scraper.js";
import { MagaluScraper } from "./magalu.scraper.js";
import { MercadoLivreScraper } from "./mercadolivre.scraper.js";
import { ShopeeScraper } from "./shopee.scraper.js";
import { AFFILIATE_LINKS } from "./valid-links.js";
import type { MarketplaceEnum, MarketplaceScraper, ScrapeOptions, ScraperResult } from "./types.js";

export class ScraperRouter {
  private scrapers: MarketplaceScraper[];
  private affiliateMap: Map<string, MarketplaceEnum>;

  constructor() {
    this.scrapers = [
      new ShopeeScraper(),
      new MercadoLivreScraper(),
      new AmazonScraper(),
      new MagaluScraper(),
    ];
    this.affiliateMap = this.buildAffiliateMap();
  }

  private buildAffiliateMap() {
    const map = new Map<string, MarketplaceEnum>();
    AFFILIATE_LINKS.forEach((link) => {
      const scraper = this.scrapers.find((item) => item.canHandle(link));
      if (scraper) {
        map.set(link, scraper.marketplace);
      }
    });
    return map;
  }

  private getScraperByMarketplace(marketplace: MarketplaceEnum): MarketplaceScraper | null {
    return this.scrapers.find((scraper) => scraper.marketplace === marketplace) || null;
  }

  detectMarketplace(url: string): MarketplaceEnum | null {
    const affiliateMarketplace = this.affiliateMap.get(url);
    if (affiliateMarketplace) {
      return affiliateMarketplace;
    }

    const scraper = this.scrapers.find((item) => item.canHandle(url));
    return scraper?.marketplace || null;
  }

  getSupportedMarketplaces(): string[] {
    return this.scrapers.map((scraper) => scraper.marketplaceName);
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScraperResult> {
    const marketplace = this.detectMarketplace(url);
    const scraper = marketplace ? this.getScraperByMarketplace(marketplace) : null;

    if (!scraper) {
      return { success: false, error: "Marketplace not supported" };
    }

    let attempts = 0;
    const maxAttempts = 2;
    let lastError: string | undefined;

    while (attempts < maxAttempts) {
      attempts += 1;
      try {
        const result = await scraper.scrape(url, { ...options, originalUrl: url });
        if (result.success) {
          return result;
        }
        lastError = result.error;
        console.warn(
          `Scrape attempt ${attempts} failed for ${url} (${scraper.marketplaceName}):`,
          result.error
        );
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Unknown error";
        console.error(`Scrape attempt ${attempts} crashed for ${url}:`, error);
      }
    }

    return { success: false, error: lastError || "Failed to scrape product data" };
  }
}

export const scraperRouter = new ScraperRouter();

export * from "./types.js";
