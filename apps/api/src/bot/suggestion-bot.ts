import { Bot, InlineKeyboard } from 'grammy';
import { prisma } from '../db/prisma.js';
import { suggestionCacheService } from '../services/suggestions/suggestion-cache.service.js';
import { telegramSuggestionOrchestratorService } from '../services/suggestions/telegram-suggestion-orchestrator.service.js';
import { telemetryService } from '../services/telemetry.service.js';
import { BOT_TYPES } from '../constants/bot-types.js';
import * as telegramUtils from './shared/telegram-utils.js';
import type { Marketplace, ProductSuggestion } from '../types/suggestions.types.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_SUGESTION_TOKEN;

if (!BOT_TOKEN) {
  console.warn('[SuggestionBot] TELEGRAM_BOT_SUGESTION_TOKEN not configured!');
}

export const suggestionBot = new Bot(BOT_TOKEN || '');

// ============================================================
// COMMANDS
// ============================================================

/**
 * /start command - Welcome message with marketplace buttons
 */
suggestionBot.command('start', async (ctx) => {
  console.log('[SuggestionBot] /start command received');
  const telegramUserId = ctx.from?.id.toString();
  console.log('[SuggestionBot] Telegram user ID:', telegramUserId);
  let isLinked = false;

  if (telegramUserId) {
    console.log('[SuggestionBot] Checking if user is linked...');
    isLinked = await telegramUtils.isUserLinked(telegramUserId, BOT_TYPES.SUGGESTION);
    console.log('[SuggestionBot] User linked status:', isLinked);
  }

  if (!isLinked) {
    await ctx.reply(
      `🔒 *Bot de Sugestões - Vinculação Necessária*\n\n` +
      `Para usar este bot, você precisa vincular sua conta.\n\n` +
      `*Como vincular:*\n` +
      `1. Acesse o dashboard web\n` +
      `2. Gere um token de vinculação\n` +
      `3. Envie o token aqui ou use /codigo <token>\n\n` +
      `Comandos:\n` +
      `/vincular - Instruções de vinculação\n` +
      `/codigo <token> - Vincular com token\n` +
      `/status - Verificar status\n` +
      `/ajuda - Ajuda`,
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const keyboard = new InlineKeyboard()
    .text('🛒 Mercado Livre', 'marketplace:MERCADO_LIVRE')
    .text('🛍️ Shopee', 'marketplace:SHOPEE')
    .row()
    .text('📦 Amazon', 'marketplace:AMAZON')
    .text('🏪 Magazine Luiza', 'marketplace:MAGALU');

  await ctx.reply(
    '📊 *Bot de Sugestões Inteligentes*\n\n' +
    'Descubra os produtos em alta para divulgar como afiliado!\n\n' +
    'Escolha um marketplace para ver as sugestões de hoje:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboard
    }
  );
});

/**
 * /vincular command - Start account linking process
 */
suggestionBot.command('vincular', async (ctx) => {
  await telegramUtils.sendLinkInstructions(ctx);
});

/**
 * /codigo command - Complete account linking with token
 */
suggestionBot.command('codigo', async (ctx) => {
  const token = ctx.match?.trim();

  if (!token) {
    await ctx.reply(
      '❌ Por favor, forneça o código de vinculação.\n\n' +
      'Exemplo: `/codigo abc123...`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const result = await telegramUtils.handleTokenLink(ctx, token, BOT_TYPES.SUGGESTION);

  if (!result.success) {
    await ctx.reply(`❌ Falha na vinculação: ${result.error}`);
    return;
  }

  // Log telemetry for bot linking
  await telemetryService.logEvent({
    eventType: 'SUGGESTION_BOT_LINKED',
    userId: result.userId,
    telegramUserId: ctx.from?.id,
    origin: 'suggestion-bot',
    metadata: { botType: BOT_TYPES.SUGGESTION }
  });

  await ctx.reply(
    '✅ *Conta vinculada com sucesso!*\n\n' +
    'Agora você pode usar o bot de sugestões.\n' +
    'Use /start para ver os marketplaces disponíveis.',
    { parse_mode: 'Markdown' }
  );
});

/**
 * /status command - Check link status
 */
suggestionBot.command('status', async (ctx) => {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações.');
    return;
  }

  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.SUGGESTION);

  if (botLink) {
    // Get user preferences if available
    const preferences = await prisma.user_suggestion_preferences.findUnique({
      where: { user_id: botLink.user_id },
    });

    const statusMessage = `
📊 *Status da Conta*

✅ Conta vinculada
🆔 Telegram ID: \`${telegramUserId}\`
📅 Vinculado em: ${botLink.linked_at.toLocaleDateString('pt-BR')}

*Preferências:*
${preferences ? `
• Sugestões: ${preferences.suggestions_enabled ? 'Ativadas' : 'Desativadas'}
• Frequência: ${preferences.frequency}
• Categorias preferidas: ${preferences.preferred_categories.length > 0 ? preferences.preferred_categories.join(', ') : 'Todas'}
` : '• Usando configurações padrão'}

Use /start para ver sugestões de produtos!
`;
    await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
  } else {
    await ctx.reply(
      '🔒 *Conta não vinculada*\n\n' +
      'Use /vincular para começar o processo de vinculação.',
      { parse_mode: 'Markdown' }
    );
  }
});

/**
 * /ajuda command - Help message
 */
suggestionBot.command('ajuda', async (ctx) => {
  const helpMessage = `
🆘 *Ajuda - Bot de Sugestões*

*O que é este bot?*
Este bot sugere produtos em alta para você divulgar como afiliado, usando inteligência artificial.

*Como funciona:*
1. Vincule sua conta usando /vincular
2. Escolha um marketplace
3. Receba 5 sugestões de produtos em alta
4. Opcionalmente, gere artes dos produtos

*Comandos:*
/start - Ver marketplaces e sugestões
/vincular - Vincular sua conta
/codigo <token> - Completar vinculação
/status - Ver status da conta
/ajuda - Esta mensagem

*Dica:* Clique duas vezes no mesmo marketplace para forçar atualização das sugestões!

*Marketplaces suportados:*
• Mercado Livre
• Shopee
• Amazon
• Magazine Luiza
`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
});

// ============================================================
// CALLBACK HANDLERS
// ============================================================

suggestionBot.on('callback_query:data', async (ctx) => {
  const data = ctx.callbackQuery.data;
  const telegramUserId = ctx.from?.id.toString() || 'unknown';

  // Handle marketplace selection
  if (data.startsWith('marketplace:')) {
    await handleMarketplaceSelection(ctx, data, telegramUserId);
    return;
  }

  // Handle "generate art" request
  if (data.startsWith('generate_art:')) {
    await handleGenerateArtRequest(ctx, data, telegramUserId);
    return;
  }

  // Handle suggestion acceptance/rejection
  if (data.startsWith('accept:') || data.startsWith('reject:') || data.startsWith('ignore:')) {
    await handleSuggestionFeedback(ctx, data, telegramUserId);
    return;
  }

  // Handle show marketplaces (same as /start)
  if (data === 'show_marketplaces') {
    await ctx.answerCallbackQuery();

    const keyboard = new InlineKeyboard()
      .text('🛒 Mercado Livre', 'marketplace:MERCADO_LIVRE')
      .text('🛍️ Shopee', 'marketplace:SHOPEE')
      .row()
      .text('📦 Amazon', 'marketplace:AMAZON')
      .text('🏪 Magazine Luiza', 'marketplace:MAGALU');

    await ctx.reply(
      '📊 *Bot de Sugestões Inteligentes*\n\n' +
      'Descubra os produtos em alta para divulgar como afiliado!\n\n' +
      'Escolha um marketplace para ver as sugestões de hoje:',
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      }
    );
    return;
  }
});

