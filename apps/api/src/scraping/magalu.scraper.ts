import * as cheerio from "cheerio";
import axios from "axios";
import fs from "fs/promises";
import path from "path";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";

export class MagaluScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.MAGALU;
  readonly marketplaceName = "Magalu";

  canHandle(url: string): boolean {
    return (
      url.includes("magazineluiza.com.br") ||
      url.includes("magalu.com") ||
      url.includes("divulgador.magalu.com")
    );
  }

  async scrape(url: string, options?: ScrapeOptions) {
    const originalUrl = options?.originalUrl || url;
    const resolvedUrl = await this.resolveUrl(url);

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      return {
        success: false,
        error: "Captcha da Magalu detectado. Acesse o link no navegador, resolva o captcha e tente novamente.",
      };
    }

    try {
      const response = await axios.get(resolvedUrl, {
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

      const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res
        ?.responseUrl;
      if (responseUrl?.includes("validate.perfdrive.com")) {
        return {
          success: false,
          error: "Captcha da Magalu detectado. Acesse o link no navegador, resolva o captcha e tente novamente.",
        };
      }

      const $ = cheerio.load(response.data) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (data) {
        if (!this.isValidImageUrl(data.imageUrl)) {
          return {
            success: false,
            error: "Captcha da Magalu detectado. Acesse o link no navegador, resolva o captcha e tente novamente.",
          };
        }
        return { success: true, data };
      }
    } catch (error) {
      console.log(`Axios fetch failed for ${resolvedUrl}, trying Playwright...`, error);
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
        if (!this.isValidImageUrl(data.imageUrl)) {
      return {
        success: false,
        error: "Captcha da Magalu detectado. Acesse o link no navegador, resolva o captcha e tente novamente.",
      };
        }
        return { success: true, data };
      }
      return { success: false, error: "Failed to extract product data" };
    } catch (error) {
      return {
        success: false,
        error: "Failed to scrape product data with both methods",
      };
    }
  }

  protected async resolveUrl(url: string): Promise<string> {
    let resolvedUrl = await super.resolveUrl(url);

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      // Retry once for perfdrive challenges that may clear after a short delay.
      await new Promise((resolve) => setTimeout(resolve, 1500));
      resolvedUrl = await super.resolveUrl(url);
    }

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      const cookieHeader = await this.getMagaluCookieHeader();
      if (cookieHeader) {
        try {
          const response = await axios.get(url, {
            timeout: this.REQUEST_TIMEOUT,
            headers: {
              "User-Agent": this.USER_AGENT,
              "Accept-Language": "pt-BR,pt;q=0.9",
              Cookie: cookieHeader,
            },
          });
          const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res
            ?.responseUrl;
          if (responseUrl && !responseUrl.includes("validate.perfdrive.com")) {
            resolvedUrl = responseUrl;
          }
        } catch {
          // Ignore cookie retry errors, fallback to Playwright.
        }
      }
    }

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      const playwrightResolved = await this.resolveWithPlaywright(url);
      if (playwrightResolved) {
        resolvedUrl = playwrightResolved;
      }
    }

    const normalizedUrl = this.extractPerfdriveTarget(resolvedUrl) || resolvedUrl;
    return this.normalizeMagaluUrl(normalizedUrl);
  }

  protected extractProductData(
    $: cheerio.CheerioAPI,
    _resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    try {
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript) as Record<string, unknown>;
          const itemData = this.findProductData(nextData);
          const mapped = this.mapStateData(itemData, originalUrl, options);
          if (mapped) {
            return mapped;
          }
        } catch (error) {
          console.log("Failed to parse NEXT_DATA from Magalu", error);
        }
      }

      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
      const includeSeller = this.shouldIncludeField(options?.fields, "seller");

      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          const productData = Array.isArray(jsonData)
            ? jsonData.find((item) => item["@type"] === "Product")
            : jsonData["@type"] === "Product"
            ? jsonData
            : null;

          if (productData) {
            const title = productData.name || "";
            const imageUrl = productData.image?.[0] || productData.image || "";
            const price =
              typeof productData.offers?.price === "number"
                ? productData.offers.price
                : this.extractPrice(productData.offers?.price || "");

            const rating = includeRating
              ? productData.aggregateRating?.ratingValue || undefined
              : undefined;
            const reviewCount = includeReviewCount
              ? productData.aggregateRating?.reviewCount || undefined
              : undefined;

            if (title && imageUrl && price) {
              return {
                title,
                description: includeDescription ? productData.description || undefined : undefined,
                price,
                imageUrl,
                productUrl: originalUrl,
                marketplace: MarketplaceEnum.MAGALU,
                rating,
                reviewCount,
                inStock: productData.offers?.availability === "https://schema.org/InStock",
                scrapedAt: new Date(),
              };
            }
          }
        } catch (error) {
          console.log("Failed to parse JSON-LD from Magalu", error);
        }
      }

      const title =
        $('meta[property="og:title"]').attr("content") ||
        $('h1[data-testid="heading-product-title"]').text().trim() ||
        $("h1").first().text().trim() ||
        "";

      const imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('img[data-testid="image-selected-thumbnail"]').attr("src") ||
        $('img[class*="product"]').first().attr("src") ||
        "";

      const priceText =
        $('[data-testid="price-value"]').first().text().trim() ||
        $(".sc-price-order").first().text().trim() ||
        $('meta[property="product:price:amount"]').attr("content") ||
        "";

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      const originalPriceText =
        $('[data-testid="price-original"]').first().text().trim() ||
        $(".sc-price-from").first().text().trim() ||
        "";

      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;

      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      const ratingText = includeRating
        ? $('[data-testid="review-star-rating"]').first().attr("aria-label") ||
          $('[class*="rating"]').first().text().trim() ||
          ""
        : "";
      const rating = includeRating ? this.extractRating(ratingText) : undefined;

      const reviewText = includeReviewCount
        ? $('[data-testid="review-card-count"]').first().text().trim() ||
          $('[class*="review"]').first().text().trim() ||
          ""
        : "";
      const reviewCount = includeReviewCount ? this.extractReviewCount(reviewText) : undefined;

      const seller = includeSeller
        ? $('[data-testid="seller-name"]').first().text().trim() ||
          $('[class*="seller"]').first().text().trim() ||
          undefined
        : undefined;

      const stockText =
        $('[data-testid="buy-button"]').first().text().trim().toLowerCase() ||
        $('button[class*="buy"]').first().text().trim().toLowerCase() ||
        "";
      const inStock =
        !stockText.includes("indisponível") &&
        !stockText.includes("esgotado") &&
        stockText !== "";

      return {
        title,
        description: includeDescription ? undefined : undefined,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.MAGALU,
        rating,
        reviewCount,
        seller,
        inStock,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("Error extracting Magalu product data:", error);
      return null;
    }
  }

  protected async scrapeWithPlaywright(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.USER_AGENT,
        locale: "pt-BR",
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
      });
      const page = await context.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9",
      });

      await page.goto(resolvedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page
        .waitForSelector('h1, [data-testid="heading-product-title"]', { timeout: 10000 })
        .catch(() => {});

      const stateData = await page.evaluate(() => {
        const anyWindow = window as typeof window & {
          __INITIAL_STATE__?: Record<string, unknown>;
          __PRELOADED_STATE__?: Record<string, unknown>;
          __APOLLO_STATE__?: Record<string, unknown>;
        };

        if (anyWindow.__INITIAL_STATE__) {
          return anyWindow.__INITIAL_STATE__;
        }

        if (anyWindow.__PRELOADED_STATE__) {
          return anyWindow.__PRELOADED_STATE__;
        }

        if (anyWindow.__APOLLO_STATE__) {
          return anyWindow.__APOLLO_STATE__;
        }

        const nextDataEl = document.querySelector("#__NEXT_DATA__");
        if (nextDataEl?.textContent) {
          try {
            return JSON.parse(nextDataEl.textContent) as Record<string, unknown>;
          } catch {
            return null;
          }
        }

        return null;
      });

      if (stateData) {
        const itemData = this.findProductData(stateData);
        const mapped = this.mapStateData(itemData, originalUrl, options);
        if (mapped) {
          return mapped;
        }
      }

      const html = await page.content();
      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const htmlData = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (htmlData) {
        return htmlData;
      }

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector('h1[data-testid="heading-product-title"], h1');
        const title =
          titleEl?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.getAttribute("content") ||
          "";

        const priceEl = document.querySelector(
          '[data-testid="price-value"], .sc-price-order, [data-testid="price-default"]'
        );
        const priceText =
          priceEl?.textContent?.trim() ||
          document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") ||
          "";

        const imgEl = document.querySelector(
          'img[data-testid="image-selected-thumbnail"], img[class*="product"], img[itemprop="image"]'
        );
        const imageUrl =
          imgEl?.getAttribute("src") ||
          document.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
          "";

        const originalPriceEl = document.querySelector('[data-testid="price-original"], .sc-price-from');
        const originalPriceText = originalPriceEl?.textContent?.trim() || "";

        const buyButton = document.querySelector('[data-testid="buy-button"], button[class*="buy"]');
        const stockText = buyButton?.textContent?.trim().toLowerCase() || "";
        const inStock =
          !stockText.includes("indisponível") &&
          !stockText.includes("esgotado") &&
          stockText !== "";

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
        marketplace: MarketplaceEnum.MAGALU,
        rating: undefined,
        reviewCount: undefined,
        inStock: data.inStock,
        scrapedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }

  private extractPerfdriveTarget(url: string): string | null {
    try {
      const parsed = new URL(url);
      const target = parsed.searchParams.get("ssc");
      if (target) {
        return this.normalizeMagaluUrl(decodeURIComponent(target));
      }
    } catch (error) {
      console.error("Erro ao interpretar URL perfdrive:", error);
    }

    return null;
  }

  private normalizeMagaluUrl(url: string): string {
    try {
      const parsed = new URL(url.replace(/^http:\/\//i, "https://"));
      if (parsed.pathname.includes("/divulgador/oferta/")) {
        parsed.pathname = parsed.pathname.replace("/divulgador/oferta/", "/p/");
        parsed.searchParams.delete("promoter_id");
        parsed.searchParams.delete("partner_id");
      }
      return parsed.toString();
    } catch (error) {
      return url;
    }
  }

  private async getMagaluCookieHeader(): Promise<string> {
    try {
      const storagePath = this.getStorageStatePath();
      const raw = await fs.readFile(storagePath, "utf-8");
      const data = JSON.parse(raw) as { cookies?: Array<{ name: string; value: string; domain?: string }> };
      const cookies = (data.cookies || []).filter((cookie) =>
        (cookie.domain || "").includes("magazineluiza.com.br")
      );
      if (!cookies.length) {
        return "";
      }
      return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    } catch {
      return "";
    }
  }

  private getStorageStatePath(): string {
    return path.join(process.cwd(), ".cache", "magalu-playwright.json");
  }

  private async resolveWithPlaywright(url: string): Promise<string | null> {
    const { chromium } = await import("playwright");
    const storagePath = this.getStorageStatePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.USER_AGENT,
        locale: "pt-BR",
        storageState: await fs
          .readFile(storagePath, "utf-8")
          .then((value) => JSON.parse(value))
          .catch(() => undefined),
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
      });

      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      const finalUrl = page.url();

      if (finalUrl.includes("validate.perfdrive.com")) {
        return null;
      }

      await context.storageState({ path: storagePath });
      return finalUrl;
    } catch {
      return null;
    } finally {
      await browser.close();
    }
  }

  private isValidImageUrl(value: string): boolean {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  private mapStateData(
    data: Record<string, unknown> | null,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    if (!data) return null;

    const title =
      (typeof data.title === "string" && data.title) ||
      (typeof data.name === "string" && data.name) ||
      "";
    const imageUrl =
      (typeof data.image === "string" && data.image) ||
      (Array.isArray(data.images) ? (data.images[0] as string | undefined) : undefined) ||
      (Array.isArray(data.imageUrls) ? (data.imageUrls[0] as string | undefined) : undefined) ||
      "";

    const priceValue =
      (data.price as number | string | undefined) ||
      (data.priceValue as number | string | undefined) ||
      (data.salePrice as number | string | undefined) ||
      (data.bestPrice as number | string | undefined) ||
      (data.sellingPrice as number | string | undefined);
    const price =
      typeof priceValue === "number"
        ? priceValue
        : typeof priceValue === "string"
        ? this.extractPrice(priceValue)
        : null;

    if (!title || !imageUrl || !price) {
      return null;
    }

    const originalPriceValue =
      (data.originalPrice as number | string | undefined) ||
      (data.listPrice as number | string | undefined) ||
      (data.priceFrom as number | string | undefined);
    const originalPrice =
      typeof originalPriceValue === "number"
        ? originalPriceValue
        : typeof originalPriceValue === "string"
        ? this.extractPrice(originalPriceValue)
        : null;

    const discountPercentage =
      originalPrice && originalPrice > price
        ? this.calculateDiscount(originalPrice, price)
        : undefined;

    const includeDescription = this.shouldIncludeField(options?.fields, "description");

    return {
      title,
      description: includeDescription ? undefined : undefined,
      price,
      originalPrice: originalPrice || undefined,
      discountPercentage,
      imageUrl,
      productUrl: originalUrl,
      marketplace: MarketplaceEnum.MAGALU,
      rating: undefined,
      reviewCount: undefined,
      inStock: true,
      scrapedAt: new Date(),
    };
  }

  private findProductData(payload: unknown): Record<string, unknown> | null {
    const queue: unknown[] = [payload];
    const seen = new Set<unknown>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== "object") continue;
      if (seen.has(current)) continue;
      seen.add(current);

      const record = current as Record<string, unknown>;
      const hasName =
        typeof record.name === "string" || typeof record.title === "string";
      const hasPrice =
        typeof record.price === "number" ||
        typeof record.priceValue === "number" ||
        typeof record.salePrice === "number" ||
        typeof record.bestPrice === "number" ||
        typeof record.sellingPrice === "number" ||
        typeof record.price === "string" ||
        typeof record.priceValue === "string";
      const hasImage =
        typeof record.image === "string" ||
        (Array.isArray(record.images) && typeof record.images[0] === "string") ||
        (Array.isArray(record.imageUrls) && typeof record.imageUrls[0] === "string");

      if (hasName && hasPrice && hasImage) {
        return record;
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }

    return null;
  }
}
