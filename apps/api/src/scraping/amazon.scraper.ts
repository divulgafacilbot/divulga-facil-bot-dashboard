import * as cheerio from "cheerio";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";

export class AmazonScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.AMAZON;
  readonly marketplaceName = "Amazon";

  canHandle(url: string): boolean {
    return url.includes("amazon.com.br") || url.includes("amazon.com") || url.includes("a.co");
  }

  protected extractProductData(
    $: cheerio.CheerioAPI,
    _resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    try {
      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");

      const title =
        $("#productTitle").text().trim() ||
        $("h1#title").text().trim() ||
        $('meta[name="title"]').attr("content") ||
        "";

      const imageUrl =
        $("#landingImage").attr("src") ||
        $("#imgBlkFront").attr("src") ||
        $(".a-dynamic-image").first().attr("src") ||
        $('meta[property="og:image"]').attr("content") ||
        "";

      let priceText =
        $(".a-price .a-offscreen").first().text().trim() ||
        $("#priceblock_ourprice").text().trim() ||
        $("#priceblock_dealprice").text().trim() ||
        $(".a-price-whole").first().text().trim() ||
        "";

      if (!priceText) {
        const whole = $(".a-price-whole").first().text().trim();
        const fraction = $(".a-price-fraction").first().text().trim();
        if (whole) {
          priceText = fraction ? `${whole}${fraction}` : whole;
        }
      }

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      const originalPriceText =
        $(".a-price.a-text-price .a-offscreen").first().text().trim() ||
        $("#priceblock_saleprice").text().trim() ||
        "";

      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;
      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      const ratingText = includeRating
        ? $(".a-icon-star .a-icon-alt").first().text().trim() ||
          $('[data-hook="rating-out-of-text"]').first().text().trim() ||
          ""
        : "";
      const rating = includeRating ? this.extractRating(ratingText) : undefined;

      const reviewText = includeReviewCount
        ? $("#acrCustomerReviewText").text().trim() ||
          $('[data-hook="total-review-count"]').text().trim() ||
          ""
        : "";
      const reviewCount = includeReviewCount ? this.extractReviewCount(reviewText) : undefined;

      const stockText = $("#availability").text().trim().toLowerCase();
      const inStock =
        !stockText.includes("indisponível") &&
        !stockText.includes("unavailable") &&
        !stockText.includes("out of stock");

      return {
        title,
        description: includeDescription ? undefined : undefined,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.AMAZON,
        rating,
        reviewCount,
        inStock,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("Error extracting Amazon product data:", error);
      return null;
    }
  }

  protected async scrapeWithPlaywright(
    resolvedUrl: string,
    originalUrl: string
  ): Promise<ProductData | null> {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage();

      await page.setExtraHTTPHeaders({
        "User-Agent": this.USER_AGENT,
        "Accept-Language": "pt-BR,pt;q=0.9",
      });

      await page.goto(resolvedUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("#productTitle, h1#title", { timeout: 10000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector("#productTitle, h1#title");
        const title = titleEl?.textContent?.trim() || "";

        const imgEl = document.querySelector("#landingImage, #imgBlkFront, .a-dynamic-image");
        const imageUrl = imgEl?.getAttribute("src") || "";

        let priceText = "";
        const priceOffscreen = document.querySelector(".a-price .a-offscreen");
        if (priceOffscreen) {
          priceText = priceOffscreen.textContent?.trim() || "";
        } else {
          const whole = document.querySelector(".a-price-whole");
          const fraction = document.querySelector(".a-price-fraction");
          if (whole) {
            priceText = whole.textContent?.trim() || "";
            if (fraction) {
              priceText += fraction.textContent?.trim() || "";
            }
          }
        }

        const originalPriceEl = document.querySelector(".a-price.a-text-price .a-offscreen");
        const originalPriceText = originalPriceEl?.textContent?.trim() || "";

        const stockEl = document.querySelector("#availability");
        const stockText = stockEl?.textContent?.trim().toLowerCase() || "";
        const inStock =
          !stockText.includes("indisponível") &&
          !stockText.includes("unavailable") &&
          !stockText.includes("out of stock");

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
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.AMAZON,
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