/**
 * Handle marketplace button click
 */
async function handleMarketplaceSelection(ctx: any, data: string, telegramUserId: string) {
  console.log('[SuggestionBot] handleMarketplaceSelection called with data:', data);
  const marketplace = data.replace('marketplace:', '') as Marketplace;
  console.log('[SuggestionBot] Marketplace selected:', marketplace);

  // Check if user is linked
  console.log('[SuggestionBot] Getting bot link for user:', telegramUserId);
  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.SUGGESTION);
  console.log('[SuggestionBot] Bot link result:', botLink ? 'found' : 'not found');
  if (!botLink) {
    await ctx.answerCallbackQuery({ text: '🔒 Vincule sua conta primeiro!' });
    await ctx.reply(
      '🔒 Você precisa vincular sua conta para ver sugestões.\n\n' +
      'Use /vincular para começar.',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  // Log telemetry for button click
  await telemetryService.logEvent({
    eventType: 'SUGGESTION_BOT_BUTTON_CLICKED',
    userId: botLink.user_id,
    telegramUserId: ctx.from?.id,
    origin: 'suggestion-bot',
    metadata: { marketplace }
  });

  try {
    await ctx.answerCallbackQuery();
    await ctx.reply('🔄 Buscando sugestões...');

    // Check for double-click (same day = force refresh per guidelines)
    // 1st click of the day: use cache
    // 2nd click same day: force refresh
    const shouldForceRefresh = await suggestionCacheService.detectDoubleClick(botLink.user_id, marketplace);
    console.log('[SuggestionBot] Should force refresh (double-click):', shouldForceRefresh);

    if (shouldForceRefresh) {
      console.log('[SuggestionBot] Double-click detected, invalidating cache for refresh');
      await suggestionCacheService.invalidateCache();

      await telemetryService.logEvent({
        eventType: 'SUGGESTION_BOT_FORCE_REFRESH',
        userId: botLink.user_id,
        telegramUserId: ctx.from?.id,
        origin: 'suggestion-bot',
        metadata: { marketplace, trigger: 'double_click' }
      });
    }

    // Get suggestions (from cache or generate new via Perplexity AI)
    console.log('[SuggestionBot] Calling telegramSuggestionOrchestratorService.getSuggestions()...');
    const suggestions = await telegramSuggestionOrchestratorService.getSuggestions();
    console.log('[SuggestionBot] Suggestions received:', suggestions ? 'success' : 'null');

    if (!suggestions) {
      console.error('[SuggestionBot] No suggestions returned from orchestrator');
      await ctx.reply('❌ Erro ao gerar sugestões. Tente novamente mais tarde.');
      return;
    }

    // Get marketplace-specific suggestions
    const marketplaceSuggestions = suggestions[marketplace];
    console.log('[SuggestionBot] Marketplace suggestions count:', marketplaceSuggestions?.length || 0);

    if (!marketplaceSuggestions || marketplaceSuggestions.length === 0) {
      console.error('[SuggestionBot] No suggestions for marketplace:', marketplace);
      await ctx.reply('❌ Nenhuma sugestão encontrada para este marketplace.');
      return;
    }

    // Save to suggestion_history
    await saveSuggestionHistory(botLink.user_id, marketplace, marketplaceSuggestions);

    // Format response
    const marketplaceLabels: Record<Marketplace, string> = {
      MERCADO_LIVRE: 'Mercado Livre',
      SHOPEE: 'Shopee',
      AMAZON: 'Amazon',
      MAGALU: 'Magazine Luiza',
    };

    let response = `🔥 *Top 5 produtos em alta no ${marketplaceLabels[marketplace]}:*\n\n`;

    marketplaceSuggestions.forEach((product, index) => {
      response += `*${index + 1}. ${product.title}*\n`;
      response += `   💡 Gancho: _"${product.hook_angle}"_\n`;
      response += `   💰 Preço: ${product.estimated_price}\n`;
      response += `   📂 Categoria: ${product.category}\n`;
      response += `   🔗 [Ver produto](${product.url})\n\n`;
    });

    // Create keyboard with start button
    const keyboard = new InlineKeyboard()
      .text('🔄 Ver outras sugestões', 'show_marketplaces');

    await ctx.reply(response, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });

    // Record click for double-click detection (using database user_id, not telegramUserId)
    await suggestionCacheService.recordClick(botLink.user_id, marketplace);

    // Log suggestion delivered
    await telemetryService.logEvent({
      eventType: 'SUGGESTION_BOT_SUGGESTIONS_DELIVERED',
      userId: botLink.user_id,
      telegramUserId: ctx.from?.id,
      origin: 'suggestion-bot',
      metadata: { marketplace, count: marketplaceSuggestions.length }
    });

  } catch (error) {
    console.error('[SuggestionBot] Error handling marketplace callback:', error);
    await ctx.reply('❌ Erro ao buscar sugestões. Tente novamente.');
  }
}

