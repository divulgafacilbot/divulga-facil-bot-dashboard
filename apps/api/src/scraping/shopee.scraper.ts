import * as cheerio from "cheerio";
import axios from "axios";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";

export class ShopeeScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.SHOPEE;
  readonly marketplaceName = "Shopee";

  canHandle(url: string): boolean {
    return (
      url.includes("shopee.com.br") ||
      url.includes("shopee.com") ||
      url.includes("s.shopee.com")
    );
  }

  async scrape(url: string, options?: ScrapeOptions) {
    const resolvedUrl = await this.resolveUrl(url);
    const ids = this.extractIds(resolvedUrl) || this.extractIds(url);
    const canonicalUrl = ids
      ? `https://shopee.com.br/product/${ids.shopId}/${ids.itemId}`
      : resolvedUrl;
    if (ids) {
      const apiResult = await this.fetchFromApi(
        ids.shopId,
        ids.itemId,
        url,
        canonicalUrl,
        options
      );
      if (apiResult) {
        return { success: true, data: apiResult };
      }
    }

    return super.scrape(canonicalUrl, { ...options, originalUrl: options?.originalUrl || url });
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
          const itemData = this.findItemData(nextData);
          const mapped = this.mapApiData(itemData, originalUrl, options);
          if (mapped) {
            return mapped;
          }
        } catch (error) {
          console.log("Failed to parse NEXT_DATA from Shopee", error);
        }
      }

      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
      const includeSalesQuantity = this.shouldIncludeField(options?.fields, "salesQuantity");

      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          if (jsonData["@type"] === "Product") {
            const title = jsonData.name || "";
            const description = includeDescription ? jsonData.description || undefined : undefined;
            const imageUrl = jsonData.image || "";
            const price =
              typeof jsonData.offers?.price === "number"
                ? jsonData.offers.price
                : this.extractPrice(jsonData.offers?.price || "");

            const rating = includeRating
              ? jsonData.aggregateRating?.ratingValue || undefined
              : undefined;
            const reviewCount = includeReviewCount
              ? jsonData.aggregateRating?.reviewCount || undefined
              : undefined;

            if (title && imageUrl && price) {
              return {
                title,
                description,
                price,
                imageUrl,
                productUrl: originalUrl,
                marketplace: MarketplaceEnum.SHOPEE,
                rating,
                reviewCount,
                salesQuantity: includeSalesQuantity ? undefined : undefined,
                inStock: jsonData.offers?.availability === "https://schema.org/InStock",
                scrapedAt: new Date(),
              };
            }
          }
        } catch (error) {
          console.log("Failed to parse JSON-LD from Shopee", error);
        }
      }

      const title =
        $('meta[property="og:title"]').attr("content") || $("h1").first().text().trim() || "";

      const description = includeDescription
        ? $('meta[property="og:description"]').attr("content") ||
          $('meta[name="description"]').attr("content") ||
          $(".description, [class*=\"description\"]").first().text().trim() ||
          undefined
        : undefined;

      const imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $('img[itemprop="image"]').attr("src") ||
        "";

      const priceText =
        $('meta[property="product:price:amount"]').attr("content") ||
        $(".price, [class*=\"price\"], [data-testid*=\"price\"]").first().text().trim() ||
        "";

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl || !price) {
        return null;
      }

      const ratingText = includeRating
        ? $(".rating, [class*=\"rating\"]").first().text().trim()
        : "";
      const rating = includeRating ? this.extractRating(ratingText) : undefined;

      const reviewText = includeReviewCount
        ? $(".reviews, [class*=\"review\"]").first().text().trim()
        : "";
      const reviewCount = includeReviewCount ? this.extractReviewCount(reviewText) : undefined;

      const salesText = includeSalesQuantity
        ? $(".sold, [class*=\"sold\"], [data-testid*=\"sold\"]").first().text().trim()
        : "";
      const salesQuantity = includeSalesQuantity ? this.extractReviewCount(salesText) : undefined;

      return {
        title,
        description,
        price,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.SHOPEE,
        rating,
        reviewCount,
        salesQuantity,
        inStock: true,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("Error extracting Shopee product data:", error);
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
        .waitForSelector('meta[property="og:title"], script[type="application/ld+json"], h1', {
          timeout: 15000,
        })
        .catch(() => {});
      const apiResponse = await page
        .waitForResponse(
          (response) =>
            response.ok() &&
            (response.url().includes("/api/v4/item/get") ||
              response.url().includes("/api/v4/pdp/get_pc")),
          { timeout: 15000 }
        )
        .catch(() => null);

      if (apiResponse) {
        const json = await apiResponse.json().catch(() => null);
        const apiData = json?.data?.item || json?.data || json?.item || null;
        const mapped = this.mapApiData(apiData, originalUrl, options);
        if (mapped) {
          return mapped;
        }
      }

      const stateData = await page.evaluate(() => {
        const anyWindow = window as typeof window & {
          __INITIAL_STATE__?: Record<string, unknown>;
          __PRELOADED_STATE__?: Record<string, unknown>;
        };

        if (anyWindow.__INITIAL_STATE__) {
          return anyWindow.__INITIAL_STATE__;
        }

        if (anyWindow.__PRELOADED_STATE__) {
          return anyWindow.__PRELOADED_STATE__;
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
        const itemData = this.findItemData(stateData);
        const mapped = this.mapApiData(itemData, originalUrl, options);
        if (mapped) {
          return mapped;
        }
      }

      const html = await page.content();
      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const cheerioData = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (cheerioData) {
        return cheerioData;
      }

      const data = await page.evaluate(() => {
        const titleEl = document.querySelector("h1, [class*=\"title\"]");
        const title = titleEl?.textContent?.trim() || "";

        const priceEl = document.querySelector("[class*=\"price\"]");
        const priceText = priceEl?.textContent?.trim() || "";

        const imgEl = document.querySelector("img[class*=\"product\"], img[itemprop=\"image\"]");
        const imageUrl = imgEl?.getAttribute("src") || "";

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
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.SHOPEE,
        rating: undefined,
        reviewCount: undefined,
        inStock: true,
        scrapedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }

  private extractIds(url: string): { shopId: string; itemId: string } | null {
    const slashMatch = url.match(/\/(\d+)\/(\d+)/);
    if (slashMatch) {
      return { shopId: slashMatch[1], itemId: slashMatch[2] };
    }

    const dottedMatch = url.match(/i\.(\d+)\.(\d+)/);
    if (dottedMatch) {
      return { shopId: dottedMatch[1], itemId: dottedMatch[2] };
    }

    return null;
  }

  private normalizePrice(value?: number | null): number | null {
    if (!value) return null;
    if (value > 1000000) return value / 100000;
    if (value > 10000) return value / 100;
    return value;
  }

  private mapApiData(
    data: Record<string, unknown> | null,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    const itemData =
      (data as { item?: Record<string, unknown> } | null)?.item ??
      (data as Record<string, unknown> | null);
    if (!itemData) return null;

    const name = itemData.name || itemData.item_name;
    const title = typeof name === "string" ? name : "";

    const imageHash =
      (itemData.image as string | undefined) ||
      (Array.isArray(itemData.images) ? (itemData.images[0] as string | undefined) : undefined);
    const imageUrl = imageHash
      ? imageHash.startsWith("http")
        ? imageHash
        : `https://cf.shopee.com.br/file/${imageHash}`
      : "";

    const price = this.normalizePrice(
      (itemData.price as number | undefined) ||
        (itemData.price_min as number | undefined) ||
        (itemData.price_max as number | undefined) ||
        (itemData.item_price as number | undefined)
    );

    const originalPrice = this.normalizePrice(
      (itemData.price_before_discount as number | undefined) ||
        (itemData.price_max_before_discount as number | undefined) ||
        (itemData.item_price_before_discount as number | undefined)
    );

    const discountPercentage =
      originalPrice && price ? this.calculateDiscount(originalPrice, price) : undefined;

    if (!title || !imageUrl || !price) {
      return null;
    }

    const includeDescription = this.shouldIncludeField(options?.fields, "description");
    const includeRating = this.shouldIncludeField(options?.fields, "rating");
    const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
    const includeSalesQuantity = this.shouldIncludeField(options?.fields, "salesQuantity");

    return {
      title,
      description: includeDescription
        ? (itemData.description as string | undefined) || undefined
        : undefined,
      price,
      originalPrice: originalPrice || undefined,
      discountPercentage,
      imageUrl,
      productUrl: originalUrl,
      marketplace: MarketplaceEnum.SHOPEE,
      rating: includeRating
        ? ((itemData.item_rating as { rating_star?: number } | undefined)?.rating_star ??
            undefined)
        : undefined,
      reviewCount: includeReviewCount
        ? ((itemData.item_rating as { rating_count?: number[] } | undefined)?.rating_count?.[0] ??
            undefined)
        : undefined,
      salesQuantity: includeSalesQuantity
        ? (itemData.historical_sold as number | undefined) ||
          (itemData.sold as number | undefined) ||
          undefined
        : undefined,
      inStock:
        typeof itemData.stock === "number"
          ? itemData.stock > 0
          : typeof itemData.normal_stock === "number"
          ? itemData.normal_stock > 0
          : true,
      scrapedAt: new Date(),
    };
  }

  private findItemData(payload: unknown): Record<string, unknown> | null {
    const queue: unknown[] = [payload];
    const seen = new Set<unknown>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== "object") continue;
      if (seen.has(current)) continue;
      seen.add(current);

      const record = current as Record<string, unknown>;
      const hasName =
        typeof record.name === "string" || typeof record.item_name === "string";
      const hasPrice =
        typeof record.price === "number" ||
        typeof record.price_min === "number" ||
        typeof record.price_max === "number" ||
        typeof record.item_price === "number";
      const hasImage =
        typeof record.image === "string" ||
        (Array.isArray(record.images) && typeof record.images[0] === "string");

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

  private async fetchFromApi(
    shopId: string,
    itemId: string,
    originalUrl: string,
    resolvedUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    try {
      const landingResponse = await axios.get(resolvedUrl, {
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
      const landingCookies =
        landingResponse.headers?.["set-cookie"]
          ?.map((cookie) => cookie.split(";")[0])
          .join("; ") || "";

      const response = await axios.get(
        `https://shopee.com.br/api/v4/item/get?shopid=${shopId}&itemid=${itemId}`,
        {
          timeout: this.REQUEST_TIMEOUT,
          headers: {
            "User-Agent": this.USER_AGENT,
            "Accept-Language": "pt-BR,pt;q=0.9",
            Accept: "application/json, text/plain, */*",
            Origin: "https://shopee.com.br",
            Referer: resolvedUrl,
            "X-Requested-With": "XMLHttpRequest",
            "X-Api-Source": "pc",
            Cookie: landingCookies,
          },
        }
      );

      const data = response.data?.data;
      return this.mapApiData(data, originalUrl, options);
    } catch (error) {
      console.error("Erro ao buscar dados da Shopee API:", error);
      return null;
    }
  }
}
