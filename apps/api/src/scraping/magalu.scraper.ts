import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";
import { telemetryService } from "../services/telemetry.service.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAGALU SCRAPER - Sistema de 3 Camadas de Fallback
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este scraper foi desenvolvido para contornar a proteção anti-bot da Magalu
 * (perfdrive/shieldsquare) usando múltiplas estratégias em camadas:
 *
 * CAMADA 1 - APIs de Meta Tags (Rápidas, ~100-500ms):
 *   - Iframely API: Extrai Open Graph meta tags
 *   - Microlink API: Preview de links com metadata
 *   - OpenGraph.io: Parser de Open Graph
 *
 * CAMADA 2 - Scraping Cloud (Médias, ~2-10s):
 *   - ScraperAPI: Proxy rotativo com render JS
 *   - ZenRows: Anti-bot bypass especializado
 *   - ScrapingBee: Headless browser as service
 *
 * CAMADA 3 - Browser Automation (Pesadas, ~10-30s):
 *   - Playwright Stealth: Navegador com anti-detecção
 *   - Múltiplas tentativas com delays
 *   - Simulação de comportamento humano
 *
 * Para testar todos os métodos, defina MAGALU_TEST_ALL_METHODS=true no .env
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface MethodResult {
  method: string;
  category: string;
  success: boolean;
  data: ProductData | null;
  error?: string;
  durationMs: number;
}

export class MagaluScraper extends BaseScraper {
  readonly marketplace = MarketplaceEnum.MAGALU;
  readonly marketplaceName = "Magalu";
  private readonly MAGALU_REQUEST_TIMEOUT = 20000;
  private readonly SCRAPER_API_SUCCESS_TTL_MS = 10 * 60 * 1000;
  private readonly SCRAPER_API_FAILURE_TTL_MS = 2 * 60 * 1000;
  private scraperApiCache = new Map<string, { data: ProductData | null; expiresAt: number }>();

  canHandle(url: string): boolean {
    return (
      url.includes("magazineluiza.com.br") ||
      url.includes("magalu.com") ||
      url.includes("divulgador.magalu.com")
    );
  }

  async scrape(url: string, options?: ScrapeOptions) {
    const originalUrl = options?.originalUrl || url;
    const testAllMethods = process.env.MAGALU_TEST_ALL_METHODS === "true";

    console.log(`[Magalu] ═══════════════════════════════════════════════════════════`);
    console.log(`[Magalu] Iniciando scrape de: ${url}`);
    console.log(`[Magalu] Modo teste de todos os métodos: ${testAllMethods}`);
    console.log(`[Magalu] ═══════════════════════════════════════════════════════════`);

    // Resolver URL primeiro
    const resolvedUrl = await this.resolveUrl(url);
    console.log(`[Magalu] URL resolvida: ${resolvedUrl}`);

    // Normalizar URL para produto
    const productUrl = this.normalizeMagaluUrl(resolvedUrl);
    console.log(`[Magalu] URL normalizada: ${productUrl}`);

    // Se modo teste, testar todos os métodos
    if (testAllMethods) {
      const results = await this.testAllMethods(productUrl, originalUrl, options);
      this.logTestResults(results);

      // Ainda assim, retornar o primeiro resultado bem-sucedido
      const successResult = results.find(r => r.success && r.data);
      if (successResult?.data) {
        return { success: true, data: successResult.data };
      }
      return { success: false, error: "Todos os métodos falharam" };
    }

    // Modo normal: usar sistema de 3 camadas
    return this.scrapeWithFallbackLayers(productUrl, originalUrl, options);
  }