/**
 * Handle "generate art" button click
 */
async function handleGenerateArtRequest(ctx: any, data: string, telegramUserId: string) {
  const [, marketplace, indexStr] = data.split(':');
  const index = parseInt(indexStr, 10);

  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.SUGGESTION);
  if (!botLink) {
    await ctx.answerCallbackQuery({ text: '🔒 Vincule sua conta primeiro!' });
    return;
  }

  await ctx.answerCallbackQuery();

  // Get cached suggestions
  const suggestions = await suggestionCacheService.getCache();
  if (!suggestions) {
    await ctx.reply('❌ Sugestões expiraram. Use /start para buscar novas.');
    return;
  }

  const product = suggestions[marketplace as Marketplace]?.[index];
  if (!product) {
    await ctx.reply('❌ Produto não encontrado.');
    return;
  }

  // Log art request
  await telemetryService.logEvent({
    eventType: 'SUGGESTION_BOT_ART_REQUESTED',
    userId: botLink.user_id,
    telegramUserId: ctx.from?.id,
    origin: 'suggestion-bot',
    metadata: { marketplace, productTitle: product.title }
  });

  // Send instructions for generating art
  const artInstructions = `
🎨 *Gerar Arte para:*
${product.title}

Para gerar uma arte personalizada deste produto:

1. Copie o link abaixo
2. Abra o *Bot de Artes* (@DivulgaFacilArtsBot)
3. Cole o link e receba sua arte!

🔗 Link: ${product.url}

💡 *Dica:* O Bot de Artes cria imagens personalizadas com sua marca para você divulgar nas redes sociais!
`;

  await ctx.reply(artInstructions, {
    parse_mode: 'Markdown',
    reply_markup: new InlineKeyboard()
      .url('🎨 Abrir Bot de Artes', 'https://t.me/DivulgaFacilArtsBot')
      .row()
      .text('◀️ Voltar', `marketplace:${marketplace}`),
  });
}

