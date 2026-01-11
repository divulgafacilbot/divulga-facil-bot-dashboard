import { Context } from 'grammy';
import { prisma } from '../../db/prisma.js';
import { telegramLinkService } from '../../services/telegram/link-service.js';
import { promoTokensService } from '../../services/admin/promo-tokens.service.js';
import { BotType } from '../../constants/bot-types.js';

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

    if (existingLink && existingLink.user_id !== promoToken.user_id) {
      return {
        success: false,
        error: 'Esta conta do Telegram já está vinculada a outro usuário.',
      };
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
        linked_at: new Date(),
      },
      create: {
        user_id: promoToken.user_id,
        bot_type: botType,
        telegram_user_id: telegramUserId,
        chat_id: chatId,
        linked_at: new Date(),
      },
    });

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
/vincular - Vincular sua conta
/codigo - Completar vinculação com código
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
