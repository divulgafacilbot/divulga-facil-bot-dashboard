import { BaseScraper } from './base-scraper.js';
import { ProductData } from './types.js';
import * as cheerio from 'cheerio';

/**
 * Magazine Luiza marketplace scraper
 * Handles URLs like: https://www.magazineluiza.com.br/produto/123456
 */
export class MagazineLuizaScraper extends BaseScraper {
  readonly marketplaceName = 'Magazine Luiza';

  canHandle(url: string): boolean {
    return url.includes('magazineluiza.com.br');
  }

  protected extractProductData($: cheerio.CheerioAPI, url: string): ProductData | null {
    try {
      // Magazine Luiza uses structured data
      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          // Can be a single product or array
          const productData = Array.isArray(jsonData)
            ? jsonData.find((item) => item['@type'] === 'Product')
            : jsonData['@type'] === 'Product'
            ? jsonData
            : null;

          if (productData) {
            const title = productData.name || '';
            const imageUrl = productData.image?.[0] || productData.image || '';
            const price = typeof productData.offers?.price === 'number'
              ? productData.offers.price
              : this.extractPrice(productData.offers?.price || '');

            const rating = productData.aggregateRating?.ratingValue || null;
            const reviewCount = productData.aggregateRating?.reviewCount || null;

            if (title && imageUrl && price) {
              return {
                title,
                price,
                imageUrl,
                productUrl: url,
                marketplace: 'MAGAZINE_LUIZA',
                rating,
                reviewCount,
                inStock: productData.offers?.availability === 'https://schema.org/InStock',
                scrapedAt: new Date(),
              };
            }
          }
        } catch (e) {
          console.log('Failed to parse JSON-LD from Magazine Luiza');
        }
      }

      // Fallback: try meta tags and specific selectors
      const title =
        $('meta[property="og:title"]').attr('content') ||
        $('h1[data-testid="heading-product-title"]').text().trim() ||
        $('h1').first().text().trim() ||
        '';

      const imageUrl =
        $('meta[property="og:image"]').attr('content') ||
        $('img[data-testid="image-selected-thumbnail"]').attr('src') ||
        $('img[class*="product"]').first().attr('src') ||
        '';

      // Price selectors for Magazine Luiza
      const priceText =
        $('[data-testid="price-value"]').first().text().trim() ||
        $('.sc-price-order').first().text().trim() ||
        $('meta[property="product:price:amount"]').attr('content') ||
        '';

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      // Try to get original price
      const originalPriceText =
        $('[data-testid="price-original"]').first().text().trim() ||
        $('.sc-price-from').first().text().trim() ||
        '';

      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;

      // Calculate discount
      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      // Try to get rating
      const ratingText =
        $('[data-testid="review-star-rating"]').first().attr('aria-label') ||
        $('[class*="rating"]').first().text().trim() ||
        '';
      const rating = this.extractRating(ratingText);

      // Try to get review count
      const reviewText =
        $('[data-testid="review-card-count"]').first().text().trim() ||
        $('[class*="review"]').first().text().trim() ||
        '';
      const reviewCount = this.extractReviewCount(reviewText);

      // Try to get seller
      const seller =
        $('[data-testid="seller-name"]').first().text().trim() ||
        $('[class*="seller"]').first().text().trim() ||
        undefined;

      // Check availability
      const stockText = $('[data-testid="buy-button"]').first().text().trim().toLowerCase() ||
                        $('button[class*="buy"]').first().text().trim().toLowerCase() ||
                        '';
      const inStock = !stockText.includes('indisponível') &&
                      !stockText.includes('esgotado') &&
                      stockText !== '';

      return {
        title,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: url,
        marketplace: 'MAGAZINE_LUIZA',
        rating,
        reviewCount,
        seller,
        inStock,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error extracting Magazine Luiza product data:', error);
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

      // Wait for product title
      await page.waitForSelector('h1, [data-testid="heading-product-title"]', { timeout: 10000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector('h1[data-testid="heading-product-title"], h1');
        const title = titleEl?.textContent?.trim() || '';

        const priceEl = document.querySelector('[data-testid="price-value"], .sc-price-order');
        const priceText = priceEl?.textContent?.trim() || '';

        const imgEl = document.querySelector(
          'img[data-testid="image-selected-thumbnail"], img[class*="product"]'
        );
        const imageUrl = imgEl?.getAttribute('src') || '';

        const originalPriceEl = document.querySelector(
          '[data-testid="price-original"], .sc-price-from'
        );
        const originalPriceText = originalPriceEl?.textContent?.trim() || '';

        const buyButton = document.querySelector('[data-testid="buy-button"], button[class*="buy"]');
        const stockText = buyButton?.textContent?.trim().toLowerCase() || '';
        const inStock = !stockText.includes('indisponível') &&
                       !stockText.includes('esgotado') &&
                       stockText !== '';

        return { title, priceText, imageUrl, originalPriceText, inStock };
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
        marketplace: 'MAGAZINE_LUIZA',
        rating: undefined,
        reviewCount: undefined,
        inStock: data.inStock,
        scrapedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }
}
