import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { prisma } from '../db/prisma.js';
import { getRequiredScrapeFields } from '../scraping/fields.js';
import { scraperRouter } from '../scraping/index.js';
import { brandConfigService } from '../services/brand-config.service.js';
import { artGeneratorService } from '../services/image-generation/art-generator.service.js';
import { layoutPreferencesService } from '../services/layout-preferences.service.js';
import { usageCountersService } from '../services/usage-counters.service.js';
import { BOT_TYPES } from '../constants/bot-types.js';
import { scrapingCoreService } from './shared/scraping-core.service.js';
import { artGenerationCoreService } from './shared/art-generation-core.service.js';
import * as telegramUtils from './shared/telegram-utils.js';

const TELEGRAM_BOT_ARTS_TOKEN = process.env.TELEGRAM_BOT_ARTS_TOKEN;

if (!TELEGRAM_BOT_ARTS_TOKEN) {
  throw new Error('TELEGRAM_BOT_ARTS_TOKEN is not defined in environment variables');
}

export const artsBot = new Bot(TELEGRAM_BOT_ARTS_TOKEN);

/**
 * /start command - Welcome message
 */
artsBot.command('start', async (ctx) => {
  await telegramUtils.sendWelcomeMessage(
    ctx,
    'Bot de Artes',
    BOT_TYPES.ARTS,
    scraperRouter.getSupportedMarketplaces()
  );
});

/**
 * /vincular command - Start account linking process
 */
artsBot.command('vincular', async (ctx) => {
  await telegramUtils.sendLinkInstructions(ctx);
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

  const result = await telegramUtils.handleTokenLink(ctx, token, BOT_TYPES.ARTS);

  if (!result.success) {
    await ctx.reply(`❌ Falha na vinculação: ${result.error}`);
    return;
  }

  await ctx.reply('✅ *Conta vinculada com sucesso!*\n\nAgora você pode enviar links de produtos.', {
    parse_mode: 'Markdown',
  });
});

// Removed duplicate helper functions - now using shared scraping-core.service.ts

/**
 * /status command - Check link status
 */
artsBot.command('status', async (ctx) => {
  await telegramUtils.sendStatusMessage(ctx);
});

/**
 * /ajuda command - Help message
 */
artsBot.command('ajuda', async (ctx) => {
  await telegramUtils.sendHelpMessage(ctx, 'Bot de Artes', scraperRouter.getSupportedMarketplaces());
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
  let botLink = null;

  if (telegramUserId) {
    botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.ARTS);
  }

  if (!urls || urls.length === 0) {
    if (!botLink) {
      const result = await telegramUtils.handleTokenLink(ctx, text.trim(), BOT_TYPES.ARTS);

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
      const previewResult = await scrapingCoreService.buildProductFromTelegramPreview(
        ctx,
        url,
        marketplace,
        TELEGRAM_BOT_ARTS_TOKEN
      );
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
