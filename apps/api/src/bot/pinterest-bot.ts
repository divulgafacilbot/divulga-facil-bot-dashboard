import { Bot, InlineKeyboard, InputFile, Context } from 'grammy';
import { prisma } from '../db/prisma.js';
import { CardSource, Marketplace } from '@prisma/client';
import { getRequiredScrapeFields } from '../scraping/fields.js';
import { scraperRouter } from '../scraping/index.js';
import { brandConfigService } from '../services/brand-config.service.js';
import { artGeneratorService } from '../services/image-generation/art-generator.service.js';
import { layoutPreferencesService, LayoutPreferences, DEFAULT_LAYOUT_PREFERENCES } from '../services/layout-preferences.service.js';
import { usageCountersService } from '../services/usage-counters.service.js';
import { telemetryService } from '../services/telemetry.service.js';
import { BOT_TYPES } from '../constants/bot-types.js';
import { scrapingCoreService } from './shared/scraping-core.service.js';
import { artGenerationCoreService } from './shared/art-generation-core.service.js';
import * as telegramUtils from './shared/telegram-utils.js';
import { PublicCardService } from '../services/pinterest/public-card.service.js';
import { PinterestBotConfigService } from '../services/pinterest/pinterest-bot-config.service.js';
import { PublicPageService } from '../services/pinterest/public-page.service.js';
import { CategoryInferenceService } from '../services/category-inference.service.js';
import { ProductData } from '../scraping/types.js';

const TELEGRAM_BOT_PINTEREST_TOKEN = process.env.TELEGRAM_BOT_PINTEREST_TOKEN;

// ═══════════════════════════════════════════════════════════════════════════════
// Estado para confirmação de preço da Shopee (Antibot)
// ═══════════════════════════════════════════════════════════════════════════════
interface PendingPriceConfirmation {
  product: ProductData;
  url: string;
  userId: string;
  botLink: { user_id: string };
  layoutPreferences: LayoutPreferences;
  processingMsgId: number;
  chatId: number;
  timestamp: number;
}

// Map para armazenar confirmações pendentes por chatId
const pendingPriceConfirmations = new Map<number, PendingPriceConfirmation>();

// Limpar confirmações antigas (mais de 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [chatId, pending] of pendingPriceConfirmations.entries()) {
    if (now - pending.timestamp > 5 * 60 * 1000) {
      pendingPriceConfirmations.delete(chatId);
    }
  }
}, 60 * 1000);

if (!TELEGRAM_BOT_PINTEREST_TOKEN) {
  throw new Error('TELEGRAM_BOT_PINTEREST_TOKEN is not defined in environment variables');
}

export const pinterestBot = new Bot(TELEGRAM_BOT_PINTEREST_TOKEN);

// ============================================================
// COMMANDS
// ============================================================

/**
 * /start command - Welcome message
 */
pinterestBot.command('start', async (ctx) => {
  await telegramUtils.sendWelcomeMessage(
    ctx,
    'Bot do Pinterest',
    BOT_TYPES.PINTEREST,
    scraperRouter.getSupportedMarketplaces()
  );
});

/**
 * /vincular command - Start account linking process
 */
pinterestBot.command('vincular', async (ctx) => {
  await telegramUtils.sendLinkInstructions(ctx);
});

/**
 * Helper: Check if text looks like a token
 */
function looksLikeToken(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length >= 32 && !trimmed.includes(' ') && !trimmed.includes('://') && /^[a-zA-Z0-9_-]+$/.test(trimmed);
}

/**
 * /status command - Check link status with detailed info
 */
pinterestBot.command('status', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações.');
    return;
  }

  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.PINTEREST);

  if (!botLink) {
    await ctx.reply(
      '🔒 *Conta não vinculada*\n\n' +
      `Telegram ID: \`${telegramUserId}\`\n\n` +
      'Use /vincular para começar o processo de vinculação.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Get usage counters
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const usageCounters = await prisma.usage_counters.findUnique({
    where: {
      user_id_date: {
        user_id: botLink.user_id,
        date: today,
      },
    },
  });

  // Get brand config
  const brandConfig = await brandConfigService.getConfig(botLink.user_id);

  // Get layout preferences
  const layoutPrefs = await layoutPreferencesService.getPreferences(botLink.user_id);

  // Get Pinterest bot config
  const pinterestConfig = await PinterestBotConfigService.getOrCreate(botLink.user_id);

  // Get public page info
  const publicPage = await prisma.public_page_settings.findUnique({
    where: { user_id: botLink.user_id },
  });

  // Count public cards
  const publicCardsCount = await prisma.public_cards.count({
    where: {
      user_id: botLink.user_id,
      status: 'ACTIVE',
    },
  });

  const rendersToday = usageCounters?.renders_count || 0;
  const linkedDate = botLink.linked_at ? new Date(botLink.linked_at).toLocaleDateString('pt-BR') : 'N/A';
  const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://divulgafacil.com';
  const publicPageUrl = publicPage?.public_slug ? `${baseUrl}/p/${publicPage.public_slug}` : null;

  const statusMessage = `
📊 *Status da Conta - Bot Pinterest*

✅ *Conta vinculada*
🆔 Telegram ID: \`${telegramUserId}\`
📅 Vinculado em: ${linkedDate}

📈 *Uso Hoje:*
• Artes geradas: ${rendersToday}

🌐 *Página Pública:*
${publicPageUrl ? `• Link: ${publicPageUrl}` : '• ⚠️ Página não configurada'}
• Cards ativos: ${publicCardsCount}
• Auto-publicar: ${pinterestConfig.auto_publish ? '✅ Ativo' : '❌ Desativado'}
${pinterestConfig.default_category ? `• Categoria padrão: ${pinterestConfig.default_category}` : ''}

🎨 *Configuração de Marca:*
• Template: ${brandConfig?.templateId || 'default'}
• Cor de fundo: ${brandConfig?.bgColor || '#FFFFFF'}
• Cor do texto: ${brandConfig?.textColor || '#000000'}
• Cor do preço: ${brandConfig?.priceColor || '#FF0000'}
• Cupom: ${brandConfig?.showCoupon ? `Sim (${brandConfig?.couponText || '-'})` : 'Não'}

📐 *Layout Story:*
• Título: ${layoutPrefs.storyShowTitle ? '✓' : '✗'}
• Preço: ${layoutPrefs.storyShowPrice ? '✓' : '✗'}
• Preço original: ${layoutPrefs.storyShowOriginalPrice ? '✓' : '✗'}
• Cupom: ${layoutPrefs.storyShowCoupon ? '✓' : '✗'}

Use /config para ver configurações detalhadas.
Use /ajuda para mais comandos.
`;

  await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
});

