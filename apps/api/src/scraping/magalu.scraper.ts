import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";
import { telemetryService } from "../services/telemetry.service.js";

export class MagaluScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.MAGALU;
  readonly marketplaceName = "Magalu";
  private readonly MAGALU_REQUEST_TIMEOUT = 20000;
  private readonly SCRAPFLY_SUCCESS_TTL_MS = 10 * 60 * 1000;
  private readonly SCRAPFLY_FAILURE_TTL_MS = 2 * 60 * 1000;
  private scrapflyCache = new Map<string, { data: ProductData | null; expiresAt: number }>();

  canHandle(url: string): boolean {
    return (
      url.includes("magazineluiza.com.br") ||
      url.includes("magalu.com") ||
      url.includes("divulgador.magalu.com")
    );
  }

  async scrape(url: string, options?: ScrapeOptions) {
    const originalUrl = options?.originalUrl || url;
    console.log(`[Magalu] Iniciando scrape de: ${url}`);

    const resolvedUrl = await this.resolveUrl(url);
    console.log(`[Magalu] URL resolvida: ${resolvedUrl}`);

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      console.log("[Magalu] Bloqueado por validate.perfdrive.com após resolveUrl");
      return {
        success: false,
        error: "Link bloqueado por proteção anti-bot. Tente acessar o link diretamente no navegador primeiro.",
      };
    }

    try {
      const response = await axios.get(resolvedUrl, {
        timeout: this.MAGALU_REQUEST_TIMEOUT,
        headers: this.getRequestHeaders(),
      });

      const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res
        ?.responseUrl;
      if (responseUrl?.includes("validate.perfdrive.com")) {
        console.log("[Magalu] Bloqueado por validate.perfdrive.com no redirect do axios");
        const scrapflyData = await this.scrapeWithScrapfly(resolvedUrl, originalUrl, options);
        if (scrapflyData) {
          return { success: true, data: scrapflyData };
        }
        return {
          success: false,
          error: "Link bloqueado por proteção anti-bot. Tente acessar o link diretamente no navegador primeiro.",
        };
      }

      const $ = cheerio.load(response.data) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (data) {
        console.log("[Magalu] Dados extraídos:", {
          title: data.title?.substring(0, 50),
          price: data.price,
          imageUrl: data.imageUrl?.substring(0, 100),
        });

        if (!this.isValidImageUrl(data.imageUrl)) {
          console.log("[Magalu] Imagem inválida extraída:", data.imageUrl);

          // Salvar HTML para debug
          try {
            await fs.mkdir("/tmp", { recursive: true });
            await fs.writeFile("/tmp/magalu-invalid-image.html", response.data);
            console.log("[Magalu] HTML salvo em /tmp/magalu-invalid-image.html para debug");
          } catch {}

          console.log("[Magalu] Tentando Playwright devido a imagem inválida...");
          // Não retornar erro aqui, tentar Playwright
        } else {
          console.log("[Magalu] Dados extraídos com sucesso via axios!");
          return { success: true, data };
        }
      }
      console.log("[Magalu] Não conseguiu extrair dados via axios, tentando Playwright...");
    } catch (error) {
      console.log(`[Magalu] Axios falhou para ${resolvedUrl}:`, error);
    }

    if (options?.skipPlaywright) {
      return {
        success: false,
        error: "Playwright skipped for validation",
      };
    }

    try {
      console.log("[Magalu] Iniciando scrape com Playwright...");

      // Se a resolvedUrl ainda tem perfdrive, tentar usar a URL normalizada diretamente
      let urlToScrape = resolvedUrl;
      if (resolvedUrl.includes("validate.perfdrive.com")) {
        console.log("[Magalu] URL resolvida ainda tem perfdrive, extraindo target...");
        const targetUrl = this.extractPerfdriveTarget(resolvedUrl);
        if (targetUrl) {
          urlToScrape = this.normalizeMagaluUrl(targetUrl);
          console.log("[Magalu] Usando URL extraída do perfdrive:", urlToScrape);
        }
      }

      const data = await this.scrapeWithPlaywright(urlToScrape, originalUrl, options);
      if (data) {
        if (!this.isValidImageUrl(data.imageUrl)) {
          console.log("[Magalu] Imagem inválida extraída via Playwright:", data.imageUrl);
          const scrapflyData = await this.scrapeWithScrapfly(urlToScrape, originalUrl, options);
          if (scrapflyData) {
            return { success: true, data: scrapflyData };
          }
          return {
            success: false,
            error: "Dados extraídos inválidos (imagem)",
          };
        }
        console.log("[Magalu] Dados extraídos com sucesso via Playwright!");
        return { success: true, data };
      }
      console.log("[Magalu] Playwright não conseguiu extrair dados");
      const scrapflyData = await this.scrapeWithScrapfly(urlToScrape, originalUrl, options);
      if (scrapflyData) {
        return { success: true, data: scrapflyData };
      }
      return { success: false, error: "Não foi possível extrair dados do produto" };
    } catch (error) {
      console.error("[Magalu] Erro no Playwright:", error);
      const scrapflyData = await this.scrapeWithScrapfly(resolvedUrl, originalUrl, options);
      if (scrapflyData) {
        return { success: true, data: scrapflyData };
      }
      return {
        success: false,
        error: "Falha ao extrair dados do produto",
      };
    }
  }

  protected async resolveUrl(url: string): Promise<string> {
    console.log("[Magalu] resolveUrl: iniciando para", url);
    let resolvedUrl = await super.resolveUrl(url);
    console.log("[Magalu] resolveUrl: primeira tentativa ->", resolvedUrl);

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      console.log("[Magalu] resolveUrl: perfdrive detectado, retry com delay...");
      await new Promise((resolve) => setTimeout(resolve, 1500));
      resolvedUrl = await super.resolveUrl(url);
      console.log("[Magalu] resolveUrl: após retry ->", resolvedUrl);
    }

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      console.log("[Magalu] resolveUrl: tentando com cookies salvos...");
      const cookieHeader = await this.getMagaluCookieHeader();
      if (cookieHeader) {
        try {
          const response = await axios.get(url, {
            timeout: this.MAGALU_REQUEST_TIMEOUT,
            headers: {
              ...this.getRequestHeaders(),
              Cookie: cookieHeader,
            },
          });
          const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res
            ?.responseUrl;
          if (responseUrl && !responseUrl.includes("validate.perfdrive.com")) {
            resolvedUrl = responseUrl;
            console.log("[Magalu] resolveUrl: resolvido com cookies ->", resolvedUrl);
          }
        } catch (error) {
          console.log("[Magalu] resolveUrl: falha com cookies:", error);
        }
      }
    }

    if (resolvedUrl.includes("validate.perfdrive.com")) {
      console.log("[Magalu] resolveUrl: tentando com Playwright...");
      const playwrightResolved = await this.resolveWithPlaywright(url);
      if (playwrightResolved) {
        resolvedUrl = playwrightResolved;
        console.log("[Magalu] resolveUrl: resolvido com Playwright ->", resolvedUrl);
      } else {
        console.log("[Magalu] resolveUrl: Playwright falhou, mantendo perfdrive URL");
      }
    }

    const normalizedUrl = this.extractPerfdriveTarget(resolvedUrl) || resolvedUrl;
    console.log("[Magalu] resolveUrl: URL final normalizada ->", normalizedUrl);
    return this.normalizeMagaluUrl(normalizedUrl);
  }

  protected extractProductData(
    $: cheerio.CheerioAPI,
    _resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    try {
      // PRIORIDADE 1: __NEXT_DATA__ (fonte mais confiável)
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          console.log("[Magalu] Tentando extrair de __NEXT_DATA__...");
          const nextData = JSON.parse(nextDataScript) as Record<string, unknown>;
          const itemData = this.findProductData(nextData);
          if (itemData) {
            console.log("[Magalu] Dados encontrados em __NEXT_DATA__");
          }
          const mapped = this.mapStateData(itemData, originalUrl, options);
          if (mapped && this.isValidProduct(mapped)) {
            console.log("[Magalu] ✅ Extração bem-sucedida via __NEXT_DATA__");
            return mapped;
          } else if (mapped) {
            console.log("[Magalu] ❌ Dados de __NEXT_DATA__ falharam validação:", {
              title: mapped.title?.substring(0, 50),
              imageUrl: mapped.imageUrl?.substring(0, 100),
              price: mapped.price,
            });
          }
        } catch (error) {
          console.log("[Magalu] Failed to parse NEXT_DATA:", error);
        }
      }

      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
      const includeSeller = this.shouldIncludeField(options?.fields, "seller");

      // PRIORIDADE 2: data-product (segunda fonte mais confiável)
      const dataProduct = this.extractDataProduct($);
      if (dataProduct) {
        console.log("[Magalu] Tentando extrair de data-product...");
        const mapped = this.mapDataProduct(dataProduct, originalUrl, options);
        if (mapped && this.isValidProduct(mapped)) {
          console.log("[Magalu] ✅ Extração bem-sucedida via data-product");
          return mapped;
        } else if (mapped) {
          console.log("[Magalu] ❌ Dados de data-product falharam validação:", {
            title: mapped.title?.substring(0, 50),
            imageUrl: mapped.imageUrl?.substring(0, 100),
            price: mapped.price,
          });
        }
      }

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

            if (title && imageUrl && price && this.isValidImageUrl(imageUrl)) {
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
      if (!this.isValidImageUrl(imageUrl)) {
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
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.USER_AGENT,
        locale: "pt-BR",
        viewport: { width: 1920, height: 1080 },
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, "languages", {
          get: () => ["pt-BR", "pt", "en-US", "en"],
        });
      });
      const page = await context.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9",
      });

      await page.goto(resolvedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page
        .waitForSelector('h1, [data-testid="heading-product-title"]', { timeout: 10000 })
        .catch(() => { });

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

  private getRequestHeaders(): Record<string, string> {
    const acceptLanguages = [
      "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "pt-BR,pt;q=0.9,en-US;q=0.7,en;q=0.6",
      "pt-BR,pt;q=0.9",
    ];
    const accepts = [
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    ];
    const userAgents = [
      this.USER_AGENT,
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    ];

    const pick = (values: string[]) => values[Math.floor(Math.random() * values.length)];
    return {
      "User-Agent": pick(userAgents),
      Accept: pick(accepts),
      "Accept-Language": pick(acceptLanguages),
      "Accept-Encoding": "gzip, deflate, br",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Cache-Control": "max-age=0",
    };
  }

  private extractDataProduct($: cheerio.CheerioAPI): Record<string, unknown> | null {
    const raw =
      $('[data-product]').first().attr("data-product") ||
      $(".header-product.js-header-product").attr("data-product") ||
      "";
    if (!raw) {
      return null;
    }

    try {
      const normalized = raw
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&amp;/g, "&");
      return JSON.parse(normalized) as Record<string, unknown>;
    } catch (error) {
      console.log("Failed to parse data-product from Magalu", error);
      return null;
    }
  }

  private parsePriceValue(value: unknown): number | null {
    if (typeof value === "number") {
      return value;
    }
    if (typeof value === "string") {
      return this.extractPrice(value);
    }
    return null;
  }

  private mapDataProduct(
    data: Record<string, unknown>,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    const title =
      (typeof data.fullTitle === "string" && data.fullTitle) ||
      (typeof data.title === "string" && data.title) ||
      (typeof data.name === "string" && data.name) ||
      "";

    const imageValue =
      (typeof data.image === "string" && data.image) ||
      (typeof data.imageUrl === "string" && data.imageUrl) ||
      (Array.isArray(data.images) && typeof data.images[0] === "string" ? data.images[0] : "") ||
      "";

    const price =
      this.parsePriceValue(data.bestPriceTemplate) ||
      this.parsePriceValue(data.bestPrice) ||
      this.parsePriceValue(data.price) ||
      this.parsePriceValue(data.priceTemplate) ||
      null;

    const rawOriginalPrice =
      this.parsePriceValue(data.priceOriginalTemplate) ||
      this.parsePriceValue(data.listPriceTemplate) ||
      this.parsePriceValue(data.priceOriginal) ||
      this.parsePriceValue(data.oldPrice) ||
      null;

    if (!title || !imageValue || !price) {
      return null;
    }

    // Validar originalPrice: só considerar se for maior que price
    const originalPrice = rawOriginalPrice && rawOriginalPrice > price ? rawOriginalPrice : null;

    const discountPercentage =
      originalPrice && originalPrice > price
        ? this.calculateDiscount(originalPrice, price)
        : undefined;

    const includeDescription = this.shouldIncludeField(options?.fields, "description");
    const includeRating = this.shouldIncludeField(options?.fields, "rating");
    const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
    const includeSeller = this.shouldIncludeField(options?.fields, "seller");

    return {
      title,
      description: includeDescription
        ? (typeof data.description === "string" ? data.description : undefined)
        : undefined,
      price,
      originalPrice: originalPrice || undefined,
      discountPercentage,
      imageUrl: imageValue,
      productUrl: originalUrl,
      marketplace: MarketplaceEnum.MAGALU,
      rating: includeRating
        ? (typeof data.rating === "number" ? data.rating : undefined)
        : undefined,
      reviewCount: includeReviewCount
        ? (typeof data.reviewCount === "number" ? data.reviewCount : undefined)
        : undefined,
      seller: includeSeller
        ? (typeof data.seller === "string" ? data.seller : undefined)
        : undefined,
      inStock: true,
      scrapedAt: new Date(),
    };
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

    console.log("[Magalu] Resolvendo URL com Playwright:", url);

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-infobars",
        "--window-size=1920,1080",
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.USER_AGENT,
        locale: "pt-BR",
        viewport: { width: 1920, height: 1080 },
        storageState: await fs
          .readFile(storagePath, "utf-8")
          .then((value) => JSON.parse(value))
          .catch(() => undefined),
      });

      await context.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => undefined,
        });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, "languages", {
          get: () => ["pt-BR", "pt", "en-US", "en"],
        });
        Object.defineProperty(navigator, "platform", {
          get: () => "Win32",
        });
        // @ts-ignore
        window.chrome = { runtime: {} };
      });

      const page = await context.newPage();

      // Navegar primeiro para homepage (estabelecer sessão legítima)
      console.log("[Magalu] Navegando para homepage...");
      await page.goto("https://www.magazineluiza.com.br/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000 + Math.random() * 1000);

      // Simular movimentos de mouse e scroll
      await page.mouse.move(100, 100);
      await page.waitForTimeout(300);
      await page.mouse.move(500, 400);
      await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
      await page.waitForTimeout(1000 + Math.random() * 500);

      // Agora navegar para o link do produto
      console.log("[Magalu] Navegando para o produto...");
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
      await page.waitForTimeout(3000 + Math.random() * 2000);

      // Simular mais interações humanas
      await page.mouse.move(200, 200);
      await page.waitForTimeout(500);
      await page.evaluate(() => window.scrollTo({ top: 400, behavior: "smooth" }));
      await page.waitForTimeout(1000);

      let finalUrl = page.url();
      console.log("[Magalu] URL após navegação:", finalUrl);

      if (finalUrl.includes("validate.perfdrive.com")) {
        console.log("[Magalu] Detectado perfdrive, aguardando resolução...");

        // Tentar resolver o desafio aguardando e procurando pelo produto
        try {
          // Aguardar até 10s para o JavaScript resolver o challenge
          await page.waitForSelector('h1, [data-testid="heading-product-title"]', {
            timeout: 10000,
          });

          // Verificar se URL mudou
          finalUrl = page.url();
          console.log("[Magalu] URL após espera:", finalUrl);

          if (!finalUrl.includes("validate.perfdrive.com")) {
            console.log("[Magalu] Perfdrive resolvido automaticamente!");
            await context.storageState({ path: storagePath });
            return finalUrl;
          }

          // Se ainda está no perfdrive, tentar mover mouse e esperar mais
          console.log("[Magalu] Tentando resolver perfdrive com interações...");
          await page.mouse.move(500, 500);
          await page.waitForTimeout(2000);
          await page.mouse.move(700, 300);
          await page.waitForTimeout(2000);

          finalUrl = page.url();
          if (!finalUrl.includes("validate.perfdrive.com")) {
            console.log("[Magalu] Perfdrive resolvido após interações!");
            await context.storageState({ path: storagePath });
            return finalUrl;
          }
        } catch (error) {
          console.log("[Magalu] Erro ao tentar resolver perfdrive:", error);
        }

        // Salvar screenshot para debug
        try {
          await page.screenshot({ path: "/tmp/magalu-perfdrive.png", fullPage: true });
          console.log("[Magalu] Screenshot salvo em /tmp/magalu-perfdrive.png");
        } catch {}

        console.log("[Magalu] Não conseguiu resolver perfdrive");
        return null;
      }

      console.log("[Magalu] URL resolvida com sucesso!");
      await context.storageState({ path: storagePath });
      return finalUrl;
    } catch (error) {
      console.error("[Magalu] Erro no resolveWithPlaywright:", error);
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

  private isValidProduct(data: ProductData): boolean {
    // Verificar título mínimo
    if (!data.title || data.title.length < 10) {
      return false;
    }

    // Verificar se imagem é válida
    if (!this.isValidImageUrl(data.imageUrl)) {
      return false;
    }

    // Verificar se preço é razoável (entre R$ 1 e R$ 100.000)
    if (typeof data.price !== "number" || data.price < 1 || data.price > 100000) {
      return false;
    }

    // Verificar se não é título genérico de recomendação
    const titleLower = data.title.toLowerCase();
    if (
      titleLower.includes("recomendado para você") ||
      titleLower.includes("você também pode gostar") ||
      titleLower.includes("produtos relacionados") ||
      titleLower.includes("sugestões")
    ) {
      return false;
    }

    return true;
  }

  private async scrapeWithScrapfly(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.SCRAPFLY_API_KEY;
    if (!apiKey) {
      console.log("[Magalu] Scrapfly ignorado: SCRAPFLY_API_KEY não configurada");
      return null;
    }

    const endpoint = process.env.SCRAPFLY_API_URL || "https://api.scrapfly.io/scrape";
    const cached = this.scrapflyCache.get(resolvedUrl);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        if (cached.data) {
          await telemetryService.logEvent({
            eventType: "SCRAPE_FALLBACK_SCRAPFLY",
            userId: options?.userId,
            telegramUserId: options?.telegramUserId,
            origin: options?.origin,
            metadata: { marketplace: this.marketplaceName, url: resolvedUrl, cached: true },
          });
        }
        return cached.data;
      }
      this.scrapflyCache.delete(resolvedUrl);
    }

    const defaultRenderJs =
      (process.env.SCRAPFLY_RENDER_JS || "false").trim().toLowerCase() === "true";
    const fetchScrapflyHtml = async (renderJs: boolean) => {
      const response = await axios.get(endpoint, {
        timeout: this.MAGALU_REQUEST_TIMEOUT * 2,
        params: {
          key: apiKey,
          url: resolvedUrl,
          render_js: renderJs ? "true" : "false",
          country: "br",
        },
      });

      return (response.data as { result?: { content?: string } })?.result?.content || "";
    };
    try {
      console.log("[Magalu] Tentando Scrapfly...");
      let renderJs = defaultRenderJs;
      let html = await fetchScrapflyHtml(renderJs);
      if (!html) {
        console.log("[Magalu] Scrapfly não retornou HTML");
        return null;
      }

      const needsJsRender =
        !renderJs &&
        (!html.includes("__NEXT_DATA__") ||
          /validate\.perfdrive|shieldsquare/i.test(html));

      if (needsJsRender) {
        console.log("[Magalu] Scrapfly detectou bloqueio/HTML incompleto, tentando com render_js...");
        renderJs = true;
        html = await fetchScrapflyHtml(true);
      }

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (data && this.isValidImageUrl(data.imageUrl)) {
        console.log("[Magalu] Dados extraídos com sucesso via Scrapfly!");
        this.scrapflyCache.set(resolvedUrl, {
          data,
          expiresAt: Date.now() + this.SCRAPFLY_SUCCESS_TTL_MS,
        });
        await telemetryService.logEvent({
          eventType: "SCRAPE_FALLBACK_SCRAPFLY",
          userId: options?.userId,
          telegramUserId: options?.telegramUserId,
          origin: options?.origin,
          metadata: {
            marketplace: this.marketplaceName,
            url: resolvedUrl,
            renderJs,
            cached: false,
          },
        });
        return data;
      }

      console.log("[Magalu] Scrapfly não conseguiu extrair dados válidos");
      this.scrapflyCache.set(resolvedUrl, {
        data: null,
        expiresAt: Date.now() + this.SCRAPFLY_FAILURE_TTL_MS,
      });
      return null;
    } catch (error) {
      console.log("[Magalu] Scrapfly falhou:", error);
      this.scrapflyCache.set(resolvedUrl, {
        data: null,
        expiresAt: Date.now() + this.SCRAPFLY_FAILURE_TTL_MS,
      });
      return null;
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
    if (!this.isValidImageUrl(imageUrl)) {
      return null;
    }

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
      const imageCandidate =
        (typeof record.image === "string" && record.image) ||
        (Array.isArray(record.images) && typeof record.images[0] === "string"
          ? (record.images[0] as string)
          : "") ||
        (Array.isArray(record.imageUrls) && typeof record.imageUrls[0] === "string"
          ? (record.imageUrls[0] as string)
          : "");
      const hasImage = Boolean(imageCandidate) && this.isValidImageUrl(imageCandidate);

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
