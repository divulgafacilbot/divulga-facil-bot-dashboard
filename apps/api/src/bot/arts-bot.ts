import { Bot, InlineKeyboard, InputFile } from 'grammy';
import { prisma } from '../db/prisma.js';
import { getRequiredScrapeFields } from '../scraping/fields.js';
import { scraperRouter } from '../scraping/index.js';
import { brandConfigService } from '../services/brand-config.service.js';
import { artGeneratorService } from '../services/image-generation/art-generator.service.js';
import { layoutPreferencesService } from '../services/layout-preferences.service.js';
import { telegramLinkService } from '../services/telegram/link-service.js';
import { usageCountersService } from '../services/usage-counters.service.js';

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
        bot_type: 'ARTS',
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
  const result = await telegramLinkService.confirmLink(token, telegramUserId, chatId, 'ARTS');

  if (!result.success) {
    await ctx.reply(`❌ Falha na vinculação: ${result.error}`);
    return;
  }

  await ctx.reply('✅ *Conta vinculada com sucesso!*\n\nAgora você pode enviar links de produtos.', {
    parse_mode: 'Markdown',
  });
});

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
        bot_type: 'ARTS',
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
        'ARTS'
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
    const result = await scraperRouter.scrape(url, { fields: requiredFields });

    if (!result.success || !result.data) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `❌ Não consegui extrair os dados do produto.\n\nErro: ${result.error || 'Desconhecido'}`
      );
      return;
    }

    const product = result.data;

    // Format product info message
    const priceFormatted = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    const originalPriceText = product.originalPrice
      ? `\n~~R$ ${product.originalPrice.toFixed(2).replace('.', ',')}~~`
      : '';
    const discountText = product.discountPercentage
      ? ` *(-${product.discountPercentage}%)*`
      : '';

    const productInfo = `
✅ *Produto encontrado!*

📦 *${product.title}*

💰 Preço: ${priceFormatted}${originalPriceText}${discountText}
🏪 Marketplace: ${product.marketplace.replace(/_/g, ' ')}
${product.rating ? `⭐ Avaliação: ${product.rating}${product.reviewCount ? ` (${product.reviewCount} avaliações)` : ''}` : ''}
${product.inStock ? '✅ Em estoque' : '❌ Fora de estoque'}

🎨 *Gerando arte personalizada...*
`;

    await ctx.api.editMessageText(ctx.chat.id, processingMsg.message_id, productInfo, {
      parse_mode: 'Markdown',
    });

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
        parse_mode: 'Markdown',
      });

      // Send story art
      await ctx.replyWithPhoto(new InputFile(storyArtBuffer, 'product-story.png'), {
        caption: '',
        parse_mode: 'Markdown',
        reply_markup: new InlineKeyboard().url('Ver Produto', product.productUrl),
      });

      // Send success message
      await usageCountersService.incrementRenders(userId);

      // Sucesso silencioso: evita mensagem extra após enviar as artes.
    } catch (artError) {
      console.error('Error generating custom art:', artError);
      const fallbackMessage = `⚠️ *Erro ao gerar arte personalizada*\n\nAqui está a imagem original do produto:\n\n${product.title}\n\n💰 ${priceFormatted}${discountText}`;
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
          parse_mode: 'Markdown',
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