/**
 * /config command - Show current configuration
 */
pinterestBot.command('config', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações.');
    return;
  }

  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.PINTEREST);

  if (!botLink) {
    await ctx.reply(
      '🔒 *Conta não vinculada*\n\n' +
      'Vincule sua conta primeiro com /vincular para ver suas configurações.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Get brand config
  const brandConfig = await brandConfigService.getConfig(botLink.user_id);

  // Get layout preferences
  const layoutPrefs = await layoutPreferencesService.getPreferences(botLink.user_id);

  // Check if using defaults
  const isDefaultBrand = !brandConfig;
  const dbPrefs = await prisma.user_layout_preferences.findUnique({
    where: { user_id: botLink.user_id },
  });
  const isDefaultLayout = !dbPrefs;

  const configMessage = `
⚙️ *Configurações - Bot Pinterest*

🎨 *Configuração de Marca* ${isDefaultBrand ? '(padrão)' : '(personalizada)'}
┌─────────────────────────────
│ Template: \`${brandConfig?.templateId || 'default'}\`
│ Cor de fundo: \`${brandConfig?.bgColor || '#FFFFFF'}\`
│ Cor do texto: \`${brandConfig?.textColor || '#000000'}\`
│ Cor do preço: \`${brandConfig?.priceColor || '#FF0000'}\`
│ Fonte: \`${brandConfig?.fontFamily || 'Inter'}\`
│ Mostrar cupom: ${brandConfig?.showCoupon !== false ? 'Sim' : 'Não'}
│ Texto do cupom: \`${brandConfig?.couponText || 'APROVEITE!'}\`
│ CTA: \`${brandConfig?.ctaText || 'COMPRE AGORA!'}\`
└─────────────────────────────

📐 *Layout Story (9:16)* ${isDefaultLayout ? '(padrão)' : '(personalizado)'}
┌─────────────────────────────
│ Título: ${layoutPrefs.storyShowTitle ? '✅ Visível' : '❌ Oculto'}
│ Preço promocional: ${layoutPrefs.storyShowPrice ? '✅ Visível' : '❌ Oculto'}
│ Preço original: ${layoutPrefs.storyShowOriginalPrice ? '✅ Visível' : '❌ Oculto'}
│ Cupom: ${layoutPrefs.storyShowCoupon ? '✅ Visível' : '❌ Oculto'}
│ Texto personalizado: ${layoutPrefs.storyShowCustomText ? '✅ Visível' : '❌ Oculto'}
│
│ Ordem: ${layoutPrefs.storyOrder.join(' → ')}
│
│ 🎨 Cores do texto:
│   • Título: \`${layoutPrefs.storyColors?.title || '#000000'}\`
│   • Preço promo: \`${layoutPrefs.storyColors?.promotionalPrice || '#000000'}\`
│   • Preço cheio: \`${layoutPrefs.storyColors?.fullPrice || '#000000'}\`
│   • Cupom: \`${layoutPrefs.storyColors?.coupon || '#000000'}\`
└─────────────────────────────

📝 *Layout Feed (4:5)* ${isDefaultLayout ? '(padrão)' : '(personalizado)'}
┌─────────────────────────────
│ Título: ${layoutPrefs.feedShowTitle ? '✅' : '❌'}
│ Descrição: ${layoutPrefs.feedShowDescription ? '✅' : '❌'}
│ Preço: ${layoutPrefs.feedShowPrice ? '✅' : '❌'}
│ Preço original: ${layoutPrefs.feedShowOriginalPrice ? '✅' : '❌'}
│ URL do produto: ${layoutPrefs.feedShowProductUrl ? '✅' : '❌'}
│ Cupom: ${layoutPrefs.feedShowCoupon ? '✅' : '❌'}
│ Disclaimer: ${layoutPrefs.feedShowDisclaimer ? '✅' : '❌'}
│ Qtd vendas: ${layoutPrefs.feedShowSalesQuantity ? '✅' : '❌'}
└─────────────────────────────

💡 *Dica:* Para alterar suas configurações, acesse o dashboard web.
`;

  await ctx.reply(configMessage, { parse_mode: 'Markdown' });
});

/**
 * /ajuda command - Help message
 */