/**
 * Handle suggestion feedback (accept/reject/ignore)
 */
async function handleSuggestionFeedback(ctx: any, data: string, telegramUserId: string) {
  const [action, marketplace, indexStr] = data.split(':');
  const botLink = await telegramUtils.getBotLink(telegramUserId, BOT_TYPES.SUGGESTION);

  if (!botLink) {
    await ctx.answerCallbackQuery({ text: '🔒 Vincule sua conta primeiro!' });
    return;
  }

  // Log feedback
  await telemetryService.logEvent({
    eventType: `SUGGESTION_BOT_${action.toUpperCase()}`,
    userId: botLink.user_id,
    telegramUserId: ctx.from?.id,
    origin: 'suggestion-bot',
    metadata: { marketplace, index: indexStr, action }
  });

  const messages: Record<string, string> = {
    accept: '✅ Sugestão marcada como aceita!',
    reject: '❌ Sugestão rejeitada. Vamos melhorar!',
    ignore: '⏭️ Sugestão ignorada.',
  };

  await ctx.answerCallbackQuery({ text: messages[action] || 'Feedback registrado!' });
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Save suggestions to history table (one record per suggestion)
 */
async function saveSuggestionHistory(
  userId: string,
  marketplace: Marketplace,
  suggestions: ProductSuggestion[]
): Promise<void> {
  try {
    // Filter out suggestions without URLs (url is optional in ProductSuggestion)
    const historyRecords = suggestions
      .filter((suggestion) => suggestion.url)
      .map((suggestion) => ({
        user_id: userId,
        suggested_product_url: suggestion.url!,
        suggested_title: suggestion.title.substring(0, 500),
        suggested_category: suggestion.category,
        suggested_marketplace: marketplace,
        suggested_at: new Date(),
      }));

    if (historyRecords.length === 0) {
      return;
    }

    await prisma.suggestion_history.createMany({
      data: historyRecords,
      skipDuplicates: true,
    });

    console.log('[SuggestionBot] Saved', historyRecords.length, 'suggestion history records for user:', userId);
  } catch (error) {
    console.error('[SuggestionBot] Error saving suggestion history:', error);
    // Non-blocking error
  }
}

// ============================================================
// TEXT MESSAGE HANDLER (for inline token linking)
// ============================================================

suggestionBot.on('message:text', async (ctx) => {
  const text = ctx.message.text;

  // Skip if it's a command
  if (text.startsWith('/')) {
    return;
  }

  const telegramUserId = ctx.from?.id.toString();
  if (!telegramUserId) return;

  // Check if user is already linked
  const isLinked = await telegramUtils.isUserLinked(telegramUserId, BOT_TYPES.SUGGESTION);

  if (!isLinked) {
    // Try to treat the text as a token
    const result = await telegramUtils.handleTokenLink(ctx, text.trim(), BOT_TYPES.SUGGESTION);

    if (result.success) {
      // Log telemetry for bot linking (inline token)
      await telemetryService.logEvent({
        eventType: 'SUGGESTION_BOT_LINKED',
        userId: result.userId,
        telegramUserId: ctx.from?.id,
        origin: 'suggestion-bot',
        metadata: { botType: BOT_TYPES.SUGGESTION, method: 'inline' }
      });

      await ctx.reply(
        '✅ *Conta vinculada com sucesso!*\n\n' +
        'Use /start para ver os marketplaces e receber sugestões.',
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `❌ Token inválido: ${result.error}\n\n` +
        'Use /vincular para ver como gerar um token válido.'
      );
    }
    return;
  }

  // User is linked but sent random text
  await ctx.reply(
    '👋 Use /start para ver os marketplaces disponíveis!\n\n' +
    'Ou use /ajuda para mais informações.'
  );
});

// ============================================================
// ERROR HANDLER
// ============================================================

suggestionBot.catch((err) => {
  console.error('[SuggestionBot] Error:', err);
});

// ============================================================
// START BOT
// ============================================================

export async function startSuggestionBot() {
  if (!BOT_TOKEN) {
    console.error('[SuggestionBot] Cannot start - token not configured');
    return;
  }

  try {
    await suggestionBot.start({
      onStart: (botInfo) => {
        console.log(`✅ Suggestion Bot started: @${botInfo.username}`);
      },
    });
  } catch (error) {
    console.error('[SuggestionBot] Failed to start:', error);
    throw error;
  }
}
