import axios from 'axios';
import { Bot } from 'grammy';
import { MarketplaceEnum, ProductData } from '../../scraping/types.js';
import { nowBrt } from '../../utils/time.js';

/**
 * Telegram type definitions for link previews
 */
export type TelegramPhoto = { file_id?: string };
export type TelegramWebPage = {
  title?: string;
  description?: string;
  display_url?: string;
  site_name?: string;
  photo?: TelegramPhoto | TelegramPhoto[];
  thumbnail_url?: string;
  image_url?: string;
};
export type ExternalPreview = {
  title?: string;
  description?: string;
  image?: string;
  images?: string[];
};

/**
 * Scraping Core Service
 * Shared scraping utilities for all Telegram bots
 */
export class ScrapingCoreService {
  /**
   * Build product data from Telegram link preview (fallback when scraper fails)
   */
  async buildProductFromTelegramPreview(
    ctx: { message?: unknown; api: Bot['api']; chat?: { id: number; type?: string } },
    url: string,
    marketplace: MarketplaceEnum,
    botToken: string
  ): Promise<{ product: ProductData; priceImageUrl: string | null } | null> {
    const message = ctx.message as Record<string, unknown> | undefined;
    const webPage =
      (message?.['web_page'] as TelegramWebPage | undefined) ||
      (message?.['link_preview'] as TelegramWebPage | undefined) ||
      (message?.['linkPreview'] as TelegramWebPage | undefined);

    if (webPage) {
      console.log('[Preview] web_page encontrado no ctx.message');
    }

    const resolvedWebPage = webPage || (await this.fetchTelegramPreview(ctx, url));
    const previewUrls = resolvedWebPage ? [url] : await this.buildPreviewUrlCandidates(url);
    const externalPreview = resolvedWebPage ? null : await this.fetchExternalPreview(previewUrls);
    if (!resolvedWebPage && !externalPreview) {
      console.log('[Preview] Nenhum preview disponível (Telegram/externo).');
      return null;
    }

    const title =
      resolvedWebPage?.title ||
      resolvedWebPage?.site_name ||
      resolvedWebPage?.display_url ||
      externalPreview?.title ||
      '';
    if (!title) {
      console.log('[Preview] Preview sem título.');
      return null;
    }

    if (this.isLikelyQueryStringTitle(title)) {
      console.log('[Preview] Preview com título inválido (query string).', { title });
      return null;
    }

    const previewImages: string[] = [];
    if (resolvedWebPage?.thumbnail_url) previewImages.push(resolvedWebPage.thumbnail_url);
    if (resolvedWebPage?.image_url) previewImages.push(resolvedWebPage.image_url);
    if (externalPreview?.image) previewImages.push(externalPreview.image);
    if (externalPreview?.images?.length) previewImages.push(...externalPreview.images);

    let imageUrl = previewImages[0] || '';
    const priceImageUrl = imageUrl;

    if (!imageUrl && resolvedWebPage?.photo) {
      const photo = Array.isArray(resolvedWebPage.photo)
        ? resolvedWebPage.photo[resolvedWebPage.photo.length - 1]
        : resolvedWebPage.photo;
      const fileId = photo?.file_id;
      if (fileId) {
        try {
          const file = await ctx.api.getFile(fileId);
          if (file.file_path) {
            imageUrl = `https://api.telegram.org/file/bot${botToken}/${file.file_path}`;
          }
        } catch {}
      }
    }

    if (!imageUrl) {
      console.log('[Preview] Preview sem imagem.');
      return null;
    }

    // Verificar se é captcha/block page
    if (this.isCaptchaOrBlockPage(title, imageUrl)) {
      console.log('[Preview] Preview de captcha detectado, ignorando:', {
        title,
        imageUrl,
      });
      return null;
    }

    if (this.isGenericShopeePreview(title, imageUrl, url)) {
      console.log('[Preview] Preview generico detectado, ignorando:', {
        title,
        imageUrl,
      });
      return null;
    }

    console.log('[Preview] Produto construído com preview:', {
      title,
      hasImage: true,
      source: resolvedWebPage ? 'telegram' : 'external',
    });

    const priceResult = await this.findPriceViaOcr(imageUrl);
    const price = priceResult?.price ?? null;

    const cleanImage = await this.selectCleanProductImage(
      previewImages,
      imageUrl,
      priceResult?.text || null
    );
    if (cleanImage) {
      imageUrl = cleanImage;
    }

    return {
      product: {
        title,
        description: resolvedWebPage?.description || externalPreview?.description || undefined,
        price,
        originalPrice: null,
        discountPercentage: undefined,
        imageUrl,
        productUrl: url,
        marketplace,
        rating: undefined,
        reviewCount: undefined,
        salesQuantity: undefined,
        seller: undefined,
        inStock: true,
        scrapedAt: nowBrt(),
      },
      priceImageUrl,
    };
  }