  /**
   * Sistema de 3 camadas de fallback
   */
  private async scrapeWithFallbackLayers(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ) {
    // ═══════════════════════════════════════════════════════════════════════════
    // CAMADA 1: APIs de Meta Tags (Rápidas)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] CAMADA 1: APIs de Meta Tags`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    // 1.1 - Iframely API
    const iframelyData = await this.tryIframelyApi(resolvedUrl, originalUrl, options);
    if (iframelyData && this.isValidProduct(iframelyData)) {
      console.log(`[Magalu] ✅ SUCESSO via Iframely API!`);
      return { success: true, data: iframelyData };
    }

    // 1.2 - Microlink API
    const microlinkData = await this.tryMicrolinkApi(resolvedUrl, originalUrl, options);
    if (microlinkData && this.isValidProduct(microlinkData)) {
      console.log(`[Magalu] ✅ SUCESSO via Microlink API!`);
      return { success: true, data: microlinkData };
    }

    // 1.3 - OpenGraph.io
    const opengraphData = await this.tryOpenGraphIo(resolvedUrl, originalUrl, options);
    if (opengraphData && this.isValidProduct(opengraphData)) {
      console.log(`[Magalu] ✅ SUCESSO via OpenGraph.io!`);
      return { success: true, data: opengraphData };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMADA 2: Scraping Cloud (Médias)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] CAMADA 2: Scraping Cloud`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    // 2.1 - ScraperAPI
    const scraperApiData = await this.scrapeWithScraperApi(resolvedUrl, originalUrl, options);
    if (scraperApiData && this.isValidProduct(scraperApiData)) {
      console.log(`[Magalu] ✅ SUCESSO via ScraperAPI!`);
      return { success: true, data: scraperApiData };
    }

    // 2.2 - ZenRows
    const zenRowsData = await this.tryZenRows(resolvedUrl, originalUrl, options);
    if (zenRowsData && this.isValidProduct(zenRowsData)) {
      console.log(`[Magalu] ✅ SUCESSO via ZenRows!`);
      return { success: true, data: zenRowsData };
    }

    // 2.3 - ScrapingBee
    const scrapingBeeData = await this.tryScrapingBee(resolvedUrl, originalUrl, options);
    if (scrapingBeeData && this.isValidProduct(scrapingBeeData)) {
      console.log(`[Magalu] ✅ SUCESSO via ScrapingBee!`);
      return { success: true, data: scrapingBeeData };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMADA 3: Browser Automation (Pesadas)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] CAMADA 3: Browser Automation`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    if (options?.skipPlaywright) {
      console.log(`[Magalu] Playwright pulado por opção`);
      return {
        success: false,
        error: "Todas as camadas 1 e 2 falharam. Playwright desabilitado.",
      };
    }

    // 3.1 - Playwright Stealth (Tentativa 1 - Normal)
    const playwrightData1 = await this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 1);
    if (playwrightData1 && this.isValidProduct(playwrightData1)) {
      console.log(`[Magalu] ✅ SUCESSO via Playwright (Tentativa 1)!`);
      return { success: true, data: playwrightData1 };
    }

