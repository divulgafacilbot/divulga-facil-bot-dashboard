import { Request, Response } from 'express';
import { telegramLinkService } from '../services/telegram/link-service.js';
import { linkTokenRequestSchema, confirmLinkSchema } from '../validators/telegram.schema.js';

export class TelegramController {
  /**
   * POST /telegram/link-token
   * Generate a link token for authenticated user
   */
  async generateLinkToken(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Validate request body with Zod
      const validation = linkTokenRequestSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { botType } = validation.data;

      // Generate token
      const token = await telegramLinkService.generateLinkToken(userId, botType);

      return res.status(200).json({
        token,
        expiresIn: 600, // 10 minutes in seconds
        message: 'Token generated successfully. Use this token in the Telegram bot within 10 minutes.',
      });
    } catch (error) {
      console.error('Error generating link token:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /telegram/confirm-link
   * Confirm link between user and Telegram account
   * This endpoint is called by the Telegram bot (no auth required)
   */
  async confirmLink(req: Request, res: Response) {
    try {
      // Validate request body with Zod
      const validation = confirmLinkSchema.safeParse(req.body);

      if (!validation.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.error.errors,
        });
      }

      const { token, telegramUserId, chatId } = validation.data;

      // Note: botType should be inferred from the bot that's calling this endpoint
      // For now, we'll assume ARTS bot (will be passed as query param or header by bot)
      const botType = (req.query.botType as 'ARTS' | 'DOWNLOAD') || 'ARTS';

      // Confirm link
      const result = await telegramLinkService.confirmLink(
        token,
        telegramUserId,
        chatId,
        botType
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Account linked successfully',
        userId: result.userId,
      });
    } catch (error) {
      console.error('Error confirming link:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /telegram/link-status
   * Check if user has linked their Telegram account
   */
  async getLinkStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const botType = (req.query.botType as 'ARTS' | 'DOWNLOAD') || 'ARTS';

      const link = await telegramLinkService.getLink(userId, botType);

      if (!link) {
        return res.status(200).json({
          linked: false,
          message: 'No Telegram account linked',
        });
      }

      return res.status(200).json({
        linked: true,
        telegramUserId: link.telegram_user_id,
        linkedAt: link.linked_at,
      });
    } catch (error) {
      console.error('Error getting link status:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * DELETE /telegram/unlink
   * Unlink Telegram account from user
   */
  async unlinkAccount(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const botType = (req.query.botType as 'ARTS' | 'DOWNLOAD') || 'ARTS';

      const success = await telegramLinkService.unlinkAccount(userId, botType);

      if (!success) {
        return res.status(404).json({
          error: 'No linked account found',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Account unlinked successfully',
      });
    } catch (error) {
      console.error('Error unlinking account:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const telegramController = new TelegramController();