  /**
   * Build preview URL candidates for external preview APIs
   */
  async buildPreviewUrlCandidates(url: string): Promise<string[]> {
    const cleaned = this.stripTrackingParams(url);
    const resolved = await this.resolveUrlForPreview(cleaned);
    const candidates = [resolved, cleaned, url];

    const shopeeCanonical = this.toShopeeCanonicalUrl(resolved) || this.toShopeeCanonicalUrl(cleaned);
    if (shopeeCanonical) {
      candidates.unshift(shopeeCanonical);
    }

    const unique = Array.from(new Set(candidates.filter(Boolean)));
    console.log('[Preview] URLs candidatas para preview:', unique);
    return unique;
  }

  /**
   * Resolve URL following redirects
   */
  async resolveUrlForPreview(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        maxRedirects: 5,
        timeout: 12000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });
      const resolved =
        (response.request as { res?: { responseUrl?: string } })?.res?.responseUrl || url;
      const finalUrl = this.stripTrackingParams(resolved);
      console.log('[Preview] URL resolvida para:', finalUrl);
      return finalUrl;
    } catch (error) {
      console.log('[Preview] Falha ao resolver URL, usando original:', error);
      return url;
    }
  }

  /**
   * Strip tracking parameters from URL
   */
  stripTrackingParams(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.search = '';
      return parsed.toString();
    } catch {
      return url;
    }
  }

  /**
   * Check if title looks like a query string (invalid)
   */
  isLikelyQueryStringTitle(title: string): boolean {
    const trimmed = title.trim();
    if (!trimmed) return true;
    if (trimmed.length > 120 && trimmed.includes('&') && trimmed.includes('=')) {
      return true;
    }
    if (trimmed.includes('__mobile__') || trimmed.includes('utm_')) {
      return true;
    }
    const hasSpaces = /\s/.test(trimmed);
    if (!hasSpaces && trimmed.includes('&') && trimmed.includes('=')) {
      return true;
    }
    return false;
  }

  /**
   * Convert Shopee URL to canonical format
   */
  toShopeeCanonicalUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      if (!parsed.hostname.includes('shopee')) return null;
      const path = parsed.pathname.replace(/\/+$/, '');
      const opaanlpMatch = path.match(/\/opaanlp\/(\d+)\/(\d+)/i);
      if (opaanlpMatch) {
        return `https://shopee.com.br/product/${opaanlpMatch[1]}/${opaanlpMatch[2]}`;
      }
      const dottedMatch = path.match(/i\.(\d+)\.(\d+)/);
      if (dottedMatch) {
        return `https://shopee.com.br/product/${dottedMatch[1]}/${dottedMatch[2]}`;
      }
      const slashMatch = path.match(/\/(\d+)\/(\d+)/);
      if (slashMatch) {
        return `https://shopee.com.br/product/${slashMatch[1]}/${slashMatch[2]}`;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Fetch external preview from multiple APIs (Microlink, Iframely, OpenGraph)
   */
  async fetchExternalPreview(urls: string[]): Promise<ExternalPreview | null> {
    console.log('[Preview] Tentando preview externo (Microlink → Iframely → OpenGraph)...');
    for (const targetUrl of urls) {
      const microlink = await this.fetchFromMicrolink(targetUrl);
      if (microlink) {
        // Verificar se é captcha/block page
        if (this.isCaptchaOrBlockPage(microlink.title || '', microlink.image || '')) {
          console.log('[Preview] Microlink retornou captcha, tentando proximo');
          continue;
        }
        if (!this.isGenericShopeePreview(microlink.title || '', microlink.image || '', targetUrl)) {
          console.log('[Preview] Microlink OK');
          return microlink;
        }
        console.log('[Preview] Microlink generico, tentando proximo:', {
          title: microlink.title,
          image: microlink.image,
        });
      }

      const iframely = await this.fetchFromIframely(targetUrl);
      if (iframely) {
        // Verificar se é captcha/block page
        if (this.isCaptchaOrBlockPage(iframely.title || '', iframely.image || '')) {
          console.log('[Preview] Iframely retornou captcha, tentando proximo');
          continue;
        }
        if (!this.isGenericShopeePreview(iframely.title || '', iframely.image || '', targetUrl)) {
          console.log('[Preview] Iframely OK');
          return iframely;
        }
        console.log('[Preview] Iframely generico, tentando proximo:', {
          title: iframely.title,
          image: iframely.image,
        });
      }

      const openGraph = await this.fetchFromOpenGraph(targetUrl);
      if (openGraph) {
        // Verificar se é captcha/block page
        if (this.isCaptchaOrBlockPage(openGraph.title || '', openGraph.image || '')) {
          console.log('[Preview] OpenGraph.io retornou captcha, tentando proximo');
          continue;
        }
        if (!this.isGenericShopeePreview(openGraph.title || '', openGraph.image || '', targetUrl)) {
          console.log('[Preview] OpenGraph.io OK');
          return openGraph;
        }
        console.log('[Preview] OpenGraph.io generico, tentando proximo:', {
          title: openGraph.title,
          image: openGraph.image,
        });
      }
    }

    console.log('[Preview] Todos os serviços externos falharam.');
    return null;
  }

  /**
   * Fetch preview from Microlink API
   */
  async fetchFromMicrolink(url: string): Promise<ExternalPreview | null> {
    const apiKey = process.env.MICROLINK_API_KEY;
    try {
      console.log('[Preview] Microlink request:', { hasKey: !!apiKey });
      const response = await axios.get('https://api.microlink.io', {
        timeout: 12000,
        params: { url },
        headers: {
          Accept: 'application/json',
          ...(apiKey ? { 'X-API-Key': apiKey } : {}),
        },
      });

      const data = response.data?.data;
      if (!data) return null;
      const images =
        Array.isArray(data.images) ?
          data.images.map((img: { url?: string }) => img.url).filter(Boolean) :
          [];
      return {
        title: data.title,
        description: data.description,
        image: data.image?.url || data.logo?.url,
        images,
      };
    } catch (error) {
      console.log('[Preview] Microlink falhou:', error);
      return null;
    }
  }

  /**
   * Fetch preview from Iframely API
   */
  async fetchFromIframely(url: string): Promise<ExternalPreview | null> {
    const apiKey = process.env.IFRAMELY_API_KEY;
    if (!apiKey) return null;
    try {
      console.log('[Preview] Iframely request');
      const response = await axios.get('https://iframe.ly/api/iframely', {
        timeout: 12000,
        params: { url, api_key: apiKey },
        headers: { Accept: 'application/json' },
      });

      const data = response.data;
      const images = [
        ...(data?.links?.image?.map((item: { href?: string }) => item.href) || []),
        ...(data?.links?.thumbnail?.map((item: { href?: string }) => item.href) || []),
      ].filter(Boolean);
      const thumb =
        images[0] ||
        data?.links?.icon?.[0]?.href;

      return {
        title: data?.meta?.title,
        description: data?.meta?.description,
        image: thumb,
        images,
      };
    } catch (error) {
      console.log('[Preview] Iframely falhou:', error);
      return null;
    }
  }

  /**
   * Fetch preview from OpenGraph.io API
   */
  async fetchFromOpenGraph(url: string): Promise<ExternalPreview | null> {
    const appId = process.env.OPENGRAPH_APP_ID;
    if (!appId) return null;
    try {
      console.log('[Preview] OpenGraph.io request');
      const encoded = encodeURIComponent(url);
      const response = await axios.get(`https://opengraph.io/api/1.1/site/${encoded}`, {
        timeout: 12000,
        params: { app_id: appId },
        headers: { Accept: 'application/json' },
      });

      const data = response.data?.hybridGraph;
      if (!data) return null;
      const images = [data.image].filter(Boolean) as string[];
      return {
        title: data.title,
        description: data.description,
        image: data.image,
        images,
      };
    } catch (error) {
      console.log('[Preview] OpenGraph.io falhou:', error);
      return null;
    }
  }

  /**
   * Fetch Telegram link preview by sending message
   */
  async fetchTelegramPreview(
    ctx: { api: Bot['api']; chat?: { id: number; type?: string } },
    url: string
  ): Promise<TelegramWebPage | null> {
    if (!ctx.chat) {
      return null;
    }

    try {
      console.log('[Telegram] Tentando gerar link preview via sendMessage...');
      const previewMsg = await ctx.api.sendMessage(ctx.chat.id, url, {
        disable_notification: true,
        link_preview_options: { is_disabled: false },
      });

      const previewPayload = previewMsg as unknown as {
        web_page?: TelegramWebPage;
        link_preview?: TelegramWebPage;
        linkPreview?: TelegramWebPage;
      };
      const webPage = previewPayload.web_page || previewPayload.link_preview || previewPayload.linkPreview;

      await ctx.api.deleteMessage(ctx.chat.id, previewMsg.message_id).catch(() => {});

      if (!webPage) {
        console.log('[Telegram] Link preview não disponível para:', url);
        console.log('[Telegram] Mensagem recebida:', {
          messageId: previewMsg.message_id,
          hasWebPage: !!webPage,
        });
      } else {
        console.log('[Telegram] Link preview capturado com sucesso.');
      }

      return (webPage as TelegramWebPage | undefined) || null;
    } catch {
      return null;
    }
  }

  /**
   * Normalize title for comparison (removes Shopee branding)
   */
  normalizeTitleForMatch(value: string): string {
    return value
      .toLowerCase()
      .replace(/\s+[\-|–|—]\s*shopee.*$/i, '')
      .replace(/\s+\|\s*shopee.*$/i, '')
      .replace(/\s+–\s*shopee.*$/i, '')
      .replace(/\s+—\s*shopee.*$/i, '')
      .replace(/\s+shopee.*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if preview is a captcha/block page (anti-bot protection)
   */
  isCaptchaOrBlockPage(title: string, imageUrl: string): boolean {
    const normalizedTitle = (title || '').toLowerCase().trim();
    const normalizedImage = (imageUrl || '').toLowerCase();

    // Padrões de título que indicam captcha/antibot
    const captchaTitlePatterns = [
      'captcha',
      'verificação',
      'verificacao',
      'verify',
      'robot',
      'robô',
      'robo',
      'humano',
      'human',
      'security',
      'check',
      'challenge',
      'blocked',
      'bloqueado',
      'block page',
      'block',
      'acesso negado',
      'access denied',
      'denied',
      'perfdrive',
      'shieldsquare',
      'cloudflare',
      'radware',
      'incapsula',
      'imperva',
      'distil',
      'datadome',
      'akamai',
      'kasada',
      'bot manager',
      'bot detection',
      'protection',
      'proteção',
      'aguarde',
      'wait',
      'loading',
      'carregando',
      'validando',
      'validating',
      'just a moment',
      'checking your browser',
      'please wait',
      'attention required',
      'pardon our interruption',
      'unusual traffic',
      'automated',
      'automático',
      'suspicious',
      'suspeito',
    ];

    for (const pattern of captchaTitlePatterns) {
      if (normalizedTitle.includes(pattern)) {
        console.log(`[Preview] ⚠️ Detectado captcha/antibot no título: "${title}"`);
        return true;
      }
    }

    // Padrões de imagem que indicam captcha/antibot/logo genérico
    const captchaImagePatterns = [
      'logo',
      'captcha',
      'challenge',
      'cloudflare',
      'shieldsquare',
      'perfdrive',
      'radware',
      'incapsula',
      'imperva',
      'datadome',
      'akamai',
      'favicon',
      'icon',
      'brand',
      '/static/',
      'data:image',
      'az-request-verify',
    ];

    for (const pattern of captchaImagePatterns) {
      if (normalizedImage.includes(pattern)) {
        console.log(`[Preview] ⚠️ Detectada imagem de captcha/logo: "${imageUrl?.substring(0, 80)}"`);
        return true;
      }
    }

    // Títulos muito curtos provavelmente não são de produto
    if (normalizedTitle.length > 0 && normalizedTitle.length < 15) {
      console.log(`[Preview] ⚠️ Título muito curto: "${title}"`);
      return true;
    }

    return false;
  }

  /**
   * Check if preview is generic Shopee placeholder
   */
  isGenericShopeePreview(title: string, imageUrl: string, url: string): boolean {
    const normalizedTitle = title.toLowerCase().trim();
    const normalizedUrl = url.toLowerCase();
    const normalizedImage = imageUrl.toLowerCase();

    const genericTitles = [
      'shopee brasil | ofertas incríveis. melhores preços do mercado',
      'shopee brasil | ofertas incríveis',
      'faça login e comece suas compras | shopee brasil',
      'faça login',
      'login',
      'shopee brasil',
    ];

    if (/^\d{6,}$/.test(normalizedTitle)) {
      return true;
    }

    if (genericTitles.some((generic) => normalizedTitle === generic)) {
      return true;
    }

    if (
      normalizedTitle.includes('faça login') ||
      normalizedTitle.includes('login') ||
      normalizedTitle.includes('ofertas incríveis') ||
      normalizedTitle.includes('melhores preços do mercado')
    ) {
      return true;
    }

    if (normalizedUrl.includes('shopee')) {
      if (
        normalizedImage.includes('logo') ||
        normalizedImage.includes('icon') ||
        normalizedImage.includes('shopee') && normalizedImage.includes('assets') ||
        normalizedImage.includes('shopee') && normalizedImage.includes('logo')
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if two titles match exactly (after normalization)
   */
  isExactTitleMatch(expected: string, candidate: string): boolean {
    if (!expected || !candidate) return false;
    const normalizedExpected = this.normalizeTitleForMatch(expected);
    const normalizedCandidate = this.normalizeTitleForMatch(candidate);
    return normalizedExpected === normalizedCandidate;
  }

  /**
   * Extract price from text (R$ format)
   */
  extractPrice(text: string): number | null {
    if (!text) return null;
    const cleaned = text
      .replace(/R\$\s*/g, '')
      .replace(/\./g, '')
      .replace(/,/g, '.')
      .trim();
    const value = parseFloat(cleaned);
    return Number.isNaN(value) ? null : value;
  }

  /**
   * Extract price from text using regex
   */
  extractPriceFromText(text: string): number | null {
    if (!text) return null;
    const match = text.match(/R\$\s*[0-9\.\,]+/);
    if (!match) return null;
    return this.extractPrice(match[0]);
  }

  /**
   * Pick best price from OCR text (handles multiple prices)
   */
  pickPriceFromOcrText(text: string): number | null {
    if (!text) return null;
    const normalized = text.replace(/\s+/g, ' ');
    const regex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3},\d{2})/gi;
    const candidates: Array<{ value: number; context: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      const raw = match[0];
      const value = this.extractPrice(raw);
      if (value === null) continue;
      const start = Math.max(0, match.index - 12);
      const end = Math.min(normalized.length, match.index + raw.length + 12);
      const context = normalized.slice(start, end).toLowerCase();
      candidates.push({ value, context });
    }

    if (candidates.length === 0) return null;

    const preferred = candidates.filter((item) => {
      if (item.context.includes('de ')) return false;
      if (item.context.includes('era ')) return false;
      if (item.context.includes('antes ')) return false;
      if (item.context.includes('x ')) return false;
      return item.context.includes('por') || item.context.includes('agora') || item.context.includes('r$');
    });

    if (preferred.length > 0) {
      preferred.sort((a, b) => a.value - b.value);
      return preferred[0].value;
    }

    candidates.sort((a, b) => a.value - b.value);
    return candidates[0].value;
  }

  /**
   * Extract price from Google Custom Search pagemap
   */
  extractPriceFromPagemap(pagemap: Record<string, unknown> | undefined): number | null {
    if (!pagemap) return null;
    const metatags = Array.isArray(pagemap.metatags) ? pagemap.metatags[0] : undefined;
    const product = Array.isArray(pagemap.product) ? pagemap.product[0] : undefined;
    const offer = Array.isArray(pagemap.offer) ? pagemap.offer[0] : undefined;
    const offers = Array.isArray(pagemap.offers) ? pagemap.offers[0] : undefined;

    const raw =
      (metatags?.['product:price:amount'] as string | undefined) ||
      (metatags?.['og:price:amount'] as string | undefined) ||
      (metatags?.['product:price'] as string | undefined) ||
      (product?.price as string | number | undefined) ||
      (offer?.price as string | number | undefined) ||
      (offers?.price as string | number | undefined);

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      return this.extractPrice(raw);
    }
    return null;
  }

  /**
   * Find price via OCR on product image
   */
  async findPriceViaOcr(
    imageUrl: string
  ): Promise<{ price: number | null; text: string | null } | null> {
    console.log('[Price] Tentando achar preco via OCR da imagem...');
    const ocrText = await this.extractTextFromImage(imageUrl);
    if (!ocrText) {
      console.log('[Price] OCR nao retornou texto.');
      return { price: null, text: null };
    }

    const price = this.pickPriceFromOcrText(ocrText);
    if (price === null) {
      console.log('[Price] OCR sem preco detectado.');
      return { price: null, text: ocrText };
    }

    console.log('[Price] Preco encontrado via OCR:', price);
    return { price, text: ocrText };
  }

  /**
   * Extract text from image using OCR
   */
  async extractTextFromImage(imageUrl: string): Promise<string | null> {
    const ocrSpaceText = await this.extractTextViaOcrSpace(imageUrl);
    if (ocrSpaceText) {
      return ocrSpaceText;
    }
    return null;
  }

  /**
   * Select clean product image without price overlay
   */
  async selectCleanProductImage(
    candidates: string[],
    fallbackImage: string,
    ocrText: string | null
  ): Promise<string | null> {
    const unique = Array.from(new Set(candidates.filter(Boolean)));
    if (unique.length === 0) return null;

    const hasPriceInOriginal = ocrText ? this.hasPricePattern(ocrText) : false;
    const candidatesToCheck = unique.filter((url) => url !== fallbackImage);

    if (!hasPriceInOriginal) {
      return fallbackImage;
    }

    const hasOcrKey = !!process.env.OCR_SPACE_API_KEY;
    const limitedCandidates = candidatesToCheck.slice(0, 3);

    if (hasOcrKey) {
      for (const candidate of limitedCandidates) {
        const text = await this.extractTextFromImage(candidate);
        if (text && !this.hasPricePattern(text)) {
          console.log('[Price] Imagem sem preco detectado via OCR:', candidate);
          return candidate;
        }
      }
    }

    const nonPromo = candidatesToCheck.find((url) => !this.isLikelyPromoImage(url));
    if (nonPromo) {
      console.log('[Price] Imagem alternativa escolhida por heuristica:', nonPromo);
      return nonPromo;
    }

    return fallbackImage;
  }

  /**
   * Check if text contains price pattern
   */
  hasPricePattern(text: string): boolean {
    return (
      /R\$\s*\d+/.test(text) ||
      /\d{1,3}(\.\d{3})*,\d{2}/.test(text) ||
      /\d{1,3},\d{2}/.test(text)
    );
  }

  /**
   * Check if URL looks like a promo/banner image
   */
  isLikelyPromoImage(url: string): boolean {
    const normalized = url.toLowerCase();
    return (
      normalized.includes('promo') ||
      normalized.includes('banner') ||
      normalized.includes('icon') ||
      normalized.includes('favicon') ||
      normalized.includes('logo')
    );
  }

  /**
   * Extract text from image using OCR.Space API
   */
  async extractTextViaOcrSpace(imageUrl: string): Promise<string | null> {
    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      console.log('[Price] OCR.Space key ausente.');
      return null;
    }

    try {
      const response = await axios.get('https://api.ocr.space/parse/imageurl', {
        timeout: 20000,
        params: {
          apikey: apiKey,
          url: imageUrl,
          language: 'por',
          OCREngine: '2',
        },
        headers: {
          Accept: 'application/json',
        },
      });

      if (response.data?.IsErroredOnProcessing) {
        console.log('[Price] OCR.Space erro:', response.data?.ErrorMessage || response.data);
        return null;
      }

      const parsedText = response.data?.ParsedResults?.[0]?.ParsedText;
      if (!parsedText) {
        console.log('[Price] OCR.Space sem texto retornado.');
        return null;
      }

      console.log('[Price] OCR.Space texto capturado.');
      return String(parsedText);
    } catch (error) {
      console.log('[Price] OCR.Space falhou:', error);
      return null;
    }
  }

  /**
   * Fetch price from Google Custom Search Engine
   */
  async fetchPriceFromGoogleCse(title: string): Promise<number | null> {
    const apiKey = process.env.GOOGLE_CSE_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    if (!apiKey || !cseId) {
      console.log('[Price] Google CSE key/id ausente.');
      return null;
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        timeout: 12000,
        params: {
          key: apiKey,
          cx: cseId,
          q: `${title} shopee`,
          num: 5,
        },
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Accept: 'application/json',
        },
      });

      const items = Array.isArray(response.data?.items) ? response.data.items : [];
      console.log('[Price] Google CSE resultados:', items.length);
      for (const item of items) {
        if (!this.isExactTitleMatch(title, item.title || '')) {
          continue;
        }

        const priceFromPagemap = this.extractPriceFromPagemap(item.pagemap);
        if (priceFromPagemap !== null) {
          console.log('[Price] Google CSE pagemap OK');
          return priceFromPagemap;
        }

        const priceFromSnippet = this.extractPriceFromText(item.snippet || '');
        if (priceFromSnippet !== null) {
          console.log('[Price] Google CSE snippet OK');
          return priceFromSnippet;
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.log('[Shopee] Erro ao buscar preco no Google CSE:', {
          status: error.response?.status,
          data: error.response?.data,
        });
      } else {
        console.log('[Shopee] Erro ao buscar preco no Google CSE:', error);
      }
    }

    return null;
  }

  /**
   * Fetch price from SerpAPI Shopping
   */
  async fetchPriceFromSerpApiShopping(title: string): Promise<number | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log('[Price] SerpAPI key ausente.');
      return null;
    }

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        timeout: 12000,
        params: {
          engine: 'google_shopping',
          q: `${title} shopee`,
          api_key: apiKey,
          hl: 'pt',
          gl: 'br',
        },
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Accept: 'application/json',
        },
      });

      const results = Array.isArray(response.data?.shopping_results)
        ? response.data.shopping_results
        : [];
      console.log('[Price] SerpAPI Shopping resultados:', results.length);

      for (const result of results) {
        const price =
          this.extractPrice(String(result.price || '')) ??
          this.extractPriceFromText(result.snippet || '') ??
          this.extractPriceFromText(result.title || '');
        if (price !== null) {
          return price;
        }
      }
    } catch (error) {
      console.log('[Shopee] Erro ao buscar preco no SerpAPI Shopping:', error);
    }

    return null;
  }

  /**
   * Fetch price from SerpAPI Ads
   */
  async fetchPriceFromSerpApiAds(title: string): Promise<number | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log('[Price] SerpAPI key ausente.');
      return null;
    }

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        timeout: 12000,
        params: {
          engine: 'google_ads',
          q: `${title} shopee`,
          api_key: apiKey,
          hl: 'pt',
          gl: 'br',
        },
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Accept: 'application/json',
        },
      });

      const results = Array.isArray(response.data?.ads)
        ? response.data.ads
        : [];
      console.log('[Price] SerpAPI Ads resultados:', results.length);

      for (const result of results) {
        const price =
          this.extractPriceFromText(result.price || '') ??
          this.extractPriceFromText(result.snippet || '') ??
          this.extractPriceFromText(result.title || '');
        if (price !== null) {
          return price;
        }
      }
    } catch (error) {
      console.log('[Shopee] Erro ao buscar preco no SerpAPI Ads:', error);
    }

    return null;
  }

  /**
   * Fetch price from SerpAPI organic results
   */
  async fetchPriceFromSerpApi(title: string): Promise<number | null> {
    const apiKey = process.env.SERPAPI_API_KEY;
    if (!apiKey) {
      console.log('[Price] SerpAPI key ausente.');
      return null;
    }

    try {
      const response = await axios.get('https://serpapi.com/search.json', {
        timeout: 12000,
        params: {
          engine: 'google',
          q: `${title} shopee`,
          api_key: apiKey,
          hl: 'pt',
          gl: 'br',
        },
        headers: {
          'Accept-Language': 'pt-BR,pt;q=0.9',
          Accept: 'application/json',
        },
      });

      const results = Array.isArray(response.data?.organic_results)
        ? response.data.organic_results
        : [];
      console.log('[Price] SerpAPI resultados:', results.length);
      for (const result of results) {
        if (!this.isExactTitleMatch(title, result.title || '')) {
          continue;
        }

        const directPrice =
          (typeof result.price === 'number' ? result.price : null) ??
          (typeof result.price === 'string' ? this.extractPrice(result.price) : null) ??
          (typeof result.extracted_price === 'number' ? result.extracted_price : null);
        if (directPrice !== null) {
          console.log('[Price] SerpAPI price direto OK');
          return directPrice;
        }

        const richSnippet =
          result.rich_snippet?.top?.extensions?.join(' ') ||
          result.rich_snippet?.bottom?.extensions?.join(' ') ||
          '';
        const priceFromRich = this.extractPriceFromText(richSnippet);
        if (priceFromRich !== null) {
          console.log('[Price] SerpAPI rich snippet OK');
          return priceFromRich;
        }

        const priceFromSnippet = this.extractPriceFromText(result.snippet || '');
        if (priceFromSnippet !== null) {
          console.log('[Price] SerpAPI snippet OK');
          return priceFromSnippet;
        }
      }
    } catch (error) {
      console.log('[Shopee] Erro ao buscar preco no SerpAPI:', error);
    }

    return null;
  }
}

/**
 * Export singleton instance
 */
export const scrapingCoreService = new ScrapingCoreService();