pinterestBot.command('ajuda', async (ctx) => {
  const helpMessage = `
🆘 *Ajuda - Bot do Pinterest*

*O que é este bot?*
Este bot cria pins personalizados para o Pinterest a partir de links de produtos de marketplaces brasileiros.

*Como funciona:*
1. Vincule sua conta usando /vincular
2. Envie um link de produto
3. Receba seu pin em formato 9:16 (story)

*Marketplaces suportados:*
${scraperRouter.getSupportedMarketplaces().map((m) => `• ${m}`).join('\n')}

*Comandos:*
/start - Mensagem de boas-vindas
/vincular - Vincular sua conta
/status - Ver status e uso
/config - Ver configurações detalhadas
/ajuda - Esta mensagem

💡 *Para vincular:* Cole o token gerado no dashboard diretamente no chat

*Dicas:*
• Cole o link direto do produto
• O bot extrai automaticamente título, preço e imagem
• Se o scraping falhar, tentamos extrair via preview
• Suas artes usam as cores da sua marca configurada

*Problemas?*
Acesse o suporte pelo dashboard web.
`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// ============================================================
// URL HANDLER
// ============================================================

/**
 * Handle product URLs
 */
pinterestBot.on('message:text', async (ctx) => {
  const text = ctx.message.text;
  const telegramUserId = ctx.from?.id.toString();
  const chatId = ctx.chat?.id;

  console.log('[Pinterest] ========== NOVA MENSAGEM ==========');
  console.log('[Pinterest] Telegram User ID:', telegramUserId);
  console.log('[Pinterest] Texto recebido:', text.substring(0, 100) + (text.length > 100 ? '...' : ''));

  // Skip if it's a command
  if (text.startsWith('/')) {
    console.log('[Pinterest] Ignorando: é um comando');
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Priorizar detecção de token (para vinculação ou promo access)
  // ═══════════════════════════════════════════════════════════════════════════
  if (looksLikeToken(text)) {
    console.log('[Pinterest] Texto parece ser um token, tentando vincular...');
    const result = await telegramUtils.handleTokenLink(ctx, text.trim(), BOT_TYPES.PINTEREST);

    if (result.success) {
      console.log('[Pinterest] Vinculação via token bem sucedida! User ID:', result.userId);
      await telemetryService.logEvent({
        eventType: 'PINTEREST_BOT_LINKED',
        userId: result.userId,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: { botType: BOT_TYPES.PINTEREST, method: 'inline' }
      });
      await ctx.reply('✅ *Conta vinculada com sucesso!*\n\nAgora você pode enviar links de produtos.', {
        parse_mode: 'Markdown',
      });
    } else {
      await ctx.reply(`❌ ${result.error || 'Token inválido ou expirado.'}\n\nGere um novo token no dashboard e tente novamente.`);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Verificar se há confirmação de preço pendente (Antibot Shopee)
  // ═══════════════════════════════════════════════════════════════════════════
  if (chatId && pendingPriceConfirmations.has(chatId)) {
    const pending = pendingPriceConfirmations.get(chatId)!;

    // Verificar se o texto é um preço (números com , ou .)
    const priceMatch = text.match(/^R?\$?\s*(\d+[.,]?\d*)$/);
    if (priceMatch) {
      const newPrice = parseFloat(priceMatch[1].replace(',', '.'));

      if (!isNaN(newPrice) && newPrice > 0) {
        // Atualizar preço do produto
        pending.product.price = newPrice;

        const priceFormatted = `R$ ${newPrice.toFixed(2).replace('.', ',')}`;
        await ctx.reply(`✅ Preço atualizado para *${priceFormatted}*\n\n🎨 *Gerando pin do Pinterest...*`, {
          parse_mode: 'Markdown',
        });

        try {
          await generateAndSendPins(ctx, pending.product, pending.userId, pending.layoutPreferences);
          pendingPriceConfirmations.delete(chatId);
        } catch (error) {
          console.error('[Pinterest] Error generating pin after price change:', error);
          await ctx.reply('❌ Erro ao gerar pin. Tente novamente.');
          pendingPriceConfirmations.delete(chatId);
        }
        return;
      }
    }
    // Se não é preço válido, continua para processar como URL
  }

  // Check if text contains a URL
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  console.log('[Pinterest] URLs encontradas:', urls?.length || 0);

  // Get bot link early to check if user is linked
  let botLink = null;
  if (telegramUserId) {
    botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.PINTEREST);
    console.log('[Pinterest] Bot link encontrado:', botLink ? 'SIM' : 'NÃO');
    if (botLink) {
      console.log('[Pinterest] User ID vinculado:', botLink.user_id);
    }
  }

  // No URL found
  if (!urls || urls.length === 0) {
    console.log('[Pinterest] Nenhuma URL encontrada no texto');
    if (!botLink) {
      await ctx.reply('❌ Você precisa vincular sua conta primeiro.\n\nCole o token gerado no dashboard ou use /vincular para ver as instruções.');
    } else {
      await ctx.reply('👋 Envie um link de produto para eu criar um pin!\n\nUse /ajuda para mais informações.');
    }
    return;
  }

  const url = urls[0]; // Process first URL
  console.log('[Pinterest] URL a processar:', url);

  // Check marketplace BEFORE sending "processing" message
  const marketplace = scraperRouter.detectMarketplace(url);
  console.log('[Pinterest] Marketplace detectado:', marketplace || 'NENHUM');

  if (!marketplace) {
    console.log('[Pinterest] ERRO: Marketplace não suportado');
    await ctx.reply(
      `❌ Este marketplace não é suportado.\n\n*Marketplaces suportados:*\n${scraperRouter
        .getSupportedMarketplaces()
        .map((m) => `• ${m}`)
        .join('\n')}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Check if user is linked BEFORE sending "processing" message
  if (!botLink) {
    console.log('[Pinterest] ERRO: Usuário não vinculado');
    await ctx.reply(
      '🔒 *Você precisa vincular sua conta primeiro!*\n\n' +
      'Use /vincular para obter instruções.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // NOW send "processing" message (user is linked and marketplace is valid)
  console.log('[Pinterest] Enviando mensagem de processamento...');
  const processingMsg = await ctx.reply(`🔍 Extraindo dados do produto de *${marketplace}*...`, {
    parse_mode: 'Markdown',
  });

  // Check subscription access AND marketplace access using combined check
  const accessResult = await telegramUtils.checkFullAccess(telegramUserId!, BOT_TYPES.PINTEREST, marketplace);
  if (!accessResult.hasAccess) {
    console.log('[Pinterest] ERRO: Acesso negado -', accessResult.reason);
    const upgradeHint = accessResult.needsUpgrade
      ? '\n\n💡 *Dica:* Faca upgrade do seu plano para acessar mais marketplaces!'
      : '';
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      `🔒 *Acesso não autorizado*\n\n${accessResult.reason || 'Sua assinatura expirou ou você não tem acesso a este bot.'}${upgradeHint}`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  try {
    console.log('[Pinterest] Obtendo layout preferences para user:', botLink.user_id);
    const layoutPreferences = await layoutPreferencesService.getPreferences(botLink.user_id);
    const requiredFields = getRequiredScrapeFields(layoutPreferences);
    console.log('[Pinterest] Campos requeridos para scraping:', requiredFields);

    // Scrape product data
    console.log('[Pinterest] Iniciando scraping da URL...');
    const result = await scraperRouter.scrape(url, {
      fields: requiredFields,
      userId: botLink.user_id,
      telegramUserId: ctx.from?.id,
      origin: "bot_pinterest",
    });
    console.log('[Pinterest] Resultado do scraping - Success:', result.success, '| Error:', result.error || 'N/A');

    let product = result.data ?? null;
    let priceImageUrl: string | null = null;

    // Fallback to Telegram preview if scraping failed
    if (!product) {
      console.log('[Pinterest] Scraping falhou, tentando fallback via Telegram preview...');
      const previewResult = await scrapingCoreService.buildProductFromTelegramPreview(
        ctx,
        url,
        marketplace,
        TELEGRAM_BOT_PINTEREST_TOKEN
      );
      if (previewResult) {
        console.log('[Pinterest] Fallback via preview bem sucedido!');
        product = previewResult.product;
        priceImageUrl = previewResult.priceImageUrl;
      } else {
        console.log('[Pinterest] Fallback via preview também falhou');
      }
    }

    if (!product) {
      console.log('[Pinterest] ERRO: Não foi possível extrair dados do produto');
      // Log scraping failure telemetry
      await telemetryService.logEvent({
        eventType: 'PINTEREST_SCRAPING_FAILED',
        userId: botLink.user_id,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: { marketplace, url, error: result.error || 'Unknown' }
      });

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `❌ Não consegui extrair os dados do produto.\n\nErro: ${result.error || 'Desconhecido'}`
      );
      return;
    }

    console.log('[Pinterest] ========== PRODUTO EXTRAÍDO ==========');
    console.log('[Pinterest] Título:', product.title);
    console.log('[Pinterest] Preço:', product.price);
    console.log('[Pinterest] Preço Original:', product.originalPrice);
    console.log('[Pinterest] Desconto:', product.discountPercentage, '%');
    console.log('[Pinterest] Imagem URL:', product.imageUrl?.substring(0, 80) + '...');
    console.log('[Pinterest] Product URL:', product.productUrl?.substring(0, 80) + '...');
    console.log('[Pinterest] Marketplace:', product.marketplace);

    // ========== VALIDAÇÃO DO PRODUTO ==========
    // Verificar se o produto tem dados válidos antes de tentar gerar arte
    const isInvalidImage = (imageUrl: string): boolean => {
      if (!imageUrl) return true;
      const lowerUrl = imageUrl.toLowerCase();
      // Rejeitar favicons, logos e imagens genéricas
      return (
        lowerUrl.includes('favicon') ||
        lowerUrl.includes('/logo') ||
        lowerUrl.includes('placeholder') ||
        lowerUrl.endsWith('.ico') ||
        lowerUrl.endsWith('.svg') ||
        // Imagem muito curta (provavelmente não é de produto)
        imageUrl.length < 30
      );
    };

    const isInvalidTitle = (title: string): boolean => {
      if (!title) return true;
      // Título muito curto (menos de 5 caracteres) provavelmente não é válido
      if (title.length < 5) return true;
      // Título parece ser parte de URL
      if (/^[a-zA-Z0-9]{5,15}[''"]?$/.test(title)) return true;
      // Título é só números ou caracteres especiais
      if (/^[\d\W]+$/.test(title)) return true;
      return false;
    };

    console.log('[Pinterest] Validando produto...');
    console.log('[Pinterest]   - Imagem inválida:', isInvalidImage(product.imageUrl));
    console.log('[Pinterest]   - Título inválido:', isInvalidTitle(product.title));

    if (isInvalidImage(product.imageUrl) || isInvalidTitle(product.title)) {
      console.log('[Pinterest] ERRO: Produto inválido detectado!');
      console.log('[Pinterest]   - Motivo: Imagem ou título não parecem ser de um produto real');

      await telemetryService.logEvent({
        eventType: 'PINTEREST_INVALID_PRODUCT',
        userId: botLink.user_id,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: {
          marketplace,
          url,
          title: product.title,
          imageUrl: product.imageUrl,
          reason: isInvalidImage(product.imageUrl) ? 'invalid_image' : 'invalid_title'
        }
      });

      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `❌ *Não foi possível extrair os dados do produto.*\n\n` +
        `O link enviado parece não ser de um produto válido ou a página não está mais disponível.\n\n` +
        `💡 *Dicas:*\n` +
        `• Verifique se o link abre corretamente no navegador\n` +
        `• Tente copiar o link diretamente da página do produto\n` +
        `• Evite links encurtados ou expirados`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    console.log('[Pinterest] Produto válido! Continuando...');

    // If product has no price but we have priceImageUrl, try OCR
    if (product.price === null && priceImageUrl) {
      console.log('[Pinterest] Preço null, tentando extrair via OCR...');
      const ocrResult = await scrapingCoreService.findPriceViaOcr(priceImageUrl);
      if (ocrResult?.price) {
        console.log('[Pinterest] Preço encontrado via OCR:', ocrResult.price);
        product.price = ocrResult.price;
      } else {
        console.log('[Pinterest] OCR não encontrou preço');
      }
    }

    // Log scraping success telemetry
    await telemetryService.logEvent({
      eventType: 'PINTEREST_SCRAPING_SUCCESS',
      userId: botLink.user_id,
      telegramUserId: ctx.from?.id,
      origin: 'pinterest-bot',
      metadata: { marketplace, url, productTitle: product.title, hasPrice: product.price !== null }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ANTIBOT SHOPEE: Pedir confirmação de preço
    // ═══════════════════════════════════════════════════════════════════════════
    const priceValue = typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
    const hasPrice = priceValue !== null;
    const priceFormatted = hasPrice ? `R$ ${priceValue.toFixed(2).replace('.', ',')}` : "";

    if (marketplace === 'SHOPEE' && hasPrice) {
      const confirmationMsg = `
⚠️ *Metadados da Shopee podem estar desatualizados.*

📦 *${product.title}*

💰 Confira se o preço deste produto ainda é: *${priceFormatted}*

🔗 Clique e confira: ${url}
`;

      await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, confirmationMsg, {
        parse_mode: 'Markdown',
        link_preview_options: { is_disabled: true },
        reply_markup: new InlineKeyboard()
          .text('✅ Confirmar preço', 'pinterest_confirm_price')
          .text('✏️ Alterar preço', 'pinterest_change_price'),
      });

      // Salvar estado pendente
      pendingPriceConfirmations.set(ctx.chat.id, {
        product,
        url,
        userId: botLink.user_id,
        botLink,
        layoutPreferences,
        processingMsgId: processingMsg.message_id,
        chatId: ctx.chat.id,
        timestamp: Date.now(),
      });

      // Parar aqui - a continuação será feita pelo callback handler
      return;
    }

    // Format product info message
    const productInfo = telegramUtils.formatProductInfo(product);

    await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, `${productInfo}\n🎨 *Gerando pin do Pinterest...*`, {
      parse_mode: 'Markdown',
    });

    // Get user ID from telegram link
    let userId: string | null = botLink.user_id;
    console.log('[Pinterest] Obtendo brand config para user:', userId);
    let brandConfig;
    brandConfig = await brandConfigService.getConfig(userId);

    // If no user found, use default config
    if (!brandConfig) {
      console.log('[Pinterest] Sem brand config personalizado, usando padrão');
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
    } else {
      console.log('[Pinterest] Brand config encontrado:', JSON.stringify(brandConfig, null, 2));
    }

    // Generate Pinterest arts (FEED and STORY formats - same as arts-bot)
    try {
      console.log('[Pinterest] ========== GERANDO ARTES ==========');
      console.log('[Pinterest] Layout preferences:', JSON.stringify(layoutPreferences, null, 2));

      // Generate feed format (4:5) - WITH description in caption
      console.log('[Pinterest] Gerando arte FEED (4:5)...');
      const feedArtBuffer = await artGeneratorService.generateArt(
        product,
        brandConfig,
        'feed',
        userId || undefined,
        layoutPreferences
      );
      console.log('[Pinterest] Arte FEED gerada! Tamanho do buffer:', feedArtBuffer.length, 'bytes');

      // Generate story format (9:16) - WITHOUT description (text on image)
      console.log('[Pinterest] Gerando arte STORY (9:16)...');
      const storyArtBuffer = await artGeneratorService.generateArt(
        product,
        brandConfig,
        'story',
        userId || undefined,
        layoutPreferences
      );
      console.log('[Pinterest] Arte STORY gerada! Tamanho do buffer:', storyArtBuffer.length, 'bytes');

      // Build caption/legend for FEED only
      console.log('[Pinterest] Construindo legenda para FEED...');
      const legendText = artGeneratorService.buildLegendText(
        product,
        brandConfig,
        layoutPreferences
      );
      console.log('[Pinterest] Legenda construída:', legendText.substring(0, 100) + (legendText.length > 100 ? '...' : ''));

      // Log art generation success telemetry
      await telemetryService.logEvent({
        eventType: 'PINTEREST_ART_GENERATED',
        userId,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: { marketplace, productTitle: product.title, formats: ['feed', 'story'] }
      });

      // Send FEED art WITH caption (description included)
      // Telegram has a 1024 character limit for photo captions
      const TELEGRAM_CAPTION_LIMIT = 1024;
      let caption = legendText;
      if (caption.length > TELEGRAM_CAPTION_LIMIT) {
        // Truncate and add ellipsis, leaving room for closing tags
        caption = caption.substring(0, TELEGRAM_CAPTION_LIMIT - 50) + '...';
        // Close any open HTML tags
        const openBold = (caption.match(/<b>/g) || []).length;
        const closeBold = (caption.match(/<\/b>/g) || []).length;
        if (openBold > closeBold) {
          caption += '</b>';
        }
        const openA = (caption.match(/<a /g) || []).length;
        const closeA = (caption.match(/<\/a>/g) || []).length;
        if (openA > closeA) {
          caption += '</a>';
        }
        console.log('[Pinterest] Legenda truncada de', legendText.length, 'para', caption.length, 'caracteres');
      }

      console.log('[Pinterest] Enviando arte FEED com legenda...');
      await ctx.replyWithPhoto(new InputFile(feedArtBuffer, 'pinterest-feed.png'), {
        caption,
        parse_mode: 'HTML',
      });
      console.log('[Pinterest] Arte FEED enviada com sucesso!');

      // Send STORY art WITHOUT caption (text is on image via SVG)
      console.log('[Pinterest] Enviando arte STORY sem legenda (texto na imagem)...');
      await ctx.replyWithPhoto(new InputFile(storyArtBuffer, 'pinterest-story.png'), {
        caption: '',
        parse_mode: 'HTML',
        reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
      });
      console.log('[Pinterest] Arte STORY enviada com sucesso!');

      // Check if autoPublish is enabled and create card on public page
      console.log('[Pinterest] ========== PÁGINA PÚBLICA ==========');
      console.log('[Pinterest] Verificando se autoPublish está ativado para user:', userId);
      const autoPublishEnabled = await PinterestBotConfigService.isAutoPublishEnabled(userId);
      console.log('[Pinterest] AutoPublish habilitado:', autoPublishEnabled);

      if (autoPublishEnabled) {
        try {
          console.log('[Pinterest] Inferindo categoria do produto...');
          // Infer category from product title
          const inferredCategory = CategoryInferenceService.infer(product.title);
          console.log('[Pinterest] Categoria inferida:', inferredCategory);

          // Get default category (overrides inferred if set)
          const defaultCategory = await PinterestBotConfigService.getDefaultCategory(userId);
          console.log('[Pinterest] Categoria padrão do usuário:', defaultCategory || 'Nenhuma (usando inferida)');

          // Use user's default category if set, otherwise use inferred category
          const finalCategory = defaultCategory || inferredCategory;
          console.log('[Pinterest] Categoria final:', finalCategory);

          // Format price as string for card
          const priceValue = typeof product.price === 'number' && Number.isFinite(product.price)
            ? product.price
            : null;
          const priceString = priceValue !== null
            ? `R$ ${priceValue.toFixed(2).replace('.', ',')}`
            : 'Preço indisponível';
          const originalPriceString = typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
            ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}`
            : undefined;

          // Check for duplicate product before creating card
          console.log('[Pinterest] Verificando se produto já existe na página pública...');
          const duplicateCheck = await PublicCardService.checkDuplicate(userId, product.productUrl);
          console.log('[Pinterest] Produto duplicado:', duplicateCheck.isDuplicate);

          if (duplicateCheck.isDuplicate) {
            console.log('[Pinterest] Produto já existe! Card existente:', duplicateCheck.existingCard?.card_slug);

            // Log duplicate detection telemetry
            await telemetryService.logEvent({
              eventType: 'PINTEREST_PUBLIC_CARD_DUPLICATE',
              userId,
              telegramUserId: ctx.from?.id,
              origin: 'pinterest-bot',
              metadata: {
                marketplace,
                productTitle: product.title,
                existingCardId: duplicateCheck.existingCard?.id,
                existingCardSlug: duplicateCheck.existingCard?.card_slug
              }
            });

            // Get public page settings to build link
            const publicPage = await PublicPageService.getByUserId(userId);
            const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://divulgafacil.com';
            const cardLink = publicPage?.public_slug && duplicateCheck.existingCard?.card_slug
              ? `${baseUrl}/${publicPage.public_slug}/${duplicateCheck.existingCard.card_slug}`
              : null;

            // Notify user about duplicate
            console.log('[Pinterest] Notificando usuário sobre duplicata...');
            console.log('[Pinterest] Link do card existente:', cardLink);
            await ctx.reply(
              `⚠️ *Este produto não foi postado na página pública por já existir lá.*\n\n` +
              `📌 O card já está disponível na sua página.` +
              (cardLink ? `\n\n🔗 ${cardLink}` : ''),
              { parse_mode: 'Markdown' }
            );
            console.log('[Pinterest] Usuário notificado sobre duplicata!');
          } else {
            console.log('[Pinterest] Produto novo! Criando card na página pública...');
            console.log('[Pinterest] Dados do card:');
            console.log('[Pinterest]   - userId:', userId);
            console.log('[Pinterest]   - source:', CardSource.BOT);
            console.log('[Pinterest]   - marketplace:', product.marketplace);
            console.log('[Pinterest]   - title:', product.title);
            console.log('[Pinterest]   - price:', priceString);
            console.log('[Pinterest]   - originalPrice:', originalPriceString);
            console.log('[Pinterest]   - imageUrl:', product.imageUrl?.substring(0, 50) + '...');
            console.log('[Pinterest]   - affiliateUrl:', product.productUrl?.substring(0, 50) + '...');
            console.log('[Pinterest]   - category:', finalCategory);

            // Create card on public page
            const card = await PublicCardService.create({
              userId,
              source: CardSource.BOT,
              marketplace: product.marketplace as Marketplace,
              title: product.title,
              description: product.description,
              price: priceString,
              originalPrice: originalPriceString,
              imageUrl: product.imageUrl,
              affiliateUrl: product.productUrl,
              coupon: brandConfig.showCoupon && brandConfig.couponText ? brandConfig.couponText : undefined,
              category: finalCategory,
              metadata: {
                telegramUserId: ctx.from?.id,
                scrapedAt: product.scrapedAt,
                discountPercentage: product.discountPercentage,
              }
            });

            console.log('[Pinterest] Card criado com sucesso!');
            console.log('[Pinterest] Card ID:', card.id);
            console.log('[Pinterest] Card Slug:', card.card_slug);

            // Log card creation telemetry
            await telemetryService.logEvent({
              eventType: 'PINTEREST_PUBLIC_CARD_CREATED',
              userId,
              telegramUserId: ctx.from?.id,
              origin: 'pinterest-bot',
              metadata: {
                marketplace,
                productTitle: product.title,
                cardId: card.id,
                cardSlug: card.card_slug
              }
            });

            // Get public page settings to build link
            const publicPage = await PublicPageService.getByUserId(userId);
            const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://divulgafacil.com';
            const cardLink = publicPage?.public_slug
              ? `${baseUrl}/${publicPage.public_slug}/${card.card_slug}`
              : null;

            // Notify user about public page card
            console.log('[Pinterest] Notificando usuário sobre o card publicado...');
            console.log('[Pinterest] Link do card:', cardLink);
            await ctx.reply(
              `✅ *Card publicado na sua página pública!*` +
              (cardLink ? `\n\n🔗 ${cardLink}` : '\n\n📌 Acesse: /status para ver o link da sua página.'),
              { parse_mode: 'Markdown' }
            );
            console.log('[Pinterest] Usuário notificado!');
          }
        } catch (cardError) {
          console.error('[Pinterest] ERRO ao criar card na página pública:', cardError);
          console.error('[Pinterest] Stack trace:', cardError instanceof Error ? cardError.stack : 'N/A');
          // Don't fail the whole flow, just log the error
          await telemetryService.logEvent({
            eventType: 'PINTEREST_PUBLIC_CARD_FAILED',
            userId,
            telegramUserId: ctx.from?.id,
            origin: 'pinterest-bot',
            metadata: {
              marketplace,
              productTitle: product.title,
              error: String(cardError)
            }
          });
        }
      } else {
        console.log('[Pinterest] AutoPublish desabilitado, não criando card na página pública');
      }

      // Log card/pin created telemetry
      await telemetryService.logEvent({
        eventType: 'PINTEREST_CARD_CREATED_BOT',
        userId,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: { marketplace, productTitle: product.title, productUrl: product.productUrl }
      });

      // Increment usage counter
      console.log('[Pinterest] Incrementando contador de uso...');
      await usageCountersService.incrementRenders(userId);
      console.log('[Pinterest] ========== FLUXO CONCLUÍDO COM SUCESSO ==========');

    } catch (artError) {
      console.error('[Pinterest] ========== ERRO NA GERAÇÃO DE ARTE ==========');
      console.error('[Pinterest] Erro:', artError);
      console.error('[Pinterest] Stack trace:', artError instanceof Error ? artError.stack : 'N/A');
      console.error('[Pinterest] Produto que causou erro:', JSON.stringify({
        title: product.title,
        price: product.price,
        imageUrl: product.imageUrl?.substring(0, 50),
        marketplace: product.marketplace,
      }, null, 2));

      // Log art generation failure
      await telemetryService.logEvent({
        eventType: 'PINTEREST_ART_GENERATION_FAILED',
        userId,
        telegramUserId: ctx.from?.id,
        origin: 'pinterest-bot',
        metadata: { marketplace, productTitle: product.title, error: String(artError) }
      });

      const priceValue =
        typeof product.price === "number" && Number.isFinite(product.price) ? product.price : null;
      const hasPrice = priceValue !== null;
      const priceFormatted = hasPrice ? `R$ ${priceValue.toFixed(2).replace('.', ',')}` : "";
      const discountText =
        hasPrice && product.discountPercentage ? ` *(-${product.discountPercentage}%)*` : '';

      const safeTitle = product.title
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      const fallbackPrice = hasPrice ? `${priceFormatted}${discountText}` : "Preço indisponível";
      const fallbackMessage = `⚠️ <b>Erro ao gerar pin personalizado</b>\n\nAqui está a imagem original do produto:\n\n${safeTitle}\n\n💰 ${fallbackPrice}`;

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
    console.error('[Pinterest] ========== ERRO GERAL NO PROCESSAMENTO ==========');
    console.error('[Pinterest] Erro:', error);
    console.error('[Pinterest] Stack trace:', error instanceof Error ? error.stack : 'N/A');
    await ctx.api.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      '❌ Ocorreu um erro ao processar o produto. Tente novamente mais tarde.'
    );
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Função auxiliar para gerar e enviar pins
// ═══════════════════════════════════════════════════════════════════════════════
async function generateAndSendPins(
  ctx: Context,
  product: ProductData,
  userId: string,
  layoutPreferences: LayoutPreferences
) {
  let brandConfig = await brandConfigService.getConfig(userId);

  if (!brandConfig) {
    brandConfig = {
      userId: userId,
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

  // Generate feed format (4:5)
  const feedArtBuffer = await artGeneratorService.generateArt(
    product,
    brandConfig,
    'feed',
    userId,
    layoutPreferences
  );

  // Generate story format (9:16)
  const storyArtBuffer = await artGeneratorService.generateArt(
    product,
    brandConfig,
    'story',
    userId,
    layoutPreferences
  );

  // Build caption/legend for FEED
  const legendText = artGeneratorService.buildLegendText(
    product,
    brandConfig,
    layoutPreferences
  );

  // Truncate caption if needed
  const TELEGRAM_CAPTION_LIMIT = 1024;
  let caption = legendText;
  if (caption.length > TELEGRAM_CAPTION_LIMIT) {
    caption = caption.substring(0, TELEGRAM_CAPTION_LIMIT - 50) + '...';
    const openBold = (caption.match(/<b>/g) || []).length;
    const closeBold = (caption.match(/<\/b>/g) || []).length;
    if (openBold > closeBold) {
      caption += '</b>';
    }
  }

  // Send FEED art WITH caption
  await ctx.replyWithPhoto(new InputFile(feedArtBuffer, 'pinterest-feed.png'), {
    caption,
    parse_mode: 'HTML',
  });

  // Send STORY art WITHOUT caption
  await ctx.replyWithPhoto(new InputFile(storyArtBuffer, 'pinterest-story.png'), {
    caption: '',
    parse_mode: 'HTML',
    reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
  });

  // Check if autoPublish is enabled
  const autoPublishEnabled = await PinterestBotConfigService.isAutoPublishEnabled(userId);

  if (autoPublishEnabled) {
    try {
      const inferredCategory = CategoryInferenceService.infer(product.title);
      const defaultCategory = await PinterestBotConfigService.getDefaultCategory(userId);
      const finalCategory = defaultCategory || inferredCategory;

      const priceValue = typeof product.price === 'number' && Number.isFinite(product.price) ? product.price : null;
      const priceString = priceValue !== null ? `R$ ${priceValue.toFixed(2).replace('.', ',')}` : 'Preço indisponível';
      const originalPriceString = typeof product.originalPrice === 'number' && Number.isFinite(product.originalPrice)
        ? `R$ ${product.originalPrice.toFixed(2).replace('.', ',')}`
        : undefined;

      const duplicateCheck = await PublicCardService.checkDuplicate(userId, product.productUrl);

      if (duplicateCheck.isDuplicate) {
        const publicPage = await PublicPageService.getByUserId(userId);
        const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://divulgafacil.com';
        const cardLink = publicPage?.public_slug && duplicateCheck.existingCard?.card_slug
          ? `${baseUrl}/${publicPage.public_slug}/${duplicateCheck.existingCard.card_slug}`
          : null;

        await ctx.reply(
          `⚠️ *Este produto não foi postado na página pública por já existir lá.*\n\n` +
          `📌 O card já está disponível na sua página.` +
          (cardLink ? `\n\n🔗 ${cardLink}` : ''),
          { parse_mode: 'Markdown' }
        );
      } else {
        const card = await PublicCardService.create({
          userId,
          source: CardSource.BOT,
          marketplace: product.marketplace as Marketplace,
          title: product.title,
          description: product.description,
          price: priceString,
          originalPrice: originalPriceString,
          imageUrl: product.imageUrl,
          affiliateUrl: product.productUrl,
          coupon: brandConfig.showCoupon && brandConfig.couponText ? brandConfig.couponText : undefined,
          category: finalCategory,
        });

        const publicPage = await PublicPageService.getByUserId(userId);
        const baseUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://divulgafacil.com';
        const cardLink = publicPage?.public_slug
          ? `${baseUrl}/${publicPage.public_slug}/${card.card_slug}`
          : null;

        await ctx.reply(
          `✅ *Card publicado na sua página pública!*` +
          (cardLink ? `\n\n🔗 ${cardLink}` : '\n\n📌 Acesse: /status para ver o link da sua página.'),
          { parse_mode: 'Markdown' }
        );
      }
    } catch (cardError) {
      console.error('[Pinterest] Erro ao criar card na página pública:', cardError);
    }
  }

  await usageCountersService.incrementRenders(userId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Callback handlers para confirmação de preço Shopee
// ═══════════════════════════════════════════════════════════════════════════════

// Callback: Confirmar preço
pinterestBot.callbackQuery(/^pinterest_confirm_price$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingPriceConfirmations.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: '⚠️ Sessão expirada. Envie o link novamente.' });
    return;
  }

  await ctx.answerCallbackQuery({ text: '✅ Preço confirmado!' });

  // Remover botões
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {}

  // Continuar com a geração
  await ctx.reply('🎨 *Gerando pin do Pinterest...*', { parse_mode: 'Markdown' });

  try {
    await generateAndSendPins(ctx, pending.product, pending.userId, pending.layoutPreferences);
    pendingPriceConfirmations.delete(chatId);
  } catch (error) {
    console.error('[Pinterest] Error generating pin after price confirmation:', error);
    await ctx.reply('❌ Erro ao gerar pin. Tente novamente.');
    pendingPriceConfirmations.delete(chatId);
  }
});

// Callback: Alterar preço
pinterestBot.callbackQuery(/^pinterest_change_price$/, async (ctx) => {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const pending = pendingPriceConfirmations.get(chatId);
  if (!pending) {
    await ctx.answerCallbackQuery({ text: '⚠️ Sessão expirada. Envie o link novamente.' });
    return;
  }

  await ctx.answerCallbackQuery();

  // Remover botões
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: undefined });
  } catch {}

  // Pedir novo preço
  await ctx.reply(
    '💰 *Digite o preço correto do produto:*',
    { parse_mode: 'Markdown' }
  );

  // Resetar timeout
  pending.timestamp = Date.now();
});

// ============================================================
// ERROR HANDLER
// ============================================================

pinterestBot.catch((err) => {
  console.error('[Pinterest] ========== ERRO NÃO TRATADO ==========');
  console.error('[Pinterest] Erro:', err);
  console.error('[Pinterest] Stack:', err instanceof Error ? err.stack : 'N/A');
});

console.log('[Pinterest] Bot inicializado com sucesso!');
