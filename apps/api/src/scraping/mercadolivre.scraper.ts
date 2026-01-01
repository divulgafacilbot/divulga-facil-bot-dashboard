import * as cheerio from "cheerio";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";

export class MercadoLivreScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.MERCADO_LIVRE;
  readonly marketplaceName = "Mercado Livre";

  canHandle(url: string): boolean {
    return (
      url.includes("mercadolivre.com.br") ||
      url.includes("mercadolibre.com") ||
      url.includes("mercadolivre.com/sec") ||
      url.includes("mercadolivre.com")
    );
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
      const includeSalesQuantity = this.shouldIncludeField(options?.fields, "salesQuantity");
      const includeSeller = this.shouldIncludeField(options?.fields, "seller");

      const card = $(".poly-card").first();
      if (card.length) {
        const cardTitle = card.find(".poly-component__title").first().text().trim();
        const cardImageEl = card.find(".poly-component__picture").first();
        const cardImage =
          cardImageEl.attr("data-src") ||
          cardImageEl.attr("data-srcset")?.split(" ")[0] ||
          cardImageEl.attr("src") ||
          card.find('img[alt]').first().attr("data-src") ||
          card.find('img[alt]').first().attr("src") ||
          "";
        const cardPriceAria =
          card.find(".poly-price__current [aria-label]").first().attr("aria-label") || "";
        const cardPriceText =
          this.parsePriceText(cardPriceAria) ??
          this.extractPrice(
            card.find(".poly-price__current .andes-money-amount__fraction").first().text().trim()
          );
        const cardOriginalText = card.find(".andes-money-amount--previous").first().text().trim();
        const cardOriginalPrice = cardOriginalText ? this.extractPrice(cardOriginalText) : null;

        if (cardTitle && cardImage && cardPriceText) {
          const discountPercentage =
            cardOriginalPrice && cardOriginalPrice > cardPriceText
              ? this.calculateDiscount(cardOriginalPrice, cardPriceText)
              : undefined;

          return {
            title: cardTitle,
            description: includeDescription ? undefined : undefined,
            price: cardPriceText,
            originalPrice: cardOriginalPrice || undefined,
            discountPercentage,
            imageUrl: cardImage,
            productUrl: originalUrl,
            marketplace: MarketplaceEnum.MERCADO_LIVRE,
            rating: undefined,
            reviewCount: undefined,
            salesQuantity: undefined,
            seller: includeSeller
              ? card.find(".poly-component__seller").first().text().trim() || undefined
              : undefined,
            inStock: true,
            scrapedAt: new Date(),
          };
        }
      }

      const jsonLdScript = $('script[type="application/ld+json"]').html();

      if (jsonLdScript) {
        try {
          const jsonData = JSON.parse(jsonLdScript);

          if (jsonData["@type"] === "Product") {
            const title = jsonData.name || "";
            const imageUrl = jsonData.image?.[0] || jsonData.image || "";
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
                description: includeDescription ? jsonData.description || undefined : undefined,
                price,
                imageUrl,
                productUrl: originalUrl,
                marketplace: MarketplaceEnum.MERCADO_LIVRE,
                rating,
                reviewCount,
                inStock: jsonData.offers?.availability === "https://schema.org/InStock",
                scrapedAt: new Date(),
              };
            }
          }
        } catch (error) {
          console.log("Failed to parse JSON-LD from Mercado Livre", error);
        }
      }

      const title =
        $(".poly-component__title").first().text().trim() ||
        $('meta[property="og:title"]').attr("content") ||
        $("h1.ui-pdp-title").text().trim() ||
        $("h1").first().text().trim() ||
        "";

      const imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $("figure.ui-pdp-gallery__figure img").first().attr("src") ||
        $('img[class*="ui-pdp"]').first().attr("src") ||
        "";

      const priceAria =
        $(".poly-price__current [aria-label]").first().attr("aria-label") ||
        $('.poly-price__current [role="img"][aria-label]').first().attr("aria-label") ||
        $('.andes-money-amount[role="img"][aria-label]').first().attr("aria-label") ||
        $('meta[property="product:price:amount"]').attr("content") ||
        "";

      const priceText =
        this.parsePriceText(priceAria) ||
        $(".poly-price__current .andes-money-amount__fraction").first().text().trim() ||
        $(".andes-money-amount__fraction").first().text().trim() ||
        $(".price-tag-fraction").first().text().trim() ||
        "";

      const price =
        typeof priceText === "number"
          ? priceText
          : this.extractPrice(String(priceText));

      if (!title || !imageUrl || !price) {
        return null;
      }

      const originalPriceText = $(".andes-money-amount--previous").first().text().trim();
      const originalPrice = originalPriceText ? this.extractPrice(originalPriceText) : null;

      const discountPercentage =
        originalPrice && originalPrice > price
          ? this.calculateDiscount(originalPrice, price)
          : undefined;

      const ratingText = includeRating
        ? $(".ui-pdp-review__rating").first().text().trim() ||
          $('[class*="rating"]').first().text().trim()
        : "";
      const rating = includeRating ? this.extractRating(ratingText) : undefined;

      const reviewText = includeReviewCount
        ? $(".ui-pdp-review__amount").first().text().trim() ||
          $('[class*="review"]').first().text().trim()
        : "";
      const reviewCount = includeReviewCount ? this.extractReviewCount(reviewText) : undefined;

      const seller = includeSeller
        ? $(".ui-pdp-seller__header__title").first().text().trim() ||
          $('[class*="seller"]').first().text().trim() ||
          undefined
        : undefined;

      const salesText = includeSalesQuantity
        ? $('[class*="sold"]').first().text().trim()
        : "";
      const salesQuantity = includeSalesQuantity ? this.extractReviewCount(salesText) : undefined;

      return {
        title,
        description: includeDescription ? undefined : undefined,
        price,
        originalPrice: originalPrice || undefined,
        discountPercentage,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.MERCADO_LIVRE,
        rating,
        reviewCount,
        salesQuantity,
        seller,
        inStock: true,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error("Error extracting Mercado Livre product data:", error);
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
      });

      await page.goto(resolvedUrl, { waitUntil: "networkidle", timeout: 30000 });
      await page.waitForSelector("h1, .ui-pdp-title", { timeout: 10000 }).catch(() => {});

      const data = await page.evaluate(() => {
        const card = document.querySelector(".poly-card");
        const cardTitle =
          card?.querySelector(".poly-component__title")?.textContent?.trim() || "";
        const cardImageEl = card?.querySelector(".poly-component__picture");
        const cardImage =
          cardImageEl?.getAttribute("data-src") ||
          cardImageEl?.getAttribute("data-srcset")?.split(" ")[0] ||
          cardImageEl?.getAttribute("src") ||
          card?.querySelector("img[alt]")?.getAttribute("data-src") ||
          card?.querySelector("img[alt]")?.getAttribute("src") ||
          "";
        const cardPriceAria =
          card?.querySelector(".poly-price__current [aria-label]")?.getAttribute("aria-label") ||
          "";
        const cardPriceText =
          card?.querySelector(".poly-price__current .andes-money-amount__fraction")?.textContent?.trim() ||
          "";
        const cardOriginalPriceText =
          card?.querySelector(".andes-money-amount--previous")?.textContent?.trim() || "";

        const titleEl = document.querySelector(".poly-component__title, h1.ui-pdp-title, h1");
        const title = titleEl?.textContent?.trim() || "";

        const priceAria =
          document
            .querySelector(".poly-price__current [aria-label]")
            ?.getAttribute("aria-label") ||
          document
            .querySelector('.andes-money-amount[role=\"img\"][aria-label]')
            ?.getAttribute("aria-label") ||
          document
            .querySelector('meta[property=\"product:price:amount\"]')
            ?.getAttribute("content") ||
          "";

        const priceEl = document.querySelector(
          ".poly-price__current .andes-money-amount__fraction, .andes-money-amount__fraction, .price-tag-fraction"
        );
        const priceText = priceEl?.textContent?.trim() || "";

        const imgEl = document.querySelector(
          "figure.ui-pdp-gallery__figure img, img[class*=\"ui-pdp\"]"
        );
        const imageUrl = imgEl?.getAttribute("src") || "";

        const originalPriceEl = document.querySelector(".andes-money-amount--previous");
        const originalPriceText = originalPriceEl?.textContent?.trim() || "";

        return {
          cardTitle,
          cardImage,
          cardPriceAria,
          cardPriceText,
          cardOriginalPriceText,
          title,
          priceText,
          priceAria,
          imageUrl,
          originalPriceText,
        };
      });

      const cardPrice = this.parsePriceText(data.cardPriceAria || "");
      const cardPriceText = cardPrice ?? this.extractPrice(data.cardPriceText || "");
      if (data.cardTitle && data.cardImage && cardPriceText) {
        const cardOriginalPrice = data.cardOriginalPriceText
          ? this.extractPrice(data.cardOriginalPriceText)
          : null;
        const discountPercentage =
          cardOriginalPrice && cardOriginalPrice > cardPriceText
            ? this.calculateDiscount(cardOriginalPrice, cardPriceText)
            : undefined;

        return {
          title: data.cardTitle,
          price: cardPriceText,
          originalPrice: cardOriginalPrice || undefined,
          discountPercentage,
          imageUrl: data.cardImage,
          productUrl: originalUrl,
          marketplace: MarketplaceEnum.MERCADO_LIVRE,
          rating: undefined,
          reviewCount: undefined,
          inStock: true,
          scrapedAt: new Date(),
        };
      }

      const parsedAriaPrice = this.parsePriceText(data.priceAria || "");
      const priceText = parsedAriaPrice ? String(parsedAriaPrice) : data.priceText;

      if (!data.title || !data.imageUrl || !priceText) {
        return null;
      }

      const price =
        parsedAriaPrice ?? this.extractPrice(priceText);
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
        marketplace: MarketplaceEnum.MERCADO_LIVRE,
        rating: undefined,
        reviewCount: undefined,
        inStock: true,
        scrapedAt: new Date(),
      };
    } finally {
      await browser.close();
    }
  }

  private parsePriceText(text: string): number | null {
    if (!text) return null;
    const match = text.match(/[\d.]+(?:,\d+)?/);
    if (!match) return null;
    const normalized = match[0].replace(/\./g, "").replace(",", ".");
    const value = parseFloat(normalized);
    return Number.isNaN(value) ? null : value;
  }
}
