import axios from "axios";
import * as cheerio from "cheerio";
import type { MarketplaceScraper, ProductData, ScrapeOptions, ScraperResult, ScrapeField } from "./types.js";

export abstract class BaseScraper implements MarketplaceScraper {
  abstract readonly marketplace: MarketplaceScraper["marketplace"];
  abstract readonly marketplaceName: string;

  protected readonly REQUEST_TIMEOUT = 12000;
  protected readonly USER_AGENT =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

  abstract canHandle(url: string): boolean;

  protected abstract extractProductData(
    $: cheerio.CheerioAPI,
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null;

  protected async scrapeWithPlaywright(
    _resolvedUrl: string,
    _originalUrl: string,
    _options?: ScrapeOptions
  ): Promise<ProductData | null> {
    throw new Error("Playwright scraping not implemented for this marketplace");
  }

  protected shouldIncludeField(fields: ScrapeField[] | undefined, field: ScrapeField): boolean {
    if (!fields || fields.length === 0) return true;
    return fields.includes(field);
  }

  protected async resolveUrl(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        timeout: this.REQUEST_TIMEOUT,
        maxRedirects: 5,
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });

      const resolved = (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl;
      return resolved || url;
    } catch (error) {
      console.log("Falha ao resolver URL, usando original:", error);
      return url;
    }
  }

  protected async fetchHTML(url: string): Promise<string> {
    const response = await axios.get(url, {
      timeout: this.REQUEST_TIMEOUT,
      headers: {
        "User-Agent": this.USER_AGENT,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        DNT: "1",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    return response.data;
  }

  async scrape(url: string, options?: ScrapeOptions): Promise<ScraperResult> {
    const originalUrl = options?.originalUrl || url;
    const resolvedUrl = await this.resolveUrl(url);

    try {
      if (!this.canHandle(resolvedUrl) && !this.canHandle(originalUrl)) {
        return {
          success: false,
          error: `URL not supported by ${this.marketplaceName} scraper`,
        };
      }

      try {
        const html = await this.fetchHTML(resolvedUrl);
        const $ = cheerio.load(html) as cheerio.CheerioAPI;
        const data = this.extractProductData($, resolvedUrl, originalUrl, options);

        if (data) {
          return { success: true, data };
        }

        console.log(`Cheerio extraction failed for ${resolvedUrl}, trying Playwright...`);
      } catch (axiosError) {
        console.log(`Axios fetch failed for ${resolvedUrl}, trying Playwright...`, axiosError);
      }

      if (options?.skipPlaywright) {
        return {
          success: false,
          error: "Playwright skipped for validation",
        };
      }

      try {
        const data = await this.scrapeWithPlaywright(resolvedUrl, originalUrl, options);
        if (data) {
          return { success: true, data };
        }

        return { success: false, error: "Failed to extract product data" };
      } catch (playwrightError) {
        console.error("Playwright scraping failed:", playwrightError);
        return {
          success: false,
          error: "Failed to scrape product data with both methods",
        };
      }
    } catch (error) {
      console.error(`Error scraping ${resolvedUrl}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  protected extractPrice(text: string): number | null {
    const cleaned = text
      .replace(/R\$\s*/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .trim();

    const price = parseFloat(cleaned);
    return Number.isNaN(price) ? null : price;
  }

  protected extractRating(text: string): number | undefined {
    const match = text.match(/(\d+(\.\d+)?)/);
    if (!match) return undefined;

    const rating = parseFloat(match[1]);
    return Number.isNaN(rating) ? undefined : rating;
  }

  protected extractReviewCount(text: string): number | undefined {
    const cleaned = text.replace(/\D/g, "");
    const count = parseInt(cleaned, 10);
    return Number.isNaN(count) ? undefined : count;
  }

  protected calculateDiscount(originalPrice: number, currentPrice: number): number {
    if (originalPrice <= currentPrice) return 0;
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
  }
}
