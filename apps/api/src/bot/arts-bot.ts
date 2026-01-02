import { Bot, InlineKeyboard, InputFile } from 'grammy';
import axios from 'axios';
import { prisma } from '../db/prisma.js';
import { getRequiredScrapeFields } from '../scraping/fields.js';
import { scraperRouter } from '../scraping/index.js';
import { MarketplaceEnum, ProductData } from '../scraping/types.js';
import { brandConfigService } from '../services/brand-config.service.js';
import { artGeneratorService } from '../services/image-generation/art-generator.service.js';
import { layoutPreferencesService } from '../services/layout-preferences.service.js';
import { telegramLinkService } from '../services/telegram/link-service.js';
import { usageCountersService } from '../services/usage-counters.service.js';
import { BOT_TYPES } from '../constants/bot-types.js';

const TELEGRAM_BOT_ARTS_TOKEN = process.env.TELEGRAM_BOT_ARTS_TOKEN;

if (!TELEGRAM_BOT_ARTS_TOKEN) {
  throw new Error('TELEGRAM_BOT_ARTS_TOKEN is not defined in environment variables');
}

export const artsBot = new Bot(TELEGRAM_BOT_ARTS_TOKEN);

/**
 * /start command - Welcome message
 */
artsBot.command('start', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString();
  let isLinked = false;

  if (telegramUserId) {
    const link = await prisma.telegram_bot_links.findFirst({
      where: {
        telegram_user_id: telegramUserId,
        bot_type: BOT_TYPES.ARTS,
      },
    });
    isLinked = !!link;
  }

  const welcomeMessage = isLinked
    ? `
🎨 *Bem-vindo ao Bot de Artes!*

Envie um link de produto de qualquer marketplace suportado e eu crio uma arte personalizada para você!

*Marketplaces suportados:*
${scraperRouter.getSupportedMarketplaces().map((m) => `• ${m}`).join('\n')}

*Como usar:*
1. Cole o link do produto
2. Aguarde enquanto eu extraio as informações
3. Receba sua arte personalizada!
`
    : `
🔒 *Token necessário para acessar*

Envie seu token de acesso para liberar o bot.

Depois de vinculado, você poderá enviar links de produtos.
`;

  await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
});

/**
 * /vincular command - Start account linking process
 */
artsBot.command('vincular', async (ctx) => {
  const message = `
🔗 *Vincular Conta*

Gere um token no dashboard web e envie aqui.
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
});

/**
 * /codigo command - Complete account linking
 */
artsBot.command('codigo', async (ctx) => {
  const token = ctx.match?.trim();

  if (!token) {
    await ctx.reply('❌ Por favor, forneça o código de vinculação.\n\nExemplo: `/codigo abc123...`', {
      parse_mode: 'Markdown',
    });
    return;
  }

  const telegramUserId = ctx.from?.id.toString();
  const chatId = ctx.chat?.id.toString();

  if (!telegramUserId || !chatId) {
    await ctx.reply('❌ Erro ao obter suas informações do Telegram.');
    return;
  }

  // Confirm link
  const result = await telegramLinkService.confirmLink(
    token,
    telegramUserId,
    chatId,
    BOT_TYPES.ARTS
  );

  if (!result.success) {
    await ctx.reply(`❌ Falha na vinculação: ${result.error}`);
    return;
  }

  await ctx.reply('✅ *Conta vinculada com sucesso!*\n\nAgora você pode enviar links de produtos.', {
    parse_mode: 'Markdown',
  });
});

type TelegramPhoto = { file_id?: string };
type TelegramWebPage = {
  title?: string;
  description?: string;
  display_url?: string;
  site_name?: string;
  photo?: TelegramPhoto | TelegramPhoto[];
  thumbnail_url?: string;
  image_url?: string;
};
type ExternalPreview = {
  title?: string;
  description?: string;
  image?: string;
  images?: string[];
};

async function buildProductFromTelegramPreview(
  ctx: { message?: unknown; api: Bot['api']; chat?: { id: number; type?: string } },
  url: string,
  marketplace: MarketplaceEnum
): Promise<{ product: ProductData; priceImageUrl: string | null } | null> {
  const message = ctx.message as Record<string, unknown> | undefined;
  const webPage =
    (message?.['web_page'] as TelegramWebPage | undefined) ||
    (message?.['link_preview'] as TelegramWebPage | undefined) ||
    (message?.['linkPreview'] as TelegramWebPage | undefined);

  if (webPage) {
    console.log('[Preview] web_page encontrado no ctx.message');
  }

  const resolvedWebPage = webPage || (await fetchTelegramPreview(ctx, url));
  const previewUrls = resolvedWebPage ? [url] : await buildPreviewUrlCandidates(url);
  const externalPreview = resolvedWebPage ? null : await fetchExternalPreview(previewUrls);
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

  if (isLikelyQueryStringTitle(title)) {
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
          imageUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_ARTS_TOKEN}/${file.file_path}`;
        }
      } catch {}
    }
  }

  if (!imageUrl) {
    console.log('[Preview] Preview sem imagem.');
    return null;
  }

  if (isGenericShopeePreview(title, imageUrl, url)) {
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

  const priceResult = await findPriceViaOcr(imageUrl);
  const price = priceResult?.price ?? null;

  const cleanImage = await selectCleanProductImage(
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
      scrapedAt: new Date(),
    },
    priceImageUrl,
  };
}

