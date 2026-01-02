import { prisma } from '../../db/prisma.js';
import crypto from 'crypto';
import type { BotType } from '../../constants/bot-types.js';

// Tokens are long-lived; use a far-future expiry to keep them valid.
const TOKEN_EXPIRATION_MS = 1000 * 60 * 60 * 24 * 365 * 100;

export class TelegramLinkService {
  /**
   * Generate a unique link token for a user
   * Tokens are long-lived and limited to 2 per user/bot.
   */
  async generateLinkToken(userId: string, botType: BotType): Promise<string> {
    // Generate secure random token (32 bytes = 64 hex chars)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    const existingTokens = await prisma.telegram_links.count({
      where: {
        user_id: userId,
        bot_type: botType,
      },
    });

    if (existingTokens >= 2) {
      throw new Error('Token limit reached');
    }

    // Create new token
    await prisma.telegram_links.create({
      data: {
        user_id: userId,
        bot_type: botType,
        token,
        expires_at: expiresAt,
        status: 'PENDING',
      },
    });

    return token;
  }

  /**
   * Validate a token and check if it's still valid
   * Returns the userId if valid, null if invalid/expired
   */
  async validateToken(token: string, botType: BotType): Promise<string | null> {
    const link = await prisma.telegram_links.findFirst({
      where: {
        token,
        bot_type: botType,
        status: 'PENDING',
        expires_at: {
          gt: new Date(),
        },
      },
    });

    return link?.user_id || null;
  }

  /**
   * Confirm a link between user and Telegram account
   * Validates token, creates telegram_bot_links record, updates telegram_links status
   */
  async confirmLink(
    token: string,
    telegramUserId: string,
    chatId: string,
    botType: BotType
  ): Promise<{ success: boolean; userId?: string; error?: string }> {
    // Validate token first
    const userId = await this.validateToken(token, botType);

    if (!userId) {
      return {
        success: false,
        error: 'Invalid or expired token',
      };
    }

    try {
      // Check if this Telegram user is already linked to another account for this bot
      const existingLink = await prisma.telegram_bot_links.findFirst({
        where: {
          telegram_user_id: telegramUserId,
          bot_type: botType,
        },
      });

      if (existingLink && existingLink.user_id !== userId) {
        return {
          success: false,
          error: 'This Telegram account is already linked to another user',
        };
      }

      await prisma.telegram_bot_links.upsert({
        where: {
          user_id_bot_type: {
            user_id: userId,
            bot_type: botType,
          },
        },
        update: {
          telegram_user_id: telegramUserId,
          chat_id: chatId,
          linked_at: new Date(),
        },
        create: {
          user_id: userId,
          telegram_user_id: telegramUserId,
          chat_id: chatId,
          bot_type: botType,
          linked_at: new Date(),
        },
      });

      return {
        success: true,
        userId,
      };
    } catch (error) {
      console.error('Error confirming link:', error);
      return {
        success: false,
        error: 'Failed to confirm link',
      };
    }
  }

  /**
   * Get existing link for a user and bot type
   * Returns null if no active link exists
   */
  async getLink(userId: string, botType: BotType) {
    const link = await prisma.telegram_bot_links.findUnique({
      where: {
        user_id_bot_type: {
          user_id: userId,
          bot_type: botType,
        },
      },
    });

    return link;
  }

  /**
   * Unlink a Telegram account from a user
   */
  async unlinkAccount(userId: string, botType: BotType): Promise<boolean> {
    try {
      await prisma.telegram_bot_links.delete({
        where: {
          user_id_bot_type: {
            user_id: userId,
            bot_type: botType,
          },
        },
      });
      return true;
    } catch (error) {
      // Record doesn't exist or delete failed
      return false;
    }
  }

  async listTokens(userId: string, botType: BotType) {
    const tokens = await prisma.telegram_links.findMany({
      where: {
        user_id: userId,
        bot_type: botType,
      },
      orderBy: {
        created_at: 'desc',
      },
    });
    const keep = tokens.slice(0, 2);
    const remove = tokens.slice(2);

    if (remove.length) {
      await prisma.telegram_links.deleteMany({
        where: {
          id: { in: remove.map((token) => token.id) },
        },
      });
    }

    return keep.reverse();
  }

  async deleteToken(userId: string, botType: BotType, tokenId: string) {
    return prisma.telegram_links.deleteMany({
      where: {
        id: tokenId,
        user_id: userId,
        bot_type: botType,
      },
    });
  }

  async refreshToken(userId: string, botType: BotType, tokenId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRATION_MS);

    const updated = await prisma.telegram_links.updateMany({
      where: {
        id: tokenId,
        user_id: userId,
        bot_type: botType,
      },
      data: {
        token,
        expires_at: expiresAt,
        status: 'PENDING',
      },
    });

    if (!updated.count) {
      throw new Error('Token not found');
    }

    return { token, expiresAt };
  }
}

export const telegramLinkService = new TelegramLinkService();
