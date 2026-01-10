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
    let ids = this.extractIds(resolvedUrl) || this.extractIds(url);
    let searchData: ProductData | null = null;
    const preferSearch = true;
    const disableShopeeRequests = false; // Reativado para tentar scraping direto primeiro

    if (!ids) {
      const candidate =
        (await this.fetchSearchCandidate(resolvedUrl)) || (await this.fetchSearchCandidate(url));
      if (candidate) {
        const shopId = candidate.item.shopid ?? candidate.item.shop_id;
        const itemId = candidate.item.itemid ?? candidate.item.item_id;
        if (shopId && itemId) {
          ids = { shopId: String(shopId), itemId: String(itemId) };
          console.log(`[Shopee] IDs resolvidos via search: ${ids.shopId}/${ids.itemId}`);
        }
        searchData = this.mapApiData(candidate.item, url, options);
        if (searchData && !ids) {
          return { success: true, data: searchData };
        }
      }
    }
    if (preferSearch && !searchData) {
      searchData = await this.fetchFromSearchBySlug(resolvedUrl, url, options);
      if (searchData) {
        const enriched = await this.enrichPriceIfMissing(searchData);
        return { success: true, data: enriched };
      }
    }
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
        const enriched = await this.enrichPriceIfMissing(apiResult);
        return { success: true, data: enriched };
      }
      if (!searchData) {
        searchData = await this.fetchFromSearchBySlug(resolvedUrl, url, options);
      }
      if (searchData) {
        const enriched = await this.enrichPriceIfMissing(searchData);
        return { success: true, data: enriched };
      }
    }

    const result = await super.scrape(canonicalUrl, {
      ...options,
      originalUrl: options?.originalUrl || url,
    });

    if (result.success && result.data) {
      const enriched = await this.enrichPriceIfMissing(result.data);
      return { success: true, data: enriched };
    }

    // Se falhou, retornar mensagem clara
    if (!result.success && result.error?.includes("Failed to extract")) {
      return {
        success: false,
        error:
          "A Shopee está solicitando login para acessar este produto. " +
          "Alguns produtos da Shopee exigem autenticação e não podem ser extraídos automaticamente.",
      };
    }

    return result;
  }

  protected extractProductData(
    $: cheerio.CheerioAPI,
    _resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    try {
      console.log("[Shopee] Iniciando extractProductData do HTML...");

      // PRIORIDADE 1: __NEXT_DATA__
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          console.log("[Shopee] Tentando extrair de __NEXT_DATA__...");
          const nextData = JSON.parse(nextDataScript) as Record<string, unknown>;
          const itemData = this.findItemData(nextData);
          const mapped = this.mapApiData(itemData, originalUrl, options);
          if (mapped) {
            console.log("[Shopee] ✅ Extração bem-sucedida via __NEXT_DATA__!");
            return mapped;
          }
        } catch (error) {
          console.log("[Shopee] Failed to parse NEXT_DATA:", error);
        }
      }

      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
      const includeSalesQuantity = this.shouldIncludeField(options?.fields, "salesQuantity");

      // PRIORIDADE 2: JSON-LD
      const jsonLdScript = $('script[type="application/ld+json"]').html();
      if (jsonLdScript) {
        try {
          console.log("[Shopee] Tentando extrair de JSON-LD...");
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

            if (title && imageUrl) {
              console.log("[Shopee] ✅ Extração bem-sucedida via JSON-LD!");
              return {
                title,
                description,
                price: price ?? null,
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
          console.log("[Shopee] Failed to parse JSON-LD:", error);
        }
      }

      // PRIORIDADE 3: Meta tags e seletores HTML específicos
      console.log("[Shopee] Tentando extrair de meta tags e seletores HTML...");

      // Seletores atualizados baseados no HTML real de 2025/2026
      const title =
        $('meta[property="og:title"]').attr("content") ||
        $("h1.vR6K3w").first().text().trim() || // Novo seletor de 2025
        $("h1.shopee-product-detail__title, h1._44qnta").first().text().trim() ||
        $("h1").first().text().trim() ||
        "";

      const description = includeDescription
        ? $('meta[property="og:description"]').attr("content") ||
          $('meta[name="description"]').attr("content") ||
          $(".shopee-product-detail__description, ._2u0jt9").first().text().trim() ||
          $(".description, [class*=\"description\"]").first().text().trim() ||
          undefined
        : undefined;

      const imageUrl =
        $('meta[property="og:image"]').attr("content") ||
        $("img.rWN4DK").first().attr("src") || // Novo seletor de 2025
        $("img.shopee-product-detail__image, img._2JKL8X").first().attr("src") ||
        $('img[itemprop="image"]').attr("src") ||
        $("img._1-7c_j").first().attr("src") ||
        "";

      const priceText =
        $('meta[property="product:price:amount"]').attr("content") ||
        $(".IZPeQz.B67UQ0").first().text().trim() || // Novo seletor de 2025
        $(".shopee-product-price, ._3n5NQx").first().text().trim() ||
        $("[class*=\"price-\"], [class*=\"Price\"]").first().text().trim() ||
        $(".price, [class*=\"price\"], [data-testid*=\"price\"]").first().text().trim() ||
        "";

      const price = this.extractPrice(priceText);

      if (!title || !imageUrl) {
        console.log("[Shopee] ❌ Dados essenciais não encontrados no HTML:", {
          hasTitle: !!title,
          hasImage: !!imageUrl,
          hasPrice: !!price,
        });
        return null;
      }

      // Extrair avaliação
      const ratingText = includeRating
        ? $(".shopee-product-rating, [class*=\"rating\"]").first().text().trim()
        : "";
      const rating = includeRating ? this.extractRating(ratingText) : undefined;

      // Extrair contagem de avaliações
      const reviewText = includeReviewCount
        ? $(".shopee-product-rating__count, [class*=\"review\"]").first().text().trim()
        : "";
      const reviewCount = includeReviewCount ? this.extractReviewCount(reviewText) : undefined;

      // Extrair vendas
      const salesText = includeSalesQuantity
        ? $(".shopee-product-detail__sold-count, [class*=\"sold\"]").first().text().trim()
        : "";
      const salesQuantity = includeSalesQuantity ? this.extractReviewCount(salesText) : undefined;

      console.log("[Shopee] ✅ Extração bem-sucedida via HTML seletores!");
      const pageTitle = $("title").text().trim().toLowerCase();
      const isLoginPage =
        pageTitle.includes("login") || pageTitle.includes("faça login");

      if (!price && isLoginPage && title.toLowerCase().includes("login")) {
        return null;
      }

      return {
        title,
        description,
        price: price ?? null,
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
      console.error("[Shopee] Error extracting product data:", error);
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

      // Configurar listener para API responses
      const apiResponsePromise = page
        .waitForResponse(
          (response) =>
            response.url().includes("/api/v4/item/get") ||
            response.url().includes("/api/v4/pdp/get_pc") ||
            response.url().includes("/api/v4/product/get_shop_info"),
          { timeout: 25000 }
        )
        .catch(() => null);

      await page.goto(resolvedUrl, { waitUntil: "networkidle", timeout: 40000 });
      await page
        .waitForSelector('meta[property="og:title"], script[type="application/ld+json"], h1', {
          timeout: 10000,
        })
        .catch(() => {});

      // Tentar capturar resposta da API
      const apiResponse = await apiResponsePromise;

      if (apiResponse) {
        try {
          const json = await apiResponse.json();
          console.log(`API response capturada no scrapeWithPlaywright (status ${apiResponse.status()})`);
          const apiData = json?.data?.item || json?.data || json?.item || null;
          if (apiData) {
            const mapped = this.mapApiData(apiData, originalUrl, options);
            if (mapped) {
              return mapped;
            }
          }
        } catch (error) {
          console.log("Erro ao processar API response:", error);
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

  private extractSlug(url: string): string | null {
    try {
      const parsed = new URL(url);
      const path = parsed.pathname.replace(/\/+$/, "");
      if (!path || path === "/" || path.includes("/product/")) {
        return null;
      }
      const lastSegment = path.split("/").filter(Boolean).pop();
      if (!lastSegment) return null;
      const cleaned = lastSegment.replace(/-i\.\d+\.\d+$/i, "");
      const normalized = cleaned.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
      return normalized.length >= 3 ? normalized : null;
    } catch {
      return null;
    }
  }

  private normalizeText(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private scoreNameMatch(slug: string, name: string): number {
    const normalizedSlug = this.normalizeText(slug);
    const normalizedName = this.normalizeText(name);
    if (!normalizedSlug || !normalizedName) return 0;

    if (normalizedName === normalizedSlug) return 120;
    if (normalizedName.includes(normalizedSlug)) return 80;

    const slugTokens = normalizedSlug.split(" ").filter((token) => token.length > 2);
    if (slugTokens.length === 0) return 0;

    let matches = 0;
    for (const token of slugTokens) {
      if (normalizedName.includes(token)) {
        matches += 1;
      }
    }

    const ratioScore = Math.round((matches / slugTokens.length) * 40);
    const tokenScore = matches * 6;
    return ratioScore + tokenScore;
  }

  private async fetchSearchCandidate(
    url: string
  ): Promise<{ item: Record<string, unknown>; score: number } | null> {
    const slug = this.extractSlug(url);
    if (!slug) {
      return null;
    }

    const keyword = slug.replace(/-/g, " ").trim();
    if (!keyword) return null;

    try {
      const response = await axios.get("https://shopee.com.br/api/v4/search/search_items", {
        timeout: this.REQUEST_TIMEOUT,
        params: {
          by: "relevancy",
          keyword,
          limit: "50",
          new: "0",
          order: "desc",
          page_type: "search",
          scenario: "PAGE_GLOBAL_SEARCH",
          version: "2",
        },
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
          Accept: "application/json",
          Referer: "https://shopee.com.br/",
        },
      });

      const data = response.data?.data;
      if (!data) return null;

      const itemsRaw = Array.isArray(data.items) ? data.items : [];
      const items = itemsRaw
        .map((entry: Record<string, unknown>) => {
          const itemBasic = entry.item_basic as Record<string, unknown> | undefined;
          return itemBasic || entry;
        })
        .filter(Boolean) as Array<Record<string, unknown>>;

      if (items.length === 0) return null;

      let best: { item: Record<string, unknown>; score: number } | null = null;
      for (const item of items) {
        const nameValue = item.name ?? item.item_name;
        const name = typeof nameValue === "string" ? nameValue : "";
        const score = this.scoreNameMatch(slug, name);
        if (!best || score > best.score) {
          best = { item, score };
        }
      }

      if (!best || best.score < 18) {
        return null;
      }

      return best;
    } catch (error) {
      console.log("[Shopee] Erro ao resolver IDs via search:", error);
      return null;
    }
  }

  private async fetchFromSearchBySlug(
    url: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const candidate = await this.fetchSearchCandidate(url);
    if (!candidate) {
      return null;
    }
    return this.mapApiData(candidate.item, originalUrl, options);
  }

  private async enrichPriceIfMissing(product: ProductData): Promise<ProductData> {
    if (typeof product.price === "number" && Number.isFinite(product.price)) {
      return product;
    }

    const title = product.title?.trim();
    if (!title) {
      return product;
    }

    const googlePrice = await this.fetchPriceFromGoogleCse(title);
    if (googlePrice !== null) {
      return { ...product, price: googlePrice };
    }

    const serpPrice = await this.fetchPriceFromSerpApi(title);
    if (serpPrice !== null) {
      return { ...product, price: serpPrice };
    }

    return product;
  }

  private normalizeTitleForMatch(value: string): string {
    const cleaned = value
      .toLowerCase()
      .replace(/\s+[\-|–|—]\s*shopee.*$/i, "")
      .replace(/\s+\|\s*shopee.*$/i, "")
      .replace(/\s+–\s*shopee.*$/i, "")
      .replace(/\s+—\s*shopee.*$/i, "")
      .replace(/\s+shopee.*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
    return cleaned;
  }

  private isExactTitleMatch(expected: string, candidate: string): boolean {
    if (!expected || !candidate) return false;
    const normalizedExpected = this.normalizeTitleForMatch(expected);
    const normalizedCandidate = this.normalizeTitleForMatch(candidate);
    return normalizedExpected === normalizedCandidate;
  }

  private extractPriceFromText(text: string): number | null {
    if (!text) return null;
    const match = text.match(/R\$\s*[0-9\.\,]+/);
    if (!match) return null;
    return this.extractPrice(match[0]);
  }

  private extractPriceFromPagemap(
    pagemap: Record<string, unknown> | undefined
  ): number | null {
    if (!pagemap) return null;
    const metatags = Array.isArray(pagemap.metatags) ? pagemap.metatags[0] : undefined;
    const product = Array.isArray(pagemap.product) ? pagemap.product[0] : undefined;
    const offer = Array.isArray(pagemap.offer) ? pagemap.offer[0] : undefined;
    const offers = Array.isArray(pagemap.offers) ? pagemap.offers[0] : undefined;

    const raw =
      (metatags?.["product:price:amount"] as string | undefined) ||
      (metatags?.["og:price:amount"] as string | undefined) ||
      (metatags?.["product:price"] as string | undefined) ||
      (product?.price as string | number | undefined) ||
      (offer?.price as string | number | undefined) ||
      (offers?.price as string | number | undefined);

    if (typeof raw === "number" && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === "string") {
      return this.extractPrice(raw);
    }
    return null;
  }

  private async fetchPriceFromGoogleCse(title: string): Promise<number | null> {
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    if (!apiKey || !cseId) return null;

    try {
      const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
        timeout: this.REQUEST_TIMEOUT,
        params: {
          key: apiKey,
          cx: cseId,
          q: `${title} shopee`,
          num: 5,
        },
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
          Accept: "application/json",
        },
      });

      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      for (const item of items) {
        if (!this.isExactTitleMatch(title, item.title || "")) {
          continue;
        }

        const priceFromPagemap = this.extractPriceFromPagemap(item.pagemap);
        if (priceFromPagemap !== null) {
          return priceFromPagemap;
        }

        const priceFromSnippet = this.extractPriceFromText(item.snippet || "");
        if (priceFromSnippet !== null) {
          return priceFromSnippet;
        }
      }
    } catch (error) {
      console.log("[Shopee] Erro ao buscar preco no Google CSE:", error);
    }

    return null;
  }

  private async fetchPriceFromSerpApi(title: string): Promise<number | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) return null;

    try {
      const response = await axios.get("https://serpapi.com/search.json", {
        timeout: this.REQUEST_TIMEOUT,
        params: {
          engine: "google",
          q: `${title} shopee`,
          api_key: apiKey,
          hl: "pt",
          gl: "br",
        },
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
          Accept: "application/json",
        },
      });

      const results = Array.isArray(response.data?.organic_results)
        ? response.data.organic_results
        : [];
      for (const result of results) {
        if (!this.isExactTitleMatch(title, result.title || "")) {
          continue;
        }

        const richSnippet =
          result.rich_snippet?.top?.extensions?.join(" ") ||
          result.rich_snippet?.bottom?.extensions?.join(" ") ||
          "";
        const priceFromRich = this.extractPriceFromText(richSnippet);
        if (priceFromRich !== null) {
          return priceFromRich;
        }

        const priceFromSnippet = this.extractPriceFromText(result.snippet || "");
        if (priceFromSnippet !== null) {
          return priceFromSnippet;
        }
      }
    } catch (error) {
      console.log("[Shopee] Erro ao buscar preco no SerpAPI:", error);
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
      originalPrice && price !== null ? this.calculateDiscount(originalPrice, price) : undefined;

    if (!title || !imageUrl) {
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
      price: price ?? null,
      originalPrice: price !== null ? originalPrice || undefined : undefined,
      discountPercentage: price !== null ? discountPercentage : undefined,
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
    let foundCandidates: Array<{ record: Record<string, unknown>; score: number }> = [];

    console.log("[Shopee] Procurando item data no payload...");

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || typeof current !== "object") continue;
      if (seen.has(current)) continue;
      seen.add(current);

      const record = current as Record<string, unknown>;

      // Calcular score de confiança
      let score = 0;
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

      if (hasName) score += 3;
      if (hasPrice) score += 3;
      if (hasImage) score += 3;

      // Bonus por campos adicionais relevantes
      if (record.itemid || record.item_id) score += 1;
      if (record.shopid || record.shop_id) score += 1;
      if (record.stock || record.normal_stock) score += 1;

      if (score >= 9) {
        // Encontrou um candidato perfeito
        console.log("[Shopee] ✅ Item data perfeito encontrado (score: " + score + ")");
        return record;
      } else if (score >= 6) {
        // Candidato parcial
        foundCandidates.push({ record, score });
      }

      for (const value of Object.values(record)) {
        if (value && typeof value === "object") {
          queue.push(value);
        }
      }
    }

    // Se não encontrou perfeito, retornar melhor candidato
    if (foundCandidates.length > 0) {
      foundCandidates.sort((a, b) => b.score - a.score);
      const best = foundCandidates[0];
      console.log(`[Shopee] ⚠️ Retornando melhor candidato (score: ${best.score})`);
      return best.record;
    }

    console.log("[Shopee] ❌ Nenhum item data encontrado no payload");
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
      const session = await this.getSessionCookies(resolvedUrl);

      // Tentar múltiplos endpoints (pdp/get_pc é mais confiável)
      const apiUrls = [
        `https://shopee.com.br/api/v4/pdp/get_pc?shopid=${shopId}&itemid=${itemId}`,
        `https://shopee.com.br/api/v4/item/get?shopid=${shopId}&itemid=${itemId}`,
      ];

      for (const apiUrl of apiUrls) {
        try {
          const response = await axios.get(apiUrl, {
            timeout: this.REQUEST_TIMEOUT,
            headers: {
              "User-Agent": this.USER_AGENT,
              "Accept-Language": "pt-BR,pt;q=0.9",
              Accept: "application/json, text/plain, */*",
              Origin: "https://shopee.com.br",
              Referer: resolvedUrl,
              "X-Requested-With": "XMLHttpRequest",
              "X-Api-Source": "pc",
              "af-ac-enc-dat": "null",
              "If-None-Match-": "*",
              "X-Shopee-Language": "pt-BR",
              "Sec-Fetch-Dest": "empty",
              "Sec-Fetch-Mode": "cors",
              "Sec-Fetch-Site": "same-origin",
              ...(session.csrfToken ? { "x-csrftoken": session.csrfToken } : {}),
              ...(session.cookieHeader ? { Cookie: session.cookieHeader } : {}),
            },
          });

          if (response.data?.error === 90309999) {
            console.log(`API ${apiUrl} retornou 90309999, tentando próximo endpoint...`);
            continue;
          }

          const data = response.data?.data;
          const mapped = this.mapApiData(data, originalUrl, options);
          if (mapped) {
            return mapped;
          }
        } catch (error) {
          console.log(`Erro ao tentar ${apiUrl}:`, error);
          continue;
        }
      }

      // Tentar API pública (NÃO retorna erro 90309999)
      console.log("Tentando API pública da Shopee...");
      const publicApiData = await this.fetchFromPublicApi(shopId, itemId, originalUrl, options);
      if (publicApiData) {
        return publicApiData;
      }

      // Se todos endpoints falharam, usar Playwright
      console.log("Todos endpoints da API falharam, usando Playwright...");
      const pwData = await this.fetchFromPlaywrightApi(resolvedUrl, originalUrl, options);
      if (pwData) {
        return pwData;
      }

      return null;
    } catch (error) {
      console.error("Erro ao buscar dados da Shopee API:", error);
      return null;
    }
  }

  private async fetchFromPublicApi(
    shopId: string,
    itemId: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    try {
      // API pública que funciona sem autenticação
      const apiUrl = `https://shopee.com.br/api/v4/recommend/recommend`;
      const params = {
        bundle: "item_detail",
        item_card: "1",
        limit: "20",
        offset: "0",
        section: "items_you_may_also_like",
        shopid: shopId,
        itemid: itemId,
      };

      console.log("[Shopee] Tentando API pública:", apiUrl);

      const response = await axios.get(apiUrl, {
        params,
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
          Accept: "application/json",
          Referer: `https://shopee.com.br/product/${shopId}/${itemId}`,
        },
      });

      if (response.data?.error) {
        console.log(`[Shopee] API pública retornou erro ${response.data.error}`);
        return null;
      }

      // A API pública pode retornar dados em estrutura diferente
      // Tentar encontrar o item nos dados retornados
      const data = response.data?.data;
      if (!data) {
        console.log("[Shopee] API pública não retornou dados");
        return null;
      }

      // Procurar o item específico nos resultados
      let itemData = null;
      if (data.sections) {
        for (const section of data.sections) {
          if (section.data?.item) {
            const items = (
              Array.isArray(section.data.item)
                ? section.data.item
                : [section.data.item]
            ) as Array<Record<string, unknown>>;
            itemData = items.find(
              (item) => {
                const itemIdValue = item.itemid ?? item.item_id;
                return String(itemIdValue) === String(itemId);
              }
            );
            if (itemData) break;
          }
        }
      }

      if (!itemData && data.item) {
        itemData = data.item;
      }

      if (itemData) {
        console.log("[Shopee] ✅ Dados encontrados na API pública!");
        const mapped = this.mapApiData(itemData, originalUrl, options);
        if (mapped) {
          return mapped;
        }
      }

      console.log("[Shopee] Item não encontrado na API pública");
      return null;
    } catch (error) {
      console.log("[Shopee] Erro na API pública:", error);
      return null;
    }
  }

  private extractCsrfToken(cookieHeader: string): string | null {
    const match = cookieHeader.match(/(?:^|;\\s*)csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private async getSessionCookies(
    resolvedUrl: string
  ): Promise<{ cookieHeader: string; csrfToken: string | null }> {
    try {
      const landingResponse = await axios.get("https://shopee.com.br/", {
        timeout: this.REQUEST_TIMEOUT,
        headers: {
          "User-Agent": this.USER_AGENT,
          "Accept-Language": "pt-BR,pt;q=0.9",
        },
      });
      const cookieHeader =
        landingResponse.headers?.["set-cookie"]
          ?.map((cookie) => cookie.split(";")[0])
          .join("; ") || "";
      const csrfToken = this.extractCsrfToken(cookieHeader);
      if (cookieHeader) {
        return { cookieHeader, csrfToken };
      }
    } catch (error) {
      console.log("Falha ao obter cookies da Shopee via HTTP, tentando Playwright...", error);
    }

    return this.getSessionCookiesWithPlaywright(resolvedUrl);
  }

  private async getSessionCookiesWithPlaywright(
    resolvedUrl: string
  ): Promise<{ cookieHeader: string; csrfToken: string | null }> {
    const { chromium } = await import("playwright");
    const browser = await chromium.launch({
      headless: true,
      args: ["--disable-blink-features=AutomationControlled"],
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

      // Navegar primeiro para homepage para obter cookies base
      await page.goto("https://shopee.com.br/", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(2000 + Math.random() * 1000);

      // Depois navegar para o produto para cookies específicos
      await page.goto(resolvedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForTimeout(2000 + Math.random() * 1000);

      const cookies = await context.cookies();
      const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
      const csrfCookie = cookies.find((cookie) => cookie.name === "csrftoken");
      return { cookieHeader, csrfToken: csrfCookie?.value || null };
    } finally {
      await browser.close();
    }
  }

  private async fetchFromPlaywrightApi(
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

      // Configurar listener ANTES de navegar - capturar TODAS respostas (mesmo com erro)
      const apiResponsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/api/v4/item/get") ||
          response.url().includes("/api/v4/pdp/get_pc") ||
          response.url().includes("/api/v4/product/get_shop_info"),
        { timeout: 30000 }
      );

      // Navegar para a página do produto
      await page.goto(resolvedUrl, { waitUntil: "networkidle", timeout: 40000 });

      // Aguardar a resposta da API (mesmo se retornar erro)
      const apiResponse = await apiResponsePromise.catch(() => null);

      if (apiResponse) {
        try {
          const json = await apiResponse.json();
          console.log(`Resposta da API Shopee (status ${apiResponse.status()}):`, JSON.stringify(json).substring(0, 200));

          // Se veio erro 90309999, IGNORAR API e ir direto para state/HTML
          if (json?.error === 90309999 || json?.[3] === 90309999) {
            console.log("API retornou erro 90309999, IGNORANDO e extraindo do state...");
          } else {
            // Tentar extrair dados da API apenas se NÃO houver erro
            const apiData = json?.data?.item || json?.data || json?.item || null;
            if (apiData) {
              console.log("Dados encontrados na API, tentando mapear...");
              const mapped = this.mapApiData(apiData, originalUrl, options);
              if (mapped) {
                console.log("✅ Extração bem-sucedida via API!");
                return mapped;
              }
            }
          }
        } catch (error) {
          console.log("Erro ao processar resposta da API:", error);
        }
      }

      // Fallback: extrair do state/HTML da página
      console.log("Extraindo dados do state/HTML da página...");
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
        console.log("State data encontrado, procurando item data...");
        const itemData = this.findItemData(stateData);
        if (itemData) {
          console.log("Item data encontrado no state:", Object.keys(itemData).slice(0, 10));
          const mapped = this.mapApiData(itemData, originalUrl, options);
          if (mapped) {
            console.log("✅ Extração bem-sucedida via state data!");
            return mapped;
          } else {
            console.log("❌ Falha ao mapear item data do state");
          }
        } else {
          console.log("❌ Item data não encontrado no state");
        }
      } else {
        console.log("❌ State data não encontrado");
      }

      // Último fallback: extrair do HTML com cheerio
      console.log("Tentando extrair do HTML com cheerio...");
      const html = await page.content();

      // Análise do HTML para diagnóstico
      const htmlInfo = {
        length: html.length,
        hasNextData: html.includes("__NEXT_DATA__"),
        hasJsonLd: html.includes('application/ld+json'),
        hasOgTitle: html.includes('og:title'),
        hasProductClass: html.includes('shopee-product'),
        preview: html.substring(0, 500),
      };
      console.log("[Shopee] Análise do HTML:", htmlInfo);

      // Salvar HTML para debug
      try {
        await import("fs/promises").then(fs =>
          fs.mkdir("/tmp", { recursive: true }).then(() =>
            fs.writeFile("/tmp/shopee-failed.html", html)
          )
        );
        console.log("[Shopee] HTML completo salvo em /tmp/shopee-failed.html");
      } catch {}

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const htmlData = this.extractProductData($, resolvedUrl, originalUrl, options);
      if (htmlData) {
        console.log("✅ Extração bem-sucedida via HTML!");
        return htmlData;
      } else {
        console.log("❌ Falha ao extrair do HTML");

        // Debug adicional: tentar identificar o que está na página
        const pageTitle = $("title").text();
        const h1Count = $("h1").length;
        const imgCount = $("img").length;

        console.log("[Shopee] Debug da página:", {
          title: pageTitle,
          h1Count,
          imgCount,
          hasMetaTags: $('meta[property="og:title"]').length > 0,
        });

        // Detectar se é página de login
        if (pageTitle.includes("Faça Login") || pageTitle.includes("Login")) {
          console.log("❌ [Shopee] Página de login detectada - produto requer autenticação");
        }

        return null;
      }
    } finally {
      await browser.close();
    }
  }
}
