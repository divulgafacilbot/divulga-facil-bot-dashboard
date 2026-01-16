import { Bot, InputFile } from 'grammy';
import { BOT_TYPES } from '../constants/bot-types.js';
import { prisma } from '../db/prisma.js';
import { scrapeMedia } from '../scraping/social/index.js';
import { telegramLinkService } from '../services/telegram/link-service.js';
import { usageCountersService } from '../services/usage-counters.service.js';
import { telemetryService } from '../services/telemetry.service.js';
import { cleanupTempFile, downloadMediaToFile } from '../utils/media-downloader.js';
import { checkBotAccess } from './shared/telegram-utils.js';

const TELEGRAM_BOT_DOWNLOAD_TOKEN = process.env.TELEGRAM_BOT_DOWNLOAD_TOKEN;

if (!TELEGRAM_BOT_DOWNLOAD_TOKEN) {
  console.warn('⚠️  TELEGRAM_BOT_DOWNLOAD_TOKEN is not defined - Download Bot will not be initialized');
}

export const downloadBot = TELEGRAM_BOT_DOWNLOAD_TOKEN ? new Bot(TELEGRAM_BOT_DOWNLOAD_TOKEN) : null;

if (downloadBot) {
  /**
   * /start command
   */
  downloadBot.command('start', async (ctx) => {
    const telegramUserId = ctx.from?.id.toString();
    let isLinked = false;

    if (telegramUserId) {
      const link = await prisma.telegram_bot_links.findFirst({
        where: {
          telegram_user_id: telegramUserId,
          bot_type: BOT_TYPES.DOWNLOAD,
        },
      });
      isLinked = !!link;
    }

    const welcomeMessage = isLinked
      ? `👋 *Olá! Eu sou o Bot de Download.*

📥 Envie um link de:
• Instagram (post/reel público)
• TikTok (vídeo público)
• Pinterest (pin público)
• YouTube (shorts)
• Shopee (vídeo de propaganda)

E eu baixo a mídia para você!

Use /ajuda para ver todos os comandos.`
      : `👋 *Olá! Para usar este bot, você precisa conectá-lo à sua conta.*

1. Acesse o dashboard
2. Gere um token para o Bot de Download
3. Cole o token aqui

Ou use /vincular para mais informações.`;

    await ctx.reply(welcomeMessage, { parse_mode: 'Markdown' });
  });

  /**
   * /vincular command
   */
  downloadBot.command('vincular', async (ctx) => {
    const message = `🔗 *Para vincular sua conta:*

1. Acesse o dashboard
2. Clique em "Gerar Token" na seção Bot de Download
3. Copie o token gerado
4. Cole o token aqui

O token expira em 10 minutos.`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  });

  /**
   * /codigo command
   */
  downloadBot.command('codigo', async (ctx) => {
    const token = ctx.match?.trim();

    if (!token) {
      await ctx.reply('❌ Uso correto: `/codigo SEU_TOKEN`', { parse_mode: 'Markdown' });
      return;
    }

    const telegramUserId = ctx.from?.id.toString();
    const chatId = ctx.chat?.id.toString();

    if (!telegramUserId || !chatId) {
      await ctx.reply('❌ Erro ao obter suas informações do Telegram.');
      return;
    }

    const result = await telegramLinkService.confirmLink(
      token,
      telegramUserId,
      chatId,
      BOT_TYPES.DOWNLOAD
    );

    if (result.success) {
      await ctx.reply(
        `✅ *Conta vinculada com sucesso!*

Agora você pode enviar links de:
• Instagram
• TikTok
• Pinterest
• YouTube
• Shopee

Use /ajuda para ver todos os comandos.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        `❌ Token inválido ou expirado.

Gere um novo token no dashboard e tente novamente.`
      );
    }
  });

  /**
   * /status command
   */
  downloadBot.command('status', async (ctx) => {
    const telegramUserId = ctx.from?.id.toString();

    if (!telegramUserId) {
      await ctx.reply('❌ Erro ao obter suas informações.');
      return;
    }

    const link = await prisma.telegram_bot_links.findFirst({
      where: {
        telegram_user_id: telegramUserId,
        bot_type: BOT_TYPES.DOWNLOAD,
      },
    });

    if (link) {
      await ctx.reply('✅ Sua conta está vinculada e ativa!');
    } else {
      await ctx.reply(
        `❌ Sua conta não está vinculada.

Use /vincular para conectar sua conta.`
      );
    }
  });

  /**
   * /ajuda command
   */
  downloadBot.command('ajuda', async (ctx) => {
    const helpMessage = `📖 *Comandos disponíveis:*

/start - Iniciar bot
/vincular - Instruções para vincular conta
/status - Ver status da vinculação
/ajuda - Ver esta mensagem

💡 *Para vincular:* Cole o token gerado no dashboard

💡 *Para usar:* Envie um link público de:
• Instagram (post/reel)
• TikTok (vídeo)
• Pinterest (pin)
• YouTube (shorts)
• Shopee (vídeo de propaganda)`;

    await ctx.reply(helpMessage, { parse_mode: 'Markdown' });
  });

  /**
   * Message handler for URLs
   */
  downloadBot.on('message:text', async (ctx) => {
    const message = ctx.message.text;

    // Skip if it's a command
    if (message.startsWith('/')) {
      return;
    }

    const telegramUserId = ctx.from?.id.toString();

    if (!telegramUserId) {
      await ctx.reply('❌ Erro ao obter suas informações.');
      return;
    }

    // Check if user is linked
    const link = await prisma.telegram_bot_links.findFirst({
      where: {
        telegram_user_id: telegramUserId,
        bot_type: BOT_TYPES.DOWNLOAD,
      },
      include: {
        user: true,
      },
    });

    if (!link) {
      // If not linked, allow pasting a raw token to link (supports both regular and promo tokens)
      if (message.length > 10 && !message.includes(' ')) {
        const { handleTokenLink } = await import('./shared/telegram-utils.js');
        const result = await handleTokenLink(ctx, message.trim(), BOT_TYPES.DOWNLOAD);

        if (result.success) {
          await ctx.reply(
            `✅ *Conta vinculada com sucesso!*

Agora você pode enviar links de:
• Instagram
• TikTok
• Pinterest
• YouTube
• Shopee

Use /ajuda para ver todos os comandos.`,
            { parse_mode: 'Markdown' }
          );
        } else {
          await ctx.reply(
            `❌ ${result.error || 'Token inválido ou expirado.'}

Gere um novo token no dashboard e tente novamente.`
          );
        }
      } else {
        await ctx.reply(
          `❌ Você precisa vincular sua conta primeiro.

Use /vincular para ver as instruções.`
        );
      }
      return;
    }

    // Check if message contains URL
    const urlMatch = message.match(/https?:\/\/[^\s]+/);

    if (!urlMatch) {
      await ctx.reply(
        `📥 Envie um link de:
• Instagram (post/reel público)
• TikTok (vídeo público)
• Pinterest (pin público)
• YouTube (shorts)
• Shopee (vídeo de propaganda)

Exemplo: https://instagram.com/p/ABC123/`
      );
      return;
    }

    const url = urlMatch[0];

    // Send processing message
    const processingMsg = await ctx.reply('🔍 Processando link...');

    // Check subscription access using single source of truth
    const accessResult = await checkBotAccess(telegramUserId, BOT_TYPES.DOWNLOAD);
    if (!accessResult.hasAccess) {
      await ctx.api.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        `🔒 *Acesso não autorizado*\n\n${accessResult.reason || 'Sua assinatura expirou ou você não tem acesso a este bot.'}`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    try {
      // Scrape media
      const mediaResult = await scrapeMedia(url);

      // Send platform confirmation
      await ctx.reply(`✅ ${mediaResult.source} detectado! Baixando mídia...`);

      const userId = link.user_id;

      // Process each media item
      for (const item of mediaResult.items) {
        let tempFile: string | null = null;

        try {
          // Download
          const filename = item.filenameHint || `download-${Date.now()}.${item.mediaType === 'video' ? 'mp4' : 'jpg'}`;
          tempFile = await downloadMediaToFile(item.directUrl, filename, {
            headers: item.headers,
            strategy: item.downloadStrategy,
            transcodeToMp4: mediaResult.source === 'INSTAGRAM' && item.mediaType === 'video',
          });

          // Send to Telegram
          if (item.mediaType === 'video') {
            await ctx.replyWithVideo(new InputFile(tempFile));
          } else {
            await ctx.replyWithPhoto(new InputFile(tempFile));
          }

          // Increment usage counter
          await usageCountersService.incrementDownloads(userId);
          await telemetryService.logEvent({
            eventType: 'DOWNLOAD_COMPLETED',
            userId,
            origin: 'download-bot',
            metadata: {
              platform: mediaResult.source,
              mediaType: item.mediaType,
            },
          });

          await ctx.reply('✅ Mídia enviada com sucesso!');
        } catch (downloadError: any) {
          console.error('Erro ao baixar/enviar mídia:', downloadError);
          await ctx.reply(`❌ Erro ao processar mídia: ${downloadError.message}`);
        } finally {
          // Always cleanup temp file
          if (tempFile) {
            cleanupTempFile(tempFile);
          }
        }
      }
    } catch (error: any) {
      console.error('Erro ao processar link:', error);
      await ctx.reply(
        `❌ ${error.message}

Verifique se:
• O link está correto
• O conteúdo é público
• A plataforma é suportada`
      );
    }
  });
}

export async function startDownloadBot() {
  if (downloadBot) {
    console.log('🚀 Starting Download Bot...');
    // Clear stale connections from previous instances
    await downloadBot.api.deleteWebhook({ drop_pending_updates: true });
    await downloadBot.start();
    console.log('✅ Download Bot is online');
  } else {
    console.log('⚠️  Download Bot not initialized (token missing)');
  }
}

export async function stopDownloadBot() {
  if (downloadBot) {
    await downloadBot.stop();
    console.log('🛑 Download Bot stopped');
  }
}