async function buildPreviewUrlCandidates(url: string): Promise<string[]> {
  const cleaned = stripTrackingParams(url);
  const resolved = await resolveUrlForPreview(cleaned);
  const candidates = [resolved, cleaned, url];

  const shopeeCanonical = toShopeeCanonicalUrl(resolved) || toShopeeCanonicalUrl(cleaned);
  if (shopeeCanonical) {
    candidates.unshift(shopeeCanonical);
  }

  const unique = Array.from(new Set(candidates.filter(Boolean)));
  console.log('[Preview] URLs candidatas para preview:', unique);
  return unique;
}

async function resolveUrlForPreview(url: string): Promise<string> {
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
    const finalUrl = stripTrackingParams(resolved);
    console.log('[Preview] URL resolvida para:', finalUrl);
    return finalUrl;
  } catch (error) {
    console.log('[Preview] Falha ao resolver URL, usando original:', error);
    return url;
  }
}

function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function isLikelyQueryStringTitle(title: string): boolean {
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

function toShopeeCanonicalUrl(url: string): string | null {
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

async function fetchExternalPreview(urls: string[]): Promise<ExternalPreview | null> {
  console.log('[Preview] Tentando preview externo (Microlink → Iframely → OpenGraph)...');
  for (const targetUrl of urls) {
    const microlink = await fetchFromMicrolink(targetUrl);
    if (microlink && !isGenericShopeePreview(microlink.title || '', microlink.image || '', targetUrl)) {
      console.log('[Preview] Microlink OK');
      return microlink;
    }
    if (microlink) {
      console.log('[Preview] Microlink generico, tentando proximo:', {
        title: microlink.title,
        image: microlink.image,
      });
    }

    const iframely = await fetchFromIframely(targetUrl);
    if (iframely && !isGenericShopeePreview(iframely.title || '', iframely.image || '', targetUrl)) {
      console.log('[Preview] Iframely OK');
      return iframely;
    }
    if (iframely) {
      console.log('[Preview] Iframely generico, tentando proximo:', {
        title: iframely.title,
        image: iframely.image,
      });
    }

    const openGraph = await fetchFromOpenGraph(targetUrl);
    if (openGraph && !isGenericShopeePreview(openGraph.title || '', openGraph.image || '', targetUrl)) {
      console.log('[Preview] OpenGraph.io OK');
      return openGraph;
    }
    if (openGraph) {
      console.log('[Preview] OpenGraph.io generico, tentando proximo:', {
        title: openGraph.title,
        image: openGraph.image,
      });
    }
  }

  console.log('[Preview] Todos os serviços externos falharam.');
  return null;
}

async function fetchFromMicrolink(url: string): Promise<ExternalPreview | null> {
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

async function fetchFromIframely(url: string): Promise<ExternalPreview | null> {
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

async function fetchFromOpenGraph(url: string): Promise<ExternalPreview | null> {
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

async function fetchTelegramPreview(
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

function normalizeTitleForMatch(value: string): string {
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

function isGenericShopeePreview(title: string, imageUrl: string, url: string): boolean {
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

function isExactTitleMatch(expected: string, candidate: string): boolean {
  if (!expected || !candidate) return false;
  const normalizedExpected = normalizeTitleForMatch(expected);
  const normalizedCandidate = normalizeTitleForMatch(candidate);
  return normalizedExpected === normalizedCandidate;
}

function extractPrice(text: string): number | null {
  if (!text) return null;
  const cleaned = text
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.')
    .trim();
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

function extractPriceFromText(text: string): number | null {
  if (!text) return null;
  const match = text.match(/R\$\s*[0-9\.\,]+/);
  if (!match) return null;
  return extractPrice(match[0]);
}

function pickPriceFromOcrText(text: string): number | null {
  if (!text) return null;
  const normalized = text.replace(/\s+/g, ' ');
  const regex = /(?:R\$\s*)?(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3},\d{2})/gi;
  const candidates: Array<{ value: number; context: string }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(normalized)) !== null) {
    const raw = match[0];
    const value = extractPrice(raw);
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

function extractPriceFromPagemap(pagemap: Record<string, unknown> | undefined): number | null {
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
    return extractPrice(raw);
  }
  return null;
}

async function findPriceViaOcr(
  imageUrl: string
): Promise<{ price: number | null; text: string | null } | null> {
  console.log('[Price] Tentando achar preco via OCR da imagem...');
  const ocrText = await extractTextFromImage(imageUrl);
  if (!ocrText) {
    console.log('[Price] OCR nao retornou texto.');
    return { price: null, text: null };
  }

  const price = pickPriceFromOcrText(ocrText);
  if (price === null) {
    console.log('[Price] OCR sem preco detectado.');
    return { price: null, text: ocrText };
  }

  console.log('[Price] Preco encontrado via OCR:', price);
  return { price, text: ocrText };
}

async function extractTextFromImage(imageUrl: string): Promise<string | null> {
  const ocrSpaceText = await extractTextViaOcrSpace(imageUrl);
  if (ocrSpaceText) {
    return ocrSpaceText;
  }
  return null;
}

async function selectCleanProductImage(
  candidates: string[],
  fallbackImage: string,
  ocrText: string | null
): Promise<string | null> {
  const unique = Array.from(new Set(candidates.filter(Boolean)));
  if (unique.length === 0) return null;

  const hasPriceInOriginal = ocrText ? hasPricePattern(ocrText) : false;
  const candidatesToCheck = unique.filter((url) => url !== fallbackImage);

  if (!hasPriceInOriginal) {
    return fallbackImage;
  }

  const hasOcrKey = !!process.env.OCR_SPACE_API_KEY;
  const limitedCandidates = candidatesToCheck.slice(0, 3);

  if (hasOcrKey) {
    for (const candidate of limitedCandidates) {
      const text = await extractTextFromImage(candidate);
      if (text && !hasPricePattern(text)) {
        console.log('[Price] Imagem sem preco detectado via OCR:', candidate);
        return candidate;
      }
    }
  }

  const nonPromo = candidatesToCheck.find((url) => !isLikelyPromoImage(url));
  if (nonPromo) {
    console.log('[Price] Imagem alternativa escolhida por heuristica:', nonPromo);
    return nonPromo;
  }

  return fallbackImage;
}

function hasPricePattern(text: string): boolean {
  return (
    /R\$\s*\d+/.test(text) ||
    /\d{1,3}(\.\d{3})*,\d{2}/.test(text) ||
    /\d{1,3},\d{2}/.test(text)
  );
}

function isLikelyPromoImage(url: string): boolean {
  const normalized = url.toLowerCase();
  return (
    normalized.includes('promo') ||
    normalized.includes('banner') ||
    normalized.includes('icon') ||
    normalized.includes('favicon') ||
    normalized.includes('logo')
  );
}

async function extractTextViaOcrSpace(imageUrl: string): Promise<string | null> {
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

async function fetchPriceFromGoogleCse(title: string): Promise<number | null> {
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
      if (!isExactTitleMatch(title, item.title || '')) {
        continue;
      }

      const priceFromPagemap = extractPriceFromPagemap(item.pagemap);
      if (priceFromPagemap !== null) {
        console.log('[Price] Google CSE pagemap OK');
        return priceFromPagemap;
      }

      const priceFromSnippet = extractPriceFromText(item.snippet || '');
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

async function fetchPriceFromSerpApiShopping(title: string): Promise<number | null> {
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
        extractPrice(String(result.price || '')) ??
        extractPriceFromText(result.snippet || '') ??
        extractPriceFromText(result.title || '');
      if (price !== null) {
        return price;
      }
    }
  } catch (error) {
    console.log('[Shopee] Erro ao buscar preco no SerpAPI Shopping:', error);
  }

  return null;
}

async function fetchPriceFromSerpApiAds(title: string): Promise<number | null> {
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
        extractPriceFromText(result.price || '') ??
        extractPriceFromText(result.snippet || '') ??
        extractPriceFromText(result.title || '');
      if (price !== null) {
        return price;
      }
    }
  } catch (error) {
    console.log('[Shopee] Erro ao buscar preco no SerpAPI Ads:', error);
  }

  return null;
}

async function fetchPriceFromSerpApi(title: string): Promise<number | null> {
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
      if (!isExactTitleMatch(title, result.title || '')) {
        continue;
      }

      const directPrice =
        (typeof result.price === 'number' ? result.price : null) ??
        (typeof result.price === 'string' ? extractPrice(result.price) : null) ??
        (typeof result.extracted_price === 'number' ? result.extracted_price : null);
      if (directPrice !== null) {
        console.log('[Price] SerpAPI price direto OK');
        return directPrice;
      }

      const richSnippet =
        result.rich_snippet?.top?.extensions?.join(' ') ||
        result.rich_snippet?.bottom?.extensions?.join(' ') ||
        '';
      const priceFromRich = extractPriceFromText(richSnippet);
      if (priceFromRich !== null) {
        console.log('[Price] SerpAPI rich snippet OK');
        return priceFromRich;
      }

      const priceFromSnippet = extractPriceFromText(result.snippet || '');
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

/**
 * /status command - Check link status
 */
artsBot.command('status', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações.');
    return;
  }

  // Try to find link by telegram_user_id (reverse lookup)
  // This requires a helper method in the service
  const statusMessage = `
📊 *Status da Vinculação*

Telegram ID: \`${telegramUserId}\`

Para verificar se sua conta está vinculada, use o comando /vincular se ainda não fez isso.
`;

  await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
});

/**
 * /ajuda command - Help message
 */
artsBot.command('ajuda', async (ctx) => {
  const helpMessage = `
🆘 *Ajuda - Bot de Artes*

*Como funciona:*
1. Vincule sua conta usando /vincular
2. Envie um link de produto
3. Receba uma arte personalizada

*Marketplaces suportados:*
${scraperRouter.getSupportedMarketplaces().map((m) => `• ${m}`).join('\n')}

*Comandos:*
/start - Mensagem de boas-vindas
/vincular - Vincular sua conta
/codigo - Completar vinculação com código
/status - Ver status da conta
/config - Ver configurações
/ajuda - Esta mensagem

*Problemas?*
Entre em contato com o suporte.
`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

/**
 * Handle product URLs
 */
artsBot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }

  // Check if text contains a URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);

  const telegramUserId = ctx.from?.id.toString();
  const chatId = ctx.chat?.id.toString();
  let botLink = null;

  if (telegramUserId) {
    botLink = await prisma.telegram_bot_links.findFirst({
      where: {
        telegram_user_id: telegramUserId,
        bot_type: BOT_TYPES.ARTS,
      },
    });
  }

  if (!urls || urls.length === 0) {
    if (!telegramUserId || !chatId) {
      await ctx.reply('❌ Erro ao obter suas informações do Telegram.');
      return;
    }

    if (!botLink) {
      const result = await telegramLinkService.confirmLink(
        text.trim(),
        telegramUserId,
        chatId,
        BOT_TYPES.ARTS
      );

      if (!result.success) {
        await ctx.reply(`❌ Token inválido: ${result.error}`);
        return;
      }

      await ctx.reply('✅ Conta vinculada com sucesso! Agora envie um link de produto.');
      return;
    }

    await ctx.reply('👋 Envie um link de produto para eu criar uma arte!\n\nUse /ajuda para mais informações.');
    return;
  }

  const url = urls[0]; // Process first URL

  // Check if marketplace is supported
  const marketplace = scraperRouter.detectMarketplace(url);

  if (!marketplace) {
    await ctx.reply(
      `❌ Este marketplace não é suportado.\n\n*Marketplaces suportados:*\n${scraperRouter
        .getSupportedMarketplaces()
        .map((m) => `• ${m}`)
        .join('\n')}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Send "processing" message
  const processingMsg = await ctx.reply(`🔍 Extraindo dados do produto de *${marketplace}*...`, {
    parse_mode: 'Markdown',
  });

  if (!botLink) {
    await ctx.reply('🔒 Você precisa vincular sua conta com um token antes de gerar artes.');
    return;
  }

  try {
    const layoutPreferences = await layoutPreferencesService.getPreferences(botLink.user_id);
    const requiredFields = getRequiredScrapeFields(layoutPreferences);

    // Scrape product data
    const result = await scraperRouter.scrape(url, {
      fields: requiredFields,
      userId: botLink.user_id,
      telegramUserId: ctx.from?.id,
      origin: "bot_arts",
    });

    let product = result.data ?? null;
    let priceImageUrl: string | null = null;
    if (!product) {
      const previewResult = await buildProductFromTelegramPreview(ctx, url, marketplace);
      if (previewResult) {
        product = previewResult.product;
        priceImageUrl = previewResult.priceImageUrl;
      }
    }

    if (!product) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `❌ Não consegui extrair os dados do produto.\n\nErro: ${result.error || 'Desconhecido'}`
      );
      return;
    }

    // Format product info message
    const priceValue =
      typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
    const hasPrice = priceValue !== null;
    const priceFormatted = hasPrice ? `R$ ${priceValue.toFixed(2).replace('.', ',')}` : "";
    const originalPriceText =
      hasPrice && typeof product.originalPrice === "number"
        ? `\n~~R$ ${product.originalPrice.toFixed(2).replace('.', ',')}~~`
        : '';
    const discountText =
      hasPrice && product.discountPercentage ? ` *(-${product.discountPercentage}%)*` : '';

    const productInfo = `
✅ *Produto encontrado!*

📦 *${product.title}*

💰 Preço: ${hasPrice ? `${priceFormatted}${originalPriceText}${discountText}` : "indisponível"}
🏪 Marketplace: ${product.marketplace.replace(/_/g, ' ')}
${product.rating ? `⭐ Avaliação: ${product.rating}${product.reviewCount ? ` (${product.reviewCount} avaliações)` : ''}` : ''}

🎨 *Gerando arte personalizada...*
`;

    await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, productInfo, {
      parse_mode: 'Markdown',
    });

    void priceImageUrl;

    // Get user ID from telegram link
    let userId: string | null = botLink.user_id;
    let brandConfig;
    brandConfig = await brandConfigService.getConfig(userId);

    // If no user found, use default config
    if (!brandConfig) {
      brandConfig = {
        templateId: 'default',
        bgColor: '#FFFFFF',
        textColor: '#000000',
        priceColor: '#FF0000',
        fontFamily: 'Inter',
        showCoupon: true,
        couponText: 'APROVEITE!',
        ctaText: 'COMPRE AGORA!',
        customImageUrl: null,
      };
    }

    // If no layout preferences, use defaults (show everything)

    // Generate custom art images (feed and story formats)
    try {
      // Generate feed format (4:5)
      const feedArtBuffer = await artGeneratorService.generateArt(
        product,
        brandConfig,
        'feed',
        userId || undefined,
        layoutPreferences
      );

      // Generate story format (9:16)
      const storyArtBuffer = await artGeneratorService.generateArt(
        product,
        brandConfig,
        'story',
        userId || undefined,
        layoutPreferences
      );

      // Send feed art
      const legendText = artGeneratorService.buildLegendText(
        product,
        brandConfig,
        layoutPreferences
      );

      await ctx.replyWithPhoto(new InputFile(feedArtBuffer, 'product-feed.png'), {
        caption: `${legendText}`,
        parse_mode: 'HTML',
      });

      // Send story art
      await ctx.replyWithPhoto(new InputFile(storyArtBuffer, 'product-story.png'), {
        caption: '',
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
      });

      // Send success message
      await usageCountersService.incrementRenders(userId);

      // Sucesso silencioso: evita mensagem extra após enviar as artes.
    } catch (artError) {
      console.error('Error generating custom art:', artError);
      const safeTitle = product.title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const fallbackPrice = hasPrice ? `${priceFormatted}${discountText}` : "Preço indisponível";
      const fallbackMessage = `⚠️ <b>Erro ao gerar arte personalizada</b>\n\nAqui está a imagem original do produto:\n\n${safeTitle}\n\n💰 ${fallbackPrice}`;
      const hasValidImageUrl = (() => {
        try {
          const parsed = new URL(product.imageUrl);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch {
          return false;
        }
      })();

      if (hasValidImageUrl) {
        await ctx.replyWithPhoto(product.imageUrl, {
          caption: fallbackMessage,
          parse_mode: 'HTML',
          reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
        });
      } else {
        await ctx.reply(fallbackMessage, {
          parse_mode: 'Markdown',
          reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
        });
      }
    }
  } catch (error) {
    console.error('Error processing product URL:', error);
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      '❌ Ocorreu um erro ao processar o produto. Tente novamente mais tarde.'
    );
  }
});

/**
 * Error handler
 */
artsBot.catch((err) => {
  console.error('Bot error:', err);
});

console.log('🤖 Arts Bot initialized');
