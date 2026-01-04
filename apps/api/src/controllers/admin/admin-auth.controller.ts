import { Request, Response } from 'express';
import { AdminAuthService } from '../../services/admin/admin-auth.service.js';
import { AdminRequest } from '../../middleware/require-admin.middleware.js';
import { z } from 'zod';
import { changePasswordSchema } from '../../utils/validation.js';
import { prisma } from '../../db/prisma.js';
import { PasswordService } from '../../services/auth/password.service.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export class AdminAuthController {
  /**
   * POST /admin/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = loginSchema.parse(req.body);
      console.log('[admin-auth] login request', { email });

      const result = await AdminAuthService.loginAdmin(email, password);

      res.json({
        success: true,
        token: result.token,
        admin: result.admin,
      });
    } catch (error: any) {
      console.warn('[admin-auth] login error', {
        message: error?.message,
        isZod: error instanceof z.ZodError,
      });
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }

      res.status(401).json({
        error: error.message || 'Authentication failed',
      });
    }
  }

  /**
   * POST /admin/auth/logout
   */
  static async logout(req: AdminRequest, res: Response) {
    // For JWT, logout is handled client-side by removing the token
    // Could add token blacklisting here if needed
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * GET /admin/auth/me
   */
  static async getMe(req: AdminRequest, res: Response) {
    try {
      const admin = await AdminAuthService.getAdminById(req.admin!.id);

      res.json({
        success: true,
        admin,
      });
    } catch (error: any) {
      res.status(404).json({
        error: error.message || 'Admin not found',
      });
    }
  }

  /**
   * POST /admin/auth/change-password
   */
  static async changePassword(req: AdminRequest, res: Response) {
    try {
      const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
      const adminId = req.admin?.id;

      if (!adminId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const admin = await prisma.admin_users.findUnique({
        where: { id: adminId },
        select: { id: true, password_hash: true, is_active: true },
      });

      if (!admin) {
        return res.status(404).json({ error: 'Admin not found' });
      }

      if (!admin.is_active) {
        return res.status(403).json({ error: 'Account is inactive' });
      }

      const isValid = await PasswordService.verify(currentPassword, admin.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Senha atual invalida' });
      }

      const password_hash = await PasswordService.hash(newPassword);

      await prisma.admin_users.update({
        where: { id: admin.id },
        data: { password_hash },
      });

      res.json({ message: 'Senha atualizada com sucesso' });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Falha na validacao', details: error.errors });
      }
      console.error('Admin change password error:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}
