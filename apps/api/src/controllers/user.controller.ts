import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { PasswordService } from '../services/auth/password.service.js';
import { RefreshTokenService } from '../services/auth/refresh-token.service.js';
import { LoginHistoryService } from '../services/auth/login-history.service.js';
import { changePasswordSchema } from '../utils/validation.js';
import { jwtConfig } from '../config/jwt.js';
import { getUserById } from '../services/user/userService.js';

export class UserController {
  /**
   * GET /me - Get current user data
   *
   * Returns the authenticated user's data with placeholders for future features.
   *
   * Security:
   * - Uses userId from req.user (set by auth middleware)
   * - NEVER accepts userId from client input
   */
  static async getMe(req: Request, res: Response) {
    try {
      // CRITICAL: Get userId from session only
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Fetch user data using service layer
      const userData = await getUserById(userId);

      if (!userData) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Return user DTO (includes subscription and telegram placeholders)
      res.status(200).json(userData);
    } catch (error) {
      console.error('Get me error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async changePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      const isValid = await PasswordService.verify(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Senha atual inválida' });
      }

      const passwordHash = await PasswordService.hash(newPassword);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validação', details: error.errors });
      }
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async deleteAccount(req: Request, res: Response) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: { id: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      await prisma.user.delete({ where: { id: user.id } });
      res.clearCookie(jwtConfig.cookieName);
      res.clearCookie(jwtConfig.refreshTokenCookieName);

      res.json({ message: 'Conta excluída com sucesso' });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async revokeAllSessions(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      // Revoke all refresh tokens for this user
      await RefreshTokenService.revokeAllUserTokens(userId);

      // Get current refresh token to create a new one (keep current session active)
      const currentRefreshToken = req.cookies[jwtConfig.refreshTokenCookieName];

      if (currentRefreshToken) {
        // Create new refresh token for current session
        const newRefreshToken = await RefreshTokenService.createRefreshToken(
          userId,
          req.ip,
          req.get('user-agent')
        );

        // Set new refresh token cookie
        res.cookie(jwtConfig.refreshTokenCookieName, newRefreshToken, jwtConfig.refreshCookieOptions);
      }

      res.json({ message: 'Todas as sessões foram encerradas' });
    } catch (error) {
      console.error('Revoke sessions error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getLoginHistory(req: Request, res: Response) {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await LoginHistoryService.getUserLoginHistory(userId, limit);

      res.json({ history });
    } catch (error) {
      console.error('Get login history error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  static async getLoginStats(req: Request, res: Response) {
    try {
      const userId = req.user!.id;

      const stats = await LoginHistoryService.getLoginStats(userId);

      res.json(stats);
    } catch (error) {
      console.error('Get login stats error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
