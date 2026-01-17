import { Context } from 'grammy';
import { prisma } from '../../db/prisma.js';
import { telegramLinkService } from '../../services/telegram/link-service.js';
import { promoTokensService } from '../../services/admin/promo-tokens.service.js';
import { SubscriptionService } from '../../services/billing/subscription.service.js';
import { EntitlementService } from '../../services/billing/entitlement.service.js';
import { BotType } from '../../constants/bot-types.js';
import { MARKETPLACE_DISPLAY_NAMES, MarketplaceType } from '../../constants/enums.js';

/**
 * Telegram utility functions shared across all bots
 */

/**
 * Check if user has linked their account for a specific bot type
 */
export async function isUserLinked(
  telegramUserId: string,
  botType: BotType
): Promise<boolean> {
  const link = await prisma.telegram_bot_links.findFirst({
    where: {
      telegram_user_id: telegramUserId,
      bot_type: botType as any,
    },
  });
  return !!link;
}

/**
 * Get bot link for user
 */
export async function getBotLink(telegramUserId: string, botType: BotType) {
  return await prisma.telegram_bot_links.findFirst({
    where: {
      telegram_user_id: telegramUserId,
      bot_type: botType as any,
    },
  });
}

/**
 * Check if user has access to a specific bot type
 * Uses SubscriptionService.hasAccess() as the single source of truth
 */
export async function checkBotAccess(
  telegramUserId: string,
  botType: BotType
): Promise<{ hasAccess: boolean; userId?: string; reason?: string }> {
  console.log('[checkBotAccess] Checking access for telegramUserId:', telegramUserId, 'botType:', botType);

  // First check if user is linked
  const botLink = await getBotLink(telegramUserId, botType);
  console.log('[checkBotAccess] Bot link found:', botLink ? 'YES' : 'NO', botLink ? `userId: ${botLink.user_id}` : '');

  if (!botLink) {
    return {
      hasAccess: false,
      reason: 'Conta não vinculada. Use /vincular para conectar sua conta.',
    };
  }

  // Check subscription access using the single source of truth
  console.log('[checkBotAccess] Checking subscription access for userId:', botLink.user_id, 'botType:', botType);
  const hasAccess = await SubscriptionService.hasAccess(botLink.user_id, botType);
  console.log('[checkBotAccess] SubscriptionService.hasAccess result:', hasAccess);

  if (!hasAccess) {
    // Debug: Check what entitlements exist
    const entitlements = await prisma.user_entitlements.findMany({
      where: { user_id: botLink.user_id },
      select: { id: true, bot_type: true, entitlement_type: true, status: true, expires_at: true },
    });
    console.log('[checkBotAccess] User entitlements:', JSON.stringify(entitlements, null, 2));

    return {
      hasAccess: false,
      userId: botLink.user_id,
      reason: 'Sua assinatura expirou ou você não tem acesso a este bot. Acesse o dashboard para verificar.',
    };
  }

  return {
    hasAccess: true,
    userId: botLink.user_id,
  };
}

/**
 * Check if user has access to a specific marketplace
 * User must have a MARKETPLACE_SLOT entitlement with this marketplace assigned
 */
export async function checkMarketplaceAccess(
  userId: string,
  marketplace: string
): Promise<{
  hasAccess: boolean;
  allowedMarketplaces?: string[];
  reason?: string;
  needsUpgrade?: boolean;
}> {
  // Get user's marketplace summary
  const summary = await EntitlementService.getMarketplaceAccessSummary(userId);

  // No slots at all - plan doesn't include marketplaces
  if (summary.totalSlots === 0) {
    return {
      hasAccess: false,
      allowedMarketplaces: [],
      reason: 'Seu plano nao inclui acesso a marketplaces. Faca upgrade para usar o bot.',
      needsUpgrade: true,
    };
  }

  // Has slots but none configured
  if (summary.usedSlots === 0) {
    return {
      hasAccess: false,
      allowedMarketplaces: [],
      reason: `Voce tem ${summary.totalSlots} slot(s) de marketplace, mas ainda nao selecionou quais quer usar. Configure em Configuracoes > Marketplaces no dashboard.`,
      needsUpgrade: false,
    };
  }

  // Check if this specific marketplace is in user's selected list
  const normalizedMarketplace = marketplace.toUpperCase();
  const hasAccess = summary.selectedMarketplaces.includes(normalizedMarketplace);

  if (!hasAccess) {
    const marketplaceName = MARKETPLACE_DISPLAY_NAMES[normalizedMarketplace as MarketplaceType] || marketplace;
    const allowedNames = summary.selectedMarketplaces.map(
      (m) => MARKETPLACE_DISPLAY_NAMES[m as MarketplaceType] || m
    );

    return {
      hasAccess: false,
      allowedMarketplaces: summary.selectedMarketplaces,
      reason: `Voce nao tem acesso ao ${marketplaceName}.\n\nSeus marketplaces liberados:\n${allowedNames.map((n) => `• ${n}`).join('\n')}\n\nPara adicionar mais marketplaces, faca upgrade do seu plano.`,
      needsUpgrade: true,
    };
  }

  return {
    hasAccess: true,
    allowedMarketplaces: summary.selectedMarketplaces,
  };
}

