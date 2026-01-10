import { prisma } from '../../db/prisma.js';
import { nanoid } from 'nanoid';
import type { BotType } from '@prisma/client';

// Bot-specific configurations
const BOT_CONFIG = {
  ARTS: {
    name: 'Bot de Artes',
    telegramHandle: '@DivulgaFacilArtesBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular'
  },
  DOWNLOAD: {
    name: 'Bot de Download',
    telegramHandle: '@DivulgaFacilDownloadBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular'
  },
  PINTEREST: {
    name: 'Bot de Pinterest',
    telegramHandle: '@DivulgaFacilPinterestBot',
    instructions: 'Envie /codigo TOKEN no bot para vincular e começar a criar cards automáticos'
  },
  SUGGESTION: {
    name: 'Bot de Sugestões',
    telegramHandle: '@DivulgaFacilSugestaoBot',
    instructions: 'Envie /codigo TOKEN no bot para receber sugestões personalizadas'
  }
} as const;

export class TelegramLinkGenerationService {
  /**
   * Generate a 10-digit link token for bot connection
   * Token expires in 10 minutes
   */
  static async generateLinkToken(userId: string, botType: BotType) {
    // Generate unique 10-character alphanumeric token
    const token = nanoid(10).toUpperCase();

    // Token expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store in telegram_link_tokens table
    await prisma.telegram_link_tokens.create({
      data: {
        token,
        user_id: userId,
        bot_type: botType,
        expires_at: expiresAt
      }
    });

    const config = BOT_CONFIG[botType];

    return {
      token,
      botType,
      botName: config.name,
      telegramHandle: config.telegramHandle,
      instructions: config.instructions.replace('TOKEN', token),
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Check if user has already linked a specific bot
   */
  static async isLinked(userId: string, botType: BotType): Promise<boolean> {
    const link = await prisma.telegram_bot_links.findUnique({
      where: {
        user_id_bot_type: {
          user_id: userId,
          bot_type: botType
        }
      }
    });

    return !!link;
  }

  /**
   * Get all linked bots for a user
   */
  static async getLinkedBots(userId: string) {
    const links = await prisma.telegram_bot_links.findMany({
      where: { user_id: userId }
    });

    return links.map(link => ({
      botType: link.bot_type,
      botName: BOT_CONFIG[link.bot_type].name,
      telegramHandle: BOT_CONFIG[link.bot_type].telegramHandle,
      linkedAt: link.linked_at.toISOString(),
      chatId: link.chat_id,
      telegramUserId: link.telegram_user_id
    }));
  }

  /**
   * Get bot configuration for all bots
   */
  static getAllBotConfigs() {
    return Object.entries(BOT_CONFIG).map(([botType, config]) => ({
      botType: botType as BotType,
      botName: config.name,
      telegramHandle: config.telegramHandle
    }));
  }

  /**
   * Get bot configuration for a specific bot type
   */
  static getBotConfig(botType: BotType) {
    return {
      botType,
      ...BOT_CONFIG[botType]
    };
  }

  /**
   * Clean up expired tokens (can be run as a cron job)
   */
  static async cleanupExpiredTokens() {
    const result = await prisma.telegram_link_tokens.deleteMany({
      where: {
        expires_at: {
          lt: new Date()
        }
      }
    });

    return result.count;
  }
}
