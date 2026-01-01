import { BaseScraper } from './base-scraper.js';
import { ProductData } from './types.js';
import * as cheerio from 'cheerio';

/**
 * Mercado Livre marketplace scraper
 * Handles URLs like: https://produto.mercadolivre.com.br/MLB-123456
 */
export class MercadoLivreScraper extends BaseScraper {
  readonly marketplaceName = 'Mercado Livre';

  canHandle(url: string): boolean {
    return url.includes('mercadolivre.com.br') || url.includes('mercadolibre.com');
  }

  protected extractProductData($: cheerio.CheerioAPI, url: string): ProductData | null {
    try {
      // Mercado Livre has good structured data support
      // Try JSON-LD first
      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          if (jsonData['@type'] === 'Product') {
            const title = jsonData.name || '';
            const imageUrl = jsonData.image?.[0] || jsonData.image || '';
            const price = typeof jsonData.offers?.price === 'number'
              ? jsonData.offers.price
              : this.extractPrice(jsonData.offers?.price || '');

            const rating = jsonData.aggregateRating?.ratingValue || null;
            const reviewCount = jsonData.aggregateRating?.reviewCount || null;

            if (title && imageUrl && price) {
              return {
                title,
                price,
                imageUrl,
                productUrl: url,
                marketplace: 'MERCADO_LIVRE',
                rating,
                reviewCount,
                inStock: jsonData.offers?.availability === 'https://schema.org/InStock',
                scrapedAt: new Date(),
              };
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD from Mercado Livre');
        }
      }

      // Fallback: try meta tags and specific selectors
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1.ui-pdp-title').text().trim() ||
        $('h1').first().text().trim() ||
        '';

      const imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('figure.ui-pdp-gallery__figure img').first().attr('src') ||
        $('img[class*="ui-pdp"]').first().attr('src') ||
        '';

      // Price selectors for Mercado Livre
      const priceText =
        $('.andes-money-amount__fraction').first().text().trim() ||
        $('.price-tag-fraction').first().text().trim() ||
        $('meta[property="product:price:amount"]').attr('content') ||
        '';

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      // Try to get original price (before discount)
      const originalPriceText = $('.andes-money-amount--previous').first().text().trim();
      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;

      // Calculate discount if we have both prices
      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      // Try to get rating
      const ratingText = $('.ui-pdp-review__rating').first().text().trim() ||
                         $('[class*="rating"]').first().text().trim();
      const rating = this.extractRating(ratingText);

      // Try to get review count
      const reviewText = $('.ui-pdp-review__amount').first().text().trim() ||
                         $('[class*="review"]').first().text().trim();
      const reviewCount = this.extractReviewCount(reviewText);

      // Try to get seller
      const seller = $('.ui-pdp-seller__header__title').first().text().trim() ||
                     $('[class*="seller"]').first().text().trim() ||
                     undefined;

      return {
        title,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: url,
        marketplace: 'MERCADO_LIVRE',
        rating,
        reviewCount,
        seller,
        inStock: true, // ML usually shows only available products
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error extracting Mercado Livre product data:', error);
      return null;
    }
  }

  protected async scrapeWithPlaywright(url: string): Promise<ProductData | null> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({
        'User-Agent': this.USER_AGENT,
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for main content
      await page.waitForSelector('h1, .ui-pdp-title', { timeout: 10000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector('h1.ui-pdp-title, h1');
        const title = titleEl?.textContent?.trim() || '';

        const priceEl = document.querySelector('.andes-money-amount__fraction, .price-tag-fraction');
        const priceText = priceEl?.textContent?.trim() || '';

        const imgEl = document.querySelector('figure.ui-pdp-gallery__figure img, img[class*="ui-pdp"]');
        const imageUrl = imgEl?.getAttribute('src') || '';

        const originalPriceEl = document.querySelector('.andes-money-amount--previous');
        const originalPriceText = originalPriceEl?.textContent?.trim() || '';

        return { title, priceText, imageUrl, originalPriceText };
      });

      if (!data.title || !data.imageUrl || !data.priceText) {
        return null;
      }

      const price = this.extractPrice(data.priceText);
      if (!price) {
        return null;
      }

      const originalPrice = data.originalPriceText
        ? this.extractPrice(data.originalPriceText)
        : null;

      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      return {
        title: data.title,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl: data.imageUrl,
        productUrl: url,
        marketplace: 'MERCADO_LIVRE',
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
