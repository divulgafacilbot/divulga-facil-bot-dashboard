import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs/promises";
import path from "path";
import { BaseScraper } from "./baseScraper.js";
import { MarketplaceEnum, ProductData, ScrapeOptions } from "./types.js";
import { telemetryService } from "../services/telemetry.service.js";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MAGALU SCRAPER - Sistema de 4 Camadas de Fallback + Bypass Anti-Bot
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Este scraper foi desenvolvido para contornar a proteção anti-bot da Magalu
 * (perfdrive/shieldsquare/radware) usando múltiplas estratégias em camadas:
 *
 * CAMADA 0 - Google Shopping/Search (Bypass completo, ~1-3s):
 *   - Google Shopping API: Dados do produto via SerpAPI (mais confiável!)
 *   - Google Rich Snippets: Preço/título dos resultados de busca
 *   - Google Images: Busca de imagem do produto
 *   - URL Parsing: Extrai nome do produto do slug da URL
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
 * FALLBACK FINAL - URL Parsing + Google Search:
 *   - Extrai nome do produto da URL e busca dados via Google
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

    // Modo normal: usar sistema de 4 camadas (incluindo Layer 0)
    return this.scrapeWithFallbackLayers(productUrl, originalUrl, options);
  }

  /**
   * Sistema de 4 camadas de fallback
   *
   * CAMADA 0: Google Shopping (Bypass completo do anti-bot)
   * CAMADA 1: APIs de Meta Tags (Rápidas)
   * CAMADA 2: Scraping Cloud (Médias)
   * CAMADA 3: Browser Automation (Pesadas)
   */
  private async scrapeWithFallbackLayers(
    resolvedUrl: string,
    originalUrl: string,
    options?: ScrapeOptions
  ) {
    // Extrair informações da URL para usar na busca
    const urlInfo = this.extractProductInfoFromUrl(resolvedUrl);
    console.log(`[Magalu] Info extraída da URL: ${urlInfo?.productName || 'N/A'} (SKU: ${urlInfo?.sku || 'N/A'})`);

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMADA 0: Google Shopping (Bypass completo - mais confiável)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] CAMADA 0: Google Shopping (Bypass Anti-Bot)`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    // 0.1 - Google Shopping via SerpAPI
    const googleShoppingData = await this.tryGoogleShopping(resolvedUrl, originalUrl, urlInfo, options);
    if (googleShoppingData && this.isValidProduct(googleShoppingData)) {
      console.log(`[Magalu] ✅ SUCESSO via Google Shopping!`);
      return { success: true, data: googleShoppingData };
    }

    // 0.2 - Google Search com extração de rich snippets
    const googleSearchData = await this.tryGoogleSearchRichSnippets(resolvedUrl, originalUrl, urlInfo, options);
    if (googleSearchData && this.isValidProduct(googleSearchData)) {
      console.log(`[Magalu] ✅ SUCESSO via Google Search Rich Snippets!`);
      return { success: true, data: googleSearchData };
    }

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
      const enriched = await this.enrichPriceIfMissing(iframelyData);
      return { success: true, data: enriched };
    }

    // 1.2 - Microlink API
    const microlinkData = await this.tryMicrolinkApi(resolvedUrl, originalUrl, options);
    if (microlinkData && this.isValidProduct(microlinkData)) {
      console.log(`[Magalu] ✅ SUCESSO via Microlink API!`);
      const enriched = await this.enrichPriceIfMissing(microlinkData);
      return { success: true, data: enriched };
    }

    // 1.3 - OpenGraph.io
    const opengraphData = await this.tryOpenGraphIo(resolvedUrl, originalUrl, options);
    if (opengraphData && this.isValidProduct(opengraphData)) {
      console.log(`[Magalu] ✅ SUCESSO via OpenGraph.io!`);
      const enriched = await this.enrichPriceIfMissing(opengraphData);
      return { success: true, data: enriched };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // CAMADA 2: Scraping Cloud (Médias)
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] CAMADA 2: Scraping Cloud`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    // 2.1 - ScrapingBee (PRIORIDADE - Confirmado funcionando com premium_proxy!)
    const scrapingBeeData = await this.tryScrapingBee(resolvedUrl, originalUrl, options);
    if (scrapingBeeData && this.isValidProduct(scrapingBeeData)) {
      console.log(`[Magalu] ✅ SUCESSO via ScrapingBee!`);
      const enriched = await this.enrichPriceIfMissing(scrapingBeeData);
      return { success: true, data: enriched };
    }

    // 2.2 - ZenRows
    const zenRowsData = await this.tryZenRows(resolvedUrl, originalUrl, options);
    if (zenRowsData && this.isValidProduct(zenRowsData)) {
      console.log(`[Magalu] ✅ SUCESSO via ZenRows!`);
      const enriched = await this.enrichPriceIfMissing(zenRowsData);
      return { success: true, data: enriched };
    }

    // 2.3 - ScraperAPI
    const scraperApiData = await this.scrapeWithScraperApi(resolvedUrl, originalUrl, options);
    if (scraperApiData && this.isValidProduct(scraperApiData)) {
      console.log(`[Magalu] ✅ SUCESSO via ScraperAPI!`);
      const enriched = await this.enrichPriceIfMissing(scraperApiData);
      return { success: true, data: enriched };
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
      const enriched = await this.enrichPriceIfMissing(playwrightData1);
      return { success: true, data: enriched };
    }

    // 3.2 - Playwright Stealth (Tentativa 2 - Com Homepage first)
    const playwrightData2 = await this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 2);
    if (playwrightData2 && this.isValidProduct(playwrightData2)) {
      console.log(`[Magalu] ✅ SUCESSO via Playwright (Tentativa 2)!`);
      const enriched = await this.enrichPriceIfMissing(playwrightData2);
      return { success: true, data: enriched };
    }

    // 3.3 - Playwright Stealth (Tentativa 3 - Com interações humanas)
    const playwrightData3 = await this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 3);
    if (playwrightData3 && this.isValidProduct(playwrightData3)) {
      console.log(`[Magalu] ✅ SUCESSO via Playwright (Tentativa 3)!`);
      const enriched = await this.enrichPriceIfMissing(playwrightData3);
      return { success: true, data: enriched };
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FALLBACK FINAL: URL Parsing + Google Search
    // ═══════════════════════════════════════════════════════════════════════════
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);
    console.log(`[Magalu] FALLBACK FINAL: URL Parsing + Google Search`);
    console.log(`[Magalu] ──────────────────────────────────────────────────────────`);

    const urlFallbackData = await this.tryUrlParsingFallback(resolvedUrl, originalUrl, urlInfo, options);
    if (urlFallbackData && this.isValidProduct(urlFallbackData)) {
      console.log(`[Magalu] ✅ SUCESSO via URL Parsing Fallback!`);
      return { success: true, data: urlFallbackData };
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

    // Extrair informações da URL para usar na busca
    const urlInfo = this.extractProductInfoFromUrl(resolvedUrl);

    const methods = [
      // Camada 0 - Google Shopping (Bypass completo)
      { name: "Google Shopping", category: "Google Bypass", fn: () => this.tryGoogleShopping(resolvedUrl, originalUrl, urlInfo, options) },
      { name: "Google Rich Snippets", category: "Google Bypass", fn: () => this.tryGoogleSearchRichSnippets(resolvedUrl, originalUrl, urlInfo, options) },

      // Camada 1 - Meta Tags
      { name: "Iframely API", category: "Meta Tags", fn: () => this.tryIframelyApi(resolvedUrl, originalUrl, options) },
      { name: "Microlink API", category: "Meta Tags", fn: () => this.tryMicrolinkApi(resolvedUrl, originalUrl, options) },
      { name: "OpenGraph.io", category: "Meta Tags", fn: () => this.tryOpenGraphIo(resolvedUrl, originalUrl, options) },

      // Camada 2 - Scraping Cloud (ScrapingBee primeiro - confirmado funcionando!)
      { name: "ScrapingBee", category: "Scraping Cloud", fn: () => this.tryScrapingBee(resolvedUrl, originalUrl, options) },
      { name: "ZenRows", category: "Scraping Cloud", fn: () => this.tryZenRows(resolvedUrl, originalUrl, options) },
      { name: "ScraperAPI", category: "Scraping Cloud", fn: () => this.scrapeWithScraperApi(resolvedUrl, originalUrl, options) },

      // Camada 3 - Browser
      { name: "Playwright T1", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 1) },
      { name: "Playwright T2", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 2) },
      { name: "Playwright T3", category: "Browser", fn: () => this.scrapeWithPlaywrightStealth(resolvedUrl, originalUrl, options, 3) },

      // Extras - Axios direto
      { name: "Axios Direto", category: "Direct", fn: () => this.tryAxiosDirect(resolvedUrl, originalUrl, options) },

      // Fallback - URL Parsing (último recurso)
      { name: "URL Parsing", category: "Fallback", fn: () => this.tryUrlParsingFallback(resolvedUrl, originalUrl, urlInfo, options) },
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
  // CAMADA 0: Google Shopping (Bypass Anti-Bot)
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Extrai informações do produto a partir da URL da Magalu
   * URLs seguem o padrão: /nome-do-produto-aqui/p/SKU123/
   */
  private extractProductInfoFromUrl(url: string): { productName: string; sku: string } | null {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname;

      // Padrão 1: /nome-do-produto/p/SKU/
      const productMatch = pathname.match(/\/([^\/]+)\/p\/([^\/]+)/);
      if (productMatch) {
        const slug = productMatch[1];
        const sku = productMatch[2];

        // Converter slug para nome legível
        // Ex: "geladeira-brastemp-frost-free-462l-branca" -> "Geladeira Brastemp Frost Free 462L Branca"
        const productName = slug
          .split('-')
          .map(word => {
            // Manter siglas em maiúsculo
            if (/^[a-z]{2,4}$/.test(word) && ['tv', 'hd', 'sd', 'gb', 'tb', 'mb', 'kg', 'ml', 'cm', 'mm'].includes(word.toLowerCase())) {
              return word.toUpperCase();
            }
            // Capitalizar primeira letra
            return word.charAt(0).toUpperCase() + word.slice(1);
          })
          .join(' ');

        console.log(`[Magalu/URLParse] Extraído: "${productName}" (SKU: ${sku})`);
        return { productName, sku };
      }

      // Padrão 2: /divulgador/oferta/SKU/
      const divulgadorMatch = pathname.match(/\/divulgador\/oferta\/([^\/]+)/);
      if (divulgadorMatch) {
        return { productName: '', sku: divulgadorMatch[1] };
      }

      return null;
    } catch (error) {
      console.log("[Magalu/URLParse] Erro ao extrair info da URL:", error);
      return null;
    }
  }

  /**
   * 0.1 - Google Shopping via SerpAPI
   * Busca o produto no Google Shopping, que tem dados atualizados e não é bloqueado
   */
  private async tryGoogleShopping(
    resolvedUrl: string,
    originalUrl: string,
    urlInfo: { productName: string; sku: string } | null,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/GoogleShopping] SKIP: SERPAPI_API_KEY não configurada");
      return null;
    }

    // Precisamos do nome do produto para buscar
    if (!urlInfo?.productName) {
      console.log("[Magalu/GoogleShopping] SKIP: Nome do produto não extraído da URL");
      return null;
    }

    try {
      console.log(`[Magalu/GoogleShopping] Buscando: "${urlInfo.productName}"...`);

      // Buscar no Google Shopping
      const response = await axios.get("https://serpapi.com/search.json", {
        timeout: 15000,
        params: {
          engine: "google_shopping",
          q: `${urlInfo.productName} magazine luiza`,
          api_key: apiKey,
          hl: "pt",
          gl: "br",
          location: "Brazil",
        },
      });

      const shoppingResults = response.data?.shopping_results || [];
      console.log(`[Magalu/GoogleShopping] Encontrados ${shoppingResults.length} resultados`);

      // Procurar resultado da Magazine Luiza
      for (const result of shoppingResults) {
        const source = (result.source || "").toLowerCase();
        const isMagalu = source.includes("magazine") || source.includes("magalu");

        if (isMagalu || shoppingResults.length === 1) {
          const title = result.title;
          const price = typeof result.extracted_price === "number"
            ? result.extracted_price
            : this.extractPrice(result.price || "");
          const imageUrl = result.thumbnail || result.image || "";

          if (title && imageUrl) {
            // Verificar se não é captcha
            if (this.isCaptchaPage(title, imageUrl)) {
              console.log("[Magalu/GoogleShopping] ⚠️ Resultado parece ser captcha");
              continue;
            }

            console.log(`[Magalu/GoogleShopping] ✅ Encontrado: "${title}" - R$ ${price}`);
            return {
              title: this.cleanTitle(title),
              price,
              imageUrl,
              productUrl: originalUrl,
              marketplace: MarketplaceEnum.MAGALU,
              inStock: true,
              scrapedAt: new Date(),
            };
          }
        }
      }

      // Fallback: usar qualquer resultado com o mesmo nome de produto
      for (const result of shoppingResults) {
        const title = result.title || "";
        const normalizedTitle = title.toLowerCase();
        const normalizedSearch = urlInfo.productName.toLowerCase();

        // Verificar similaridade básica (contém palavras-chave)
        const searchWords = normalizedSearch.split(' ').filter(w => w.length > 3);
        const matchCount = searchWords.filter(word => normalizedTitle.includes(word)).length;
        const matchRatio = matchCount / searchWords.length;

        if (matchRatio >= 0.5) {
          const price = typeof result.extracted_price === "number"
            ? result.extracted_price
            : this.extractPrice(result.price || "");
          const imageUrl = result.thumbnail || result.image || "";

          if (title && imageUrl && !this.isCaptchaPage(title, imageUrl)) {
            console.log(`[Magalu/GoogleShopping] ✅ Match parcial (${Math.round(matchRatio * 100)}%): "${title}"`);
            return {
              title: this.cleanTitle(title),
              price,
              imageUrl,
              productUrl: originalUrl,
              marketplace: MarketplaceEnum.MAGALU,
              inStock: true,
              scrapedAt: new Date(),
            };
          }
        }
      }

      console.log("[Magalu/GoogleShopping] Nenhum resultado válido encontrado");
      return null;
    } catch (error) {
      console.log("[Magalu/GoogleShopping] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * 0.2 - Google Search com extração de Rich Snippets
   * Busca o produto no Google e extrai dados dos rich snippets
   */
  private async tryGoogleSearchRichSnippets(
    resolvedUrl: string,
    originalUrl: string,
    urlInfo: { productName: string; sku: string } | null,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/GoogleRich] SKIP: SERPAPI_API_KEY não configurada");
      return null;
    }

    // Tentar buscar pelo SKU ou nome
    const searchQuery = urlInfo?.sku
      ? `site:magazineluiza.com.br ${urlInfo.sku}`
      : urlInfo?.productName
        ? `site:magazineluiza.com.br ${urlInfo.productName}`
        : null;

    if (!searchQuery) {
      console.log("[Magalu/GoogleRich] SKIP: Sem query de busca");
      return null;
    }

    try {
      console.log(`[Magalu/GoogleRich] Buscando: "${searchQuery}"...`);

      const response = await axios.get("https://serpapi.com/search.json", {
        timeout: 15000,
        params: {
          engine: "google",
          q: searchQuery,
          api_key: apiKey,
          hl: "pt",
          gl: "br",
          num: 5,
        },
      });

      const organicResults = response.data?.organic_results || [];
      console.log(`[Magalu/GoogleRich] Encontrados ${organicResults.length} resultados orgânicos`);

      for (const result of organicResults) {
        // Verificar se é da Magalu
        if (!result.link?.includes("magazineluiza.com.br")) {
          continue;
        }

        const title = result.title || "";
        const snippet = result.snippet || "";

        // Verificar se não é captcha
        if (this.isCaptchaPage(title, "")) {
          continue;
        }

        // Extrair preço do rich snippet
        let price: number | null = null;
        const richSnippet = result.rich_snippet;
        if (richSnippet?.top?.extensions) {
          for (const ext of richSnippet.top.extensions) {
            const extracted = this.extractPrice(ext);
            if (extracted !== null) {
              price = extracted;
              break;
            }
          }
        }
        if (price === null && richSnippet?.bottom?.extensions) {
          for (const ext of richSnippet.bottom.extensions) {
            const extracted = this.extractPrice(ext);
            if (extracted !== null) {
              price = extracted;
              break;
            }
          }
        }
        if (price === null) {
          price = this.extractPriceFromText(snippet);
        }

        // Extrair imagem (se disponível no thumbnail)
        const imageUrl = result.thumbnail || "";

        if (title && (price || imageUrl)) {
          console.log(`[Magalu/GoogleRich] ✅ Encontrado: "${title}" - R$ ${price || 'N/A'}`);

          // Se não tiver imagem, buscar posteriormente
          const productData: ProductData = {
            title: this.cleanTitle(title),
            price,
            imageUrl: imageUrl || "", // Será enriquecido depois se vazio
            productUrl: originalUrl,
            marketplace: MarketplaceEnum.MAGALU,
            inStock: true,
            scrapedAt: new Date(),
          };

          // Se não tiver imagem, tentar buscar via Google Images
          if (!imageUrl) {
            const enrichedImage = await this.fetchImageFromGoogleImages(urlInfo?.productName || title);
            if (enrichedImage) {
              productData.imageUrl = enrichedImage;
            }
          }

          // Só retornar se tiver imagem válida
          if (productData.imageUrl && this.isValidImageUrl(productData.imageUrl)) {
            return productData;
          }
        }
      }

      console.log("[Magalu/GoogleRich] Nenhum resultado válido encontrado");
      return null;
    } catch (error) {
      console.log("[Magalu/GoogleRich] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Busca imagem do produto no Google Images
   */
  private async fetchImageFromGoogleImages(productName: string): Promise<string | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey || !productName) {
      return null;
    }

    try {
      console.log(`[Magalu/GoogleImages] Buscando imagem para: "${productName}"...`);

      const response = await axios.get("https://serpapi.com/search.json", {
        timeout: 10000,
        params: {
          engine: "google_images",
          q: `${productName} magazine luiza produto`,
          api_key: apiKey,
          hl: "pt",
          gl: "br",
          num: 5,
        },
      });

      const images = response.data?.images_results || [];

      for (const img of images) {
        const imageUrl = img.original || img.thumbnail || "";
        if (imageUrl && this.isValidImageUrl(imageUrl)) {
          // Verificar se não é logo/placeholder
          const urlLower = imageUrl.toLowerCase();
          if (!urlLower.includes("logo") && !urlLower.includes("placeholder") && !urlLower.includes("icon")) {
            console.log(`[Magalu/GoogleImages] ✅ Imagem encontrada`);
            return imageUrl;
          }
        }
      }

      return null;
    } catch (error) {
      console.log("[Magalu/GoogleImages] Erro:", error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Fallback final: usar informações da URL quando tudo mais falhar
   */
  private async tryUrlParsingFallback(
    resolvedUrl: string,
    originalUrl: string,
    urlInfo: { productName: string; sku: string } | null,
    options?: ScrapeOptions
  ): Promise<ProductData | null> {
    if (!urlInfo?.productName) {
      console.log("[Magalu/URLFallback] SKIP: Nome do produto não disponível");
      return null;
    }

    console.log(`[Magalu/URLFallback] Usando dados da URL: "${urlInfo.productName}"`);

    // Tentar obter imagem via Google Images
    const imageUrl = await this.fetchImageFromGoogleImages(urlInfo.productName);

    // Tentar obter preço via Google
    const price = await this.fetchPriceFromGoogleCse(urlInfo.productName) ||
                  await this.fetchPriceFromSerpApi(urlInfo.productName);

    if (!imageUrl) {
      console.log("[Magalu/URLFallback] Não foi possível encontrar imagem");
      return null;
    }

    console.log(`[Magalu/URLFallback] ✅ Dados construídos: "${urlInfo.productName}" - R$ ${price || 'N/A'}`);

    return {
      title: urlInfo.productName,
      price,
      imageUrl,
      productUrl: originalUrl,
      marketplace: MarketplaceEnum.MAGALU,
      inStock: true,
      scrapedAt: new Date(),
    };
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

      // Verificar se é página de captcha/antibot
      if (this.isCaptchaPage(title, imageUrl)) {
        console.log("[Magalu/Iframely] ⚠️ Detectada página de captcha");
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

      // Verificar se é página de captcha/antibot
      if (this.isCaptchaPage(title, imageUrl)) {
        console.log("[Magalu/Microlink] ⚠️ Detectada página de captcha");
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

      // Verificar se é página de captcha/antibot
      if (this.isCaptchaPage(title, imageUrl)) {
        console.log("[Magalu/OpenGraph] ⚠️ Detectada página de captcha");
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
   * 2.2 - ZenRows (FUNCIONA COM PREMIUM PROXY!)
   * Testado e confirmado funcionando com divulgador.magalu.com
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

    // Usar a URL original primeiro (divulgador funciona melhor)
    const urlsToTry = [originalUrl, resolvedUrl].filter((url, i, arr) => arr.indexOf(url) === i);

    for (const urlToFetch of urlsToTry) {
      try {
        console.log(`[Magalu/ZenRows] Fazendo requisição para: ${urlToFetch.substring(0, 60)}...`);

        // Parâmetros que funcionam (testado pelo usuário):
        // - premium_proxy: true
        // - proxy_country: br
        // - SEM js_render (causa problemas)
        // - SEM antibot (não necessário com premium_proxy)
        const response = await axios.get("https://api.zenrows.com/v1/", {
          timeout: 45000,
          params: {
            apikey: apiKey,
            url: urlToFetch,
            premium_proxy: "true",
            proxy_country: "br",
          },
        });

        const html = response.data;
        if (!html || typeof html !== "string") {
          console.log("[Magalu/ZenRows] HTML vazio, tentando próxima URL...");
          continue;
        }

        // Verificar se caiu no perfdrive/captcha
        if (/validate\.perfdrive|shieldsquare|captcha|blocked/i.test(html)) {
          console.log("[Magalu/ZenRows] Detectado bloqueio no HTML, tentando próxima URL...");
          continue;
        }

        const $ = cheerio.load(html) as cheerio.CheerioAPI;
        const data = this.extractProductData($, resolvedUrl, originalUrl, options);

        if (data && this.isValidImageUrl(data.imageUrl) && this.isValidProduct(data)) {
          console.log("[Magalu/ZenRows] ✅ Dados extraídos com sucesso!");
          return data;
        }

        console.log("[Magalu/ZenRows] Dados inválidos, tentando próxima URL...");
      } catch (error) {
        console.log(`[Magalu/ZenRows] Erro com ${urlToFetch.substring(0, 40)}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("[Magalu/ZenRows] Todas as tentativas falharam");
    return null;
  }

  /**
   * 2.3 - ScrapingBee (FUNCIONA COM PREMIUM PROXY!)
   * Testado e confirmado funcionando com divulgador.magalu.com
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

    // Usar a URL original primeiro (divulgador funciona melhor)
    // Depois tentar a URL resolvida se falhar
    const urlsToTry = [originalUrl, resolvedUrl].filter((url, i, arr) => arr.indexOf(url) === i);

    for (const urlToFetch of urlsToTry) {
      try {
        console.log(`[Magalu/ScrapingBee] Fazendo requisição para: ${urlToFetch.substring(0, 60)}...`);

        // Parâmetros que funcionam (testado pelo usuário):
        // - premium_proxy: true
        // - country_code: br
        // - SEM render_js (causa problemas)
        // - SEM stealth_proxy (conflita com premium_proxy)
        const response = await axios.get("https://app.scrapingbee.com/api/v1", {
          timeout: 45000, // Timeout maior para premium proxy
          params: {
            api_key: apiKey,
            url: urlToFetch,
            premium_proxy: "true",
            country_code: "br",
          },
        });

        const html = response.data;
        if (!html || typeof html !== "string") {
          console.log("[Magalu/ScrapingBee] HTML vazio, tentando próxima URL...");
          continue;
        }

        // Verificar se caiu no perfdrive/captcha
        if (/validate\.perfdrive|shieldsquare|captcha|blocked/i.test(html)) {
          console.log("[Magalu/ScrapingBee] Detectado bloqueio no HTML, tentando próxima URL...");
          continue;
        }

        const $ = cheerio.load(html) as cheerio.CheerioAPI;
        const data = this.extractProductData($, resolvedUrl, originalUrl, options);

        if (data && this.isValidImageUrl(data.imageUrl) && this.isValidProduct(data)) {
          console.log("[Magalu/ScrapingBee] ✅ Dados extraídos com sucesso!");
          return data;
        }

        console.log("[Magalu/ScrapingBee] Dados inválidos, tentando próxima URL...");
      } catch (error) {
        console.log(`[Magalu/ScrapingBee] Erro com ${urlToFetch.substring(0, 40)}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("[Magalu/ScrapingBee] Todas as tentativas falharam");
    return null;
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

            // Permitir dados sem preço (será enriquecido depois)
            if (title && imageUrl && this.isValidImageUrl(imageUrl)) {
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

      // Permitir dados sem preço (será enriquecido depois)
      if (!title || !imageUrl) {
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
      const discountPercentage = originalPrice && price && originalPrice > price
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

    // Permitir dados sem preço (será enriquecido depois)
    if (!title || !imageValue) return null;

    const originalPrice = rawOriginalPrice && price && rawOriginalPrice > price ? rawOriginalPrice : null;
    const discountPercentage = originalPrice && price && originalPrice > price
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

    const titleLower = data.title.toLowerCase().trim();
    const imageLower = data.imageUrl.toLowerCase();

    // ═══════════════════════════════════════════════════════════════════════════
    // DETECÇÃO DE CAPTCHA/ANTIBOT
    // ═══════════════════════════════════════════════════════════════════════════
    const captchaPatterns = [
      "captcha",
      "verificação",
      "verificacao",
      "verify",
      "robot",
      "robô",
      "robo",
      "humano",
      "human",
      "security check",
      "challenge",
      "blocked",
      "bloqueado",
      "block page",
      "acesso negado",
      "access denied",
      "perfdrive",
      "shieldsquare",
      "cloudflare",
      "radware",
      "incapsula",
      "imperva",
      "distil",
      "datadome",
      "akamai",
      "kasada",
      "aguarde",
      "wait",
      "loading",
      "carregando",
      "validando",
      "validating",
      "just a moment",
      "checking your browser",
      "please wait",
      "attention required",
      "pardon our interruption",
      "unusual traffic",
    ];

    for (const pattern of captchaPatterns) {
      if (titleLower.includes(pattern)) {
        console.log(`[Magalu] ⚠️ Detectado captcha/antibot no título: "${data.title}"`);
        return false;
      }
    }

    // Detectar imagens de logo/placeholder que indicam captcha
    const invalidImagePatterns = [
      "logo",
      "placeholder",
      "default",
      "icon",
      "favicon",
      "brand",
      "captcha",
      "challenge",
      "cloudflare",
      "shieldsquare",
      "perfdrive",
      "radware",
      "incapsula",
      "imperva",
      "datadome",
      "akamai",
      "/static/",
      "/assets/logo",
      "/images/logo",
      "magazineluiza.com.br/static",
      "data:image", // base64 placeholder
    ];

    for (const pattern of invalidImagePatterns) {
      if (imageLower.includes(pattern)) {
        console.log(`[Magalu] ⚠️ Detectada imagem inválida/logo: "${data.imageUrl.substring(0, 100)}"`);
        return false;
      }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DETECÇÃO DE TÍTULOS GENÉRICOS
    // ═══════════════════════════════════════════════════════════════════════════
    const genericPatterns = [
      "recomendado para você",
      "você também pode gostar",
      "produtos relacionados",
      "sugestões",
      "magazine luiza",
      "magalu",
      "página inicial",
      "home",
      "erro",
      "error",
      "não encontrado",
      "not found",
      "404",
      "500",
    ];
    for (const pattern of genericPatterns) {
      if (titleLower === pattern || titleLower.startsWith(pattern + " ")) {
        console.log(`[Magalu] ⚠️ Detectado título genérico: "${data.title}"`);
        return false;
      }
    }

    // Verificar se título é muito curto ou só tem nome da loja
    if (titleLower.length < 10) {
      console.log(`[Magalu] ⚠️ Título muito curto: "${data.title}"`);
      return false;
    }

    // Verificar se a imagem parece ser de produto (deve ter dimensões ou path de produto)
    const productImagePatterns = [
      "/produto/",
      "/p/",
      "/image/",
      "/img/",
      "/media/",
      "a-static.mlcdn.com.br",
      "imguol.com",
      "amazonaws.com",
      "cloudfront.net",
    ];

    const hasProductImagePattern = productImagePatterns.some(p => imageLower.includes(p));

    // Se não tem padrão de imagem de produto, verificar se parece genérica
    if (!hasProductImagePattern) {
      // Verificar se é uma URL muito curta (provavelmente placeholder)
      if (data.imageUrl.length < 50) {
        console.log(`[Magalu] ⚠️ URL de imagem suspeita (muito curta): "${data.imageUrl}"`);
        return false;
      }
    }

    return true;
  }

  /**
   * Detecta se os dados são de uma página de captcha/antibot
   */
  private isCaptchaPage(title: string, imageUrl: string): boolean {
    const titleLower = (title || "").toLowerCase().trim();
    const imageLower = (imageUrl || "").toLowerCase();

    // Log para debug
    console.log(`[Magalu/CaptchaCheck] Verificando - Título: "${title?.substring(0, 80)}" | Imagem: "${imageUrl?.substring(0, 80)}"`);

    // Padrões de título que indicam captcha/antibot
    const captchaTitlePatterns = [
      "captcha",
      "verificação",
      "verificacao",
      "verify",
      "robot",
      "robô",
      "robo",
      "humano",
      "human",
      "security",
      "check",
      "challenge",
      "blocked",
      "bloqueado",
      "block page",
      "block",
      "acesso negado",
      "access denied",
      "denied",
      "perfdrive",
      "shieldsquare",
      "cloudflare",
      "radware",
      "incapsula",
      "imperva",
      "distil",
      "datadome",
      "akamai",
      "kasada",
      "bot manager",
      "bot detection",
      "protection",
      "proteção",
      "aguarde",
      "wait",
      "loading",
      "carregando",
      "validando",
      "validating",
      "just a moment",
      "checking your browser",
      "please wait",
      "attention required",
      "pardon our interruption",
      "unusual traffic",
      "automated",
      "automático",
      "suspicious",
      "suspeito",
    ];

    for (const pattern of captchaTitlePatterns) {
      if (titleLower.includes(pattern)) {
        return true;
      }
    }

    // Padrões de imagem que indicam captcha/antibot/logo genérico
    const captchaImagePatterns = [
      "logo",
      "captcha",
      "challenge",
      "cloudflare",
      "shieldsquare",
      "perfdrive",
      "radware",
      "incapsula",
      "imperva",
      "datadome",
      "akamai",
      "favicon",
      "icon",
      "brand",
      "/static/",
      "data:image",
    ];

    for (const pattern of captchaImagePatterns) {
      if (imageLower.includes(pattern)) {
        return true;
      }
    }

    // Verificar se título é muito genérico (só nome da loja)
    const genericTitles = [
      "magazine luiza",
      "magalu",
      "magazineluiza",
    ];

    for (const generic of genericTitles) {
      if (titleLower === generic || titleLower.startsWith(generic + " -") || titleLower.startsWith(generic + " |")) {
        return true;
      }
    }

    // Verificar se título é muito curto para ser produto real (menos de 15 chars)
    if (titleLower.length < 15) {
      console.log(`[Magalu/CaptchaCheck] Título muito curto para ser produto: "${title}"`);
      return true;
    }

    // Verificar se título NÃO parece ser de produto (heurística positiva)
    // Produtos geralmente têm: números, unidades, cores, marcas, etc.
    const productIndicators = [
      /\d+/, // Contém números (modelo, tamanho, quantidade)
      /\b(gb|tb|mb|kg|ml|cm|mm|pol|"|'|w|v|hz)\b/i, // Unidades de medida
      /\b(preto|branco|azul|vermelho|verde|amarelo|rosa|cinza|prata|dourado|black|white|blue|red|green)\b/i, // Cores
      /\b(samsung|apple|lg|sony|philips|brastemp|electrolux|consul|motorola|xiaomi|dell|hp|lenovo|acer|asus|multilaser|mondial|britânia|cadence|arno|oster|philco|panasonic|jbl|intelbras|positivo|aoc|tcl)\b/i, // Marcas conhecidas
      /\b(smart|led|lcd|wifi|bluetooth|usb|hdmi|4k|hd|full|ultra|pro|max|plus|lite|mini|air)\b/i, // Termos técnicos
      /\b(geladeira|fogão|micro-ondas|microondas|televisão|tv|celular|smartphone|notebook|tablet|fone|caixa de som|ventilador|ar condicionado|máquina de lavar|lavadora|secadora|aspirador|liquidificador|batedeira|cafeteira|fritadeira|air fryer|panela|frigideira|sofá|cama|colchão|mesa|cadeira|armário|guarda-roupa|estante)\b/i, // Categorias de produto
    ];

    const hasProductIndicator = productIndicators.some(pattern => pattern.test(titleLower));

    if (!hasProductIndicator) {
      console.log(`[Magalu/CaptchaCheck] Título não parece ser de produto: "${title}"`);
      return true;
    }

    // Verificar se a imagem vem de CDN de produto válido
    const validProductImageDomains = [
      "a-static.mlcdn.com.br",
      "imgs.casasbahia.com.br",
      "images-americanas.b2w.io",
      "images-submarino.b2w.io",
      "images-shoptime.b2w.io",
      "cf.shopee.com.br",
      "images-na.ssl-images-amazon.com",
      "m.media-amazon.com",
      "http2.mlstatic.com",
      "cloudfront.net",
      "amazonaws.com",
    ];

    const isFromValidDomain = validProductImageDomains.some(domain => imageLower.includes(domain));

    if (!isFromValidDomain && !imageLower.includes("/produto") && !imageLower.includes("/p/")) {
      console.log(`[Magalu/CaptchaCheck] Imagem não vem de CDN de produto válido: "${imageUrl?.substring(0, 100)}"`);
      return true;
    }

    return false;
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

    // Permitir dados sem preço (será enriquecido depois)
    if (!title || !imageUrl) return null;

    const originalPriceValue =
      (data.originalPrice as number | string | undefined) ||
      (data.listPrice as number | string | undefined) ||
      (data.priceFrom as number | string | undefined);
    const originalPrice = typeof originalPriceValue === "number"
      ? originalPriceValue
      : typeof originalPriceValue === "string"
        ? this.extractPrice(originalPriceValue)
        : null;

    const discountPercentage = originalPrice && price && originalPrice > price
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // Métodos de Enriquecimento de Preço
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Enriquece o produto com preço se estiver faltando
   * Usa Google CSE e SerpAPI como fontes alternativas
   */
  private async enrichPriceIfMissing(product: ProductData): Promise<ProductData> {
    if (typeof product.price === "number" && Number.isFinite(product.price)) {
      return product;
    }

    const title = product.title?.trim();
    if (!title) {
      return product;
    }

    console.log(`[Magalu/Enrich] Buscando preço para: ${title.substring(0, 50)}...`);

    // Tentar Google CSE primeiro
    const googlePrice = await this.fetchPriceFromGoogleCse(title);
    if (googlePrice !== null) {
      console.log(`[Magalu/Enrich] ✅ Preço encontrado via Google CSE: R$ ${googlePrice}`);
      return { ...product, price: googlePrice };
    }

    // Tentar SerpAPI
    const serpPrice = await this.fetchPriceFromSerpApi(title);
    if (serpPrice !== null) {
      console.log(`[Magalu/Enrich] ✅ Preço encontrado via SerpAPI: R$ ${serpPrice}`);
      return { ...product, price: serpPrice };
    }

    console.log(`[Magalu/Enrich] ❌ Não foi possível encontrar preço`);
    return product;
  }

  private normalizeTitleForMatch(value: string): string {
    const cleaned = value
      .toLowerCase()
      .replace(/\s+[\-|–|—]\s*magaz?i?n?e?\s*luiza.*$/i, "")
      .replace(/\s+[\-|–|—]\s*magalu.*$/i, "")
      .replace(/\s+\|\s*magaz?i?n?e?\s*luiza.*$/i, "")
      .replace(/\s+\|\s*magalu.*$/i, "")
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
    if (!apiKey || !cseId) {
      console.log("[Magalu/GoogleCSE] SKIP: API keys não configuradas");
      return null;
    }

    try {
      console.log("[Magalu/GoogleCSE] Buscando preço...");
      const response = await axios.get("https://www.googleapis.com/customsearch/v1", {
        timeout: 10000,
        params: {
          key: apiKey,
          cx: cseId,
          q: `${title} magazine luiza site:magazineluiza.com.br`,
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
        // Verificar se é do Magazine Luiza
        if (!item.link?.includes("magazineluiza.com.br")) {
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
      console.log("[Magalu/GoogleCSE] Erro:", error instanceof Error ? error.message : error);
    }

    return null;
  }

  private async fetchPriceFromSerpApi(title: string): Promise<number | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log("[Magalu/SerpAPI] SKIP: SERPAPI_API_KEY não configurada");
      return null;
    }

    try {
      console.log("[Magalu/SerpAPI] Buscando preço...");
      const response = await axios.get("https://serpapi.com/search.json", {
        timeout: 10000,
        params: {
          engine: "google",
          q: `${title} magazine luiza site:magazineluiza.com.br`,
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

      // Tentar shopping results primeiro
      const shoppingResults = Array.isArray(response.data?.shopping_results)
        ? response.data.shopping_results
        : [];
      for (const result of shoppingResults) {
        if (result.source?.toLowerCase().includes("magazine") ||
            result.source?.toLowerCase().includes("magalu")) {
          const price = this.extractPriceFromText(result.price || "");
          if (price !== null) {
            return price;
          }
          if (typeof result.extracted_price === "number") {
            return result.extracted_price;
          }
        }
      }

      // Tentar organic results
      const results = Array.isArray(response.data?.organic_results)
        ? response.data.organic_results
        : [];
      for (const result of results) {
        if (!result.link?.includes("magazineluiza.com.br")) {
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
      console.log("[Magalu/SerpAPI] Erro:", error instanceof Error ? error.message : error);
    }

    return null;
  }
}