/**
 * Combined check for bot access AND marketplace access
 * Returns detailed information for proper user messaging
 */
export async function checkFullAccess(
  telegramUserId: string,
  botType: BotType,
  marketplace: string
): Promise<{
  hasAccess: boolean;
  userId?: string;
  reason?: string;
  needsUpgrade?: boolean;
  allowedMarketplaces?: string[];
}> {
  // 1. First check bot access (includes link check and subscription check)
  const botAccessResult = await checkBotAccess(telegramUserId, botType);

  if (!botAccessResult.hasAccess) {
    return {
      hasAccess: false,
      userId: botAccessResult.userId,
      reason: botAccessResult.reason,
      needsUpgrade: false,
    };
  }

  // 2. Now check marketplace access
  const marketplaceResult = await checkMarketplaceAccess(botAccessResult.userId!, marketplace);

  if (!marketplaceResult.hasAccess) {
    return {
      hasAccess: false,
      userId: botAccessResult.userId,
      reason: marketplaceResult.reason,
      needsUpgrade: marketplaceResult.needsUpgrade,
      allowedMarketplaces: marketplaceResult.allowedMarketplaces,
    };
  }

  return {
    hasAccess: true,
    userId: botAccessResult.userId,
    allowedMarketplaces: marketplaceResult.allowedMarketplaces,
  };
}

/**
 * Middleware-style function to check access before bot operations
 * Returns a user-friendly message if access is denied
 */
export async function requireBotAccess(
  ctx: Context,
  botType: BotType
): Promise<{ allowed: boolean; userId?: string }> {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações do Telegram.');
    return { allowed: false };
  }

  const accessResult = await checkBotAccess(telegramUserId, botType);

  if (!accessResult.hasAccess) {
    await ctx.reply(
      `🔒 *Acesso não autorizado*\n\n${accessResult.reason}`,
      { parse_mode: 'Markdown' }
    );
    return { allowed: false };
  }

  return { allowed: true, userId: accessResult.userId };
}

/**
 * Handle token-based account linking
 * Supports both regular link tokens and promotional tokens
 */
export async function handleTokenLink(
  ctx: Context,
  token: string,
  botType: BotType
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const telegramUserId = ctx.from?.id.toString();
  const chatId = ctx.chat?.id.toString();

  if (!telegramUserId || !chatId) {
    return { success: false, error: 'Erro ao obter suas informações do Telegram.' };
  }

  // Trim token to remove any whitespace
  const cleanToken = token.trim();
  console.log('[handleTokenLink] Processing token for botType:', botType, 'tokenLength:', cleanToken.length);

  // First, try regular link token
  const result = await telegramLinkService.confirmLink(
    cleanToken,
    telegramUserId,
    chatId,
    botType
  );

  // If regular token worked, return success
  if (result.success) {
    console.log('[handleTokenLink] Regular link token worked for user:', result.userId);
    return result;
  }

  console.log('[handleTokenLink] Regular token failed:', result.error, '- trying promo token for botType:', botType);

  // If regular token failed, try promo token
  const promoResult = await promoTokensService.validateToken(cleanToken, botType);
  console.log('[handleTokenLink] Promo token validation result:', JSON.stringify(promoResult));

  if (promoResult.valid && promoResult.tokenId) {
    console.log('[handleTokenLink] Promo token valid, linking telegram user');

    // Get the promo token to find the user_id
    const promoToken = await prisma.promo_tokens.findUnique({
      where: { id: promoResult.tokenId },
    });

    if (!promoToken) {
      return { success: false, error: 'Token promocional não encontrado.' };
    }

    // Check if this Telegram user is already linked to another account for this bot
    const existingLink = await prisma.telegram_bot_links.findFirst({
      where: {
        telegram_user_id: telegramUserId,
        bot_type: botType,
      },
    });

    // If linked to a different user, delete the old link first (promo token takes precedence)
    if (existingLink && existingLink.user_id !== promoToken.user_id) {
      console.log('[handleTokenLink] Telegram already linked to different user, replacing link. Old userId:', existingLink.user_id, 'New userId:', promoToken.user_id);
      await prisma.telegram_bot_links.delete({
        where: {
          user_id_bot_type: {
            user_id: existingLink.user_id,
            bot_type: botType,
          },
        },
      });
    }

    // Create or update the telegram bot link
    await prisma.telegram_bot_links.upsert({
      where: {
        user_id_bot_type: {
          user_id: promoToken.user_id,
          bot_type: botType,
        },
      },
      update: {
        telegram_user_id: telegramUserId,
        chat_id: chatId,
        promo_token_id: promoResult.tokenId,
        linked_at: new Date(),
      },
      create: {
        user_id: promoToken.user_id,
        bot_type: botType,
        telegram_user_id: telegramUserId,
        chat_id: chatId,
        promo_token_id: promoResult.tokenId,
        linked_at: new Date(),
      },
    });

    console.log('[handleTokenLink] Telegram link created for user:', promoToken.user_id);

    // CRITICAL: Create the promo access entitlement so user can actually use the bot
    try {
      const entitlement = await EntitlementService.addPromoAccess(
        promoToken.user_id,
        botType,
        promoToken.expires_at
      );
      console.log('[handleTokenLink] Promo access entitlement created/found for user:', promoToken.user_id, 'botType:', botType, 'entitlementId:', entitlement.id);
    } catch (entitlementError: any) {
      console.error('[handleTokenLink] CRITICAL: Error creating promo entitlement:', entitlementError.message);
      // Rollback the telegram link since entitlement failed
      await prisma.telegram_bot_links.delete({
        where: {
          user_id_bot_type: {
            user_id: promoToken.user_id,
            bot_type: botType,
          },
        },
      }).catch(() => {}); // Ignore rollback errors
      return { success: false, error: 'Erro ao criar acesso. Entre em contato com o suporte.' };
    }

    console.log('[handleTokenLink] Promo token link successful for user:', promoToken.user_id);

    return {
      success: true,
      userId: promoToken.user_id,
    };
  }

  // Both token types failed - provide more specific error
  console.log('[handleTokenLink] Both token types failed. Promo result:', JSON.stringify(promoResult));

  // Return more specific error based on promo result
  if (promoResult.error?.includes('is for')) {
    return { success: false, error: promoResult.error };
  }
  if (promoResult.error?.includes('inactive')) {
    return { success: false, error: 'Token inativo.' };
  }
  if (promoResult.error?.includes('expired')) {
    return { success: false, error: 'Token expirado.' };
  }

  return { success: false, error: 'Token inválido ou expirado.' };
}