    // 3.2 - Playwright Stealth (Tentativa 2 - Com Homepage first)
    const playwrightData2 = await this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 2);
    if (playwrightData2 && this.isValidProduct(playwrightData2)) {
      console.log(`[Magalu] ✅ SUCESSO via Playwright (Tentativa 2)!`);
      return { success: true, data: playwrightData2 };
    }

    // 3.3 - Playwright Stealth (Tentativa 3 - Com interações humanas)
    const playwrightData3 = await this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 3);
    if (playwrightData3 && this.isValidProduct(playwrightData3)) {
      console.log(`[Magalu] ✅ SUCESSO via Playwright (Tentativa 3)!`);
      return { success: true, data: playwrightData3 };
    }

    console.log(`[Magalu] ❌ TODAS AS CAMADAS FALHARAM`);
    return {
      success: false,
      error: "Não foi possível extrair dados do produto após tentar todas as camadas de fallback.",
    };
  }

  /**
   * Testa todos os métodos de scraping (para desenvolvimento/debug)
   */
  private async testAllMethods(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<MethodResult[]> {
    const results: MethodResult[] = [];

    const methods = [
      // Camada 1 - Meta Tags
      { name: "Iframely API", category: "Meta Tags", fn: () => this.tryIframelyApi(resolvedUrl, originalUrl, options) },
      { name: "Microlink API", category: "Meta Tags", fn: () => this.tryMicrolinkApi(resolvedUrl, originalUrl, options) },
      { name: "OpenGraph.io", category: "Meta Tags", fn: () => this.tryOpenGraphIo(resolvedUrl, originalUrl, options) },

      // Camada 2 - Scraping Cloud
      { name: "ScraperAPI", category: "Scraping Cloud", fn: () => this.scrapeWithScraperApi(resolvedUrl, originalUrl, options) },
      { name: "ZenRows", category: "Scraping Cloud", fn: () => this.tryZenRows(resolvedUrl, originalUrl, options) },
      { name: "ScrapingBee", category: "Scraping Cloud", fn: () => this.tryScrapingBee(resolvedUrl, originalUrl, options) },

      // Camada 3 - Browser
      { name: "Playwright T1", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 1) },
      { name: "Playwright T2", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 2) },
      { name: "Playwright T3", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 3) },

      // Extras - Axios direto
      { name: "Axios Direto", category: "Direct", fn: () => this.tryAxiosDirect(resolvedUrl, originalUrl, options) },
    ];

    for (const method of methods) {
      console.log(`[Magalu] Testando: ${method.name}...`);
      const start = Date.now();

      try {
        const data = await method.fn();
        const durationMs = Date.now() - start;
        const success = data !== null && this.isValidProduct(data);

        results.push({
          method: method.name,
          category: method.category,
          success,
          data,
          durationMs,
        });

        console.log(`[Magalu] ${method.name}: ${success ? "✅" : "❌"} (${durationMs}ms)`);
      } catch (error) {
        const durationMs = Date.now() - start;
        results.push({
          method: method.name,
          category: method.category,
          success: false,
          data: null,
          error: error instanceof Error ? error.message : String(error),
          durationMs,
        });
        console.log(`[Magalu] ${method.name}: ❌ ERRO (${durationMs}ms) - ${error}`);
      }
    }

    return results;
  }

  /**
   * Log dos resultados de teste
   */
  private logTestResults(results: MethodResult[]) {
    console.log(`\n[Magalu] ═══════════════════════════════════════════════════════════`);
    console.log(`[Magalu] RESULTADOS DO TESTE DE TODOS OS MÉTODOS`);
    console.log(`[Magalu] ═══════════════════════════════════════════════════════════`);
    console.log(`[Magalu] | #  | Método             | Categoria      | Status | Tempo   |`);
    console.log(`[Magalu] |----|--------------------|----------------|--------|---------|`);

    results.forEach((r, i) => {
      const status = r.success ? "✅ OK" : "❌ FAIL";
      const time = `${r.durationMs}ms`.padStart(7);
      console.log(`[Magalu] | ${(i + 1).toString().padStart(2)} | ${r.method.padEnd(18)} | ${r.category.padEnd(14)} | ${status} | ${time} |`);
    });

    const successCount = results.filter(r => r.success).length;
    console.log(`[Magalu] ═══════════════════════════════════════════════════════════`);
    console.log(`[Magalu] Total: ${successCount}/${results.length} métodos funcionaram`);
    console.log(`[Magalu] ═══════════════════════════════════════════════════════════\n`);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAMADA 1: APIs de Meta Tags
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 1.1 - Iframely API
   */
  private async tryIframelyApi(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.IFRAMELY_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/Iframely] SKIP: IFRAMELY_API_KEY não configurada");
      return null;
    }

    try {
      console.log("[Magalu/Iframely] Fazendo requisição...");
      const response = await axios.get("https://iframe.ly/api/iframely", {
        timeout: 15000,
        params: { url: resolvedUrl, api_key: apiKey },
        headers: { Accept: "application/json" },
      });

      const data = response.data;
      const meta = data?.meta || {};
      const title = meta.title;
      const description = meta.description;

      // Coletar imagens
      const images = [
        ...(data?.links?.image?.map((item: { href?: string }) => item.href) || []),
        ...(data?.links?.thumbnail?.map((item: { href?: string }) => item.href) || [])
      ].filter(Boolean);

      const imageUrl = images[0] || data?.links?.icon?.[0]?.href || "";

      // Extrair preço
      let price: number | null = null;
      const priceFields = [
        meta.price,
        meta['product:price:amount'],
        meta['og:price:amount'],
      ];

      for (const priceField of priceFields) {
        if (priceField) {
          const extracted = typeof priceField === 'number'
            ? priceField
            : this.extractPrice(String(priceField));
          if (extracted !== null && !isNaN(extracted)) {
            price = extracted;
            break;
          }
        }
      }

      if (!title || !imageUrl) {
        console.log("[Magalu/Iframely] Dados insuficientes");
        return null;
      }

      console.log("[Magalu/Iframely] ✅ Dados extraídos!");
      return {
        title: this.cleanTitle(title),
        description,
        price,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.MAGALU,
        inStock: true,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.log("[Magalu/Iframely] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 1.2 - Microlink API
   */
  private async tryMicrolinkApi(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.MICROLINK_API_KEY;
    // Microlink funciona sem API key, mas com limites

    try {
      console.log("[Magalu/Microlink] Fazendo requisição...");
      const params: Record<string, string> = {
        url: resolvedUrl,
        meta: "true",
        screenshot: "false",
      };
      if (apiKey) {
        params.apiKey = apiKey;
      }

      const response = await axios.get("https://api.microlink.io", {
        timeout: 15000,
        params,
        headers: { Accept: "application/json" },
      });

      const data = response.data?.data;
      if (!data) {
        console.log("[Magalu/Microlink] Sem dados retornados");
        return null;
      }

      const title = data.title;
      const description = data.description;
      const imageUrl = data.image?.url || data.logo?.url || "";

      // Extrair preço do meta ou description
      let price: number | null = null;
      if (data.price) {
        price = typeof data.price === 'number' ? data.price : this.extractPrice(String(data.price));
      }

      if (!title || !imageUrl) {
        console.log("[Magalu/Microlink] Dados insuficientes");
        return null;
      }

      console.log("[Magalu/Microlink] ✅ Dados extraídos!");
      return {
        title: this.cleanTitle(title),
        description,
        price,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.MAGALU,
        inStock: true,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.log("[Magalu/Microlink] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 1.3 - OpenGraph.io
   */
  private async tryOpenGraphIo(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const appId = process.env.OPENGRAPH_APP_ID;
    if (!appId) {
      console.log("[Magalu/OpenGraph] SKIP: OPENGRAPH_APP_ID não configurada");
      return null;
    }

    try {
      console.log("[Magalu/OpenGraph] Fazendo requisição...");
      const response = await axios.get("https://opengraph.io/api/1.1/site/" + encodeURIComponent(resolvedUrl), {
        timeout: 15000,
        params: { app_id: appId },
        headers: { Accept: "application/json" },
      });

      const data = response.data?.hybridGraph || response.data?.openGraph || {};
      const title = data.title;
      const description = data.description;
      const imageUrl = data.image || "";

      // Extrair preço
      let price: number | null = null;
      if (data.products?.[0]?.offers?.[0]?.price) {
        price = this.extractPrice(String(data.products[0].offers[0].price));
      }

      if (!title || !imageUrl) {
        console.log("[Magalu/OpenGraph] Dados insuficientes");
        return null;
      }

      console.log("[Magalu/OpenGraph] ✅ Dados extraídos!");
      return {
        title: this.cleanTitle(title),
        description,
        price,
        imageUrl,
        productUrl: originalUrl,
        marketplace: MarketplaceEnum.MAGALU,
        inStock: true,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.log("[Magalu/OpenGraph] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAMADA 2: Scraping Cloud
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 2.1 - ScraperAPI
   */
  private async scrapeWithScraperApi(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.SCRAPERAPI_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/ScraperAPI] SKIP: SCRAPERAPI_API_KEY não configurada");
      return null;
    }

    const endpoint = process.env.SCRAPERAPI_API_URL || "https://api.scraperapi.com";
    const cached = this.scraperApiCache.get(resolvedUrl);
    if (cached) {
      if (cached.expiresAt > Date.now()) {
        if (cached.data) {
          console.log("[Magalu/ScraperAPI] Usando cache");
        }
        return cached.data;
      }
      this.scraperApiCache.delete(resolvedUrl);
    }

    const fetchScraperApiHtml = async (renderJs: boolean) => {
      const response = await axios.get(endpoint, {
        timeout: this.MAGALU_REQUEST_TIMEOUT * 2,
        params: {
          api_key: apiKey,
          url: resolvedUrl,
          render: renderJs ? "true" : "false",
          country_code: "br",
          device_type: "desktop",
        },
      });

      if (typeof response.data === "string") {
        return response.data;
      }
      if (response.data && typeof response.data === "object" && "content" in response.data) {
        return String((response.data as { content?: string }).content || "");
      }
      return String(response.data || "");
    };

    try {
      console.log("[Magalu/ScraperAPI] Tentando sem render...");
      let html = await fetchScraperApiHtml(false);

      // Verificar se precisa render JS
      const needsJsRender = !html.includes("__NEXT_DATA__") || /validate\.perfdrive|shieldsquare/i.test(html);

      if (needsJsRender) {
        console.log("[Magalu/ScraperAPI] Tentando com render JS...");
        html = await fetchScraperApiHtml(true);
      }

      if (!html) {
        console.log("[Magalu/ScraperAPI] HTML vazio");
        return null;
      }

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);

      if (data && this.isValidImageUrl(data.imageUrl)) {
        console.log("[Magalu/ScraperAPI] ✅ Dados extraídos!");
        this.scraperApiCache.set(resolvedUrl, {
          data,
          expiresAt: Date.now() + this.SCRAPER_API_SUCCESS_TTL_MS,
        });
        await telemetryService.logEvent({
          eventType: "SCRAPE_FALLBACK_SCRAPERAPI",
          userId: options?.userId,
          telegramUserId: options?.telegramUserId,
          origin: options?.origin,
          metadata: { marketplace: this.marketplaceName, url: resolvedUrl },
        });
        return data;
      }

      console.log("[Magalu/ScraperAPI] Dados inválidos");
      this.scraperApiCache.set(resolvedUrl, {
        data: null,
        expiresAt: Date.now() + this.SCRAPER_API_FAILURE_TTL_MS,
      });
      return null;
    } catch (error) {
      console.log("[Magalu/ScraperAPI] Erro:", error instanceof Error ? error.message : error);
      this.scraperApiCache.set(resolvedUrl, {
        data: null,
        expiresAt: Date.now() + this.SCRAPER_API_FAILURE_TTL_MS,
      });
      return null;
    }
  }

  /**
   * 2.2 - ZenRows
   */
  private async tryZenRows(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.ZENROWS_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/ZenRows] SKIP: ZENROWS_API_KEY não configurada");
      return null;
    }

    try {
      console.log("[Magalu/ZenRows] Fazendo requisição...");
      const response = await axios.get("https://api.zenrows.com/v1/", {
        timeout: 30000,
        params: {
          apikey: apiKey,
          url: resolvedUrl,
          js_render: "true",
          antibot: "true",
          premium_proxy: "true",
        },
      });

      const html = response.data;
      if (!html || typeof html !== "string") {
        console.log("[Magalu/ZenRows] HTML vazio");
        return null;
      }

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);

      if (data && this.isValidImageUrl(data.imageUrl)) {
        console.log("[Magalu/ZenRows] ✅ Dados extraídos!");
        return data;
      }

      console.log("[Magalu/ZenRows] Dados inválidos");
      return null;
    } catch (error) {
      console.log("[Magalu/ZenRows] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 2.3 - ScrapingBee
   */
  private async tryScrapingBee(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.SCRAPINGBEE_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/ScrapingBee] SKIP: SCRAPINGBEE_API_KEY não configurada");
      return null;
    }

    try {
      console.log("[Magalu/ScrapingBee] Fazendo requisição...");
      const response = await axios.get("https://app.scrapingbee.com/api/v1/", {
        timeout: 30000,
        params: {
          api_key: apiKey,
          url: resolvedUrl,
          render_js: "true",
          premium_proxy: "true",
          country_code: "br",
          stealth_proxy: "true",
        },
      });

      const html = response.data;
      if (!html || typeof html !== "string") {
        console.log("[Magalu/ScrapingBee] HTML vazio");
        return null;
      }

      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);

      if (data && this.isValidImageUrl(data.imageUrl)) {
        console.log("[Magalu/ScrapingBee] ✅ Dados extraídos!");
        return data;
      }

      console.log("[Magalu/ScrapingBee] Dados inválidos");
      return null;
    } catch (error) {
      console.log("[Magalu/ScrapingBee] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CAMADA 3: Browser Automation
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * 3.x - Playwright Stealth com diferentes estratégias
   */
  private async scrapeWithPlaywrightStealth(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions,
    attempt: number = 1
  ): Promise<ProductData | null> {
    const { chromium } = await import("playwright");
    const storagePath = this.getStorageStatePath();
    await fs.mkdir(path.dirname(storagePath), { recursive: true });

    console.log(`[Magalu/Playwright] Tentativa ${attempt}...`);

    const browser = await chromium.launch({
      headless: true,
      args: [
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-infobars",
        "--window-size=1920,1080",
        "--no-sandbox",
        "--disable-setuid-sandbox",
      ],
    });

    try {
      const context = await browser.newContext({
        userAgent: this.getRandomUserAgent(),
        locale: "pt-BR",
        viewport: { width: 1920, height: 1080 },
        storageState: await fs
          .readFile(storagePath, "utf-8")
          .then((value) => JSON.parse(value))
          .catch(() => undefined),
      });

      // Anti-detecção avançada
      await context.addInitScript(() => {
        // Ocultar webdriver
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });

        // Simular plugins
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5],
        });

        // Simular idiomas
        Object.defineProperty(navigator, "languages", {
          get: () => ["pt-BR", "pt", "en-US", "en"],
        });

        // Simular plataforma
        Object.defineProperty(navigator, "platform", {
          get: () => "Win32",
        });

        // Simular hardwareConcurrency
        Object.defineProperty(navigator, "hardwareConcurrency", {
          get: () => 8,
        });

        // Simular Chrome
        // @ts-ignore
        window.chrome = { runtime: {}, loadTimes: () => {}, csi: () => {} };

        // Ocultar automação no permissions
        const originalQuery = window.navigator.permissions.query;
        // @ts-ignore
        window.navigator.permissions.query = (parameters: any) =>
          parameters.name === "notifications"
            ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
            : originalQuery(parameters);
      });

      const page = await context.newPage();
      await page.setExtraHTTPHeaders({
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      });

      // Estratégias diferentes por tentativa
      if (attempt >= 2) {
        // Tentativa 2+: Navegar primeiro para homepage
        console.log("[Magalu/Playwright] Navegando para homepage primeiro...");
        await page.goto("https://www.magazineluiza.com.br/", {
          waitUntil: "domcontentloaded",
          timeout: 30000,
        });
        await this.humanDelay(page, 2000, 3000);
        await this.simulateHumanBehavior(page);
      }

      if (attempt >= 3) {
        // Tentativa 3: Mais interações humanas
        console.log("[Magalu/Playwright] Simulando comportamento humano avançado...");
        await this.simulateAdvancedHumanBehavior(page);
      }

      // Navegar para o produto
      console.log("[Magalu/Playwright] Navegando para o produto...");
      await page.goto(resolvedUrl, {
        waitUntil: "domcontentloaded",
        timeout: 40000
      });

      await this.humanDelay(page, 2000, 4000);

      // Verificar se caiu no perfdrive
      const currentUrl = page.url();
      if (currentUrl.includes("validate.perfdrive.com")) {
        console.log("[Magalu/Playwright] Detectado perfdrive, aguardando resolução...");

        // Tentar resolver interagindo
        await this.simulateHumanBehavior(page);
        await this.humanDelay(page, 3000, 5000);

        // Verificar novamente
        const newUrl = page.url();
        if (newUrl.includes("validate.perfdrive.com")) {
          console.log("[Magalu/Playwright] Perfdrive não resolvido");
          await this.saveDebugScreenshot(page, `magalu-perfdrive-t${attempt}`);
          return null;
        }
      }

      // Aguardar elementos do produto
      try {
        await page.waitForSelector('h1, [data-testid="heading-product-title"], #__NEXT_DATA__', {
          timeout: 10000
        });
      } catch {
        console.log("[Magalu/Playwright] Elementos de produto não encontrados");
      }

      // Salvar cookies para próximas tentativas
      await context.storageState({ path: storagePath });

      // Extrair dados do state
      const stateData = await page.evaluate(() => {
        const anyWindow = window as typeof window & {
          __INITIAL_STATE__?: Record<string, unknown>;
          __PRELOADED_STATE__?: Record<string, unknown>;
          __APOLLO_STATE__?: Record<string, unknown>;
        };

        if (anyWindow.__INITIAL_STATE__) return anyWindow.__INITIAL_STATE__;
        if (anyWindow.__PRELOADED_STATE__) return anyWindow.__PRELOADED_STATE__;
        if (anyWindow.__APOLLO_STATE__) return anyWindow.__APOLLO_STATE__;

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
        if (mapped && this.isValidProduct(mapped)) {
          console.log("[Magalu/Playwright] ✅ Dados extraídos do state!");
          return mapped;
        }
      }

      // Fallback: extrair do HTML
      const html = await page.content();
      const $ = cheerio.load(html) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);

      if (data && this.isValidProduct(data)) {
        console.log("[Magalu/Playwright] ✅ Dados extraídos do HTML!");
        return data;
      }

      // Último fallback: evaluate direto
      const directData = await page.evaluate(() => {
        const titleEl = document.querySelector('h1[data-testid="heading-product-title"], h1');
        const title = titleEl?.textContent?.trim() ||
          document.querySelector('meta[property="og:title"]')?.getAttribute("content") || "";

        const priceEl = document.querySelector('[data-testid="price-value"], .sc-price-order, [data-testid="price-default"]');
        const priceText = priceEl?.textContent?.trim() ||
          document.querySelector('meta[property="product:price:amount"]')?.getAttribute("content") || "";

        const imgEl = document.querySelector('img[data-testid="image-selected-thumbnail"], img[class*="product"], img[itemprop="image"]');
        const imageUrl = imgEl?.getAttribute("src") ||
          document.querySelector('meta[property="og:image"]')?.getAttribute("content") || "";

        return { title, priceText, imageUrl };
      });

      if (directData.title && directData.imageUrl) {
        const price = this.extractPrice(directData.priceText);
        console.log("[Magalu/Playwright] ✅ Dados extraídos via evaluate!");
        return {
          title: directData.title,
          price,
          imageUrl: directData.imageUrl,
          productUrl: originalUrl,
          marketplace: MarketplaceEnum.MAGALU,
          inStock: true,
          scrapedAt: new Date(),
        };
      }

      console.log("[Magalu/Playwright] Falha na extração");
      await this.saveDebugScreenshot(page, `magalu-failed-t${attempt}`);
      return null;

    } finally {
      await browser.close();
    }
  }

  /**
   * Axios direto (para teste)
   */
  private async tryAxiosDirect(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    try {
      console.log("[Magalu/Axios] Tentando fetch direto...");
      const response = await axios.get(resolvedUrl, {
        timeout: this.MAGALU_REQUEST_TIMEOUT,
        headers: this.getRequestHeaders(),
      });

      const responseUrl = (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl;
      if (responseUrl?.includes("validate.perfdrive.com")) {
        console.log("[Magalu/Axios] Bloqueado por perfdrive");
        return null;
      }

      const $ = cheerio.load(response.data) as cheerio.CheerioAPI;
      const data = this.extractProductData($, resolvedUrl, originalUrl, options);

      if (data && this.isValidProduct(data)) {
        console.log("[Magalu/Axios] ✅ Dados extraídos!");
        return data;
      }

      console.log("[Magalu/Axios] Dados inválidos");
      return null;
    } catch (error) {
      console.log("[Magalu/Axios] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // Métodos auxiliares
  // ═══════════════════════════════════════════════════════════════════════════════

  protected async resolveUrl(url: string): Promise<string> {
    console.log("[Magalu] resolveUrl: iniciando para", url);
    let resolvedUrl = await super.resolveUrl(url);
    console.log("[Magalu] resolveUrl: primeira tentativa ->", resolvedUrl);

    // Se caiu no perfdrive, tentar extrair a URL alvo
    if (resolvedUrl.includes("validate.perfdrive.com")) {
      const targetUrl = this.extractPerfdriveTarget(resolvedUrl);
      if (targetUrl) {
        console.log("[Magalu] resolveUrl: URL extraída do perfdrive ->", targetUrl);
        return this.normalizeMagaluUrl(targetUrl);
      }
    }

    return this.normalizeMagaluUrl(resolvedUrl);
  }

  protected extractProductData(
    $: cheerio.CheerioAPI,
    _resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ): ProductData | null {
    try {
      // PRIORIDADE 1: __NEXT_DATA__
      const nextDataScript = $("#__NEXT_DATA__").html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript) as Record<string, unknown>;
          const itemData = this.findProductData(nextData);
          const mapped = this.mapStateData(itemData, originalUrl, options);
          if (mapped && this.isValidProduct(mapped)) {
            return mapped;
          }
        } catch (error) {
          console.log("[Magalu] Failed to parse NEXT_DATA:", error);
        }
      }

      const includeDescription = this.shouldIncludeField(options?.fields, "description");
      const includeRating = this.shouldIncludeField(options?.fields, "rating");
      const includeReviewCount = this.shouldIncludeField(options?.fields, "reviewCount");
      const includeSeller = this.shouldIncludeField(options?.fields, "seller");

      // PRIORIDADE 2: data-product
      const dataProduct = this.extractDataProduct($);
      if (dataProduct) {
        const mapped = this.mapDataProduct(dataProduct, originalUrl, options);
        if (mapped && this.isValidProduct(mapped)) {
          return mapped;
        }
      }

      // PRIORIDADE 3: JSON-LD
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
            const price = typeof productData.offers?.price === "number"
              ? productData.offers.price
              : this.extractPrice(productData.offers?.price || "");

            if (title && imageUrl && price && this.isValidImageUrl(imageUrl)) {
              return {
                title,
                description: includeDescription ? productData.description : undefined,
                price,
                imageUrl,
                productUrl: originalUrl,
                marketplace: MarketplaceEnum.MAGALU,
                rating: includeRating ? productData.aggregateRating?.ratingValue : undefined,
                reviewCount: includeReviewCount ? productData.aggregateRating?.reviewCount : undefined,
                inStock: productData.offers?.availability === "https://schema.org/InStock",
                scrapedAt: new Date(),
              };
            }
          }
        } catch (error) {
          console.log("Failed to parse JSON-LD from Magalu", error);
        }
      }

      // PRIORIDADE 4: Meta tags e seletores HTML
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
      const discountPercentage = originalPrice && originalPrice > price
        ? this.calculateDiscount(originalPrice, price)
        : undefined;

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
        seller: undefined,
        inStock: true,
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
    // Delegar para o método stealth
    return this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 1);
  }

  private getRequestHeaders(): Record<string, string> {
    return {
      "User-Agent": this.getRandomUserAgent(),
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
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

  private getRandomUserAgent(): string {
    const userAgents = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_6_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  private extractDataProduct($: cheerio.CheerioAPI): Record<string, unknown> | null {
    const raw =
      $('[data-product]').first().attr("data-product") ||
      $(".header-product.js-header-product").attr("data-product") ||
      "";
    if (!raw) return null;

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
    if (typeof value === "number") return value;
    if (typeof value === "string") return this.extractPrice(value);
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

    if (!title || !imageValue || !price) return null;

    const originalPrice = rawOriginalPrice && rawOriginalPrice > price ? rawOriginalPrice : null;
    const discountPercentage = originalPrice && originalPrice > price
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

  private getStorageStatePath(): string {
    return path.join(process.cwd(), ".cache", "magalu-playwright.json");
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
    if (!data.title || data.title.length < 5) return false;

    // Verificar se imagem é válida
    if (!this.isValidImageUrl(data.imageUrl)) return false;

    // Verificar se não é título genérico
    const titleLower = data.title.toLowerCase();
    const genericPatterns = [
      "recomendado para você",
      "você também pode gostar",
      "produtos relacionados",
      "sugestões",
      "magazine luiza",
      "magalu",
    ];
    for (const pattern of genericPatterns) {
      if (titleLower === pattern || titleLower.startsWith(pattern + " ")) {
        return false;
      }
    }

    return true;
  }

  private cleanTitle(title: string): string {
    return title
      .replace(/\s*[-|]\s*(Magazine Luiza|Magalu|magazineluiza).*$/i, "")
      .replace(/\s+/g, " ")
      .trim();
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
    if (!this.isValidImageUrl(imageUrl)) return null;

    const priceValue =
      (data.price as number | string | undefined) ||
      (data.priceValue as number | string | undefined) ||
      (data.salePrice as number | string | undefined) ||
      (data.bestPrice as number | string | undefined) ||
      (data.sellingPrice as number | string | undefined);
    const price = typeof priceValue === "number"
      ? priceValue
      : typeof priceValue === "string"
        ? this.extractPrice(priceValue)
        : null;

    if (!title || !imageUrl || !price) return null;

    const originalPriceValue =
      (data.originalPrice as number | string | undefined) ||
      (data.listPrice as number | string | undefined) ||
      (data.priceFrom as number | string | undefined);
    const originalPrice = typeof originalPriceValue === "number"
      ? originalPriceValue
      : typeof originalPriceValue === "string"
        ? this.extractPrice(originalPriceValue)
        : null;

    const discountPercentage = originalPrice && originalPrice > price
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
      const hasName = typeof record.name === "string" || typeof record.title === "string";
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

  // Métodos de simulação humana

  private async humanDelay(page: any, minMs: number, maxMs: number): Promise<void> {
    const delay = minMs + Math.random() * (maxMs - minMs);
    await page.waitForTimeout(delay);
  }

  private async simulateHumanBehavior(page: any): Promise<void> {
    // Movimentos de mouse aleatórios
    await page.mouse.move(100 + Math.random() * 800, 100 + Math.random() * 500);
    await this.humanDelay(page, 200, 500);
    await page.mouse.move(300 + Math.random() * 600, 200 + Math.random() * 400);

    // Scroll suave
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: "smooth" }));
    await this.humanDelay(page, 500, 1000);
  }

  private async simulateAdvancedHumanBehavior(page: any): Promise<void> {
    // Múltiplos movimentos de mouse
    for (let i = 0; i < 3; i++) {
      await page.mouse.move(
        100 + Math.random() * 1000,
        100 + Math.random() * 600
      );
      await this.humanDelay(page, 100, 300);
    }

    // Scroll em múltiplas direções
    await page.evaluate(() => window.scrollTo({ top: 500, behavior: "smooth" }));
    await this.humanDelay(page, 500, 1000);
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: "smooth" }));
    await this.humanDelay(page, 300, 700);

    // Clique em área vazia (simula clique em página)
    try {
      await page.click('body', { position: { x: 10, y: 10 } });
    } catch {
      // Ignora se falhar
    }

    await this.humanDelay(page, 500, 1500);
  }

  private async saveDebugScreenshot(page: any, name: string): Promise<void> {
    try {
      await page.screenshot({ path: `/tmp/${name}.png`, fullPage: true });
      console.log(`[Magalu] Screenshot salvo em /tmp/${name}.png`);
    } catch {
      // Ignora erros de screenshot
    }
  }
}
