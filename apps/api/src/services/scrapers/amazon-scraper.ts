import { BaseScraper } from './base-scraper.js';
import { ProductData } from './types.js';
import * as cheerio from 'cheerio';

/**
 * Amazon marketplace scraper
 * Handles URLs like: https://www.amazon.com.br/dp/B08XXX or /gp/product/B08XXX
 */
export class AmazonScraper extends BaseScraper {
  readonly marketplaceName = 'Amazon';

  canHandle(url: string): boolean {
    return url.includes('amazon.com.br') || url.includes('amazon.com');
  }

  protected extractProductData($: cheerio.CheerioAPI, url: string): ProductData | null {
    try {
      // Amazon has multiple layouts, try different selectors
      const title =
        $('#productTitle').text().trim() ||
        $('h1#title').text().trim() ||
        $('meta[name="title"]').attr('content') ||
        '';

      // Amazon image selectors
      const imageUrl =
        $('#landingImage').attr('src') ||
        $('#imgBlkFront').attr('src') ||
        $('.a-dynamic-image').first().attr('src') ||
        $('meta[property="og:image"]').attr('content') ||
        '';

      // Price selectors - Amazon has complex price structure
      let priceText =
        $('.a-price .a-offscreen').first().text().trim() ||
        $('#priceblock_ourprice').text().trim() ||
        $('#priceblock_dealprice').text().trim() ||
        $('.a-price-whole').first().text().trim() ||
        '';

      // Handle price with cents
      if (!priceText) {
        const whole = $('.a-price-whole').first().text().trim();
        const fraction = $('.a-price-fraction').first().text().trim();
        if (whole) {
          priceText = fraction ? `${whole}${fraction}` : whole;
        }
      }

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      // Try to get original price (list price)
      const originalPriceText =
        $('.a-price.a-text-price .a-offscreen').first().text().trim() ||
        $('#priceblock_saleprice').text().trim() ||
        '';

      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;

      // Calculate discount
      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      // Try to get rating
      const ratingText =
        $('.a-icon-star .a-icon-alt').first().text().trim() ||
        $('[data-hook="rating-out-of-text"]').first().text().trim() ||
        '';
      const rating = this.extractRating(ratingText);

      // Try to get review count
      const reviewText =
        $('#acrCustomerReviewText').text().trim() ||
        $('[data-hook="total-review-count"]').text().trim() ||
        '';
      const reviewCount = this.extractReviewCount(reviewText);

      // Check stock status
      const stockText = $('#availability').text().trim().toLowerCase();
      const inStock = !stockText.includes('indisponível') &&
                      !stockText.includes('unavailable') &&
                      !stockText.includes('out of stock');

      return {
        title,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: url,
        marketplace: 'AMAZON',
        rating,
        reviewCount,
        inStock,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error('Error extracting Amazon product data:', error);
      return null;
    }
  }

  protected async scrapeWithPlaywright(url: string): Promise<ProductData | null> {
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      // Amazon requires good headers to avoid bot detection
      await page.setExtraHTTPHeaders({
        'User-Agent': this.USER_AGENT,
        'Accept-Language': 'pt-BR,pt;q=0.9',
      });

      await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait for product title
      await page.waitForSelector('#productTitle, h1#title', { timeout: 10000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector('#productTitle, h1#title');
        const title = titleEl?.textContent?.trim() || '';

        const imgEl = document.querySelector('#landingImage, #imgBlkFront, .a-dynamic-image');
        const imageUrl = imgEl?.getAttribute('src') || '';

        // Get price
        let priceText = '';
        const priceOffscreen = document.querySelector('.a-price .a-offscreen');
        if (priceOffscreen) {
          priceText = priceOffscreen.textContent?.trim() || '';
        } else {
          const whole = document.querySelector('.a-price-whole');
          const fraction = document.querySelector('.a-price-fraction');
          if (whole) {
            priceText = whole.textContent?.trim() || '';
            if (fraction) {
              priceText += fraction.textContent?.trim() || '';
            }
          }
        }

        // Get original price
        const originalPriceEl = document.querySelector('.a-price.a-text-price .a-offscreen');
        const originalPriceText = originalPriceEl?.textContent?.trim() || '';

        // Get stock status
        const stockEl = document.querySelector('#availability');
        const stockText = stockEl?.textContent?.trim().toLowerCase() || '';
        const inStock = !stockText.includes('indisponível') &&
                       !stockText.includes('unavailable') &&
                       !stockText.includes('out of stock');

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
        marketplace: 'AMAZON',
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