/**
 * Extract URL from message text
 */
export function extractUrl(text: string): string | null {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urls = text.match(urlRegex);
  return urls && urls.length > 0 ? urls[0] : null;
}

/**
 * Format product info message
 */
export function formatProductInfo(product: {
  title: string;
  price?: number | null;
  originalPrice?: number | null;
  discountPercentage?: number;
  marketplace: string;
  rating?: number;
  reviewCount?: number;
}): string {
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

  return `
✅ *Produto encontrado!*

📦 *${product.title}*

💰 Preço: ${hasPrice ? `${priceFormatted}${originalPriceText}${discountText}` : "indisponível"}
🏪 Marketplace: ${product.marketplace.replace(/_/g, ' ')}
${product.rating ? `⭐ Avaliação: ${product.rating}${product.reviewCount ? ` (${product.reviewCount} avaliações)` : ''}` : ''}
`;
}

/**
 * Send welcome message based on link status
 */
export async function sendWelcomeMessage(
  ctx: Context,
  botName: string,
  botType: BotType,
  supportedMarketplaces: string[]
): Promise<void> {
  const telegramUserId = ctx.from?.id.toString();
  let isLinked = false;

  if (telegramUserId) {
    isLinked = await isUserLinked(telegramUserId, botType);
  }

  const welcomeMessage = isLinked
    ? `
🎨 *Bem-vindo ao ${botName}!*

Envie um link de produto de qualquer marketplace suportado e eu crio uma arte personalizada para você!

*Marketplaces suportados:*
${supportedMarketplaces.map((m) => `• ${m}`).join('\n')}

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
}

/**
 * Send help message
 */
export async function sendHelpMessage(
  ctx: Context,
  botName: string,
  supportedMarketplaces: string[]
): Promise<void> {
  const helpMessage = `
🆘 *Ajuda - ${botName}*

*Como funciona:*
1. Vincule sua conta usando /vincular
2. Envie um link de produto
3. Receba uma arte personalizada

*Marketplaces suportados:*
${supportedMarketplaces.map((m) => `• ${m}`).join('\n')}

*Comandos:*
/start - Mensagem de boas-vindas
/vincular - Vincular sua conta (cole o token diretamente)
/status - Ver status da conta
/config - Ver configurações
/ajuda - Esta mensagem

*Problemas?*
Entre em contato com o suporte.
`;

  await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
}

/**
 * Send status message
 */
export async function sendStatusMessage(ctx: Context): Promise<void> {
  const telegramUserId = ctx.from?.id.toString();

  if (!telegramUserId) {
    await ctx.reply('❌ Erro ao obter suas informações.');
    return;
  }

  const statusMessage = `
📊 *Status da Vinculação*

Telegram ID: \`${telegramUserId}\`

Para verificar se sua conta está vinculada, use o comando /vincular se ainda não fez isso.
`;

  await ctx.reply(statusMessage, { parse_mode: 'Markdown' });
}

/**
 * Send link instruction message
 */
export async function sendLinkInstructions(ctx: Context): Promise<void> {
  const message = `
🔗 *Vincular Conta*

Gere um token no dashboard web e envie aqui.
`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}
