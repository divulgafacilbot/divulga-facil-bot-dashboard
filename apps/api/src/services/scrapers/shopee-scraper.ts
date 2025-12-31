import { BaseScraper } from './base-scraper.js';
import { ProductData } from './types.js';
import * as cheerio from 'cheerio';

/**
 * Shopee marketplace scraper
 * Handles URLs like: https://shopee.com.br/product/123/456
 */
export class ShopeeScraper extends BaseScraper {
  readonly marketplaceName = 'Shopee';

  canHandle(url: string): boolean {
    return url.includes('shopee.com.br');
  }

  protected extractProductData($: cheerio.CheerioAPI, url: string): ProductData | null {
    try {
      // Shopee uses a lot of dynamic content, so we need to look for JSON-LD or meta tags
      // Try to extract from JSON-LD structured data
      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          if (jsonData['@type'] === 'Product') {
            const title = jsonData.name || '';
            const description = jsonData.description || undefined;
            const imageUrl = jsonData.image || '';
            const price = typeof jsonData.offers?.price === 'number'
              ? jsonData.offers.price
              : this.extractPrice(jsonData.offers?.price || '');

            const rating = jsonData.aggregateRating?.ratingValue || undefined;
            const reviewCount = jsonData.aggregateRating?.reviewCount || undefined;

            if (title && imageUrl && price) {
              return {
                title,
                description,
                price,
                imageUrl,
                productUrl: url,
                marketplace: 'SHOPEE',
                rating,
                reviewCount,
                inStock: jsonData.offers?.availability === 'https://schema.org/InStock',
                scrapedAt: new Date(),
              };
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD from Shopee');
        }
      }

      // Fallback: try meta tags and selectors
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1').first().text().trim() ||
        '';

      const description =
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="description"]').attr('content') ||
        $('.description, [class*="description"]').first().text().trim() ||
        undefined;

      const imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('img[itemprop="image"]').attr('src') ||
        '';

      const priceText =
        $('meta[property="product:price:amount"]').attr('content') ||
        $('.price, [class*="price"], [data-testid*="price"]').first().text().trim() ||
        '';

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      // Try to get rating
      const ratingText = $('.rating, [class*="rating"]').first().text().trim();
      const rating = this.extractRating(ratingText);

      // Try to get review count
      const reviewText = $('.reviews, [class*="review"]').first().text().trim();
      const reviewCount = this.extractReviewCount(reviewText);

      // Try to get sales quantity
      const salesText = $('.sold, [class*="sold"], [data-testid*="sold"]').first().text().trim();
      const salesQuantity = salesText ? this.extractReviewCount(salesText) : undefined;

      return {
        title,
        description,
        price,
        imageUrl,
        productUrl: url,
        marketplace: 'SHOPEE',
        rating,
        reviewCount,
        salesQuantity,
        inStock: true, // Default to true if we can't determine
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error extracting Shopee product data:', error);
      return null;
    }
  }

  protected async scrapeWithPlaywright(url: string): Promise<ProductData | null> {
    // Playwright implementation for Shopee
    // This would require launching a browser and waiting for dynamic content
    // For now, we'll throw an error to indicate it's not implemented
    // In production, you would use playwright to handle SPA content

    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      // Set user agent
      await page.setExtraHTTPHeaders({
        'User-Agent': this.USER_AGENT,
      });

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for content to load
      await page.waitForTimeout(2000);

      // Extract data
      const data = await page.evaluate(() => {
        // Try to find title
        const titleEl = document.querySelector('h1, [class*="title"]');
        const title = titleEl?.textContent?.trim() || '';

        // Try to find price
        const priceEl = document.querySelector('[class*="price"]');
        const priceText = priceEl?.textContent?.trim() || '';

        // Try to find image
        const imgEl = document.querySelector('img[class*="product"], img[itemprop="image"]');
        const imageUrl = imgEl?.getAttribute('src') || '';

        return { title, priceText, imageUrl };
      });

      if (!data.title || !data.imageUrl || !data.priceText) {
        return null;
      }

      const price = this.extractPrice(data.priceText);
      if (!price) {
        return null;
      }

      return {
        title: data.title,
        price,
        imageUrl: data.imageUrl,
        productUrl: url,
        marketplace: 'SHOPEE',
        rating: undefined,
        reviewCount: undefined,
        inStock: true,
        scrapedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }
}
